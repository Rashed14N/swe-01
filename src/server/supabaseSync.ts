import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import type { DBData } from './db.ts';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'supabase-config.json');

let currentSupabaseUrl = '';
let currentSupabaseKey = '';

// Try reading stored config file first
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.url) currentSupabaseUrl = parsed.url;
    if (parsed.key) currentSupabaseKey = parsed.key;
  } catch (err) {
    console.error('[Supabase] Failed to read supabase-config.json:', err);
  }
}

// Fallback to process.env
if (!currentSupabaseUrl) {
  currentSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
}
if (!currentSupabaseKey) {
  currentSupabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
}

let serverSupabase: SupabaseClient | null = null;

export function initSupabase(url?: string, key?: string): { success: boolean; message: string } {
  if (url) currentSupabaseUrl = url.trim();
  if (key) currentSupabaseKey = key.trim();

  if (
    currentSupabaseUrl &&
    currentSupabaseKey &&
    !currentSupabaseUrl.includes('placeholder') &&
    !currentSupabaseKey.includes('placeholder') &&
    currentSupabaseUrl.startsWith('https://')
  ) {
    try {
      serverSupabase = createClient(currentSupabaseUrl, currentSupabaseKey, {
        auth: { persistSession: false },
      });
      console.log('[Supabase] Initialized server-side client at:', currentSupabaseUrl);

      // Persist to file
      try {
        const dir = path.dirname(CONFIG_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ url: currentSupabaseUrl, key: currentSupabaseKey }, null, 2), 'utf-8');
      } catch (err) {
        console.error('[Supabase] Failed to write config file:', err);
      }

      return { success: true, message: `Connected to ${currentSupabaseUrl}` };
    } catch (err: any) {
      console.error('[Supabase] Initialization failed:', err);
      serverSupabase = null;
      return { success: false, message: err?.message || 'Failed to initialize client' };
    }
  }
  serverSupabase = null;
  return { success: false, message: 'Supabase URL or Key is missing or invalid' };
}

// Initialize on boot
initSupabase();

export function getServerSupabase(): SupabaseClient | null {
  return serverSupabase;
}

export function getSupabaseStatus() {
  const isConfigured = Boolean(
    serverSupabase &&
    currentSupabaseUrl &&
    currentSupabaseKey &&
    !currentSupabaseUrl.includes('placeholder')
  );

  return {
    isConfigured,
    url: currentSupabaseUrl ? `${currentSupabaseUrl.substring(0, 20)}...` : '',
    hasKey: Boolean(currentSupabaseKey),
  };
}

/**
 * Tests connection to each individual table in Supabase and returns detailed diagnostic report.
 */
export async function testSupabaseConnectionDetails() {
  if (!serverSupabase) {
    return {
      connected: false,
      message: 'Supabase client is not configured yet with valid URL & API Key.',
      tables: {},
    };
  }

  const tables = [
    'users',
    'batches',
    'courses',
    'routine_slots',
    'exams',
    'announcements',
    'department_notices',
    'resources',
  ];

  const tableResults: Record<string, { ok: boolean; count?: number; error?: string }> = {};
  let anyError = false;

  for (const t of tables) {
    try {
      const { count, error } = await serverSupabase
        .from(t)
        .select('*', { count: 'exact', head: true });

      if (error) {
        tableResults[t] = { ok: false, error: error.message || error.hint || 'Query failed' };
        anyError = true;
      } else {
        tableResults[t] = { ok: true, count: count ?? 0 };
      }
    } catch (err: any) {
      tableResults[t] = { ok: false, error: err.message || 'Exception occurred' };
      anyError = true;
    }
  }

  return {
    connected: !anyError,
    message: anyError
      ? 'Supabase connection failed (e.g. Invalid API key, typo in credentials, or table not created yet in SQL editor).'
      : 'All Supabase tables are accessible and connected successfully!',
    tables: tableResults,
  };
}

