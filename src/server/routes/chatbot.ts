import { Router, Response } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { optionalAuthToken, AuthenticatedRequest } from '../auth';
import {
  fetchAllBatches,
  fetchAllCourses,
  fetchAllRoutineSlots,
  fetchAllExams,
  fetchAllAnnouncements,
  fetchAllNotices,
  fetchAllFaculty,
  fetchAllResources,
  fetchAllUsers,
} from '../supabaseData';
import { searchAcademicKnowledge, KnowledgeItem } from '../knowledgeBase';

const router = Router();

let aiClient: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// ==============================================================================
// IN-MEMORY RESPONSE CACHE (Zero-Token Instant Hit for Repeated Queries)
// ==============================================================================
interface CachedReply {
  payload: any;
  timestamp: number;
}
const REPLY_CACHE_TTL_MS = 90 * 1000; // 90 seconds
const replyCache = new Map<string, CachedReply>();

function getCachedReply(key: string): any | null {
  const entry = replyCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > REPLY_CACHE_TTL_MS) {
    replyCache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCachedReply(key: string, payload: any): void {
  if (replyCache.size > 300) {
    const oldestKey = replyCache.keys().next().value;
    if (oldestKey) replyCache.delete(oldestKey);
  }
  replyCache.set(key, { payload, timestamp: Date.now() });
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ActionLink {
  label: string;
  path: string;
}

export interface InfoRow {
  tag?: string;
  tagTone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';
  primary: string;
  secondary?: string;
  meta?: string[];
}

const ALL_WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const WORKING_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];

const DAY_ALIASES: Array<{ keywords: string[]; day: string }> = [
  { keywords: ['sunday', 'রবিবার', 'রবি', 'robibar', 'robi'], day: 'SUNDAY' },
  { keywords: ['monday', 'সোমবার', 'সোম', 'sombar', 'som'], day: 'MONDAY' },
  { keywords: ['tuesday', 'মঙ্গলবার', 'মঙ্গল', 'mongolbar', 'mongol'], day: 'TUESDAY' },
  { keywords: ['wednesday', 'বুধবার', 'বুধ', 'budhbar', 'budh'], day: 'WEDNESDAY' },
  { keywords: ['thursday', 'বৃহস্পতিবার', 'বৃহস্পতি', 'brihospotibar', 'brihospoti'], day: 'THURSDAY' },
  { keywords: ['friday', 'শুক্রবার', 'শুক্র', 'shukrobar'], day: 'FRIDAY' },
  { keywords: ['saturday', 'শনিবার', 'শনি', 'shonibar'], day: 'SATURDAY' },
];

/**
 * Returns current weekday & date string in Bangladesh Standard Time (Asia/Dhaka)
 */
function getBangladeshDateInfo(): {
  todayStr: string;
  todayDay: string;
  tomorrowDay: string;
  dayAfterTomorrowDay: string;
} {
  const now = new Date();
  const dhakaDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  const dhakaWeekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    weekday: 'long',
  })
    .format(now)
    .toUpperCase();

  const todayIdx = ALL_WEEKDAYS.indexOf(dhakaWeekday);
  const safeIdx = todayIdx === -1 ? new Date().getDay() : todayIdx;
  const todayDay = ALL_WEEKDAYS[safeIdx];
  const tomorrowDay = ALL_WEEKDAYS[(safeIdx + 1) % 7];
  const dayAfterTomorrowDay = ALL_WEEKDAYS[(safeIdx + 2) % 7];

  return {
    todayStr: dhakaDateStr,
    todayDay,
    tomorrowDay,
    dayAfterTomorrowDay,
  };
}

/**
 * Strips any course code prefix so only the clean Course Title is displayed
 */
function cleanCourseName(title?: string, fallback = 'Course'): string {
  if (!title) return fallback;
  const cleaned = String(title)
    .replace(/^[A-Z]{2,4}[-\s]?\d{3,4}\s*[:\-–]\s*/i, '')
    .trim();
  return cleaned || fallback;
}

/**
 * Resolves batch aliases across database IDs (e.g., batch-13 vs batch-1788450159710)
 */
function getBatchCandidateIds(batchId: string): string[] {
  const norm = batchId.trim().toLowerCase().replace(/th$|st$|nd$|rd$/i, '');
  return [
    batchId,
    norm,
    ...(norm === 'batch-13' ? ['batch-1788450159710'] : []),
    ...(batchId === 'batch-1788450159710' ? ['batch-13', 'batch-13th'] : []),
    ...(norm === 'batch-12' ? ['batch-1788449554669'] : []),
    ...(batchId === 'batch-1788449554669' ? ['batch-12', 'batch-12th'] : []),
    ...(norm === 'batch-11' ? ['batch-1792923073984'] : []),
    ...(batchId === 'batch-1792923073984' ? ['batch-11', 'batch-11th'] : []),
  ];
}

function formatBatchLabel(batchId: string, allBatches: any[]): string {
  const found = allBatches.find((b) => getBatchCandidateIds(b.id).includes(batchId));
  if (found?.name) return found.name;
  const numMatch = String(batchId).match(/\d+/);
  if (numMatch && Number(numMatch[0]) <= 25) return `SWE ${numMatch[0]}th Batch`;
  return batchId;
}

function detectTargetDay(
  text: string,
  dateInfo: { todayDay: string; tomorrowDay: string; dayAfterTomorrowDay: string }
): { day?: string; label?: string } {
  const lower = text.toLowerCase();

  if (/\b(poroshu|porshu|day after tomorrow)\b/.test(lower) || lower.includes('পরশু')) {
    return { day: dateInfo.dayAfterTomorrowDay, label: `পরশু (${dateInfo.dayAfterTomorrowDay})` };
  }

  if (
    /\b(kalke|kalker|kal|tomorrow|tmrw)\b/.test(lower) ||
    lower.includes('আগামীকাল') ||
    lower.includes('কালকে') ||
    lower.includes('কাল ')
  ) {
    return { day: dateInfo.tomorrowDay, label: `আগামীকাল (${dateInfo.tomorrowDay})` };
  }

  if (
    /\b(ajke|ajker|aj|today)\b/.test(lower) ||
    lower.includes('আজকে') ||
    lower.includes('আজকের') ||
    lower.includes('আজ ')
  ) {
    return { day: dateInfo.todayDay, label: `আজ (${dateInfo.todayDay})` };
  }

  for (const entry of DAY_ALIASES) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return { day: entry.day, label: entry.day };
      }
    }
  }

  return {};
}

// Common South Asian titles and query intent stop words
const PERSON_STOPWORDS = new Set([
  'dr', 'prof', 'professor', 'md', 'mohammad', 'muhammad', 'mst', 'engr', 'engineer',
  'sir', 'madam', 'mam', 'maam', 'miss', 'mister', 'mr', 'mrs', 'lecturer', 'teacher',
  'contact', 'number', 'phone', 'email', 'mobile', 'details', 'info', 'kothay', 'kobe',
  'er', 'ke', 'class', 'routine', 'room', 'batch', 'today', 'ajke', 'kalke', 'tmrw'
]);

// Common shared surnames in Bangladesh: a match on one of these alone without any distinctive given-name
// MUST NEVER identify a specific person (prevents 'Chowdhury' colliding with Al Akram vs Wadia)
const COMMON_SURNAMES = new Set([
  'chowdhury', 'choudhury', 'ahmed', 'ahmad', 'hassan', 'hasan', 'hossain', 'hussain',
  'islam', 'khan', 'sultana', 'akter', 'begum', 'paul', 'das', 'roy', 'ali', 'rahman',
  'alam', 'haque', 'huq', 'sheikh', 'barua', 'dey', 'sharma', 'talukder', 'mazumder', 'mojumdar'
]);

/**
 * Score a person candidate against a user query using multi-factor entity resolution.
 * Prevents greedy matches on common surnames (e.g. 'Chowdhury' matching 'Al Akram Chowdhury'
 * when query was 'Wadia Iqbal Chowdhury').
 */
function scorePersonCandidate(query: string, fullName: string, shortName?: string): number {
  if (!fullName) return 0;
  const qLower = query.toLowerCase();
  const rawName = fullName.toLowerCase();
  // Strip common professional prefix from candidate name for comparison
  const cleanName = rawName.replace(/^(dr\.?|prof\.?|professor|md\.?|mohammad|mst\.?|engr\.?)\s+/i, '').trim();

  // 1. Highest priority: Exact full name appears in query
  if (cleanName.length >= 4 && qLower.includes(cleanName)) {
    return 3000 + cleanName.length * 10;
  }
  if (rawName.length >= 4 && qLower.includes(rawName)) {
    return 3000 + rawName.length * 10;
  }

  // 2. Exact standalone short name / acronym match (e.g., \bWIC\b, \bAAC\b, \bNHN\b)
  if (shortName && shortName.trim().length >= 2) {
    const sLower = shortName.trim().toLowerCase();
    const shortRegex = new RegExp(`(^|[^a-z0-9])${sLower}([^a-z0-9]|$)`, 'i');
    if (shortRegex.test(qLower)) {
      return 2200;
    }
  }

  // 3. Token-level matching with distinctive given-name requirement
  const qTokens = qLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !PERSON_STOPWORDS.has(t));

  const candTokens = cleanName
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !PERSON_STOPWORDS.has(t));

  if (candTokens.length === 0 || qTokens.length === 0) return 0;

  const distinctiveCandTokens = candTokens.filter((t) => !COMMON_SURNAMES.has(t) && t.length >= 3);
  const commonCandTokens = candTokens.filter((t) => COMMON_SURNAMES.has(t));

  let matchedDistinctive = 0;
  let matchedCommon = 0;

  for (const ct of distinctiveCandTokens) {
    if (qTokens.some((qt) => qt === ct || (ct.length >= 5 && qt.includes(ct)))) {
      matchedDistinctive++;
    }
  }

  for (const ct of commonCandTokens) {
    if (qTokens.includes(ct)) {
      matchedCommon++;
    }
  }

  // CRITICAL RULE: If candidate has distinctive name tokens (like 'wadia', 'iqbal', or 'akram'),
  // but NONE of them matched the query, matching a common surname like 'chowdhury' alone gives ZERO points!
  if (distinctiveCandTokens.length > 0 && matchedDistinctive === 0) {
    return 0;
  }

  // If candidate only had common tokens (rare), require all tokens to match
  if (distinctiveCandTokens.length === 0 && matchedCommon < candTokens.length) {
    return 0;
  }

  let score = matchedDistinctive * 600 + matchedCommon * 100;

  // Bonus if all candidate tokens matched
  if (matchedDistinctive + matchedCommon === candTokens.length) {
    score += 800;
  }

  return score;
}

