import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DBData } from './db';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

let serverSupabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder') && !supabaseKey.includes('placeholder')) {
  try {
    serverSupabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    console.log('[Supabase] Initialized server-side sync with Supabase at:', supabaseUrl);
  } catch (err) {
    console.error('[Supabase] Initialization failed:', err);
  }
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
 * Hydrates the local database with rows from Supabase on startup if available.
 */
export async function hydrateFromSupabase(dbData: DBData): Promise<void> {
  if (!serverSupabase) return;
  try {
    console.log('[Supabase] Hydrating database from Supabase tables...');
    
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
