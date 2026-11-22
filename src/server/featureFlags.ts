import fs from 'fs';
import path from 'path';

export type FeatureKey =
  | 'routine'
  | 'courses'
  | 'retake_courses'
  | 'exams'
  | 'announcements'
  | 'question_bank'
  | 'faq'
  | 'notices'
  | 'faculty'
  | 'cgpa'
  | 'chatbot'
  | 'bug_report'
  | 'cr_routine_requests';

export type FeatureCategory = 'ACADEMIC' | 'TOOLS_AI' | 'RESOURCES' | 'MANAGEMENT';

export interface FeatureFlagConfig {
  key: FeatureKey;
  name: string;
  description: string;
  category: FeatureCategory;
  routePaths: string[];
  enabled: boolean;
  disabledMessage: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlagConfig[] = [
  {
    key: 'routine',
    name: 'Class Routine',
    description: 'Daily and weekly class schedules, room locations, and faculty assignments.',
    category: 'ACADEMIC',
    routePaths: ['/routine'],
    enabled: true,
    disabledMessage: 'The Class Routine module is temporarily turned off for maintenance. Please check back shortly.',
  },
  {
    key: 'courses',
    name: 'Courses Catalog',
    description: 'Semester courses list, credit breakdown, syllabus details, and course pages.',
    category: 'ACADEMIC',
    routePaths: ['/courses'],
    enabled: true,
    disabledMessage: 'The Courses Catalog is currently disabled by the department administrator.',
  },
  {
    key: 'retake_courses',
    name: 'Retake & Improvement',
    description: 'Student retake/improvement course registration and CR retake tracking.',
    category: 'ACADEMIC',
    routePaths: ['/retake-courses', '/cr/retakes'],
    enabled: true,
    disabledMessage: 'Retake & Improvement registration is currently closed by the department.',
  },
  {
    key: 'exams',
    name: 'Exams Schedule',
    description: 'Upcoming quizzes, midterms, finals, exam rooms, and CR exam scheduling.',
    category: 'ACADEMIC',
    routePaths: ['/exams', '/cr/exams'],
    enabled: true,
    disabledMessage: 'The Exams Schedule module is temporarily unavailable while exam dates are being updated.',
  },
  {
    key: 'announcements',
    name: 'Batch Announcements',
    description: 'Batch-specific announcements and urgent class updates from CRs and Admins.',
    category: 'ACADEMIC',
    routePaths: ['/announcements', '/cr/announcements'],
    enabled: true,
    disabledMessage: 'Batch Announcements are temporarily disabled by the administrator.',
  },
  {
    key: 'chatbot',
    name: 'SWE AI Assistant Chatbot',
    description: 'Floating AI academic chatbot widget for instant routine, course, and policy Q&A.',
    category: 'TOOLS_AI',
    routePaths: ['/api/chatbot/message'],
    enabled: true,
    disabledMessage: 'The SWE AI Assistant is temporarily turned off by the administrator.',
  },
  {
    key: 'cgpa',
    name: 'CGPA Calculator & Tracker',
    description: 'Personal semester GPA & CGPA calculator, grade tracking, and transcripts.',
    category: 'TOOLS_AI',
    routePaths: ['/cgpa'],
    enabled: true,
    disabledMessage: 'The CGPA Calculator is temporarily turned off for updates.',
  },
  {
    key: 'bug_report',
    name: 'Student Bug Reporting',
    description: 'Sidebar quick bug report submission modal for students and CRs.',
    category: 'TOOLS_AI',
    routePaths: [],
    enabled: true,
    disabledMessage: 'Bug report submission is currently paused by the administrator.',
  },
  {
    key: 'question_bank',
    name: 'Question Bank & Resources',
    description: 'Previous exam questions, lecture notes, lab sheets, and study PDFs.',
    category: 'RESOURCES',
    routePaths: ['/resources/questions'],
    enabled: true,
    disabledMessage: 'The Question Bank & Resources section is temporarily disabled for moderation.',
  },
  {
    key: 'faq',
    name: 'Academic FAQ & Policies',
    description: 'Tuition fees, bank payment details, grading scale, waivers, and university policies.',
    category: 'RESOURCES',
    routePaths: ['/faq'],
    enabled: true,
    disabledMessage: 'The Academic FAQ page is currently being updated.',
  },
  {
    key: 'notices',
    name: 'Department Notices',
    description: 'Official SWE department circulars, holiday notices, and academic updates.',
    category: 'RESOURCES',
    routePaths: ['/notices'],
    enabled: true,
    disabledMessage: 'Department Notices are temporarily turned off.',
  },
  {
    key: 'faculty',
    name: 'Faculty Directory',
    description: 'SWE department teachers directory, designations, emails, and contact numbers.',
    category: 'RESOURCES',
    routePaths: ['/faculty'],
    enabled: true,
    disabledMessage: 'The Faculty Directory is temporarily unavailable.',
  },
  {
    key: 'cr_routine_requests',
    name: 'CR Routine Change Requests',
    description: 'Allows Class Representatives to submit routine swap or rescheduling requests.',
    category: 'MANAGEMENT',
    routePaths: ['/cr/routine-requests'],
    enabled: true,
    disabledMessage: 'CR Routine Change Requests are currently disabled by the department admin.',
  },
];

const VALID_FEATURE_KEYS = new Set<string>(DEFAULT_FEATURE_FLAGS.map((f) => f.key));

const DATA_DIR = path.join(process.cwd(), 'data');
const FEATURE_FLAGS_FILE = path.join(DATA_DIR, 'feature_flags.json');

interface PersistedFeatureOverride {
  enabled: boolean;
  disabledMessage?: string;
  updatedAt?: string;
  updatedBy?: string;
}

type PersistedFeatureMap = Record<string, PersistedFeatureOverride>;

let overrides: PersistedFeatureMap = {};
let isInitialized = false;

function ensureDataDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('Could not create data dir for feature flags:', err);
  }
}