function detectCourseInText(text: string, allCourses: any[]): any | undefined {
  const lower = text.toLowerCase();
  const qNorm = lower.replace(/[^a-z0-9]/g, '');

  let bestScore = 0;
  let bestCourse: any = undefined;

  for (const c of allCourses) {
    const code = String(c.code || '').trim();
    const codeNorm = code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const digits = code.replace(/\D/g, '');
    const titleLower = String(c.title || '').toLowerCase().trim();
    const shortLower = String(c.shortName || '').toLowerCase().trim();

    let score = 0;

    // Exact course code in query (e.g. SWE-211 or SWE 211)
    if (codeNorm && qNorm.includes(codeNorm)) {
      score = 3000;
    } else if (digits.length >= 3 && new RegExp(`\\b${digits}\\b`).test(lower)) {
      score = 2500;
    } else if (titleLower.length >= 5 && lower.includes(titleLower)) {
      score = 2000 + titleLower.length * 5;
    } else if (shortLower.length >= 2 && new RegExp(`(^|[^a-z0-9])${shortLower}([^a-z0-9]|$)`, 'i').test(lower)) {
      score = 1500;
    } else {
      const titleWords = titleLower.split(/\s+/).filter((w) => w.length >= 4);
      const matchedWords = titleWords.filter((w) => lower.includes(w));
      if (matchedWords.length >= 2 && matchedWords.length === titleWords.length) {
        score = 1200;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCourse = c;
    }
  }

  return bestScore >= 1200 ? bestCourse : undefined;
}

function detectFacultyInText(text: string, allFaculty: any[]): any | undefined {
  let bestScore = 0;
  let bestCandidate: any = undefined;

  for (const f of allFaculty) {
    const score = scorePersonCandidate(text, String(f.name || ''), String(f.shortName || ''));
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = f;
    }
  }

  // Minimum threshold: Must score at least 500 (meaning at least 1 distinctive token or shortName/fullName matched)
  return bestScore >= 500 ? bestCandidate : undefined;
}

function detectUserInText(text: string, allUsers: any[]): any | undefined {
  let bestScore = 0;
  let bestCandidate: any = undefined;

  for (const u of allUsers) {
    const score = scorePersonCandidate(text, String(u.name || ''), undefined);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = u;
    }
  }

  return bestScore >= 500 ? bestCandidate : undefined;
}

function detectBatchInText(text: string, allBatches: any[]): any | undefined {
  const lower = text.toLowerCase();
  for (const b of allBatches) {
    const bName = String(b.name || '').toLowerCase();
    const digitsMatch = bName.match(/\d+/);
    if (digitsMatch) {
      const num = digitsMatch[0];
      if (
        new RegExp(`\\b${num}(th|st|nd|rd)?\\s*batch\\b`).test(lower) ||
        new RegExp(`\\b${num}\\s*batch\\b`).test(lower) ||
        new RegExp(`\\bbatch\\s*${num}\\b`).test(lower) ||
        new RegExp(`\\b${num}batch\\b`).test(lower) ||
        new RegExp(`\\b${num}(th|st|nd|rd)\\b`).test(lower) ||
        new RegExp(`\\b${num}\\s*তম\\b`).test(lower)
      ) {
        return b;
      }
    }
  }
  return undefined;
}

function detectRoomInText(text: string, allRoutines: any[]): string | undefined {
  const lower = text.toLowerCase();
  const extenMatch = lower.match(/\bexten[-\s]*(\d+)\b/);
  if (extenMatch) return `Exten-${extenMatch[1]}`;

  const roomMatch = lower.match(/\broom[-\s]*(\d{3})\b/) || lower.match(/\b(\d{3})\s*room\b/);
  if (roomMatch) return roomMatch[1];

  for (const r of allRoutines) {
    const rm = String(r.room || '').trim();
    if (rm && rm.length >= 3 && lower.includes(rm.toLowerCase())) {
      return rm;
    }
  }
  return undefined;
}

function isLabRoutineSlot(slot: any, allCourses: any[]): boolean {
  const titleLower = String(slot.courseTitle || '').toLowerCase();
  const roomLower = String(slot.room || '').toLowerCase();
  if (titleLower.includes('lab') || roomLower.includes('lab')) return true;

  const matchedCourse = allCourses.find(
    (c) => String(c.code || '').toLowerCase() === String(slot.courseCode || '').toLowerCase()
  );
  return matchedCourse?.type === 'LAB';
}

function enrichSlotWithTeacher(slot: any, allCourses: any[], allFaculty: any[]): string {
  if (slot.teacherName && slot.teacherName !== 'TBA') return slot.teacherName;
  const matchedCourse = allCourses.find(
    (c) => String(c.code || '').toLowerCase() === String(slot.courseCode || '').toLowerCase()
  );
  if ((matchedCourse as any)?.teacherName) return (matchedCourse as any).teacherName;
  if (matchedCourse?.assignedFacultyName) return matchedCourse.assignedFacultyName;
  if (slot.teacherShortName) {
    const fac = allFaculty.find(
      (f) => String(f.shortName || '').toLowerCase() === String(slot.teacherShortName).toLowerCase()
    );
    if (fac) return fac.name;
    return slot.teacherShortName;
  }
  return 'Faculty Assigned by Dept';
}

function findRecentFollowUpTarget(
  history: ChatTurn[],
  allCourses: any[],
  allFaculty: any[],
  allBatches: any[]
): { recentCourse?: any; recentFaculty?: any; recentBatch?: any } {
  const recentTurns = history.slice(-3).reverse();
  let recentCourse: any;
  let recentFaculty: any;
  let recentBatch: any;

  for (const turn of recentTurns) {
    if (!recentCourse) recentCourse = detectCourseInText(turn.content, allCourses);
    if (!recentFaculty) recentFaculty = detectFacultyInText(turn.content, allFaculty);
    if (!recentBatch) recentBatch = detectBatchInText(turn.content, allBatches);
  }
  return { recentCourse, recentFaculty, recentBatch };
}

/**
 * Full-Database Context-Aware Smart Academic NLU Engine
 * - Personalized queries default to the student's batch
 * - Other batch / cross-batch / room / teacher / CR / global queries use the entire database
 * - Specific text replies without redundant course codes (Course Title only)
 */
