import { getSupabase, checkIsSupabaseConfigured } from '../lib/supabase';
import { User, RoutineSlot, Exam, BatchAnnouncement, DepartmentNotice, Resource, Course } from '../types';
import { deduplicateAndMergeRoutineSlots } from '../utils/routineUtils';
import { getFromCache, setInCache, invalidateCache, withTimeout } from './dataCache';

// Maximum time (ms) to wait for external remote Supabase before falling back to ultra-fast local /api
const SUPABASE_TIMEOUT_MS = 650;
const CACHE_TTL_MS = 45000;

export const saveUserToSupabase = async (user: User): Promise<boolean> => {
  if (!checkIsSupabaseConfigured()) return false;
  try {
    const client = getSupabase();
    const { error } = await client.from('users').upsert({
      id: user.id,
      student_id: user.studentId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      batch_id: user.batchId,
      batch_name: user.batchName,
      current_semester: user.currentSemester,
      profile_image: user.profileImage,
      status: user.status,
      points: user.points || 0,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
};

export const fetchRoutinesFromSupabase = async (batchId?: string): Promise<RoutineSlot[]> => {
  const cacheKey = `routines_${batchId || 'all'}`;
  const cached = getFromCache<RoutineSlot[]>(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  const fallbackToApi = async (): Promise<RoutineSlot[]> => {
    try {
      const res = await fetch(`/api/routines?batchId=${batchId || ''}`);
      if (res.ok) {
        const json = await res.json();
        const slots = deduplicateAndMergeRoutineSlots(json.routines || []);
        if (slots.length > 0) {
          setInCache(cacheKey, slots, CACHE_TTL_MS);
        }
        return slots;
      }
    } catch {
      // ignore
    }
    return [];
  };

  if (!checkIsSupabaseConfigured()) {
    return fallbackToApi();
  }

  try {
    const queryPromise = (async () => {
      const client = getSupabase();
      let query = client.from('routine_slots').select('*');
      if (batchId) {
        const norm = batchId.trim().toLowerCase().replace(/th$|st$|nd$|rd$/i, '');
        const candidates = [
          batchId,
          norm,
          `${norm}th`,
          ...(norm === 'batch-13' ? ['batch-1788450159710'] : []),
          ...(batchId === 'batch-1788450159710' ? ['batch-13', 'batch-13th'] : [])
        ];
        query = query.in('batch_id', candidates);
      }
      return query;
    })();

    const result = await withTimeout(queryPromise, SUPABASE_TIMEOUT_MS, null);
    if (!result || result.error || !result.data || result.data.length === 0) {
      return fallbackToApi();
    }

    const mapped: RoutineSlot[] = result.data.map((r: any) => ({
      id: r.id,
      batchId: r.batch_id,
      day: r.day,
      startTime: r.start_time,
      endTime: r.end_time,
      courseId: r.course_id,
      courseCode: r.course_code,
      courseShortName: r.course_short_name,
      courseTitle: r.course_title,
      teacherName: r.teacher_name,
      teacherShortName: r.teacher_short_name,
      room: r.room,
    }));

    const finalSlots = deduplicateAndMergeRoutineSlots(mapped);
    setInCache(cacheKey, finalSlots, CACHE_TTL_MS);
    return finalSlots;
  } catch {
    return fallbackToApi();
  }
};

export const saveRoutineToSupabase = async (slot: RoutineSlot): Promise<boolean> => {
  invalidateCache('routines_');
  invalidateCache('dashboard_');
  if (!checkIsSupabaseConfigured()) return false;
  try {
    const client = getSupabase();
    const { error } = await client.from('routine_slots').upsert({
      id: slot.id,
      batch_id: slot.batchId,
      day: slot.day,
      start_time: slot.startTime,
      end_time: slot.endTime,
      course_id: slot.courseId,
      course_code: slot.courseCode,
      course_short_name: slot.courseShortName,
      course_title: slot.courseTitle,
      teacher_name: slot.teacherName,
      teacher_short_name: slot.teacherShortName,
      room: slot.room,
    });
    return !error;
  } catch {
    return false;
  }
};

export const fetchExamsFromSupabase = async (batchId?: string): Promise<Exam[]> => {
  const cacheKey = `exams_${batchId || 'all'}`;
  const cached = getFromCache<Exam[]>(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  const fallbackToApi = async (): Promise<Exam[]> => {
    try {
      const res = await fetch(`/api/exams?batchId=${batchId || ''}&includePast=true`);
      if (res.ok) {
        const json = await res.json();
        const items = json.exams || [];
        if (items.length > 0) {
          setInCache(cacheKey, items, CACHE_TTL_MS);
        }
        return items;
      }
    } catch {
      // ignore
    }
    return [];
  };

  if (!checkIsSupabaseConfigured()) return fallbackToApi();

  try {
    const queryPromise = (async () => {
      const client = getSupabase();
      let query = client.from('exams').select('*').order('date', { ascending: true });
      if (batchId) {
        query = query.eq('batch_id', batchId);
      }
      return query;
    })();

    const result = await withTimeout(queryPromise, SUPABASE_TIMEOUT_MS, null);
    if (!result || result.error || !result.data || result.data.length === 0) {
      return fallbackToApi();
    }

    const items: Exam[] = result.data.map((e: any) => ({
      id: e.id,
      batchId: e.batch_id,
      courseId: e.course_id,
      courseCode: e.course_code,
      courseTitle: e.course_title,
      type: e.type,
      title: e.title,
      date: e.date,
      startTime: e.start_time,
      room: e.room,
      description: e.description,
      createdBy: e.created_by,
      createdByName: e.created_by_name,
      createdAt: e.created_at,
    }));

    setInCache(cacheKey, items, CACHE_TTL_MS);
    return items;
  } catch {
    return fallbackToApi();
  }
};

export const saveExamToSupabase = async (exam: Exam): Promise<boolean> => {
  invalidateCache('exams_');
  invalidateCache('dashboard_');
  if (!checkIsSupabaseConfigured()) return false;
  try {
    const client = getSupabase();
    const { error } = await client.from('exams').upsert({
      id: exam.id,
      batch_id: exam.batchId,
      course_id: exam.courseId,
      course_code: exam.courseCode,
      course_title: exam.courseTitle,
      type: exam.type,
      title: exam.title,
      date: exam.date,
      start_time: exam.startTime,
      room: exam.room,
      description: exam.description,
      created_by: exam.createdBy,
      created_by_name: exam.createdByName,
    });
    return !error;
  } catch {
    return false;
  }
};

export const fetchAnnouncementsFromSupabase = async (batchId?: string): Promise<BatchAnnouncement[]> => {
  const cacheKey = `announcements_${batchId || 'all'}`;
  const cached = getFromCache<BatchAnnouncement[]>(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  const fallbackToApi = async (): Promise<BatchAnnouncement[]> => {
    try {
      const res = await fetch(`/api/announcements?batchId=${batchId || ''}`);
      if (res.ok) {
        const json = await res.json();
        const items = json.announcements || [];
        if (items.length > 0) {
          setInCache(cacheKey, items, CACHE_TTL_MS);
        }
        return items;
      }
    } catch {
      // ignore
    }
    return [];
  };

  if (!checkIsSupabaseConfigured()) return fallbackToApi();

  try {
    const queryPromise = (async () => {
      const client = getSupabase();
      let query = client.from('announcements').select('*').order('created_at', { ascending: false });
      if (batchId) {
        query = query.eq('batch_id', batchId);
      }
      return query;
    })();

    const result = await withTimeout(queryPromise, SUPABASE_TIMEOUT_MS, null);
    if (!result || result.error || !result.data || result.data.length === 0) {
      return fallbackToApi();
    }

    const items: BatchAnnouncement[] = result.data.map((a: any) => ({
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
    }));

    setInCache(cacheKey, items, CACHE_TTL_MS);
    return items;
  } catch {
    return fallbackToApi();
  }
};

export const saveAnnouncementToSupabase = async (announcement: BatchAnnouncement): Promise<boolean> => {
  invalidateCache('announcements_');
  invalidateCache('dashboard_');
  if (!checkIsSupabaseConfigured()) return false;
  try {
    const client = getSupabase();
    const { error } = await client.from('announcements').upsert({
      id: announcement.id,
      batch_id: announcement.batchId,
      title: announcement.title,
      description: announcement.description,
      publish_date: announcement.publishDate,
      expiry_date: announcement.expiryDate,
      priority: announcement.priority,
      created_by: announcement.createdBy,
      created_by_name: announcement.createdByName,
    });
    return !error;
  } catch {
    return false;
  }
};

export const fetchNoticesFromSupabase = async (): Promise<DepartmentNotice[]> => {
  const cacheKey = 'notices_all';
  const cached = getFromCache<DepartmentNotice[]>(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  const fallbackToApi = async (): Promise<DepartmentNotice[]> => {
    try {
      const res = await fetch('/api/notices');
      if (res.ok) {
        const json = await res.json();
        const items = json.notices || [];
        if (items.length > 0) {
          setInCache(cacheKey, items, CACHE_TTL_MS);
        }
        return items;
      }
    } catch {
      // ignore
    }
    return [];
  };

  if (!checkIsSupabaseConfigured()) return fallbackToApi();

  try {
    const queryPromise = (async () => {
      const client = getSupabase();
      return client
        .from('department_notices')
        .select('*')
        .order('publish_date', { ascending: false });
    })();

    const result = await withTimeout(queryPromise, SUPABASE_TIMEOUT_MS, null);
    if (!result || result.error || !result.data || result.data.length === 0) {
      return fallbackToApi();
    }

    const items: DepartmentNotice[] = result.data.map((n: any) => ({
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
    }));

    setInCache(cacheKey, items, CACHE_TTL_MS);
    return items;
  } catch {
    return fallbackToApi();
  }
};

export const saveNoticeToSupabase = async (notice: DepartmentNotice): Promise<boolean> => {
  invalidateCache('notices_');
  invalidateCache('dashboard_');
  if (!checkIsSupabaseConfigured()) return false;
  try {
    const client = getSupabase();
    const { error } = await client.from('department_notices').upsert({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      category: notice.category,
      publish_date: notice.publishDate,
      is_important: notice.isImportant,
      attachment_url: notice.attachmentUrl,
      created_by: notice.createdBy,
      created_by_name: notice.createdByName,
    });
    return !error;
  } catch {
    return false;
  }
};

export const fetchResourcesFromSupabase = async (type?: 'QUESTION' | 'NOTE' | 'LAB'): Promise<Resource[]> => {
  const cacheKey = `resources_${type || 'all'}`;
  const cached = getFromCache<Resource[]>(cacheKey, CACHE_TTL_MS);
  if (cached) return cached;

  const fallbackToApi = async (): Promise<Resource[]> => {
    try {
      const res = await fetch(`/api/resources?type=${type || ''}`);
      if (res.ok) {
        const json = await res.json();
        const items = json.resources || [];
        if (items.length > 0) {
          setInCache(cacheKey, items, CACHE_TTL_MS);
        }
        return items;
      }
    } catch {
      // ignore
    }
    return [];
  };

  if (!checkIsSupabaseConfigured()) return fallbackToApi();

  try {
    const queryPromise = (async () => {
      const client = getSupabase();
      let query = client.from('resources').select('*').order('created_at', { ascending: false });
      if (type) {
        query = query.eq('type', type);
      }
      return query;
    })();

    const result = await withTimeout(queryPromise, SUPABASE_TIMEOUT_MS, null);
    if (!result || result.error || !result.data || result.data.length === 0) {
      return fallbackToApi();
    }

    const items: Resource[] = result.data.map((res: any) => ({
      id: res.id,
      title: res.title,
      type: res.type,
      courseId: res.course_id,
      courseCode: res.course_code,
      courseTitle: res.course_title,
      semester: res.semester,
      academicYear: res.academic_year,
      examType: res.exam_type,
      facultyName: res.faculty_name,
      targetBatch: res.target_batch,
      labCategory: res.lab_category,
      driveFileId: res.drive_file_id,
      fileUrl: res.file_url,
      fileName: res.file_name,
      fileSize: res.file_size,
      fileType: res.file_type,
      uploaderId: res.uploader_id,
      uploaderStudentId: res.uploader_student_id,
      uploaderName: res.uploader_name,
      uploaderBatchName: res.uploader_batch_name,
      status: res.status,
      rejectionReason: res.rejection_reason,
      downloadCount: res.download_count,
      verifiedAt: res.verified_at,
      createdAt: res.created_at,
    }));

    setInCache(cacheKey, items, CACHE_TTL_MS);
    return items;
  } catch {
    return fallbackToApi();
  }
};

export const saveResourceToSupabase = async (item: Resource): Promise<boolean> => {
  invalidateCache('resources_');
  if (!checkIsSupabaseConfigured()) return false;
  try {
    const client = getSupabase();
    const { error } = await client.from('resources').upsert({
      id: item.id,
      title: item.title,
      type: item.type,
      course_id: item.courseId,
      course_code: item.courseCode,
      course_title: item.courseTitle,
      semester: item.semester,
      academic_year: item.academicYear,
      exam_type: item.examType,
      faculty_name: item.facultyName,
      target_batch: item.targetBatch,
      lab_category: item.labCategory,
      drive_file_id: (item as any).driveFileId || null,
      file_url: item.fileUrl,
      fileName: item.fileName,
      fileSize: item.fileSize,
      fileType: item.fileType,
      uploader_id: item.uploaderId,
      uploader_student_id: item.uploaderStudentId,
      uploader_name: item.uploaderName,
      uploader_batch_name: item.uploaderBatchName,
      status: item.status,
      rejection_reason: item.rejectionReason,
      download_count: item.downloadCount || 0,
      verified_at: item.verifiedAt,
    });
    return !error;
  } catch {
    return false;
  }
};

export const fetchCoursesFromSupabase = async (semester?: number, batchId?: string): Promise<Course[]> => {
  const cacheKey = `courses_${semester || 'all'}_${batchId || 'all'}`;
  const cached = getFromCache<Course[]>(cacheKey, CACHE_TTL_MS * 2);
  if (cached) return cached;

  const fallbackToApi = async (): Promise<Course[]> => {
    try {
      const res = await fetch(`/api/courses?batchId=${batchId || ''}${semester ? `&semester=${semester}` : ''}`);
      if (res.ok) {
        const json = await res.json();
        const items = json.courses || [];
        if (items.length > 0) {
          setInCache(cacheKey, items, CACHE_TTL_MS * 2);
        }
        return items;
      }
    } catch {
      // ignore
    }
    return [];
  };

  if (!checkIsSupabaseConfigured()) return fallbackToApi();

  try {
    const queryPromise = (async () => {
      const client = getSupabase();
      let targetSemester = semester;

      if (!targetSemester && batchId) {
        const { data: batchData } = await client
          .from('batches')
          .select('current_semester')
          .eq('id', batchId)
          .maybeSingle();
        if (batchData?.current_semester) {
          targetSemester = batchData.current_semester;
        }
      }

      let query = client.from('courses').select('*');
      if (targetSemester) {
        query = query.eq('semester', targetSemester);
      }
      return query;
    })();

    const result = await withTimeout(queryPromise, SUPABASE_TIMEOUT_MS, null);
    if (!result || result.error || !result.data || result.data.length === 0) {
      return fallbackToApi();
    }

    let courses: Course[] = result.data.map((c: any) => ({
      id: c.id,
      code: c.code,
      shortName: c.short_name,
      title: c.title,
      credits: c.credits,
      type: c.type,
      semester: c.semester,
      assignedFacultyId: c.assigned_faculty_id,
      assignedFacultyName: c.assigned_faculty_name,
      batchIds: c.batch_ids || [],
    }));

    if (batchId) {
      courses = courses.filter(c => c.batchIds?.includes(batchId) || (semester && c.semester === semester));
    }

    if (courses.length > 0) {
      setInCache(cacheKey, courses, CACHE_TTL_MS * 2);
      return courses;
    }
    return fallbackToApi();
  } catch {
    return fallbackToApi();
  }
};
