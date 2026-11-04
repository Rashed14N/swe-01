import fs from 'fs';
import path from 'path';

/**
 * Centralized Academic Knowledge Base & Policy Repository
 * 
 * Contains verified institutional rules, policies, grading scales, fee structures,
 * waiver criteria, degree requirements, and campus information that are not stored
 * in routine/course relational tables.
 */

export interface KnowledgeItem {
  id: string;
  category:
    | 'FEES_AND_PAYMENT'
    | 'GRADING_AND_EXAMS'
    | 'SCHOLARSHIP_AND_WAIVER'
    | 'DEGREE_REQUIREMENTS'
    | 'FORUM_AND_ACTIVITIES'
    | 'CAMPUS_AND_CONTACTS'
    | 'GENERAL_POLICY';
  title: string;
  keywords: string[];
  summary: string;
  details: string;
  bulletPoints?: string[];
  actionPath?: string;
  actionLabel?: string;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const ACADEMIC_KNOWLEDGE_BASE: KnowledgeItem[] = [
  // 1. TUITION FEES & BANK PAYMENT
  {
    id: 'kb-fee-structure',
    category: 'FEES_AND_PAYMENT',
    title: 'SWE Tuition Fees & Breakdown',
    keywords: ['fee', 'fees', 'tuition', 'cost', 'admission fee', 'registration fee', 'taka', 'koto taka', 'খরচ', 'ফি', 'টিউশন ফি', 'বেতন', 'ভর্তি ফি', 'কত টাকা'],
    summary: 'Software Engineering program fee breakdown: Admission fee (one-time) 20,000 BDT, Registration fee (per term) 10,000 BDT, Campus activities 2,000 BDT/month, Monthly credit installment 7,000 BDT, BNCC fee 500 BDT.',
    details: 'Program fees breakdown:\n• Admission Fee: 20,000 BDT (One-time)\n• Registration Fee: 10,000 BDT (Per term)\n• Monthly Credit Installment: 7,000 BDT/month\n• Campus Activities: 2,000 BDT/month\n• BNCC & Other Fee: 500 BDT (One-time)\n\nNote: Fee schedules should be verified with the university accounts office as figures may periodically update.',
    actionPath: '/faq',
    actionLabel: 'View FAQ & Fees',
  },
  {
    id: 'kb-bank-payment',
    category: 'FEES_AND_PAYMENT',
    title: 'Bank Payment Method & Account Details',
    keywords: ['bank', 'deposit', 'account', 'payment', 'pay', 'kivabe taka dibo', 'bank account', 'nrb', 'ব্যাংক', 'টাকা জমা', 'পেমেন্ট', 'ব্যাংক অ্যাকাউন্ট', 'একাউন্ট', 'টাকা কিভাবে দিব'],
    summary: 'Deposit fees at NRB Commercial Bank, Metropolitan University Campus Branch, Bateshwar, Sylhet (Account No: 015954000000001). Mention Full Name, Student ID, and Mobile number on the deposit slip.',
    details: 'Deposit payments at:\n• Bank: NRB Commercial Bank Ltd.\n• Branch: Metropolitan University Campus Branch, Bateshwar, Sylhet\n• Account No: 015954000000001\n• Required Info: Student Full Name, Student ID, and Mobile Number must be written on the deposit slip.\n• Accounts Office Helpline: 01757535844 or accounts@metrouni.edu.bd\n• Installments: Tuition is payable in 4 equal installments per term before deadlines.',
    actionPath: '/faq',
    actionLabel: 'Bank & Payment FAQ',
  },
  {
    id: 'kb-admission-cancellation',
    category: 'FEES_AND_PAYMENT',
    title: 'Admission Cancellation & Readmission Policy',
    keywords: ['cancel', 'cancellation', 'admission cancel', 'drop out', 'readmission', 'বাতিল', 'ভর্তি বাতিল'],
    summary: 'Admission can be cancelled for: missing required documents, violating Proctorial Rules, absence for 3 consecutive terms without notice, or failure to pay dues. Readmission requires department head approval and readmission fee.',
    details: 'Admission cancellation causes:\n1. Failure to submit required academic certificates/documents.\n2. Violation of University Proctorial Rules.\n3. Consecutive absence for 3 terms without formal departmental approval.\n4. Defaulting on university dues and fees.\n\nReadmission: Students must apply to the Head of the Department and pay the readmission fee.',
    actionPath: '/faq',
    actionLabel: 'Admission Rules',
  },

  // 2. SCHOLARSHIPS & WAIVERS
  {
    id: 'kb-scholarships-waivers',
    category: 'SCHOLARSHIP_AND_WAIVER',
    title: 'Scholarship, Financial Aid & Tuition Waiver Policy',
    keywords: ['scholarship', 'waiver', 'tuition waiver', 'golden', 'financial aid', 'discount', 'স্কলারশিপ', 'ওয়েভার', 'ওয়েভার', 'ছাড়', 'ওয়েভার কিভাবে পাব'],
    summary: 'Golden A+ in both SSC and HSC grants an 80% tuition waiver. Maintaining A+ in all courses for 3 consecutive terms qualifies for the Chairman\'s Scholarship. Vice Chancellor\'s Scholarship is also available.',
    details: 'Scholarship Opportunities at Metropolitan University:\n• Golden A+ Waiver: Students with Golden A+ in both SSC and HSC receive an 80% tuition fee waiver.\n• Chairman\'s Scholarship: Granted to students who secure A+ in all enrolled courses for 3 terms consecutively.\n• Vice Chancellor\'s Scholarship: Awarded based on semester academic distinction.\n• Contact the Registrar or Accounts Office to apply and submit required proof.',
    actionPath: '/faq',
    actionLabel: 'Scholarship Details',
  },

  // 3. GRADING SCALE & CGPA
  {
    id: 'kb-grading-system',
    category: 'GRADING_AND_EXAMS',
    title: 'UGC Approved Grading Scale & Point System',
    keywords: ['grading', 'grade', 'gpa', 'cgpa', 'scale', 'point', 'marks', 'a+', 'fail', 'গ্রেড', 'পয়েন্ট', 'সিজিপিএ', 'কত পেলে'],
    summary: 'Metropolitan University UGC Grading Scale: 80%+ = A+ (4.00), 75-79% = A (3.75), 70-74% = A- (3.50), 65-69% = B+ (3.25), 60-64% = B (3.00), 55-59% = B- (2.75), 50-54% = C+ (2.50), 45-49% = C (2.25), 40-44% = D (2.00), Below 40% = F (0.00).',
    details: 'UGC Standard Grading System:\n• 80% and above: A+ (4.00)\n• 75% to <80%: A (3.75)\n• 70% to <75%: A- (3.50)\n• 65% to <70%: B+ (3.25)\n• 60% to <65%: B (3.00)\n• 55% to <60%: B- (2.75)\n• 50% to <55%: C+ (2.50)\n• 45% to <50%: C (2.25)\n• 40% to <45%: D (2.00 - Passing)\n• Less than 40%: F (0.00 - Fail, must retake course)\n\nGraduation Requirement: Minimum cumulative GPA of 2.00.',
    actionPath: '/cgpa',
    actionLabel: 'CGPA Calculator',
  },
  {
    id: 'kb-missed-exams-incomplete',
    category: 'GRADING_AND_EXAMS',
    title: 'Missed Exam & Incomplete (I) Grade Policy',
    keywords: ['missed exam', 'incomplete', 'i grade', 'make up exam', 'makeup', 'sick', 'অসুস্থ', 'পরীক্ষা মিস'],
    summary: 'If an exam is missed due to documented medical or emergency reasons, apply to the Department Head. If accepted, an Incomplete (I) grade is assigned. A make-up exam must be taken within 1 month of the next term, otherwise it becomes an F.',
    details: 'Missed Exam Procedure:\n1. Submit a formal application to the Department Head with valid medical/emergency proof immediately.\n2. Upon departmental approval, you are awarded an "Incomplete (I)" grade.\n3. You must take a designated make-up examination within 1 month of the commencement of the following term.\n4. If the make-up exam is not completed on time, the (I) grade automatically converts to an "F" (Fail).',
    actionPath: '/exams',
    actionLabel: 'Exams Schedule',
  },

  // 4. DEGREE REQUIREMENTS & INTERNSHIP
  {
    id: 'kb-degree-requirements',
    category: 'DEGREE_REQUIREMENTS',
    title: 'B.Sc. in Software Engineering Degree & Internship Requirements',
    keywords: ['degree', 'credit', 'credits', 'total credit', 'internship', 'duration', 'graduation', 'মোট ক্রেডিট', 'ইন্টার্নশিপ', 'গ্র্যাজুয়েশন'],
    summary: 'B.Sc. in Software Engineering duration is 4 years (48 months) with 160 total credits (148 credits theory & lab courses + 12 credits industry internship/project). Minimum CGPA 2.00 required to graduate.',
    details: 'Degree Structure:\n• Duration: 4 Years (8 Semesters / Terms)\n• Total Credits: 160 Credits\n• Coursework: 148 Credits of Theory and Laboratory Courses\n• Internship: 12 Credits Software Industry Internship / Capstone Project\n• Minimum Graduation CGPA: 2.00\n• Credit Transfer: Up to 50% of required credits can be transferred from accredited universities upon syllabus verification.',
    actionPath: '/courses',
    actionLabel: 'View Course Catalog',
  },

  // 5. SWE PROGRAMMING FORUM & ACTIVITIES
  {
    id: 'kb-swe-forum',
    category: 'FORUM_AND_ACTIVITIES',
    title: 'SWE Programming Forum & 200 BDT Fee Purpose',
    keywords: ['forum', 'club', 'programming forum', '200 taka', 'forum fee', 'competition', 'contest', 'ফোরাম'],
    summary: 'The 200 BDT SWE Forum fee supports departmental programming contests, workshops, hackathons, and competitive programming initiatives for students.',
    details: 'SWE Programming Forum:\n• Activities: Organizes national/intra-university programming contests, skill development workshops, competitive coding camps, and tech seminars.\n• 200 BDT Fee: Dedicated fund to host contests, provide refreshments, arrange prizes/certificates, and sponsor teams representing Metropolitan University in external competitions.',
    actionPath: '/faq',
    actionLabel: 'Forum Info & FAQ',
  },

  // 6. CAMPUS LOCATION & IMPORTANT CONTACTS
  {
    id: 'kb-campus-contacts',
    category: 'CAMPUS_AND_CONTACTS',
    title: 'Campus Address, Accounts & Department Contacts',
    keywords: ['campus', 'address', 'location', 'contact', 'email', 'phone', 'accounts', 'bateshwar', 'ক্যাম্পাস', 'ঠিকানা', 'যোগাযোগ'],
    summary: 'Metropolitan University Permanent Campus: Bateshwar, Sylhet-3103. Accounts office: 01757535844 / accounts@metrouni.edu.bd. Department of Software Engineering: Faculty directory available at /faculty.',
    details: 'Official Contact Directory:\n• Campus Location: Bateshwar, Sylhet-3103, Bangladesh\n• University Accounts Office: 01757535844 | accounts@metrouni.edu.bd\n• Department of Software Engineering: Faculty directory at /faculty\n• Bank: NRB Commercial Bank, Campus Branch (A/C: 015954000000001)',
    actionPath: '/faculty',
    actionLabel: 'Faculty & Office Directory',
  },
];

// Persistent file storage path for custom admin snippets
const DATA_DIR = path.join(process.cwd(), 'data');
const CUSTOM_KB_FILE = path.join(DATA_DIR, 'custom_knowledge.json');

interface CustomKnowledgeStorage {
  items: KnowledgeItem[];
  hiddenIds: string[];
}

let customKnowledgeItems: KnowledgeItem[] = [];
let hiddenDefaultIds = new Set<string>();
let isInitialized = false;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create data dir for custom knowledge:', err);
  }
}

