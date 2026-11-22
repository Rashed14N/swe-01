import type { Course } from '../types';
import { db } from './db';
import { getServerSupabase } from './supabaseSync';

export interface StoredGradeEntry {
  grade: string;
  gradePoint: number;
  semester?: number;
  updatedAt?: string;
}

export interface StoredStudentCGPA {
  studentId: string;
  rollNo?: string;
  grades: Record<string, StoredGradeEntry>;
  customCourses: Course[];
  excludedCourses: string[];
  cgpa: number;
  updatedAt: string;
}

export const CGPA_STORE_AUDIT_ACTION = 'STUDENT_CGPA_STORE';

// Cache whether dedicated public.student_cgpa table exists in Supabase
let hasDedicatedTable: boolean | null = null;

/**
 * Normalizes a course code for reliable lookup across formats like
 * "SWE-111", "SWE 111", "swe_111" -> "SWE-111".
 */
export function normalizeCourseCode(code: string): string {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-');
}

function getAuditRowId(studentId: string): string {
  const safeId = String(studentId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `cgpa_store_${safeId}`;
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function normalizeStoredGrades(
  raw: any
): Record<string, StoredGradeEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, StoredGradeEntry> = {};
  for (const [code, val] of Object.entries(raw)) {
    if (!val || typeof val !== 'object') continue;
    const entry = val as any;
    const grade = String(entry.grade || '').trim().toUpperCase();
    if (!grade || grade === 'N/A' || grade === 'NOT_PUBLISHED') continue;
    const gp = Number(entry.gradePoint);
    result[normalizeCourseCode(code)] = {
      grade,
      gradePoint: Number.isFinite(gp) ? gp : 0,
      semester: typeof entry.semester === 'number' ? entry.semester : undefined,
      updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : undefined,
    };
  }
  return result;
}

function normalizeCustomCourses(raw: any): Course[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c) => c && typeof c === 'object' && typeof c.code === 'string' && c.code.trim().length > 0);
}

function normalizeExcludedCourses(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((c) => normalizeCourseCode(String(c || '')))
        .filter((c) => c.length > 0)
    )
  );
}

function loadFromLocalDb(studentId: string, rollNo?: string): StoredStudentCGPA {
  const localGrades = normalizeStoredGrades(db.getStudentGrades(studentId, rollNo));
  const localCustom = normalizeCustomCourses(db.getStudentCustomCourses(studentId));
  const localExcluded = normalizeExcludedCourses(db.getStudentExcludedCourses(studentId));
  const localCgpa = db.getStudentCGPA(studentId, rollNo) || 0;

  return {
    studentId,
    rollNo,
    grades: localGrades,
    customCourses: localCustom,
    excludedCourses: localExcluded,
    cgpa: localCgpa,
    updatedAt: '',
  };
}

function syncRecordIntoLocalDb(record: StoredStudentCGPA): void {
  const data = db.getData();
  if (!data.studentGrades) data.studentGrades = {};
  if (!data.studentCustomCourses) data.studentCustomCourses = {};
  if (!data.studentExcludedCourses) data.studentExcludedCourses = {};

  data.studentGrades[record.studentId] = { ...record.grades };
  if (record.rollNo && record.rollNo !== record.studentId) {
    data.studentGrades[record.rollNo] = { ...record.grades };
  }
  data.studentCustomCourses[record.studentId] = [...record.customCourses];
  data.studentExcludedCourses[record.studentId] = [...record.excludedCourses];

  const matchedUser = (data.users || []).find(
    (u) =>
      u.id === record.studentId ||
      u.studentId === record.studentId ||
      (record.rollNo && (u.id === record.rollNo || u.studentId === record.rollNo))
  );
  if (matchedUser) {
    matchedUser.cgpa = record.cgpa;
  }

  db.save();
}

