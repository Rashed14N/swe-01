import { getSupabase, checkIsSupabaseConfigured } from '../lib/supabase';
import { User, RoutineSlot, Exam, BatchAnnouncement, DepartmentNotice, Resource, Course } from '../types';

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
  if (!checkIsSupabaseConfigured()) return [];
  try {
    const client = getSupabase();
    let query = client.from('routine_slots').select('*');
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((r: any) => ({
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
  } catch {
    return [];
  }
};

export const saveRoutineToSupabase = async (slot: RoutineSlot): Promise<boolean> => {
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
  if (!checkIsSupabaseConfigured()) return [];
  try {
    const client = getSupabase();
    let query = client.from('exams').select('*').order('date', { ascending: true });
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((e: any) => ({
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
  } catch {
    return [];
  }
};

export const saveExamToSupabase = async (exam: Exam): Promise<boolean> => {
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
  if (!checkIsSupabaseConfigured()) return [];
  try {
    const client = getSupabase();
    let query = client.from('announcements').select('*').order('created_at', { ascending: false });
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((a: any) => ({
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
  } catch {
    return [];
  }
};

export const saveAnnouncementToSupabase = async (announcement: BatchAnnouncement): Promise<boolean> => {
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
  if (!checkIsSupabaseConfigured()) return [];
  try {
    const client = getSupabase();
    const { data, error } = await client
      .from('department_notices')
      .select('*')
      .order('publish_date', { ascending: false });
    if (error || !data) return [];
    return data.map((n: any) => ({
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
  } catch {
    return [];
  }
};

export const saveNoticeToSupabase = async (notice: DepartmentNotice): Promise<boolean> => {
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
  if (!checkIsSupabaseConfigured()) return [];
  try {
    const client = getSupabase();
    let query = client.from('resources').select('*').order('created_at', { ascending: false });
    if (type) {
      query = query.eq('type', type);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((res: any) => ({
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
      description: res.description,
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
      downloadCount: res.download_count || 0,
      createdAt: res.created_at,
      verifiedAt: res.verified_at,
    }));
  } catch {
    return [];
  }
};

export const saveResourceToSupabase = async (item: Resource): Promise<boolean> => {
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
      description: item.description,
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
  if (!checkIsSupabaseConfigured()) return [];
  try {
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
    const { data, error } = await query;
    if (error || !data) return [];
    
    let courses = data.map((c: any) => ({
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
      courses = courses.filter(c => c.batchIds?.includes(batchId) || (targetSemester && c.semester === targetSemester));
    }

    return courses;
  } catch {
    return [];
  }
};