function loadCustomKnowledge(): void {
  if (isInitialized) return;
  try {
    ensureDataDir();
    if (fs.existsSync(CUSTOM_KB_FILE)) {
      const raw = fs.readFileSync(CUSTOM_KB_FILE, 'utf-8');
      const parsed: CustomKnowledgeStorage = JSON.parse(raw);
      if (Array.isArray(parsed.items)) {
        customKnowledgeItems = parsed.items.map((it) => ({ ...it, isCustom: true }));
      }
      if (Array.isArray(parsed.hiddenIds)) {
        hiddenDefaultIds = new Set(parsed.hiddenIds);
      }
    }
  } catch (err) {
    console.warn('Failed to load custom knowledge file:', err);
  } finally {
    isInitialized = true;
  }
}

function saveCustomKnowledge(): void {
  try {
    ensureDataDir();
    const payload: CustomKnowledgeStorage = {
      items: customKnowledgeItems,
      hiddenIds: Array.from(hiddenDefaultIds),
    };
    fs.writeFileSync(CUSTOM_KB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save custom knowledge file:', err);
  }
}

/**
 * Returns all active knowledge items (Custom Admin Items + Active Built-in Presets)
 */
export function getAllKnowledgeItems(): KnowledgeItem[] {
  loadCustomKnowledge();
  const activeBuiltIns = ACADEMIC_KNOWLEDGE_BASE.filter((it) => !hiddenDefaultIds.has(it.id)).map(
    (it) => ({ ...it, isCustom: false })
  );
  return [...customKnowledgeItems, ...activeBuiltIns];
}

/**
 * Adds a new custom knowledge snippet created by an Admin
 */
export function addCustomKnowledgeItem(
  payload: Omit<KnowledgeItem, 'id'> & { id?: string }
): KnowledgeItem {
  loadCustomKnowledge();

  const id = payload.id || `kb-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Normalize keywords
  const keywords = Array.isArray(payload.keywords)
    ? payload.keywords.map((k) => String(k).trim()).filter(Boolean)
    : String(payload.keywords || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

  const newItem: KnowledgeItem = {
    id,
    category: payload.category || 'GENERAL_POLICY',
    title: payload.title.trim(),
    keywords,
    summary: payload.summary.trim(),
    details: payload.details ? payload.details.trim() : payload.summary.trim(),
    bulletPoints: payload.bulletPoints || [],
    actionPath: payload.actionPath || '/faq',
    actionLabel: payload.actionLabel || 'View Policy',
    isCustom: true,
    createdAt: now,
    updatedAt: now,
  };

  customKnowledgeItems.unshift(newItem);
  saveCustomKnowledge();
  return newItem;
}

/**
 * Updates an existing custom knowledge item or overrides a built-in item
 */
export function updateCustomKnowledgeItem(
  id: string,
  updates: Partial<KnowledgeItem>
): KnowledgeItem | null {
  loadCustomKnowledge();

  const idx = customKnowledgeItems.findIndex((it) => it.id === id);
  const now = new Date().toISOString();

  if (idx !== -1) {
    const existing = customKnowledgeItems[idx];
    const keywords = updates.keywords
      ? Array.isArray(updates.keywords)
        ? updates.keywords.map((k) => String(k).trim()).filter(Boolean)
        : String(updates.keywords)
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean)
      : existing.keywords;

    const updated: KnowledgeItem = {
      ...existing,
      ...updates,
      id: existing.id,
      keywords,
      isCustom: true,
      updatedAt: now,
    };
    customKnowledgeItems[idx] = updated;
    saveCustomKnowledge();
    return updated;
  }

  // If built-in item, clone into custom override and hide built-in original
  const builtIn = ACADEMIC_KNOWLEDGE_BASE.find((it) => it.id === id);
  if (builtIn) {
    hiddenDefaultIds.add(builtIn.id);
    const overridden = addCustomKnowledgeItem({
      ...builtIn,
      ...updates,
      id: `kb-override-${builtIn.id}`,
    });
    return overridden;
  }

  return null;
}

/**
 * Deletes a custom knowledge snippet or soft-hides a built-in snippet
 */
export function deleteCustomKnowledgeItem(id: string): boolean {
  loadCustomKnowledge();

  const customIdx = customKnowledgeItems.findIndex((it) => it.id === id);
  if (customIdx !== -1) {
    customKnowledgeItems.splice(customIdx, 1);
    saveCustomKnowledge();
    return true;
  }

  // If built-in, mark as hidden
  const builtIn = ACADEMIC_KNOWLEDGE_BASE.find((it) => it.id === id);
  if (builtIn) {
    hiddenDefaultIds.add(builtIn.id);
    saveCustomKnowledge();
    return true;
  }

  return false;
}

/**
 * Resets all custom snippets and restores all built-in defaults
 */
export function resetKnowledgeBaseDefaults(): void {
  customKnowledgeItems = [];
  hiddenDefaultIds.clear();
  saveCustomKnowledge();
}

/**
 * Searches the Combined Knowledge Base using multi-token relevance scoring.
 * Returns matching knowledge snippets sorted by relevance.
 */
export function searchAcademicKnowledge(query: string, maxResults = 3): KnowledgeItem[] {
  if (!query || typeof query !== 'string') return [];
  const qLower = query.toLowerCase().trim();
  const qTokens = qLower
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const allItems = getAllKnowledgeItems();
  const scoredItems: Array<{ item: KnowledgeItem; score: number }> = [];

  for (const item of allItems) {
    let score = 0;

    // Check exact title match
    if (qLower.includes(item.title.toLowerCase())) {
      score += 150;
    }

    // Check keyword matches
    for (const kw of item.keywords) {
      const kwLower = kw.toLowerCase();
      if (qLower.includes(kwLower)) {
        score += 80;
      } else if (qTokens.some((qt) => kwLower.includes(qt) || qt.includes(kwLower))) {
        score += 30;
      }
    }

    // Check summary & detail token occurrences
    const summaryLower = item.summary.toLowerCase();
    for (const token of qTokens) {
      if (summaryLower.includes(token)) {
        score += 10;
      }
    }

    // Slight preference for custom admin-specified knowledge
    if (item.isCustom && score > 0) {
      score += 15;
    }

    if (score >= 40) {
      scoredItems.push({ item, score });
    }
  }

  scoredItems.sort((a, b) => b.score - a.score);
  return scoredItems.slice(0, maxResults).map((s) => s.item);
}