async function readFromDedicatedTable(
  studentId: string,
  rollNo?: string
): Promise<StoredStudentCGPA | null> {
  const supabase = getServerSupabase();
  if (!supabase || hasDedicatedTable === false) return null;

  try {
    let query = supabase.from('student_cgpa').select('*');
    if (rollNo && rollNo !== studentId) {
      query = query.or(`student_id.eq.${studentId},roll_no.eq.${rollNo}`);
    } else {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query.order('updated_at', { ascending: false }).limit(1);
    if (error) {
      if (isTableMissingError(error)) {
        hasDedicatedTable = false;
      } else {
        console.warn('[CGPA Store] Dedicated table read warning:', error.message);
      }
      return null;
    }

    hasDedicatedTable = true;
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;

    return {
      studentId,
      rollNo: row.roll_no || rollNo,
      grades: normalizeStoredGrades(row.grades),
      customCourses: normalizeCustomCourses(row.custom_courses),
      excludedCourses: normalizeExcludedCourses(row.excluded_courses),
      cgpa: Number(row.cgpa) || 0,
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn('[CGPA Store] Dedicated table read exception:', err?.message || err);
    return null;
  }
}

async function readFromSupabaseFallback(
  studentId: string,
  rollNo?: string
): Promise<StoredStudentCGPA | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  try {
    const primaryId = getAuditRowId(studentId);
    const idsToCheck = [primaryId];
    if (rollNo && rollNo !== studentId) {
      idsToCheck.push(getAuditRowId(rollNo));
    }

    const { data, error } = await supabase
      .from('audit_logs')
      .select('id, actor_id, target, details, timestamp')
      .eq('action', CGPA_STORE_AUDIT_ACTION)
      .in('id', idsToCheck)
      .order('timestamp', { ascending: false })
      .limit(1);

    let row = Array.isArray(data) && data.length > 0 ? data[0] : null;

    // Secondary lookup by actor_id or target (rollNo) in case studentId format changed
    if (!row && !error) {
      const filters = [`actor_id.eq.${studentId}`];
      if (rollNo) {
        filters.push(`target.eq.${rollNo}`);
      }
      const { data: secondary } = await supabase
        .from('audit_logs')
        .select('id, actor_id, target, details, timestamp')
        .eq('action', CGPA_STORE_AUDIT_ACTION)
        .or(filters.join(','))
        .order('timestamp', { ascending: false })
        .limit(1);
      row = Array.isArray(secondary) && secondary.length > 0 ? secondary[0] : null;
    }

    if (error) {
      console.warn('[CGPA Store] Supabase fallback read error:', error.message);
      return null;
    }
    if (!row || !row.details) return null;

    const parsed = JSON.parse(row.details);
    return {
      studentId,
      rollNo: parsed.rollNo || row.target || rollNo,
      grades: normalizeStoredGrades(parsed.grades),
      customCourses: normalizeCustomCourses(parsed.customCourses),
      excludedCourses: normalizeExcludedCourses(parsed.excludedCourses),
      cgpa: Number(parsed.cgpa) || 0,
      updatedAt: parsed.updatedAt || row.timestamp || new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn('[CGPA Store] Supabase fallback parse/read exception:', err?.message || err);
    return null;
  }
}

/**
 * Loads a student's complete CGPA state (grades, custom courses, excluded courses).
 * Prioritizes Supabase PostgreSQL so data persists reliably across Vercel serverless
 * instances and server restarts, with automatic hydration into local cache.
 */
export async function loadStudentCGPA(
  studentId: string,
  rollNo?: string
): Promise<StoredStudentCGPA> {
  const localRecord = loadFromLocalDb(studentId, rollNo);

  // 1. Try dedicated public.student_cgpa table first
  const dedicated = await readFromDedicatedTable(studentId, rollNo);
  if (dedicated) {
    syncRecordIntoLocalDb(dedicated);
    return dedicated;
  }

  // 2. Try zero-migration Supabase persistence store
  const supabaseFallback = await readFromSupabaseFallback(studentId, rollNo);
  if (supabaseFallback) {
    syncRecordIntoLocalDb(supabaseFallback);
    return supabaseFallback;
  }

  // 3. If local DB already has grades (e.g. from data/database.json), keep them and migrate upward
  const hasLocalData =
    Object.keys(localRecord.grades).length > 0 ||
    localRecord.customCourses.length > 0 ||
    localRecord.excludedCourses.length > 0;

  if (hasLocalData) {
    const migrated: StoredStudentCGPA = {
      ...localRecord,
      updatedAt: new Date().toISOString(),
    };
    // Backfill to Supabase in background so subsequent serverless calls have it
    saveStudentCGPA(migrated).catch(() => {});
    return migrated;
  }

  return localRecord;
}

/**
 * Persists a student's complete CGPA state to Supabase PostgreSQL AND local JsonDB.
 */
export async function saveStudentCGPA(
  record: StoredStudentCGPA
): Promise<{ persistedToSupabase: boolean; backend: 'student_cgpa' | 'supabase_kv' | 'local'; error?: string }> {
  const cleanRecord: StoredStudentCGPA = {
    studentId: record.studentId,
    rollNo: record.rollNo,
    grades: normalizeStoredGrades(record.grades),
    customCourses: normalizeCustomCourses(record.customCourses),
    excludedCourses: normalizeExcludedCourses(record.excludedCourses),
    cgpa: Number.isFinite(record.cgpa) ? Number(record.cgpa.toFixed(2)) : 0,
    updatedAt: record.updatedAt || new Date().toISOString(),
  };

  // Always update in-memory + local JSON cache first
  syncRecordIntoLocalDb(cleanRecord);

  const supabase = getServerSupabase();
  if (!supabase) {
    return { persistedToSupabase: false, backend: 'local', error: 'Supabase client unavailable' };
  }

  // 1. Try dedicated public.student_cgpa table if available
  if (hasDedicatedTable !== false) {
    try {
      const { error } = await supabase.from('student_cgpa').upsert(
        {
          student_id: cleanRecord.studentId,
          roll_no: cleanRecord.rollNo || null,
          grades: cleanRecord.grades,
          custom_courses: cleanRecord.customCourses,
          excluded_courses: cleanRecord.excludedCourses,
          cgpa: cleanRecord.cgpa,
          updated_at: cleanRecord.updatedAt,
        },
        { onConflict: 'student_id' }
      );

      if (!error) {
        hasDedicatedTable = true;
        return { persistedToSupabase: true, backend: 'student_cgpa' };
      }

      if (isTableMissingError(error)) {
        hasDedicatedTable = false;
      } else {
        console.warn('[CGPA Store] Dedicated table write warning:', error.message);
      }
    } catch (err: any) {
      console.warn('[CGPA Store] Dedicated table write exception:', err?.message || err);
    }
  }

  // 2. Zero-migration Supabase persistence (deterministic upsert keyed per student)
  try {
    const payload = JSON.stringify({
      rollNo: cleanRecord.rollNo || null,
      grades: cleanRecord.grades,
      customCourses: cleanRecord.customCourses,
      excludedCourses: cleanRecord.excludedCourses,
      cgpa: cleanRecord.cgpa,
      updatedAt: cleanRecord.updatedAt,
    });

    const { error } = await supabase.from('audit_logs').upsert(
      {
        id: getAuditRowId(cleanRecord.studentId),
        actor_id: cleanRecord.studentId,
        actor_name: cleanRecord.rollNo || cleanRecord.studentId,
        action: CGPA_STORE_AUDIT_ACTION,
        target: cleanRecord.rollNo || cleanRecord.studentId,
        details: payload,
        timestamp: cleanRecord.updatedAt,
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.error('[CGPA Store] Supabase fallback write error:', error.message);
      return { persistedToSupabase: false, backend: 'local', error: error.message };
    }

    return { persistedToSupabase: true, backend: 'supabase_kv' };
  } catch (err: any) {
    console.error('[CGPA Store] Supabase fallback write exception:', err?.message || err);
    return { persistedToSupabase: false, backend: 'local', error: err?.message || 'Supabase write failed' };
  }
}

/**
 * Fetches all saved student CGPAs from Supabase for Admin directory views.
 */
export async function fetchAllStudentCGPAsFromSupabase(): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  const supabase = getServerSupabase();
  if (!supabase) return map;

  if (hasDedicatedTable !== false) {
    try {
      const { data, error } = await supabase
        .from('student_cgpa')
        .select('student_id, roll_no, cgpa');
      if (!error && Array.isArray(data)) {
        hasDedicatedTable = true;
        for (const row of data) {
          const val = Number(row.cgpa) || 0;
          if (row.student_id) map[row.student_id] = val;
          if (row.roll_no) map[row.roll_no] = val;
        }
        return map;
      }
      if (isTableMissingError(error)) {
        hasDedicatedTable = false;
      }
    } catch {
      // Fall through to fallback
    }
  }

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('actor_id, target, details')
      .eq('action', CGPA_STORE_AUDIT_ACTION);
    if (!error && Array.isArray(data)) {
      for (const row of data) {
        try {
          const parsed = row.details ? JSON.parse(row.details) : null;
          const val = Number(parsed?.cgpa) || 0;
          if (row.actor_id) map[row.actor_id] = val;
          if (row.target) map[row.target] = val;
        } catch {
          // ignore malformed row
        }
      }
    }
  } catch {
    // ignore
  }

  return map;
}