/**
 * Syncs any updated entity directly to Supabase table in background.
 */
export async function syncToSupabase(table: string, data: any): Promise<void> {
  if (!serverSupabase) return;
  try {
    const { error } = await serverSupabase.from(table).upsert(data);
    if (error) {
      console.error(`[Supabase Sync Error in ${table}]:`, error.message);
    } else {
      console.log(`[Supabase Sync Success]: Synced to ${table}`);
    }
  } catch (err: any) {
    console.error(`[Supabase Sync Failed]:`, err.message);
  }
}

/**
 * Deletes an item from a Supabase table.
 */
export async function deleteFromSupabase(table: string, id: string): Promise<void> {
  if (!serverSupabase) return;
  try {
    const { error } = await serverSupabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`[Supabase Delete Error in ${table}]:`, error.message);
    }
  } catch (err: any) {
    console.error(`[Supabase Delete Failed]:`, err.message);
  }
}

/**
 * Pushes all in-memory local data to Supabase in one go.
 */
export async function syncAllLocalToSupabase(dbData: DBData): Promise<{
  success: boolean;
  synced: Record<string, number>;
  errors: string[];
}> {
  if (!serverSupabase) {
    return {
      success: false,
      synced: {},
      errors: ['Supabase is not configured.'],
    };
  }

  const synced: Record<string, number> = {};
  const errors: string[] = [];

  // 1. Sync Batches
  try {
    const batchRows = dbData.batches.map(b => ({
      id: b.id,
      name: b.name,
      admission_year: b.admissionYear,
      current_semester: b.currentSemester,
      academic_session: b.academicSession,
      semester_mode: b.semesterMode || 'SEQUENCE',
      status: b.status || 'ACTIVE',
      last_progressed_at: b.lastProgressedAt,
      cr_ids: b.crIds || [],
      created_at: b.createdAt,
    }));
    if (batchRows.length > 0) {
      const { error } = await serverSupabase.from('batches').upsert(batchRows);
      if (error) errors.push(`Batches: ${error.message}`);
      else synced.batches = batchRows.length;
    }
  } catch (e: any) {
    errors.push(`Batches: ${e.message}`);
  }

  // 2. Sync Courses
  try {
    const courseRows = dbData.courses.map(c => ({
      id: c.id,
      code: c.code,
      title: c.title,
      short_name: c.shortName,
      credits: c.credits,
      type: c.type,
      semester: c.semester,
      assigned_faculty_name: c.assignedFacultyName,
      batch_ids: c.batchIds || [],
    }));
    if (courseRows.length > 0) {
      const { error } = await serverSupabase.from('courses').upsert(courseRows);
      if (error) errors.push(`Courses: ${error.message}`);
      else synced.courses = courseRows.length;
    }
  } catch (e: any) {
    errors.push(`Courses: ${e.message}`);
  }

  // 3. Sync Users
  try {
    const userRows = dbData.users.map(u => ({
      id: u.id,
      student_id: u.studentId,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      batch_id: u.batchId,
      batch_name: u.batchName,
      current_semester: u.currentSemester,
      profile_image: u.profileImage,
      status: u.status,
      points: u.points || 0,
      created_at: u.createdAt,
      updated_at: u.updatedAt,
    }));
    if (userRows.length > 0) {
      const { error } = await serverSupabase.from('users').upsert(userRows);
      if (error) errors.push(`Users: ${error.message}`);
      else synced.users = userRows.length;
    }
  } catch (e: any) {
    errors.push(`Users: ${e.message}`);
  }

  // 4. Sync Routine Slots
  try {
    const routineRows = dbData.routines.map(rt => ({
      id: rt.id,
      batch_id: rt.batchId,
      day: rt.day,
      start_time: rt.startTime,
      end_time: rt.endTime,
      course_id: rt.courseId,
      course_code: rt.courseCode,
      course_short_name: rt.courseShortName,
      course_title: rt.courseTitle,
      teacher_name: rt.teacherName,
      teacher_short_name: rt.teacherShortName,
      room: rt.room,
    }));
    if (routineRows.length > 0) {
      const { error } = await serverSupabase.from('routine_slots').upsert(routineRows);
      if (error) errors.push(`Routines: ${error.message}`);
      else synced.routines = routineRows.length;
    }
  } catch (e: any) {
    errors.push(`Routines: ${e.message}`);
  }

  // 5. Sync Announcements
  try {
    const annRows = dbData.announcements.map(a => ({
      id: a.id,
      batch_id: a.batchId,
      title: a.title,
      description: a.description,
      publish_date: a.publishDate,
      expiry_date: a.expiryDate,
      priority: a.priority,
      created_by: a.createdBy,
      created_by_name: a.createdByName,
      created_at: a.createdAt,
    }));
    if (annRows.length > 0) {
      const { error } = await serverSupabase.from('announcements').upsert(annRows);
      if (error) errors.push(`Announcements: ${error.message}`);
      else synced.announcements = annRows.length;
    }
  } catch (e: any) {
    errors.push(`Announcements: ${e.message}`);
  }

  // 6. Sync Exams
  try {
    const examRows = dbData.exams.map(ex => ({
      id: ex.id,
      batch_id: ex.batchId,
      course_id: ex.courseId,
      course_code: ex.courseCode,
      course_title: ex.courseTitle,
      type: ex.type,
      title: ex.title,
      date: ex.date,
      start_time: ex.startTime,
      room: ex.room,
      description: ex.description,
      created_by: ex.createdBy,
      created_by_name: ex.createdByName,
      created_at: ex.createdAt,
    }));
    if (examRows.length > 0) {
      const { error } = await serverSupabase.from('exams').upsert(examRows);
      if (error) errors.push(`Exams: ${error.message}`);
      else synced.exams = examRows.length;
    }
  } catch (e: any) {
    errors.push(`Exams: ${e.message}`);
  }

  // 7. Sync Notices
  try {
    const noticeRows = dbData.departmentNotices.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category,
      publish_date: n.publishDate,
      is_important: n.isImportant,
      attachment_url: n.attachmentUrl,
      created_by: n.createdBy,
      created_by_name: n.createdByName,
      created_at: n.createdAt,
    }));
    if (noticeRows.length > 0) {
      const { error } = await serverSupabase.from('department_notices').upsert(noticeRows);
      if (error) errors.push(`Department Notices: ${error.message}`);
      else synced.departmentNotices = noticeRows.length;
    }
  } catch (e: any) {
    errors.push(`Department Notices: ${e.message}`);
  }

  // 8. Sync Resources
  try {
    const resourceRows = dbData.resources.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      course_id: r.courseId,
      course_code: r.courseCode,
      course_title: r.courseTitle,
      semester: r.semester,
      academic_year: r.academicYear,
      exam_type: r.examType,
      faculty_name: r.facultyName,
      target_batch: r.targetBatch,
      lab_category: r.labCategory,
      description: r.description,
      file_url: r.fileUrl,
      file_name: r.fileName,
      file_size: r.fileSize,
      file_type: r.fileType,
      uploader_id: r.uploaderId,
      uploader_student_id: r.uploaderStudentId,
      uploader_name: r.uploaderName,
      uploader_batch_name: r.uploaderBatchName,
      status: r.status,
      rejection_reason: r.rejectionReason,
      download_count: r.downloadCount || 0,
      created_at: r.createdAt,
      verified_at: r.verifiedAt,
    }));
    if (resourceRows.length > 0) {
      const { error } = await serverSupabase.from('resources').upsert(resourceRows);
      if (error) errors.push(`Resources: ${error.message}`);
      else synced.resources = resourceRows.length;
    }
  } catch (e: any) {
    errors.push(`Resources: ${e.message}`);
  }

  return {
    success: errors.length === 0,
    synced,
    errors,
  };
}