function runSmartAcademicNLU(
  query: string,
  history: ChatTurn[],
  ctx: {
    userName: string;
    userRole: string;
    userBatchId: string;
    activeBatchId: string;
    batchName: string;
    semester: number;
    isGlobalOrAllBatches: boolean;
    dateInfo: {
      todayStr: string;
      todayDay: string;
      tomorrowDay: string;
      dayAfterTomorrowDay: string;
    };
    allBatches: any[];
    allCourses: any[];
    semesterCourses: any[];
    batchRoutines: any[];
    allRoutines: any[];
    batchExams: any[];
    allExams: any[];
    batchAnnouncements: any[];
    allAnnouncements: any[];
    notices: any[];
    faculty: any[];
    resources: any[];
    users: any[];
  }
): {
  reply: string;
  rows?: InfoRow[];
  actionLinks: ActionLink[];
  suggestions: string[];
  confidentMatch: boolean;
} {
  const q = query.toLowerCase().trim();
  const isBn =
    /[ঀ-৿]/.test(q) ||
    /\b(koto|kobe|koytay|koyta|ke|ki|ache|nai|ajke|kalke|kal|poroshu|kon|kothay|sir|madam|bar|din|amar|sob)\b/.test(q);

  const dayMatch = detectTargetDay(query, ctx.dateInfo);
  const explicitCourse = detectCourseInText(query, ctx.allCourses);
  const explicitFaculty = detectFacultyInText(query, ctx.faculty);
  const explicitUser = detectUserInText(query, ctx.users);
  const explicitRoom = detectRoomInText(query, ctx.allRoutines);

  const asksLabOnly = /\b(lab|labs)\b/.test(q) || q.includes('ল্যাব');
  const asksTheoryOnly = /\b(theory)\b/.test(q) || q.includes('থিওরি');

  const asksTeacher =
    /\b(teacher|faculty|instructor)\b/.test(q) ||
    q.includes('ke ney') ||
    q.includes('ke nen') ||
    q.includes('কে নেয়') ||
    q.includes('কে নেন') ||
    q.includes('শিক্ষক') ||
    (/\b(sir|madam|mam|maam)\b/.test(q) &&
      (/\b(ke|who|list|all|directory|kothay|phone|email|contact|office)\b/.test(q) || q.includes('কে') || q.includes('তালিকা')));

  const asksTimeOnly =
    /\b(time|koytay|kokhon|when)\b/.test(q) ||
    q.includes('কয়টায়') ||
    q.includes('কখন') ||
    q.includes('সময়');

  const asksRoomOnly =
    /\b(room|kothay|venue)\b/.test(q) ||
    q.includes('রুম') ||
    q.includes('কোথায়');

  const asksTimeOrRoom =
    asksTimeOnly ||
    asksRoomOnly ||
    /\b(schedule|routine|class)\b/.test(q) ||
    q.includes('ক্লাস') ||
    q.includes('রুটিন');

  const asksCredit = q.includes('credit') || q.includes('ক্রেডিট');
  const asksContact =
    /\b(email|phone|number|mobile|contact)\b/.test(q) ||
    q.includes('ইমেইল') ||
    q.includes('নাম্বার');

  const asksCR =
    /\b(cr|class representative|representative)\b/.test(q) ||
    q.includes('সিআর');

  const asksAllBatchesInfo =
    ctx.isGlobalOrAllBatches ||
    /\b(all batch|all batches|sob batch|koyta batch|total batch|batches)\b/.test(q) ||
    q.includes('সব ব্যাচ') ||
    q.includes('কয়টা ব্যাচ');

  // ============================================================================
  // 0A. CR (CLASS REPRESENTATIVE) / STUDENT DIRECTORY QUERIES (Full DB Access)
  // ============================================================================
  if (asksCR) {
    const crs = ctx.users.filter((u) => String(u.role || '').toUpperCase() === 'CR');
    const batchCandidateIds = getBatchCandidateIds(ctx.activeBatchId);
    const targetCRs = asksAllBatchesInfo
      ? crs
      : crs.filter((u) => u.batchId && batchCandidateIds.includes(u.batchId));

    const listToUse = targetCRs.length > 0 ? targetCRs : crs;
    if (listToUse.length > 0) {
      const names = listToUse.map((c) => `**${c.name}** (${c.batchName || formatBatchLabel(c.batchId, ctx.allBatches)})`).join(', ');
      return {
        reply: isBn
          ? targetCRs.length > 0 && !asksAllBatchesInfo
            ? `**${ctx.batchName}**-এর Class Representative (CR): ${names}।`
            : `সকল ব্যাচের Class Representative (CR) তালিকা:`
          : targetCRs.length > 0 && !asksAllBatchesInfo
          ? `Class Representative (CR) for **${ctx.batchName}**: ${names}.`
          : `Here are the Class Representatives (CRs) across batches:`,
        rows: listToUse.slice(0, 8).map((c) => ({
          tag: c.batchName || formatBatchLabel(c.batchId, ctx.allBatches),
          tagTone: 'emerald',
          primary: c.name,
          secondary: `ID: ${c.studentId || 'N/A'}${c.phone ? `  •  📞 ${c.phone}` : ''}`,
          meta: c.email ? [`✉️ ${c.email}`] : undefined,
        })),
        actionLinks: [{ label: 'Dashboard', path: '/dashboard' }],
        suggestions: ["Today's routine", 'All batches info', 'Faculty list'],
        confidentMatch: true,
      };
    }
  }

  // ============================================================================
  // 0D. KNOWLEDGE BASE & UNIVERSITY POLICIES (Fees, Bank, Waivers, Grading, etc.)
  // ============================================================================
  const isKnowledgeQuery =
    /\b(fee|fees|taka|cost|tuition|admission|bank|account|deposit|waiver|scholarship|grading|gpa|cgpa|grade|grades|point|scale|forum|club|makeup|incomplete|internship|degree|credits|refund|cancel|nrbc)\b/.test(q) ||
    q.includes('ফি') ||
    q.includes('টাকা') ||
    q.includes('ব্যাংক') ||
    q.includes('অ্যাকাউন্ট') ||
    q.includes('জমা') ||
    q.includes('ওয়েভার') ||
    q.includes('ওয়েভার') ||
    q.includes('স্কলারশিপ') ||
    q.includes('গ্রেড') ||
    q.includes('পয়েন্ট') ||
    q.includes('জিপিএ') ||
    q.includes('সিজিপিএ') ||
    q.includes('ফোরাম');

  const kbMatches = searchAcademicKnowledge(query, 2);
  const bestKb = kbMatches[0];

  const asksRoutineExplicitly =
    /\b(routine|class|classes|lab|theory)\b/.test(q) ||
    q.includes('রুটিন') ||
    q.includes('ক্লাস');

  if (bestKb && (!asksRoutineExplicitly || isKnowledgeQuery)) {
    return {
      reply: isBn
        ? `**${bestKb.title}** সম্পর্কে তথ্য:\n${bestKb.summary}`
        : `Policy regarding **${bestKb.title}**:\n${bestKb.summary}`,
      rows: [
        {
          tag: bestKb.category.replace(/_/g, ' '),
          tagTone: 'purple',
          primary: bestKb.title,
          secondary: bestKb.details.split('\n')[0],
          meta: [bestKb.actionLabel ? `🔗 ${bestKb.actionLabel}` : 'Verified Academic Policy'],
        },
      ],
      actionLinks: [
        {
          label: bestKb.actionLabel || 'University Policies',
          path: bestKb.actionPath || '/faq',
        },
        { label: 'Dashboard', path: '/dashboard' },
      ],
      suggestions: [
        'Tuition fee breakdown',
        'Bank account details',
        'Grading scale',
        'Scholarship waiver policy',
      ],
      confidentMatch: true,
    };
  }

  // Helper to deduplicate cross-batch routine slots when aliased batch IDs exist
  const dedupeCrossBatchSlots = (slots: any[]) => {
    const seen = new Set<string>();
    return slots.filter((s) => {
      const key = `${formatBatchLabel(s.batchId, ctx.allBatches)}|${s.day}|${s.startTime}|${cleanCourseName(s.courseTitle)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // ============================================================================
  // 0B. ROOM-BASED CROSS-BATCH QUERY (e.g. "Room 301 e ki class?", "403 room")
  // ============================================================================
  if (explicitRoom && (q.includes('class') || q.includes('ক্লাস') || q.includes('batch') || q.includes('routine') || dayMatch.day)) {
    const targetDay = dayMatch.day || ctx.dateInfo.todayDay;
    const roomSlots = dedupeCrossBatchSlots(
      ctx.allRoutines.filter((r) => {
        const matchRm = String(r.room || '').toLowerCase().includes(explicitRoom.toLowerCase());
        return dayMatch.day ? matchRm && r.day === targetDay : matchRm;
      })
    );

    if (roomSlots.length > 0) {
      return {
        reply: isBn
          ? `**Room ${explicitRoom}**-এ ${dayMatch.day ? `**${dayMatch.label}**` : 'সপ্তাহে'} মোট **${roomSlots.length}টি ক্লাস** রয়েছে:`
          : `Found **${roomSlots.length} class(es)** in **${explicitRoom}**${dayMatch.day ? ` on **${dayMatch.label}**` : ''}:`,
        rows: roomSlots.slice(0, 8).map((s) => {
          const bLabel = formatBatchLabel(s.batchId, ctx.allBatches);
          const teacher = enrichSlotWithTeacher(s, ctx.allCourses, ctx.faculty);
          return {
            tag: `${bLabel} • ${s.day}`,
            tagTone: isLabRoutineSlot(s, ctx.allCourses) ? 'purple' : 'blue',
            primary: cleanCourseName(s.courseTitle),
            secondary: `⏰ ${s.startTime} – ${s.endTime}  •  👨‍🏫 ${teacher}`,
          };
        }),
        actionLinks: [{ label: 'Open Routine', path: '/routine' }],
        suggestions: ["Today's routine", 'All batches info', 'Lab class schedule'],
        confidentMatch: true,
      };
    }
  }

  // ============================================================================
  // 0C. FACULTY SCHEDULE ACROSS ALL BATCHES (e.g. "Al Akram sir kon batch er class nen?")
  // ============================================================================
  if (explicitFaculty && (q.includes('class') || q.includes('ক্লাস') || q.includes('routine') || q.includes('batch') || dayMatch.day)) {
    const facNameLower = String(explicitFaculty.name || '').toLowerCase();
    const facShortLower = String(explicitFaculty.shortName || '').toLowerCase();
    let facSlots = dedupeCrossBatchSlots(
      ctx.allRoutines.filter((s) => {
        const tName = enrichSlotWithTeacher(s, ctx.allCourses, ctx.faculty).toLowerCase();
        const sShort = String(s.teacherShortName || '').toLowerCase();
        return tName === facNameLower || tName.includes(facNameLower) || (facShortLower && sShort === facShortLower);
      })
    );

    if (dayMatch.day) {
      facSlots = facSlots.filter((s) => s.day === dayMatch.day);
    }

    if (facSlots.length > 0) {
      const batchesTaught = Array.from(new Set(facSlots.map((s) => formatBatchLabel(s.batchId, ctx.allBatches)))).join(', ');
      return {
        reply: isBn
          ? `**${explicitFaculty.name}** ${dayMatch.day ? `**${dayMatch.label}**-এ` : `সপ্তাহে **${batchesTaught}**-এ`} মোট **${facSlots.length}টি ক্লাস** নেন:`
          : `**${explicitFaculty.name}** conducts **${facSlots.length} class(es)** ${dayMatch.day ? `on **${dayMatch.label}**` : `across **${batchesTaught}**`}:`,
        rows: facSlots.slice(0, 8).map((s) => ({
          tag: `${formatBatchLabel(s.batchId, ctx.allBatches)} • ${s.day}`,
          tagTone: isLabRoutineSlot(s, ctx.allCourses) ? 'purple' : 'blue',
          primary: cleanCourseName(s.courseTitle),
          secondary: `⏰ ${s.startTime} – ${s.endTime}  •  🏛️ ${s.room}`,
        })),
        actionLinks: [{ label: 'Faculty Directory', path: '/faculty' }],
        suggestions: [`${explicitFaculty.name} contact`, "Today's routine", 'All faculty'],
        confidentMatch: true,
      };
    }
  }

  // ============================================================================
  // 0D. ALL BATCHES OVERVIEW QUERY (e.g. "sob batch er info", "all batches")
  // ============================================================================
  if (asksAllBatchesInfo && !dayMatch.day && !asksLabOnly && !q.includes('exam')) {
    return {
      reply: isBn
        ? `**SWE Department**-এ বর্তমানে মোট **${ctx.allBatches.length}টি ব্যাচ** সচল রয়েছে:`
        : `There are **${ctx.allBatches.length} active batches** in the **Department of Software Engineering**:`,
      rows: ctx.allBatches.map((b) => {
        const bIds = getBatchCandidateIds(b.id);
        const slotCount = ctx.allRoutines.filter((r) => bIds.includes(r.batchId)).length;
        return {
          tag: `Semester ${b.currentSemester || 1}`,
          tagTone: b.id === ctx.userBatchId ? 'emerald' : 'blue',
          primary: b.name,
          secondary: `${slotCount} weekly classes scheduled${b.id === ctx.userBatchId ? ' • Your Batch' : ''}`,
        };
      }),
      actionLinks: [{ label: 'Routine Page', path: '/routine' }],
      suggestions: ["Today's routine", '10th batch routine', 'Upcoming exams'],
      confidentMatch: true,
    };
  }

  // ============================================================================
  // 1. DAY-SPECIFIC OR LAB/ROUTINE QUERIES (Personalized or Target Batch or All Batches)
  // ============================================================================
  if (
    dayMatch.day ||
    asksLabOnly ||
    q.includes('routine') ||
    q.includes('schedule') ||
    q.includes('রুটিন') ||
    (!explicitCourse && !explicitFaculty && (q.includes('class') || q.includes('ক্লাস')))
  ) {
    // If asking about all batches on a specific day:
    if (asksAllBatchesInfo && dayMatch.day) {
      const targetDay = dayMatch.day;
      const dayLabel = dayMatch.label || targetDay;
      let allDaySlots = ctx.allRoutines.filter((r) => r.day === targetDay);
      if (asksLabOnly) allDaySlots = allDaySlots.filter((s) => isLabRoutineSlot(s, ctx.allCourses));

      if (allDaySlots.length > 0) {
        return {
          reply: isBn
            ? `**${dayLabel}** সকল ব্যাচ মিলিয়ে মোট **${allDaySlots.length}টি ক্লাস** রয়েছে:`
            : `Across all batches on **${dayLabel}**, **${allDaySlots.length} class(es)** are scheduled:`,
          rows: allDaySlots.slice(0, 10).map((s) => {
            const teacher = enrichSlotWithTeacher(s, ctx.allCourses, ctx.faculty);
            const bLabel = formatBatchLabel(s.batchId, ctx.allBatches);
            return {
              tag: `${bLabel} • ${s.startTime}`,
              tagTone: isLabRoutineSlot(s, ctx.allCourses) ? 'purple' : 'blue',
              primary: cleanCourseName(s.courseTitle),
              secondary: `👨‍🏫 ${teacher}  •  🏛️ ${s.room}`,
            };
          }),
          actionLinks: [{ label: 'Open Routine', path: '/routine' }],
          suggestions: ["My batch routine today", 'Lab class schedule', 'Upcoming exams'],
          confidentMatch: true,
        };
      }
    }

    // Subcase 1A: Specific day for Target Batch (User's own batch by default, or mentioned batch like 10th batch)
    if (dayMatch.day) {
      const targetDay = dayMatch.day;
      const dayLabel = dayMatch.label || targetDay;
      let slots = ctx.batchRoutines.filter((r) => r.day === targetDay);

      if (asksLabOnly) {
        slots = slots.filter((s) => isLabRoutineSlot(s, ctx.allCourses));
      } else if (asksTheoryOnly) {
        slots = slots.filter((s) => !isLabRoutineSlot(s, ctx.allCourses));
      }

      if (slots.length > 0) {
        const enriched = slots.map((s) => ({
          ...s,
          cleanTitle: cleanCourseName(s.courseTitle),
          teacher: enrichSlotWithTeacher(s, ctx.allCourses, ctx.faculty),
          isLab: isLabRoutineSlot(s, ctx.allCourses),
        }));

        // Build SPECIFIC text response tailored to what the student asked (NO course codes!)
        let specificReplyBn = '';
        let specificReplyEn = '';

        if (asksTeacher) {
          if (enriched.length === 1) {
            specificReplyBn = `**${dayLabel}** **${ctx.batchName}**-এর *${enriched[0].cleanTitle}* ক্লাস নিচ্ছেন **${enriched[0].teacher}** (${enriched[0].startTime}, ${enriched[0].room})।`;
            specificReplyEn = `On **${dayLabel}**, **${enriched[0].teacher}** takes *${enriched[0].cleanTitle}* for **${ctx.batchName}** (${enriched[0].startTime}, ${enriched[0].room}).`;
          } else {
            const listBn = enriched.map((e) => `**${e.teacher}** (*${e.cleanTitle}*)`).join(' এবং ');
            const listEn = enriched.map((e) => `**${e.teacher}** (*${e.cleanTitle}*)`).join(' and ');
            specificReplyBn = `**${dayLabel}** **${ctx.batchName}**-এর ক্লাস নিচ্ছেন: ${listBn}।`;
            specificReplyEn = `On **${dayLabel}**, **${ctx.batchName}** classes are conducted by: ${listEn}.`;
          }
        } else if (asksRoomOnly && !asksTimeOnly) {
          if (enriched.length === 1) {
            specificReplyBn = `**${dayLabel}** **${ctx.batchName}**-এর *${enriched[0].cleanTitle}* ক্লাস হবে **${enriched[0].room}**-এ (${enriched[0].startTime})।`;
            specificReplyEn = `On **${dayLabel}**, *${enriched[0].cleanTitle}* for **${ctx.batchName}** is in **${enriched[0].room}** (${enriched[0].startTime}).`;
          } else {
            const listBn = enriched.map((e) => `*${e.cleanTitle}* (**${e.room}**)`).join(', ');
            specificReplyBn = `**${dayLabel}** **${ctx.batchName}**-এর রুমসমূহ: ${listBn}।`;
            specificReplyEn = `On **${dayLabel}**, **${ctx.batchName}** rooms: ${listBn}.`;
          }
        } else if (asksTimeOnly) {
          if (enriched.length === 1) {
            specificReplyBn = `**${dayLabel}** **${ctx.batchName}**-এর *${enriched[0].cleanTitle}* ক্লাস **${enriched[0].startTime} – ${enriched[0].endTime}** পর্যন্ত (${enriched[0].room})।`;
            specificReplyEn = `On **${dayLabel}**, *${enriched[0].cleanTitle}* for **${ctx.batchName}** is at **${enriched[0].startTime} – ${enriched[0].endTime}** (${enriched[0].room}).`;
          } else {
            const listBn = enriched.map((e) => `*${e.cleanTitle}* (**${e.startTime} – ${e.endTime}**)`).join(', ');
            specificReplyBn = `**${dayLabel}** **${ctx.batchName}**-এর ক্লাসের সময়: ${listBn}।`;
            specificReplyEn = `On **${dayLabel}**, **${ctx.batchName}** class times: ${listBn}.`;
          }
        } else {
          const typeWordBn = asksLabOnly ? 'ল্যাব ক্লাস' : asksTheoryOnly ? 'থিওরি ক্লাস' : 'ক্লাস';
          const typeWordEn = asksLabOnly ? 'lab class' : asksTheoryOnly ? 'theory class' : 'class';
          if (enriched.length === 1) {
            specificReplyBn = `**${dayLabel}** **${ctx.batchName}**-এর ১টি ${typeWordBn} — *${enriched[0].cleanTitle}* (**${enriched[0].startTime} – ${enriched[0].endTime}**, ${enriched[0].room})।`;
            specificReplyEn = `On **${dayLabel}**, **${ctx.batchName}** has 1 ${typeWordEn} — *${enriched[0].cleanTitle}* (**${enriched[0].startTime} – ${enriched[0].endTime}**, ${enriched[0].room}).`;
          } else {
            const names = enriched.map((e) => `*${e.cleanTitle}*`).join(' এবং ');
            specificReplyBn = `**${dayLabel}** **${ctx.batchName}**-এর **${enriched.length}টি ${typeWordBn}** রয়েছে: ${names}।`;
            specificReplyEn = `On **${dayLabel}**, **${ctx.batchName}** has **${enriched.length} ${typeWordEn}(es)**: ${names}.`;
          }
        }

        return {
          reply: isBn ? specificReplyBn : specificReplyEn,
          rows: enriched.map((e) => ({
            tag: `⏰ ${e.startTime} – ${e.endTime}`,
            tagTone: e.isLab ? 'purple' : 'blue',
            primary: e.cleanTitle,
            secondary: `👨‍🏫 ${e.teacher}  •  🏛️ ${e.room}`,
          })),
          actionLinks: [{ label: 'Open Routine', path: '/routine' }],
          suggestions: [
            asksLabOnly ? `All classes on ${targetDay}` : 'All lab classes',
            'Full week routine',
            'Upcoming exams',
          ],
          confidentMatch: true,
        };
      }

      // If no matching classes on that day
      const allDaySlots = ctx.batchRoutines.filter((r) => r.day === targetDay);
      if (asksLabOnly && allDaySlots.length > 0) {
        const allLabs = ctx.batchRoutines.filter((s) => isLabRoutineSlot(s, ctx.allCourses));
        return {
          reply: isBn
            ? `**${dayLabel}** **${ctx.batchName}**-এর কোনো ল্যাব ক্লাস নেই (${allDaySlots.length}টি থিওরি ক্লাস আছে)। সপ্তাহের ল্যাব ক্লাসগুলো:`
            : `No lab classes on **${dayLabel}** for **${ctx.batchName}** (${allDaySlots.length} theory class(es) scheduled). Weekly labs:`,
          rows: allLabs.map((s) => ({
            tag: `${s.day} • ${s.startTime} – ${s.endTime}`,
            tagTone: 'purple',
            primary: cleanCourseName(s.courseTitle),
            secondary: `👨‍🏫 ${enrichSlotWithTeacher(s, ctx.allCourses, ctx.faculty)}  •  🏛️ ${s.room}`,
          })),
          actionLinks: [{ label: 'Open Routine', path: '/routine' }],
          suggestions: [`Show classes on ${targetDay}`, 'Full week routine', 'My courses'],
          confidentMatch: true,
        };
      }

      return {
        reply: isBn
          ? `**${dayLabel}** **${ctx.batchName}**-এর কোনো ক্লাস নেই।`
          : `No classes are scheduled on **${dayLabel}** for **${ctx.batchName}**.`,
        actionLinks: [{ label: 'View Routine', path: '/routine' }],
        suggestions: ['Full week routine', 'All lab classes', 'Upcoming exams'],
        confidentMatch: true,
      };
    }

    // Subcase 1B: Lab classes in general ("lab class kobe?", "koyta lab ache?")
    if (asksLabOnly) {
      const labSlots = ctx.batchRoutines.filter((s) => isLabRoutineSlot(s, ctx.allCourses));
      const names = labSlots.map((s) => `*${cleanCourseName(s.courseTitle)}* (${s.day})`).join(', ');
      return {
        reply: isBn
          ? `**${ctx.batchName}**-এ সপ্তাহে **${labSlots.length}টি ল্যাব ক্লাস** রয়েছে: ${names}।`
          : `**${ctx.batchName}** has **${labSlots.length} lab class(es)** per week: ${names}.`,
        rows: labSlots.map((s) => ({
          tag: `${s.day} • ${s.startTime} – ${s.endTime}`,
          tagTone: 'purple',
          primary: cleanCourseName(s.courseTitle),
          secondary: `👨‍🏫 ${enrichSlotWithTeacher(s, ctx.allCourses, ctx.faculty)}  •  🏛️ ${s.room}`,
        })),
        actionLinks: [{ label: 'Open Routine', path: '/routine' }],
        suggestions: ["Today's routine", "Tomorrow's routine", 'My courses'],
        confidentMatch: true,
      };
    }

    // Subcase 1C: General routine query without a specific day -> Weekly overview (Course Titles only, NO course codes)
    const todaySlots = ctx.batchRoutines.filter((r) => r.day === ctx.dateInfo.todayDay);
    const weekRows: InfoRow[] = [];
    for (const d of WORKING_DAYS) {
      const dSlots = ctx.batchRoutines.filter((r) => r.day === d);
      if (dSlots.length > 0) {
        weekRows.push({
          tag: d === ctx.dateInfo.todayDay ? `${d} (TODAY)` : d,
          tagTone: d === ctx.dateInfo.todayDay ? 'emerald' : 'blue',
          primary: dSlots.map((s) => cleanCourseName(s.courseTitle)).join('  •  '),
          secondary: dSlots
            .map((s) => `⏰ ${s.startTime} (${s.room}, ${enrichSlotWithTeacher(s, ctx.allCourses, ctx.faculty)})`)
            .join(' | '),
        });
      }
    }

    return {
      reply: isBn
        ? `আজ **${ctx.dateInfo.todayDay}** **${ctx.batchName}**-এর **${todaySlots.length}টি ক্লাস** রয়েছে। পুরো সপ্তাহের রুটিন:`
        : `**${ctx.batchName}** has **${todaySlots.length} class(es)** today (**${ctx.dateInfo.todayDay}**). Weekly routine:`,
      rows: weekRows,
      actionLinks: [{ label: 'Open Routine Grid', path: '/routine' }],
      suggestions: ["Tomorrow's class", 'Lab class schedule', 'Upcoming exams'],
      confidentMatch: true,
    };
  }

  // ============================================================================
  // 2. SPECIFIC COURSE QUERY OR FOLLOW-UP (Searches Active Batch FIRST, then Full DB)
  // ============================================================================
  const { recentCourse, recentFaculty } = findRecentFollowUpTarget(
    history,
    ctx.allCourses,
    ctx.faculty,
    ctx.allBatches
  );
  const targetCourse =
    explicitCourse ||
    (!explicitFaculty && !asksContact && (asksTeacher || asksCredit || asksTimeOrRoom) ? recentCourse : undefined);

  if (targetCourse) {
    const cleanTitle = cleanCourseName(targetCourse.title);
    // Search in active batch first; if not found, search across ALL batches in database!
    let slots = ctx.batchRoutines.filter(
      (r) => String(r.courseCode || '').toLowerCase() === String(targetCourse.code || '').toLowerCase()
    );
    let isCrossBatchCourse = false;
    if (slots.length === 0) {
      slots = ctx.allRoutines.filter(
        (r) => String(r.courseCode || '').toLowerCase() === String(targetCourse.code || '').toLowerCase()
      );
      isCrossBatchCourse = slots.length > 0;
    }

    const teacherName =
      targetCourse.assignedFacultyName ||
      targetCourse.teacherName ||
      (slots[0] ? enrichSlotWithTeacher(slots[0], ctx.allCourses, ctx.faculty) : 'Faculty Assigned by Dept');

    const batchTag = isCrossBatchCourse && slots[0] ? formatBatchLabel(slots[0].batchId, ctx.allBatches) : ctx.batchName;

    if (asksTeacher) {
      return {
        reply: isBn
          ? `*${cleanTitle}* কোর্সের শিক্ষক হলেন **${teacherName}** (${batchTag})।`
          : `The instructor for *${cleanTitle}* is **${teacherName}** (${batchTag}).`,
        rows: [
          {
            tag: batchTag,
            tagTone: 'blue',
            primary: teacherName,
            secondary: `Instructor • ${cleanTitle}`,
          },
        ],
        actionLinks: [{ label: 'Course Details', path: `/courses/${targetCourse.id}` }],
        suggestions: [`When is ${cleanTitle} class?`, 'My courses', 'Faculty list'],
        confidentMatch: true,
      };
    }

    if (asksCredit) {
      return {
        reply: isBn
          ? `*${cleanTitle}* একটি **${targetCourse.credits} ক্রেডিটের** ${targetCourse.type} কোর্স।`
          : `*${cleanTitle}* is a **${targetCourse.credits}-credit** ${targetCourse.type} course.`,
        actionLinks: [{ label: 'Course Details', path: `/courses/${targetCourse.id}` }],
        suggestions: [`When is ${cleanTitle} class?`, 'My courses'],
        confidentMatch: true,
      };
    }

    return {
      reply: isBn
        ? `*${cleanTitle}* (${batchTag})-এর শিক্ষক **${teacherName}** এবং ক্লাসের সময়সূচি:`
        : `Details and schedule for *${cleanTitle}* (${batchTag}) with **${teacherName}**:`,
      rows: [
        {
          tag: `${targetCourse.credits} Cr • ${targetCourse.type}`,
          tagTone: targetCourse.type === 'LAB' ? 'purple' : 'blue',
          primary: cleanTitle,
          secondary: `👨‍🏫 ${teacherName}  •  🎓 ${batchTag}`,
          meta:
            slots.length > 0
              ? slots.map((s) => `📅 ${s.day}: ${s.startTime}–${s.endTime} (${s.room})`)
              : ['No routine slot assigned'],
        },
      ],
      actionLinks: [{ label: 'Course Page', path: `/courses/${targetCourse.id}` }],
      suggestions: ["Tomorrow's class", 'Lab class schedule', 'My courses'],
      confidentMatch: true,
    };
  }

  // ============================================================================
  // 3. SPECIFIC FACULTY, CR / STUDENT CONTACT, OR FACULTY DIRECTORY
  // ============================================================================
  const targetFaculty = explicitFaculty || (asksContact ? recentFaculty : undefined);
  if (targetFaculty) {
    // Also find which courses/batches this faculty teaches across the whole DB
    const facNameLower = String(targetFaculty.name || '').toLowerCase();
    const taughtSlots = ctx.allRoutines.filter((s) =>
      enrichSlotWithTeacher(s, ctx.allCourses, ctx.faculty).toLowerCase().includes(facNameLower)
    );
    const uniqueCourses = Array.from(new Set(taughtSlots.map((s) => cleanCourseName(s.courseTitle))));

    return {
      reply: isBn
        ? `**${targetFaculty.name}** (${targetFaculty.designation})${targetFaculty.email ? ` — ইমেইল: **${targetFaculty.email}**` : ''}${targetFaculty.phone ? `, ফোন: **${targetFaculty.phone}**` : ''}।`
        : `**${targetFaculty.name}** (${targetFaculty.designation})${targetFaculty.email ? ` — Email: **${targetFaculty.email}**` : ''}${targetFaculty.phone ? `, Phone: **${targetFaculty.phone}**` : ''}.`,
      rows: [
        {
          tag: targetFaculty.designation || 'Faculty',
          tagTone: 'blue',
          primary: targetFaculty.name,
          secondary:
            uniqueCourses.length > 0
              ? `Teaches: ${uniqueCourses.slice(0, 3).join(', ')}`
              : targetFaculty.department || 'Software Engineering',
          meta: [
            ...(targetFaculty.email ? [`✉️ ${targetFaculty.email}`] : []),
            ...(targetFaculty.phone ? [`📞 ${targetFaculty.phone}`] : []),
          ],
        },
      ],
      actionLinks: [{ label: 'Faculty Directory', path: '/faculty' }],
      suggestions: [`${targetFaculty.name} classes`, 'All faculty members', "Today's routine"],
      confidentMatch: true,
    };
  }

  // 3B. Specific Student or CR Contact Query (e.g., student name / CR name search)
  if (explicitUser && (asksContact || asksCR || q.includes('student') || q.includes('কে') || q.includes('contact'))) {
    const isCR = String(explicitUser.role || '').toUpperCase() === 'CR';
    const batchLabel = explicitUser.batchName || formatBatchLabel(explicitUser.batchId, ctx.allBatches);
    return {
      reply: isBn
        ? `**${explicitUser.name}** (${isCR ? `Class Representative (CR) • ${batchLabel}` : `Student • ${batchLabel}`})${explicitUser.email ? ` — ইমেইল: **${explicitUser.email}**` : ''}${explicitUser.phone ? `, ফোন: **${explicitUser.phone}**` : ''}।`
        : `**${explicitUser.name}** (${isCR ? `Class Representative (CR) • ${batchLabel}` : `Student • ${batchLabel}`})${explicitUser.email ? ` — Email: **${explicitUser.email}**` : ''}${explicitUser.phone ? `, Phone: **${explicitUser.phone}**` : ''}.`,
      rows: [
        {
          tag: isCR ? 'CR' : 'Student',
          tagTone: isCR ? 'emerald' : 'blue',
          primary: explicitUser.name,
          secondary: `${batchLabel} • ID: ${explicitUser.studentId || 'N/A'}`,
          meta: [
            ...(explicitUser.email ? [`✉️ ${explicitUser.email}`] : []),
            ...(explicitUser.phone ? [`📞 ${explicitUser.phone}`] : []),
          ],
        },
      ],
      actionLinks: [{ label: 'Dashboard', path: '/dashboard' }],
      suggestions: ["Today's routine", 'All batches info', 'Faculty directory'],
      confidentMatch: true,
    };
  }

  // 3C. Specific Person Contact Requested but NOT found in either faculty or student directory
  // (Prevents false matches or dumping all faculty when user asked for a specific person)
  if (asksContact && !explicitFaculty && !explicitUser && !explicitCourse) {
    return {
      reply: isBn
        ? `দুঃখিত, আপনি যার যোগাযোগের তথ্য চেয়েছেন তাকে শিক্ষক বা শিক্ষার্থী ডিরেক্টরিতে পাওয়া যায়নি। সঠিক বানান অথবা শর্ট নেম (যেমন WIC, AAC, NHN) দিয়ে চেষ্টা করতে পারেন।`
        : `Sorry, the person you asked contact info for was not found in the faculty or student directory. Please check the spelling or short code (e.g. WIC, AAC, NHN).`,
      actionLinks: [
        { label: 'Faculty Directory', path: '/faculty' },
        { label: 'Routine Page', path: '/routine' },
      ],
      suggestions: ['All faculty members', "Today's routine", 'CR list'],
      confidentMatch: true,
    };
  }

  if (asksTeacher || q.includes('faculty') || q.includes('শিক্ষক')) {
    return {
      reply: isBn
        ? `**SWE Department**-এর সম্মানিত শিক্ষকদের তালিকা:`
        : `Faculty members of the **Department of Software Engineering**:`,
      rows: ctx.faculty.slice(0, 6).map((f) => ({
        tag: f.designation || 'SWE',
        tagTone: 'blue',
        primary: f.name,
        secondary: f.email ? `✉️ ${f.email}` : f.department || 'Software Engineering',
        meta: f.phone ? [`📞 ${f.phone}`] : undefined,
      })),
      actionLinks: [{ label: 'Faculty Directory', path: '/faculty' }],
      suggestions: ["Today's routine", 'My courses', 'Upcoming exams'],
      confidentMatch: true,
    };
  }

  // ============================================================================
  // 4. EXAMS & QUIZZES (Personalized or Target Batch or All Batches)
  // ============================================================================
  if (/\b(exam|exams|quiz|midterm|final|ct|test|viva)\b/.test(q) || q.includes('পরীক্ষা')) {
    const examsSource = asksAllBatchesInfo ? ctx.allExams : ctx.batchExams;
    const upcoming = examsSource
      .filter((e) => e.date >= ctx.dateInfo.todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const finalExamsList = upcoming.length > 0 ? upcoming : ctx.allExams.filter((e) => e.date >= ctx.dateInfo.todayStr);
    const showingCrossBatch = upcoming.length === 0 && finalExamsList.length > 0;

    if (finalExamsList.length === 0) {
      return {
        reply: isBn
          ? `বর্তমানে **${ctx.batchName}**-এর কোনো আসন্ন পরীক্ষা শিডিউল করা নেই।`
          : `No upcoming exams are currently scheduled for **${ctx.batchName}**.`,
        actionLinks: [
          { label: 'Exams Page', path: '/exams' },
          { label: 'Question Bank', path: '/question-bank' },
        ],
        suggestions: ["Tomorrow's class", 'Lab class schedule', 'My courses'],
        confidentMatch: true,
      };
    }

    return {
      reply: isBn
        ? showingCrossBatch
          ? `**${ctx.batchName}**-এ কোনো পরীক্ষা নেই, তবে অন্যান্য ব্যাচের আসন্ন **${finalExamsList.length}টি** পরীক্ষা:`
          : `**${asksAllBatchesInfo ? 'সকল ব্যাচের' : ctx.batchName}** আসন্ন **${finalExamsList.length}টি** পরীক্ষার সময়সূচি:`
        : showingCrossBatch
        ? `No exams for **${ctx.batchName}**, but here are **${finalExamsList.length}** upcoming exam(s) across other batches:`
        : `Upcoming **${finalExamsList.length}** assessment(s) for **${asksAllBatchesInfo ? 'All Batches' : ctx.batchName}**:`,
      rows: finalExamsList.slice(0, 6).map((ex) => ({
        tag: `${ex.type}${showingCrossBatch || asksAllBatchesInfo ? ` • ${formatBatchLabel(ex.batchId, ctx.allBatches)}` : ''}`,
        tagTone: ex.type === 'FINAL' || ex.type === 'MIDTERM' ? 'rose' : 'amber',
        primary: `${cleanCourseName(ex.courseTitle)} — ${ex.title}`,
        secondary: `📅 ${ex.date}  •  ⏰ ${ex.startTime || 'TBA'}  •  🏛️ ${ex.room || 'TBA'}`,
      })),
      actionLinks: [{ label: 'Exams Page', path: '/exams' }],
      suggestions: ["Today's routine", 'Question Bank', 'My courses'],
      confidentMatch: true,
    };
  }

  // ============================================================================
  // 5. COURSES & CREDITS (Course Titles only, NO course codes)
  // ============================================================================
  if (/\b(course|courses|credit|credits|semester|subject|syllabus)\b/.test(q) || q.includes('কোর্স')) {
    const coursesToShow = asksAllBatchesInfo ? ctx.allCourses.slice(0, 12) : ctx.semesterCourses;
    const totalCredits = coursesToShow.reduce((acc, c) => acc + (Number(c.credits) || 0), 0);
    return {
      reply: isBn
        ? `**${ctx.batchName} (Semester ${ctx.semester})**-এ মোট **${coursesToShow.length}টি কোর্স** (${totalCredits.toFixed(1)} Credits) রয়েছে:`
        : `**${ctx.batchName} (Semester ${ctx.semester})** has **${coursesToShow.length} courses** (${totalCredits.toFixed(1)} Credits):`,
      rows: coursesToShow.map((c) => {
        const slotMatch = ctx.batchRoutines.find(
          (r) => String(r.courseCode || '').toLowerCase() === String(c.code || '').toLowerCase()
        );
        const instructor =
          c.assignedFacultyName ||
          c.teacherName ||
          (slotMatch ? enrichSlotWithTeacher(slotMatch, ctx.allCourses, ctx.faculty) : '');
        return {
          tag: `${c.credits} Cr • ${c.type}`,
          tagTone: c.type === 'LAB' ? 'purple' : 'blue',
          primary: cleanCourseName(c.title),
          secondary: `${c.type === 'LAB' ? '🔬 Lab' : '📘 Theory'}${instructor ? `  •  👨‍🏫 ${instructor}` : ''}`,
        };
      }),
      actionLinks: [{ label: 'Courses Page', path: '/courses' }],
      suggestions: ['Lab class schedule', "Tomorrow's class", 'Upcoming exams'],
      confidentMatch: true,
    };
  }

  // ============================================================================
  // 6. QUESTION BANK & RESOURCES (Full DB Access)
  // ============================================================================
  // 6. QUESTION BANK & STUDY RESOURCES
  // ============================================================================
  const asksQuestionBankOrResource =
    /\b(question bank|past question|previous question|resource|resources|note|notes|pdf|slide|slides|study material)\b/.test(q) ||
    (q.includes('question') && q.includes('bank')) ||
    q.includes('কোশ্চেন ব্যাংক') ||
    q.includes('নোট') ||
    q.includes('প্রশ্ন');

  if (asksQuestionBankOrResource) {
    return {
      reply: isBn
        ? `**Question Bank & Resources**-এ মোট **${ctx.resources.length}টি ফাইল** রয়েছে:`
        : `There are **${ctx.resources.length} academic files** available in the **Question Bank & Resources**:`,
      rows: ctx.resources.slice(0, 5).map((r) => ({
        tag: r.category || r.type || 'RESOURCE',
        tagTone: 'emerald',
        primary: r.title,
        secondary: `${cleanCourseName(r.courseTitle || r.courseCode || 'SWE')}  •  Uploaded by ${r.uploadedByName || 'Student'}`,
      })),
      actionLinks: [
        { label: 'Question Bank', path: '/question-bank' },
        { label: 'Resources', path: '/resources' },
      ],
      suggestions: ["Today's routine", 'Upcoming exams', 'My courses'],
      confidentMatch: true,
    };
  }

  // ============================================================================
  // 7. ANNOUNCEMENTS & NOTICES (Batch + All Department Notices)
  // ============================================================================
  if (/\b(announcement|announcements|notice|notices|news|update)\b/.test(q) || q.includes('নোটিশ')) {
    const annsToShow = ctx.batchAnnouncements.length > 0 ? ctx.batchAnnouncements : ctx.allAnnouncements;
    const rows: InfoRow[] = [
      ...annsToShow.slice(0, 3).map((a) => ({
        tag: `${a.priority} • ${formatBatchLabel(a.batchId, ctx.allBatches)}`,
        tagTone: (a.priority === 'URGENT' ? 'rose' : 'amber') as InfoRow['tagTone'],
        primary: a.title,
        secondary: a.description.slice(0, 110),
        meta: [`📅 ${a.publishDate}`],
      })),
      ...ctx.notices.slice(0, 3).map((n) => ({
        tag: n.category || 'NOTICE',
        tagTone: 'blue' as const,
        primary: n.title,
        secondary: n.content.slice(0, 110),
        meta: [`📅 ${n.publishDate}`],
      })),
    ];

    return {
      reply: isBn
        ? `সর্বশেষ **অ্যানাউন্সমেন্ট এবং ডিপার্টমেন্ট নোটিশ**:`
        : `Latest **Announcements & Department Notices**:`,
      rows,
      actionLinks: [
        { label: 'Announcements', path: '/announcements' },
        { label: 'Notices', path: '/notices' },
      ],
      suggestions: ["Tomorrow's class", 'Lab class schedule', 'Upcoming exams'],
      confidentMatch: true,
    };
  }

  // ============================================================================
  // 8. GREETING OR GENERAL FALLBACK
  // ============================================================================
  const isGreeting = /\b(hi|hello|hey|salam|assalamu|good morning|hlw)\b/.test(q);
  return {
    reply: isBn
      ? `হ্যালো **${ctx.userName}**! আজ **${ctx.dateInfo.todayDay}**। আপনার ব্যাচ (**${ctx.batchName}**) বা অন্য যেকোনো ব্যাচের রুটিন, শিক্ষক, রুম বা পরীক্ষা নিয়ে প্রশ্ন করতে পারেন:`
      : `Hello **${ctx.userName}**! Today is **${ctx.dateInfo.todayDay}**. Ask me about **${ctx.batchName}** or any other batch's routine, faculty, rooms, or exams:`,
    rows: [
      {
        tag: `TODAY • ${ctx.dateInfo.todayDay}`,
        tagTone: 'emerald',
        primary: `${ctx.batchRoutines.filter((r) => r.day === ctx.dateInfo.todayDay).length} Classes Today (${ctx.batchName})`,
        secondary: `Tomorrow (${ctx.dateInfo.tomorrowDay}): ${ctx.batchRoutines.filter((r) => r.day === ctx.dateInfo.tomorrowDay).length} class(es) • ${ctx.allBatches.length} total batches in DB`,
      },
    ],
    actionLinks: [
      { label: 'Routine', path: '/routine' },
      { label: 'Courses', path: '/courses' },
      { label: 'Exams', path: '/exams' },
    ],
    suggestions: [
      'kalke lab koytay?',
      "Today's routine",
      '10th batch routine',
      'List my courses',
    ],
    confidentMatch: isGreeting,
  };
}

interface RAGRetrievalContext {
  targetBatchId: string;
  batchName: string;
  semester: number;
  userName: string;
  dateInfo: { todayStr: string; todayDay: string; tomorrowDay: string; dayAfterTomorrowDay: string };
  allBatches: any[];
  allCourses: any[];
  allRoutines: any[];
  allExams: any[];
  allFaculty: any[];
  allAnnouncements: any[];
  notices: any[];
  users: any[];
}

interface RAGTargetedData {
  intents: string[];
  targetDay?: string;
  dayLabel?: string;
  matchedCourse?: any;
  matchedFaculty?: any;
  matchedRoom?: string;
  retrievedRoutines: any[];
  retrievedCourses: any[];
  retrievedExams: any[];
  retrievedFaculty: any[];
  retrievedAnnouncements: any[];
  retrievedKnowledge?: KnowledgeItem[];
}

/**
 * Stage 1: Classifies the student's query into one or more academic intents.
 */
function classifyAcademicQueryIntents(query: string): string[] {
  const q = query.toLowerCase();
  const intents: string[] = [];

  const isRoutine =
    /\b(routine|schedule|class|classes|lab|labs|theory|time|room|venue|kalke|kal|ajke|aj|poroshu|porshu|koytay|kokhon|when|today|tomorrow)\b/.test(q) ||
    q.includes('রুটিন') ||
    q.includes('ক্লাস') ||
    q.includes('ল্যাব') ||
    q.includes('কখন') ||
    q.includes('কয়টায়') ||
    q.includes('সময়') ||
    q.includes('রুম');

  const isCourse =
    /\b(course|courses|credit|credits|subject|subjects|syllabus|prerequisite|semester)\b/.test(q) ||
    q.includes('কোর্স') ||
    q.includes('ক্রেডিট') ||
    q.includes('সিলেবাস');

  const isExam =
    /\b(exam|exams|quiz|quizzes|midterm|mid|final|finals|test|ct|class test|viva|assessment)\b/.test(q) ||
    q.includes('পরীক্ষা') ||
    q.includes('কুইজ') ||
    q.includes('মিডটার্ম') ||
    q.includes('ফাইনাল');

  const isFaculty =
    /\b(teacher|faculty|instructor|sir|madam|mam|maam|professor|lecturer|contact|email|phone|number|mobile)\b/.test(q) ||
    q.includes('শিক্ষক') ||
    q.includes('স্যার') ||
    q.includes('ম্যাম') ||
    q.includes('ইমেইল') ||
    q.includes('নাম্বার');

  const isNotice =
    /\b(notice|notices|announcement|announcements|news|update|holiday|vacation|off|circular)\b/.test(q) ||
    q.includes('নোটিশ') ||
    q.includes('ছুটি');

  const isCR =
    /\b(cr|class representative|representative)\b/.test(q) ||
    q.includes('সিআর');

  const isKnowledge =
    /\b(fee|fees|taka|cost|tuition|admission|bank|account|waiver|scholarship|grading|gpa|cgpa|grade|grades|point|scale|forum|club|makeup|improvement|retake|thesis|internship|project|admit|library|contact|helpline|nrbc)\b/.test(q) ||
    q.includes('ফি') ||
    q.includes('টাকা') ||
    q.includes('ব্যাংক') ||
    q.includes('অ্যাকাউন্ট') ||
    q.includes('ওয়েভার') ||
    q.includes('ওয়েভার') ||
    q.includes('স্কলারশিপ') ||
    q.includes('গ্রেড') ||
    q.includes('পয়েন্ট') ||
    q.includes('জিপিএ') ||
    q.includes('সিজিপিএ') ||
    q.includes('ফোরাম');

  if (isRoutine) intents.push('ROUTINE');
  if (isCourse) intents.push('COURSES');
  if (isExam) intents.push('EXAMS');
  if (isFaculty) intents.push('FACULTY');
  if (isNotice) intents.push('NOTICES');
  if (isCR) intents.push('CR');
  if (isKnowledge) intents.push('KNOWLEDGE');

  if (intents.length === 0) {
    intents.push('GENERAL');
  }

  return intents;
}

/**
 * Stage 2: RAG Database Search
 * Searches and filters live database tables (courses, routine, exams, faculty)
 * based specifically on the user's batch, detected day, and query intent,
 * embedding explicit batch identification metadata into every retrieved record.
 */
function retrieveRAGDatabaseContext(
  query: string,
  ctx: RAGRetrievalContext
): RAGTargetedData {
  const intents = classifyAcademicQueryIntents(query);
  const dayMatch = detectTargetDay(query, ctx.dateInfo);
  const matchedCourse = detectCourseInText(query, ctx.allCourses);
  const matchedFaculty = detectFacultyInText(query, ctx.allFaculty);
  const matchedRoom = detectRoomInText(query, ctx.allRoutines);

  const activeBatchCandidateIds = getBatchCandidateIds(ctx.targetBatchId);
  const asksAllBatches =
    /\b(all batch|all batches|sob batch|every batch)\b/i.test(query) || query.includes('সব ব্যাচ');

  // Helper to attach batch identification metadata to routine slots
  const attachRoutineBatchMeta = (slot: any) => {
    const isUserBatch = activeBatchCandidateIds.includes(slot.batchId);
    const bLabel = formatBatchLabel(slot.batchId, ctx.allBatches);
    return {
      ...slot,
      batchId: slot.batchId,
      batchName: bLabel,
      isUserBatch,
      batchScope: isUserBatch ? 'USER_ACTIVE_BATCH' : 'CROSS_BATCH',
    };
  };

  // 1. ROUTINE TABLE SEARCH
  let rawRoutines: any[] = [];
  const batchRoutines = ctx.allRoutines.filter((r) => activeBatchCandidateIds.includes(r.batchId));

  if (matchedFaculty) {
    // Cross-batch faculty schedule search across ALL batches
    const facNameLower = String(matchedFaculty.name || '').toLowerCase();
    const facShortLower = String(matchedFaculty.shortName || '').toLowerCase();
    rawRoutines = ctx.allRoutines.filter((s) => {
      const t = enrichSlotWithTeacher(s, ctx.allCourses, ctx.allFaculty).toLowerCase();
      const sShort = String(s.teacherShortName || '').toLowerCase();
      return t.includes(facNameLower) || (facShortLower && sShort === facShortLower);
    });
  } else if (matchedRoom) {
    // Room search across all routines
    rawRoutines = ctx.allRoutines.filter((r) =>
      String(r.room || '').toLowerCase().includes(matchedRoom.toLowerCase())
    );
  } else if (asksAllBatches && dayMatch.day) {
    // Cross-batch schedule on a specific day
    rawRoutines = ctx.allRoutines.filter((r) => r.day === dayMatch.day);
  } else if (matchedCourse) {
    // Specific course routine search
    rawRoutines = batchRoutines.filter(
      (r) => String(r.courseCode || '').toLowerCase() === String(matchedCourse.code || '').toLowerCase()
    );
    if (rawRoutines.length === 0) {
      rawRoutines = ctx.allRoutines.filter(
        (r) => String(r.courseCode || '').toLowerCase() === String(matchedCourse.code || '').toLowerCase()
      );
    }
  } else if (dayMatch.day) {
    // Specific day routine search for this batch
    rawRoutines = batchRoutines.filter((r) => r.day === dayMatch.day);
  } else if (intents.includes('ROUTINE')) {
    // General routine request -> weekly routine of batch
    rawRoutines = batchRoutines;
  } else {
    // Default context slice: today and tomorrow routines
    rawRoutines = batchRoutines.filter(
      (r) => r.day === ctx.dateInfo.todayDay || r.day === ctx.dateInfo.tomorrowDay
    );
    if (rawRoutines.length === 0) {
      rawRoutines = batchRoutines.slice(0, 8);
    }
  }

  // Deduplicate and tag every routine slot with explicit batch metadata
  const seenSlotKeys = new Set<string>();
  const retrievedRoutines = rawRoutines
    .map(attachRoutineBatchMeta)
    .filter((slot) => {
      const key = `${slot.batchId}|${slot.day}|${slot.startTime}|${cleanCourseName(slot.courseTitle)}`;
      if (seenSlotKeys.has(key)) return false;
      seenSlotKeys.add(key);
      return true;
    });

  // 2. COURSES TABLE SEARCH WITH BATCH METADATA
  const attachCourseBatchMeta = (course: any) => {
    const courseBatchIds: string[] = Array.isArray(course.batchIds) ? course.batchIds : [];
    const appliesToUserBatch =
      course.semester === ctx.semester ||
      courseBatchIds.some((id: string) => activeBatchCandidateIds.includes(id));
    const applicableBatchNames = courseBatchIds.length > 0
      ? courseBatchIds.map((bId: string) => formatBatchLabel(bId, ctx.allBatches))
      : [ctx.batchName];

    return {
      ...course,
      applicableBatchIds: courseBatchIds,
      applicableBatchNames,
      isUserBatch: appliesToUserBatch,
      batchScope: appliesToUserBatch ? 'USER_ACTIVE_BATCH' : 'CROSS_BATCH',
    };
  };

  let retrievedCourses: any[] = [];
  const batchSemesterCourses = ctx.allCourses.filter(
    (c) =>
      c.semester === ctx.semester ||
      (c.batchIds && c.batchIds.some((id: string) => activeBatchCandidateIds.includes(id)))
  );

  if (matchedCourse) {
    retrievedCourses = [attachCourseBatchMeta(matchedCourse)];
  } else if (intents.includes('COURSES')) {
    retrievedCourses = (batchSemesterCourses.length > 0 ? batchSemesterCourses : ctx.allCourses.slice(0, 10))
      .map(attachCourseBatchMeta);
  } else {
    retrievedCourses = batchSemesterCourses.slice(0, 8).map(attachCourseBatchMeta);
  }

  // 3. EXAMS TABLE SEARCH WITH BATCH METADATA
  const attachExamBatchMeta = (exam: any) => {
    const isUserBatch = activeBatchCandidateIds.includes(exam.batchId);
    const bLabel = formatBatchLabel(exam.batchId, ctx.allBatches);
    return {
      ...exam,
      batchId: exam.batchId,
      batchName: bLabel,
      isUserBatch,
      batchScope: isUserBatch ? 'USER_ACTIVE_BATCH' : 'CROSS_BATCH',
    };
  };

  let rawExams: any[] = [];
  const batchExams = ctx.allExams.filter((e) => activeBatchCandidateIds.includes(e.batchId));
  const upcomingBatchExams = batchExams
    .filter((e) => e.date >= ctx.dateInfo.todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (intents.includes('EXAMS')) {
    rawExams = upcomingBatchExams.length > 0
      ? upcomingBatchExams
      : ctx.allExams.filter((e) => e.date >= ctx.dateInfo.todayStr).slice(0, 6);
  } else {
    rawExams = upcomingBatchExams.slice(0, 4);
  }
  const retrievedExams = rawExams.map(attachExamBatchMeta);

  // 4. FACULTY TABLE SEARCH WITH CROSS-BATCH TEACHING METADATA
  const attachFacultyBatchMeta = (faculty: any) => {
    const facNameLower = String(faculty.name || '').toLowerCase();
    const facShortLower = String(faculty.shortName || '').toLowerCase();
    const taughtSlots = ctx.allRoutines.filter((s) => {
      const t = enrichSlotWithTeacher(s, ctx.allCourses, ctx.allFaculty).toLowerCase();
      const sShort = String(s.teacherShortName || '').toLowerCase();
      return t.includes(facNameLower) || (facShortLower && sShort === facShortLower);
    });
    const taughtBatchIds = Array.from(new Set(taughtSlots.map((s) => s.batchId)));
    const taughtBatchNames = Array.from(
      new Set(taughtSlots.map((s) => formatBatchLabel(s.batchId, ctx.allBatches)))
    );
    const teachesUserBatch = taughtBatchIds.some((bId) => activeBatchCandidateIds.includes(bId));

    return {
      ...faculty,
      taughtBatchIds,
      taughtBatchNames,
      teachesUserBatch,
      batchScope: teachesUserBatch ? 'TEACHES_USER_BATCH' : 'CROSS_BATCH_ONLY',
    };
  };

  let rawFaculty: any[] = [];
  if (matchedFaculty) {
    rawFaculty = [matchedFaculty];
  } else if (intents.includes('FACULTY')) {
    rawFaculty = ctx.allFaculty.slice(0, 8);
  } else {
    const teacherNames = new Set(retrievedRoutines.map((r) => enrichSlotWithTeacher(r, ctx.allCourses, ctx.allFaculty)));
    rawFaculty = ctx.allFaculty.filter((f) => teacherNames.has(f.name)).slice(0, 5);
  }
  const retrievedFaculty = rawFaculty.map(attachFacultyBatchMeta);

  // 5. ANNOUNCEMENTS SEARCH WITH BATCH METADATA
  const retrievedAnnouncements = ctx.allAnnouncements
    .filter((a) => (activeBatchCandidateIds.includes(a.batchId) || !a.batchId) && a.expiryDate >= ctx.dateInfo.todayStr)
    .slice(0, 3)
    .map((a) => {
      const isUserBatch = !a.batchId || activeBatchCandidateIds.includes(a.batchId);
      const bLabel = a.batchId ? formatBatchLabel(a.batchId, ctx.allBatches) : 'All Batches';
      return {
        ...a,
        batchId: a.batchId || 'all',
        batchName: bLabel,
        isUserBatch,
        batchScope: isUserBatch ? 'USER_ACTIVE_BATCH' : 'DEPARTMENT_WIDE',
      };
    });

  // 6. UNIVERSITY POLICIES & KNOWLEDGE BASE SEARCH
  const retrievedKnowledge = searchAcademicKnowledge(query, 3);

  return {
    intents,
    targetDay: dayMatch.day,
    dayLabel: dayMatch.label,
    matchedCourse,
    matchedFaculty,
    matchedRoom,
    retrievedRoutines,
    retrievedCourses,
    retrievedExams,
    retrievedFaculty,
    retrievedAnnouncements,
    retrievedKnowledge,
  };
}

/**
 * Conversation History Truncation & Compression Strategy
 * - Strips markdown noise and redundant whitespace from past turns
 * - Enforces alternating roles and deduplicates consecutive identical turns
 * - Applies both a sliding turn window (maxTurns) and a hard total character budget (maxTotalChars)
 *   to minimize input token usage while preserving immediate follow-up context (batch, course, faculty, day).
 */
function truncateAndCompressHistory(
  history: ChatTurn[],
  maxTurns = 3,
  maxCharsPerTurn = 110,
  maxTotalChars = 300
): ChatTurn[] {
  if (!Array.isArray(history) || history.length === 0) return [];

  // Take recent candidate slice and sanitize each message
  const recentRaw = history.slice(-(maxTurns * 2));
  const sanitized: ChatTurn[] = [];

  for (const turn of recentRaw) {
    if (!turn || typeof turn.content !== 'string') continue;
    const role: 'user' | 'assistant' = turn.role === 'user' ? 'user' : 'assistant';

    // Strip markdown bold/italics/bullets and collapse whitespace to save tokens
    const cleanText = turn.content
      .replace(/[*_~`#]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) continue;

    const clipped =
      cleanText.length > maxCharsPerTurn ? `${cleanText.slice(0, maxCharsPerTurn).trim()}…` : cleanText;

    // Merge or replace consecutive same-role turns so Gemini receives strictly alternating turns
    if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
      sanitized[sanitized.length - 1] = { role, content: clipped };
    } else {
      sanitized.push({ role, content: clipped });
    }
  }

  // Walk backward from the most recent turn to enforce maxTurns and maxTotalChars budget
  const selectedReversed: ChatTurn[] = [];
  let charCount = 0;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    if (selectedReversed.length >= maxTurns) break;
    const item = sanitized[i];
    if (charCount + item.content.length > maxTotalChars && selectedReversed.length > 0) {
      break;
    }
    selectedReversed.push(item);
    charCount += item.content.length;
  }

  return selectedReversed.reverse();
}

/**
 * Stage 3 & 4: Refined System Prompt Construction
 * Minimizes token usage via:
 * 1. Intent-driven section pruning (only includes tables relevant to detected query intents)
 * 2. Single-header pipe-delimited rows (eliminates repetitive field labels on every row)
 * 3. Preserves full batch identification metadata ([USR] vs [X-BATCH]) for 100% cross-batch accuracy
 */
function buildRAGSystemPrompt(
  userMsg: string,
  ctx: RAGRetrievalContext,
  ragData: RAGTargetedData
): string {
  const intents = new Set(ragData.intents);
  const isGeneral = intents.has('GENERAL');

  const includeRoutine =
    isGeneral ||
    intents.has('ROUTINE') ||
    Boolean(ragData.targetDay || ragData.matchedCourse || ragData.matchedFaculty || ragData.matchedRoom);
  const includeCourses =
    isGeneral || intents.has('COURSES') || Boolean(ragData.matchedCourse);
  const includeExams =
    isGeneral || intents.has('EXAMS');
  const includeFaculty =
    intents.has('FACULTY') || Boolean(ragData.matchedFaculty) || (includeRoutine && ragData.retrievedFaculty.length > 0);

  const sections: string[] = [];

  if (includeRoutine) {
    const rows = ragData.retrievedRoutines.map((r) => {
      const type = isLabRoutineSlot(r, ctx.allCourses) ? 'LAB' : 'TH';
      const teacher = enrichSlotWithTeacher(r, ctx.allCourses, ctx.allFaculty);
      const bLabel = r.batchName || formatBatchLabel(r.batchId, ctx.allBatches);
      const scope = r.isUserBatch ? 'USR' : 'X-BATCH';
      return `${scope}|${bLabel}|${r.day}|${r.startTime}-${r.endTime}|${cleanCourseName(r.courseTitle)}|${type}|${r.room}|${teacher}`;
    });
    sections.push(
      `# ROUTINE [Scope|Batch|Day|Time|Course|Type|Room|Teacher]\n${
        rows.length > 0 ? rows.join('\n') : `NONE_SCHEDULED (${ctx.batchName})`
      }`
    );
  }

  if (includeCourses) {
    const rows = ragData.retrievedCourses.map((c) => {
      const instructor = c.assignedFacultyName || c.teacherName || 'Dept';
      const batchLabels = c.applicableBatchNames?.length > 0 ? c.applicableBatchNames.join(',') : ctx.batchName;
      const scope = c.isUserBatch ? 'USR' : 'X-BATCH';
      return `${scope}|${batchLabels}|${cleanCourseName(c.title)}|${c.credits}Cr|${c.type}|Sem${c.semester || ctx.semester}|${instructor}`;
    });
    sections.push(
      `# COURSES [Scope|Batches|Course|Credits|Type|Sem|Faculty]\n${
        rows.length > 0 ? rows.join('\n') : 'NONE'
      }`
    );
  }

  if (includeExams) {
    const rows = ragData.retrievedExams.map((e) => {
      const bLabel = e.batchName || formatBatchLabel(e.batchId, ctx.allBatches);
      const scope = e.isUserBatch ? 'USR' : 'X-BATCH';
      return `${scope}|${bLabel}|${e.date}|${e.type}:${e.title}|${cleanCourseName(e.courseTitle)}|${e.startTime || 'TBA'}|${e.room || 'TBA'}`;
    });
    sections.push(
      `# EXAMS [Scope|Batch|Date|Exam|Course|Time|Room]\n${
        rows.length > 0 ? rows.join('\n') : `NO_UPCOMING_EXAMS (${ctx.batchName})`
      }`
    );
  }

  if (includeFaculty) {
    const rows = ragData.retrievedFaculty.map((f) => {
      const batches = f.taughtBatchNames?.length > 0 ? f.taughtBatchNames.join(',') : 'TBA';
      const teachesUsr = f.teachesUserBatch ? 'YES' : 'NO';
      return `${f.name}(${f.shortName || '-'})|${f.designation || 'Faculty'}|Batches:${batches}|TeachesUserBatch:${teachesUsr}|${f.email || '-'}|${f.phone || '-'}`;
    });
    sections.push(
      `# FACULTY [Name(Code)|Role|Batches|TeachesUserBatch|Email|Phone]\n${
        rows.length > 0 ? rows.join('\n') : 'NONE'
      }`
    );
  }

  if (ragData.retrievedKnowledge && ragData.retrievedKnowledge.length > 0) {
    const rows = ragData.retrievedKnowledge.map(
      (k) => `${k.category}|${k.title}: ${k.summary}`
    );
    sections.push(
      `# POLICIES & KNOWLEDGE BASE [Category|Verified Info]\n${rows.join('\n')}`
    );
  }

  return `SWE Academic Assistant (Metropolitan University).
USER:${ctx.userName} | ACTIVE_BATCH:${ctx.batchName}(Sem ${ctx.semester}, ID:${ctx.targetBatchId})
TIME(Dhaka):Today=${ctx.dateInfo.todayDay}(${ctx.dateInfo.todayStr}), Tomorrow(kalke)=${ctx.dateInfo.tomorrowDay}${ragData.targetDay ? ` | TARGET_DAY:${ragData.targetDay}` : ''}

[DB_GROUND_TRUTH]
${sections.join('\n\n')}

RULES:
1.BATCH_SCOPE: Records tagged USR belong to ${ctx.batchName}; X-BATCH belong to other batches. For personal/unspecified queries use ONLY USR records. For other batch queries use X-BATCH and state the batch name. Never mix batches.
2.GROUNDING: Use ONLY [DB_GROUND_TRUTH]. Never invent times, rooms, teachers, or exams. If missing, state not scheduled.
3.NO_CODES: Output Course Title ONLY (never output codes like SWE-211).
4.STYLE: 1 concise sentence answering only what was asked, in user's language (Banglish/Bengali or English).`;
}