function loadFeatureFlags(): void {
  if (isInitialized) return;
  try {
    ensureDataDir();
    if (fs.existsSync(FEATURE_FLAGS_FILE)) {
      const raw = fs.readFileSync(FEATURE_FLAGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const sanitized: PersistedFeatureMap = {};
        for (const [key, val] of Object.entries(parsed)) {
          if (VALID_FEATURE_KEYS.has(key) && val && typeof val === 'object') {
            const record = val as Record<string, unknown>;
            sanitized[key] = {
              enabled: typeof record.enabled === 'boolean' ? record.enabled : true,
              disabledMessage:
                typeof record.disabledMessage === 'string'
                  ? record.disabledMessage.slice(0, 240)
                  : undefined,
              updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
              updatedBy: typeof record.updatedBy === 'string' ? record.updatedBy : undefined,
            };
          }
        }
        overrides = sanitized;
      }
    }
  } catch (err) {
    console.warn('Failed to load feature_flags.json, using defaults:', err);
  } finally {
    isInitialized = true;
  }
}

function saveFeatureFlags(): void {
  try {
    ensureDataDir();
    fs.writeFileSync(FEATURE_FLAGS_FILE, JSON.stringify(overrides, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist feature_flags.json:', err);
  }
}

export function isValidFeatureKey(key: string): key is FeatureKey {
  return VALID_FEATURE_KEYS.has(key);
}

export function getAllFeatureFlags(): FeatureFlagConfig[] {
  loadFeatureFlags();
  return DEFAULT_FEATURE_FLAGS.map((def) => {
    const ov = overrides[def.key];
    if (!ov) return { ...def };
    return {
      ...def,
      enabled: typeof ov.enabled === 'boolean' ? ov.enabled : def.enabled,
      disabledMessage:
        ov.disabledMessage && ov.disabledMessage.trim()
          ? ov.disabledMessage.trim()
          : def.disabledMessage,
      updatedAt: ov.updatedAt,
      updatedBy: ov.updatedBy,
    };
  });
}

export function getFeatureFlag(key: FeatureKey): FeatureFlagConfig | undefined {
  return getAllFeatureFlags().find((f) => f.key === key);
}

export function isFeatureEnabled(key: FeatureKey): boolean {
  const flag = getFeatureFlag(key);
  return flag ? flag.enabled : true;
}

export function updateFeatureFlag(
  key: FeatureKey,
  updates: { enabled?: boolean; disabledMessage?: string },
  actorName = 'Admin'
): FeatureFlagConfig | null {
  loadFeatureFlags();
  if (!isValidFeatureKey(key)) return null;

  const def = DEFAULT_FEATURE_FLAGS.find((f) => f.key === key);
  if (!def) return null;

  const prev = overrides[key];
  const now = new Date().toISOString();

  overrides[key] = {
    enabled:
      typeof updates.enabled === 'boolean'
        ? updates.enabled
        : prev
        ? prev.enabled
        : def.enabled,
    disabledMessage:
      typeof updates.disabledMessage === 'string'
        ? updates.disabledMessage.trim().slice(0, 240) || def.disabledMessage
        : prev?.disabledMessage || def.disabledMessage,
    updatedAt: now,
    updatedBy: actorName,
  };

  saveFeatureFlags();
  return getFeatureFlag(key) || null;
}

export function bulkUpdateFeatureFlags(
  updates: Array<{ key: string; enabled: boolean; disabledMessage?: string }>,
  actorName = 'Admin'
): FeatureFlagConfig[] {
  loadFeatureFlags();
  const now = new Date().toISOString();

  for (const item of updates) {
    if (!item || typeof item.key !== 'string' || !isValidFeatureKey(item.key)) continue;
    if (typeof item.enabled !== 'boolean') continue;
    const def = DEFAULT_FEATURE_FLAGS.find((f) => f.key === item.key);
    if (!def) continue;

    const prev = overrides[item.key];
    overrides[item.key] = {
      enabled: item.enabled,
      disabledMessage:
        typeof item.disabledMessage === 'string'
          ? item.disabledMessage.trim().slice(0, 240) || def.disabledMessage
          : prev?.disabledMessage || def.disabledMessage,
      updatedAt: now,
      updatedBy: actorName,
    };
  }

  saveFeatureFlags();
  return getAllFeatureFlags();
}

export function resetFeatureFlags(actorName = 'Admin'): FeatureFlagConfig[] {
  loadFeatureFlags();
  const now = new Date().toISOString();
  overrides = {};
  for (const def of DEFAULT_FEATURE_FLAGS) {
    overrides[def.key] = {
      enabled: true,
      disabledMessage: def.disabledMessage,
      updatedAt: now,
      updatedBy: actorName,
    };
  }
  saveFeatureFlags();
  return getAllFeatureFlags();
}