/**
 * Hydrates the local database with rows from Supabase on startup if available.
 */
export async function hydrateFromSupabase(dbData: DBData): Promise<void> {
  if (!serverSupabase) return;
  try {
    console.log('[Supabase] Hydrating database from Supabase tables...');
    
    // Fetch batches
    const { data: batches } = await serverSupabase.from('batches').select('*');
    if (batches && batches.length > 0) {
      batches.forEach(b => {
        const mappedBatch = {
          id: b.id,
          name: b.name,
          admissionYear: b.admission_year,
          currentSemester: b.current_semester,
          academicSession: b.academic_session,
          semesterMode: (b.semester_mode === 'MANUAL' ? 'MANUAL' : 'SEQUENCE') as any,
          status: (b.status || 'ACTIVE') as any,
          lastProgressedAt: b.last_progressed_at,
          crIds: Array.isArray(b.cr_ids) ? b.cr_ids : [],
          createdAt: b.created_at,
        };
        const existingIdx = dbData.batches.findIndex(x => x.id === b.id);
        if (existingIdx >= 0) {
          dbData.batches[existingIdx] = mappedBatch;
        } else {
          dbData.batches.push(mappedBatch);
        }
      });
    }

    // Fetch users
    const { data: users } = await serverSupabase.from('users').select('*');
    if (users && users.length > 0) {
      users.forEach(u => {
        const mappedUser = {
          id: u.id,
          studentId: u.student_id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          batchId: u.batch_id,
          batchName: u.batch_name,
          currentSemester: u.current_semester,
          profileImage: u.profile_image,
          status: u.status,
          points: u.points || 0,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
        };
        const existingIdx = dbData.users.findIndex(x => x.id === u.id || x.studentId === u.student_id);
        if (existingIdx >= 0) {
          dbData.users[existingIdx] = mappedUser;
        } else {
          dbData.users.push(mappedUser);
        }
      });
    }

    // Fetch announcements
    const { data: announcements } = await serverSupabase.from('announcements').select('*');
    if (announcements && announcements.length > 0) {
      announcements.forEach(a => {
        const mappedAnn = {
          id: a.id,
          batchId: a.batch_id,
          title: a.title,
          description: a.description,
          publishDate: a.publish_date,
          expiryDate: a.expiry_date,
          priority: a.priority,
          createdBy: a.created_by,
          createdByName: a.created_by_name,
          createdAt: a.created_at,
        };
        const existingIdx = dbData.announcements.findIndex(x => x.id === a.id);
        if (existingIdx >= 0) {
          dbData.announcements[existingIdx] = mappedAnn;
        } else {
          dbData.announcements.push(mappedAnn);
        }
      });
    }

    // Fetch resources
    const { data: resources } = await serverSupabase.from('resources').select('*');
    if (resources && resources.length > 0) {
      resources.forEach(r => {
        const mappedRes = {
          id: r.id,
          title: r.title,
          type: r.type,
          courseId: r.course_id,
          courseCode: r.course_code,
          courseTitle: r.course_title,
          semester: r.semester,
          academicYear: r.academic_year,
          examType: r.exam_type,
          facultyName: r.faculty_name,
          targetBatch: r.target_batch,
          labCategory: r.lab_category,
          description: r.description,
          fileUrl: r.file_url,
          fileName: r.file_name,
          fileSize: r.file_size,
          fileType: r.file_type,
          uploaderId: r.uploader_id,
          uploaderStudentId: r.uploader_student_id,
          uploaderName: r.uploader_name,
          uploaderBatchName: r.uploader_batch_name,
          status: r.status,
          rejectionReason: r.rejection_reason,
          downloadCount: r.download_count || 0,
          createdAt: r.created_at,
          verifiedAt: r.verified_at,
        };
        const existingIdx = dbData.resources.findIndex(x => x.id === r.id);
        if (existingIdx >= 0) {
          dbData.resources[existingIdx] = mappedRes;
        } else {
          dbData.resources.push(mappedRes);
        }
      });
    }

    // Fetch routine slots
    const { data: routines } = await serverSupabase.from('routine_slots').select('*');
    if (routines && routines.length > 0) {
      routines.forEach(rt => {
        const mappedSlot = {
          id: rt.id,
          batchId: rt.batch_id,
          day: rt.day,
          startTime: rt.start_time,
          endTime: rt.end_time,
          courseId: rt.course_id,
          courseCode: rt.course_code,
          courseShortName: rt.course_short_name,
          courseTitle: rt.course_title,
          teacherName: rt.teacher_name,
          teacherShortName: rt.teacher_short_name,
          room: rt.room,
        };
        const existingIdx = dbData.routines.findIndex(x => x.id === rt.id);
        if (existingIdx >= 0) {
          dbData.routines[existingIdx] = mappedSlot;
        } else {
          dbData.routines.push(mappedSlot);
        }
      });
    }

    // Fetch exams
    const { data: exams } = await serverSupabase.from('exams').select('*');
    if (exams && exams.length > 0) {
      exams.forEach(ex => {
        const mappedExam = {
          id: ex.id,
          batchId: ex.batch_id,
          courseId: ex.course_id,
          courseCode: ex.course_code,
          courseTitle: ex.course_title,
          type: ex.type,
          title: ex.title,
          date: ex.date,
          startTime: ex.start_time,
          room: ex.room,
          description: ex.description,
          createdBy: ex.created_by,
          createdByName: ex.created_by_name,
          createdAt: ex.created_at,
        };
        const existingIdx = dbData.exams.findIndex(x => x.id === ex.id);
        if (existingIdx >= 0) {
          dbData.exams[existingIdx] = mappedExam;
        } else {
          dbData.exams.push(mappedExam);
        }
      });
    }

    // Fetch notices
    const { data: notices } = await serverSupabase.from('department_notices').select('*');
    if (notices && notices.length > 0) {
      notices.forEach(n => {
        const mappedNotice = {
          id: n.id,
          title: n.title,
          content: n.content,
          category: n.category,
          publishDate: n.publish_date,
          isImportant: n.is_important,
          attachmentUrl: n.attachment_url,
          createdBy: n.created_by,
          createdByName: n.created_by_name,
          createdAt: n.created_at,
        };
        const existingIdx = dbData.departmentNotices.findIndex(x => x.id === n.id);
        if (existingIdx >= 0) {
          dbData.departmentNotices[existingIdx] = mappedNotice;
        } else {
          dbData.departmentNotices.push(mappedNotice);
        }
      });
    }
  } catch (err: any) {
    console.error('[Supabase Hydrate Error]:', err.message);
  }
}

/**
 * Directly looks up a user in Supabase in real-time if not present in memory.
 */
export async function fetchUserFromSupabase(identifier: string): Promise<any | null> {
  if (!serverSupabase) return null;
  try {
    const term = identifier.trim().toLowerCase();
    const { data, error } = await serverSupabase
      .from('users')
      .select('*')
      .or(`student_id.ilike.${term},email.ilike.${term},id.eq.${term}`)
      .limit(1);

    if (error || !data || data.length === 0) return null;
    const u = data[0];
    return {
      id: u.id,
      studentId: u.student_id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      batchId: u.batch_id,
      batchName: u.batch_name,
      currentSemester: u.current_semester,
      profileImage: u.profile_image,
      status: u.status,
      points: u.points || 0,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    };
  } catch {
    return null;
  }
}

/**
 * Starts continuous background 15-second sync between local DB and Supabase
 */
export function startAutoSync(getDbData: () => DBData, intervalMs = 15000) {
  setInterval(async () => {
    if (serverSupabase) {
      try {
        const dbData = getDbData();
        await hydrateFromSupabase(dbData);
      } catch {}
    }
  }, intervalMs);
}