/**
 * POST /api/chatbot/message
 * - Multi-Stage RAG Architecture with Token Minimization:
 *   1. In-memory reply cache (0 tokens)
 *   2. Conversation history truncation & sanitization (sliding window + char cap)
 *   3. Deterministic Full-DB Smart Academic NLU for exact schedule/course/faculty/batch/CR queries (0 tokens, 100% accurate)
 *   4. On-demand Multi-Stage RAG retrieval & intent-pruned compact system prompt for open-ended queries
 */
router.post('/message', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, history = [] } = req.body as {
      message?: string;
      history?: ChatTurn[];
    };

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userMsg = String(message).trim();
    const user = req.user;
    const userBatchId = user?.batchId || 'batch-9';
    const dateInfo = getBangladeshDateInfo();

    // Truncate and compress conversation history early to minimize token footprint
    const truncatedHistory = truncateAndCompressHistory(history);

    // Check zero-token response cache first
    const lastTurnKey =
      truncatedHistory.length > 0 ? truncatedHistory[truncatedHistory.length - 1].content.slice(0, 40) : '';
    const cacheKey = `${userBatchId}|${dateInfo.todayStr}|${userMsg.toLowerCase()}|${lastTurnKey}`;
    const cachedResponse = getCachedReply(cacheKey);
    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Fetch FULL database across ALL batches (cached in memory for 60s in supabaseData.ts)
    const [
      allBatches,
      allCourses,
      allRoutines,
      allExams,
      allAnnouncements,
      allNotices,
      allFaculty,
      allResources,
      allUsers,
    ] = await Promise.all([
      fetchAllBatches().catch(() => []),
      fetchAllCourses().catch(() => []),
      fetchAllRoutineSlots().catch(() => []), // No batchId arg -> fetches ALL batches' routines!
      fetchAllExams().catch(() => []),        // No batchId arg -> fetches ALL batches' exams!
      fetchAllAnnouncements().catch(() => []),// No batchId arg -> fetches ALL batches' announcements!
      fetchAllNotices().catch(() => []),
      fetchAllFaculty().catch(() => []),
      fetchAllResources().catch(() => []),
      fetchAllUsers().catch(() => []),
    ]);

    // Personalized vs. Cross-Batch Resolution:
    // 1. Explicit batch in current query (e.g. "10batch", "8th batch")
    // 2. Or recent batch in immediate truncated follow-up history (unless user says "amar" / "my")
    // 3. Otherwise default to the logged-in student's own batch
    const isExplicitlyPersonal = /\b(amar|my|amader|our)\b/i.test(userMsg) || userMsg.includes('আমার') || userMsg.includes('আমাদের');
    const detectedBatch = detectBatchInText(userMsg, allBatches);
    const { recentBatch } = findRecentFollowUpTarget(truncatedHistory, allCourses, allFaculty, allBatches);

    const targetBatchObj =
      detectedBatch ||
      (!isExplicitlyPersonal && recentBatch ? recentBatch : undefined) ||
      allBatches.find((b) => getBatchCandidateIds(b.id).includes(userBatchId));

    const activeBatchId = targetBatchObj?.id || userBatchId;
    const activeCandidateIds = getBatchCandidateIds(activeBatchId);
    const batchName = targetBatchObj?.name || user?.batchName || 'SWE 9th Batch';
    const effectiveSem = targetBatchObj?.currentSemester || user?.currentSemester || 5;

    const batchRoutines = allRoutines.filter((r) => activeCandidateIds.includes(r.batchId));
    const batchExams = allExams.filter((e) => activeCandidateIds.includes(e.batchId));
    const batchAnnouncements = allAnnouncements
      .filter((a) => activeCandidateIds.includes(a.batchId) && a.expiryDate >= dateInfo.todayStr)
      .sort((a, b) => b.publishDate.localeCompare(a.publishDate));

    const semesterCourses = allCourses.filter(
      (c) =>
        c.semester === effectiveSem ||
        (c.batchIds && c.batchIds.some((id: string) => activeCandidateIds.includes(id)))
    );

    const isGlobalOrAllBatches =
      /\b(all batch|all batches|sob batch|every batch)\b/i.test(userMsg) || userMsg.includes('সব ব্যাচ');

    const fullContext = {
      userName: user?.name || 'Student',
      userRole: user?.role || 'STUDENT',
      userBatchId,
      activeBatchId,
      batchName,
      semester: effectiveSem,
      isGlobalOrAllBatches,
      dateInfo,
      allBatches,
      allCourses,
      semesterCourses: semesterCourses.length > 0 ? semesterCourses : allCourses.slice(0, 8),
      batchRoutines,
      allRoutines,
      batchExams,
      allExams,
      batchAnnouncements,
      allAnnouncements,
      notices: allNotices.slice(0, 5),
      faculty: allFaculty,
      resources: allResources,
      users: allUsers,
    };

    // =========================================================================
    // STEP 1: Run Deterministic Full-DB Smart Academic NLU First (0 Tokens, 100% Accuracy)
    // =========================================================================
    const nluResult = runSmartAcademicNLU(userMsg, truncatedHistory, fullContext);
    if (nluResult.confidentMatch) {
      const payload = {
        reply: nluResult.reply,
        rows: nluResult.rows,
        actionLinks: nluResult.actionLinks,
        suggestions: nluResult.suggestions,
        engine: 'smart-nlu',
      };
      setCachedReply(cacheKey, payload);
      return res.json(payload);
    }

    // =========================================================================
    // STEP 2: On-Demand Multi-Stage RAG Retrieval & Compact Grounded Generation
    // Only constructed when Step 1 requires LLM fallback, saving compute & tokens.
    // =========================================================================
    const ragContext: RAGRetrievalContext = {
      targetBatchId: activeBatchId,
      batchName,
      semester: effectiveSem,
      userName: user?.name || 'Student',
      dateInfo,
      allBatches,
      allCourses,
      allRoutines,
      allExams,
      allFaculty,
      allAnnouncements,
      notices: allNotices,
      users: allUsers,
    };
    const ragData = retrieveRAGDatabaseContext(userMsg, ragContext);
    const ragSystemPrompt = buildRAGSystemPrompt(userMsg, ragContext, ragData);

    const ai = getGenAIClient();
    if (ai) {
      try {
        const multiTurnContents = [
          ...truncatedHistory.map((turn) => ({
            role: turn.role === 'user' ? ('user' as const) : ('model' as const),
            parts: [{ text: turn.content }],
          })),
          {
            role: 'user' as const,
            parts: [{ text: userMsg }],
          },
        ];

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: multiTurnContents,
          config: {
            systemInstruction: ragSystemPrompt,
            maxOutputTokens: 180,
            temperature: 0.1,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: 'Specific, concise 1-sentence answer using Course Title only (NO course codes).',
                },
                rows: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      tag: { type: Type.STRING },
                      tagTone: { type: Type.STRING },
                      primary: { type: Type.STRING },
                      secondary: { type: Type.STRING },
                    },
                  },
                },
                suggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
          },
        });

        const rawJson = response.text?.trim();
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (parsed.reply) {
            const payload = {
              reply: parsed.reply,
              rows: Array.isArray(parsed.rows) ? parsed.rows : undefined,
              actionLinks: [{ label: 'Open Routine', path: '/routine' }],
              suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : undefined,
              engine: 'gemini-3.8-flash',
            };
            setCachedReply(cacheKey, payload);
            return res.json(payload);
          }
        }
      } catch (geminiErr: any) {
        console.warn('[Chatbot Gemini API fallback]:', geminiErr?.message || geminiErr);
      }
    }

    const workerUrl = process.env.CLOUDFLARE_WORKER_URL || process.env.CHATBOT_WORKER_URL;
    if (workerUrl) {
      try {
        const wRes = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.CLOUDFLARE_WORKER_TOKEN
              ? { Authorization: `Bearer ${process.env.CLOUDFLARE_WORKER_TOKEN}` }
              : {}),
          },
          body: JSON.stringify({
            system: ragSystemPrompt,
            message: userMsg,
            history: truncatedHistory,
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (wRes.ok) {
          const wData = await wRes.json();
          if (wData.reply) {
            const payload = {
              reply: wData.reply,
              rows: wData.rows,
              actionLinks: wData.actionLinks || [{ label: 'Routine', path: '/routine' }],
              suggestions: wData.suggestions,
              engine: 'cloudflare-worker',
            };
            setCachedReply(cacheKey, payload);
            return res.json(payload);
          }
        }
      } catch (workerErr: any) {
        console.warn('[Chatbot Cloudflare Worker fallback]:', workerErr?.message || workerErr);
      }
    }

    const fallbackPayload = {
      reply: nluResult.reply,
      rows: nluResult.rows,
      actionLinks: nluResult.actionLinks,
      suggestions: nluResult.suggestions,
      engine: 'smart-nlu',
    };
    setCachedReply(cacheKey, fallbackPayload);
    return res.json(fallbackPayload);
  } catch (err: any) {
    console.error('[Chatbot Route Error]:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to process chatbot message',
    });
  }
});

export default router;
