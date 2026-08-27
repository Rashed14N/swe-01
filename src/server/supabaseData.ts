import { getServerSupabase } from './supabaseSync.ts';
import { db } from './db.ts';
import type {
  Course,
  Batch,
  Faculty,
  User,
  RoutineSlot,
  Exam,
  BatchAnnouncement,
  DepartmentNotice,
  Resource,
  NotificationItem,
  AuditLog,
} from '../types.ts';

// ==============================================================================
// 1. COURSES
// ==============================================================================

export function mapCourseFromSupabase(row: any): Course {
  return {
    id: row.id,
    code: row.code || '',
    shortName: row.short_name || undefined,
    title: row.title || '',
    credits: Number(row.credits || 3),
    type: row.type || 'THEORY',
    semester: Number(row.semester || 1),
    assignedFacultyId: row.assigned_faculty_id || undefined,
    assignedFacultyName: row.assigned_faculty_name || undefined,
    batchIds: Array.isArray(row.batch_ids) ? row.batch_ids : [],
  };
}

export function mapCourseToSupabase(course: Course): any {
  return {
    id: course.id,
    code: course.code,
    short_name: course.shortName || null,
    title: course.title,
    credits: course.credits,
    type: course.type,
    semester: course.semester,
    assigned_faculty_id: course.assignedFacultyId || null,
    assigned_faculty_name: course.assignedFacultyName || null,
    batch_ids: course.batchIds || [],
  };
}

export async function fetchAllCourses(): Promise<Course[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: true });
      if (!error && data) {
        const courses = data.map(mapCourseFromSupabase);
        // Cache to local db for offline resilience
        const local = db.getData();
        local.courses = courses;
        db.save();
        return courses;
      }
      if (error) {
        console.error('[Supabase fetchAllCourses Error]:', error);
      }
    } catch (e) {
      console.error('[Supabase fetchAllCourses Exception]:', e);
    }
  }
  return db.getData().courses || [];
}

export async function fetchCourseById(id: string): Promise<Course | null> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
      if (!error && data) {
        return mapCourseFromSupabase(data);
      }
    } catch (e) {
      console.error('[Supabase fetchCourseById Exception]:', e);
    }
  }
  const course = (db.getData().courses || []).find(
    c => c.id === id || c.code.replace(/\s+/g, '').toLowerCase() === id.replace(/\s+/g, '').toLowerCase()
  );
  return course || null;
}

export async function createCourseInDB(course: Course): Promise<Course> {
  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapCourseToSupabase(course);
    const { data, error } = await supabase.from('courses').insert(payload).select().single();
    if (error) {
      console.error('[Supabase createCourse Error]:', error);
      throw new Error(error.message || 'Supabase course insert failed');
    }
    const created = data ? mapCourseFromSupabase(data) : course;
    const local = db.getData();
    local.courses = local.courses.filter(c => c.id !== created.id);
    local.courses.push(created);
    db.save();
    return created;
  }
  const local = db.getData();
  local.courses.push(course);
  db.save();
  return course;
}

export async function updateCourseInDB(id: string, updates: Partial<Course>): Promise<Course> {
  const existing = await fetchCourseById(id);
  if (!existing) {
    throw new Error('Course not found');
  }
  const updated: Course = { ...existing, ...updates };

  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapCourseToSupabase(updated);
    const { data, error } = await supabase.from('courses').update(payload).eq('id', id).select().single();
    if (error) {
      console.error('[Supabase updateCourse Error]:', error);
      throw new Error(error.message || 'Supabase course update failed');
    }
    const result = data ? mapCourseFromSupabase(data) : updated;
    const local = db.getData();
    const idx = local.courses.findIndex(c => c.id === id);
    if (idx >= 0) local.courses[idx] = result;
    db.save();
    return result;
  }
  const local = db.getData();
  const idx = local.courses.findIndex(c => c.id === id);
  if (idx >= 0) local.courses[idx] = updated;
  db.save();
  return updated;
}

export async function deleteCourseFromDB(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) {
      console.error('[Supabase deleteCourse Error]:', error);
      throw new Error(error.message || 'Supabase course delete failed');
    }
  }
  const local = db.getData();
  local.courses = local.courses.filter(c => c.id !== id);
  db.save();
  return true;
}

// ==============================================================================
// 2. BATCHES
// ==============================================================================

export function mapBatchFromSupabase(row: any): Batch {
  return {
    id: row.id,
    name: row.name || '',
    admissionYear: Number(row.admission_year || 2023),
    currentSemester: Number(row.current_semester || 1),
    academicSession: row.academic_session || '',
    semesterMode: row.semester_mode || 'SEQUENCE',
    status: row.status || 'ACTIVE',
    lastProgressedAt: row.last_progressed_at || undefined,
    crIds: Array.isArray(row.cr_ids) ? row.cr_ids : [],
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapBatchToSupabase(batch: Batch): any {
  return {
    id: batch.id,
    name: batch.name,
    admission_year: batch.admissionYear,
    current_semester: batch.currentSemester,
    academic_session: batch.academicSession,
    semester_mode: batch.semesterMode || 'SEQUENCE',
    status: batch.status || 'ACTIVE',
    last_progressed_at: batch.lastProgressedAt || null,
    cr_ids: batch.crIds || [],
    created_at: batch.createdAt || new Date().toISOString(),
  };
}

export async function fetchAllBatches(): Promise<Batch[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('batches').select('*').order('admission_year', { ascending: false });
      if (!error && data) {
        const batches = data.map(mapBatchFromSupabase);
        const local = db.getData();
        local.batches = batches;
        db.save();
        return batches;
      }
      if (error) console.error('[Supabase fetchAllBatches Error]:', error);
    } catch (e) {
      console.error('[Supabase fetchAllBatches Exception]:', e);
    }
  }
  return db.getData().batches || [];
}

export async function fetchBatchById(id: string): Promise<Batch | null> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('batches').select('*').eq('id', id).single();
      if (!error && data) return mapBatchFromSupabase(data);
    } catch (e) {
      console.error('[Supabase fetchBatchById Exception]:', e);
    }
  }
  return (db.getData().batches || []).find(b => b.id === id) || null;
}

export async function createBatchInDB(batch: Batch): Promise<Batch> {
  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapBatchToSupabase(batch);
    const { data, error } = await supabase.from('batches').insert(payload).select().single();
    if (error) throw new Error(error.message || 'Supabase batch insert failed');
    const created = data ? mapBatchFromSupabase(data) : batch;
    const local = db.getData();
    local.batches = local.batches.filter(b => b.id !== created.id);
    local.batches.push(created);
    db.save();
    return created;
  }
  const local = db.getData();
  local.batches.push(batch);
  db.save();
  return batch;
}

export async function updateBatchInDB(id: string, updates: Partial<Batch>): Promise<Batch> {
  const existing = await fetchBatchById(id);
  if (!existing) throw new Error('Batch not found');
  const updated: Batch = { ...existing, ...updates };

  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapBatchToSupabase(updated);
    const { data, error } = await supabase.from('batches').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message || 'Supabase batch update failed');
    const result = data ? mapBatchFromSupabase(data) : updated;
    const local = db.getData();
    const idx = local.batches.findIndex(b => b.id === id);
    if (idx >= 0) local.batches[idx] = result;
    db.save();
    return result;
  }
  const local = db.getData();
  const idx = local.batches.findIndex(b => b.id === id);
  if (idx >= 0) local.batches[idx] = updated;
  db.save();
  return updated;
}

export async function deleteBatchFromDB(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from('batches').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Supabase batch delete failed');
  }
  const local = db.getData();
  local.batches = local.batches.filter(b => b.id !== id);
  db.save();
  return true;
}

// ==============================================================================
// 3. FACULTY
// ==============================================================================

export function mapFacultyFromSupabase(row: any): Faculty {
  return {
    id: row.id,
    name: row.name || '',
    shortName: row.short_name || undefined,
    designation: row.designation || 'Lecturer',
    department: row.department || 'Software Engineering',
    email: row.email || '',
    phone: row.phone || undefined,
    officeRoom: row.office_room || '',
    photoUrl: row.photo_url || '',
    specialization: row.specialization || undefined,
    assignedCourses: Array.isArray(row.assigned_courses) ? row.assigned_courses : [],
  };
}

export function mapFacultyToSupabase(faculty: Faculty): any {
  return {
    id: faculty.id,
    name: faculty.name,
    short_name: faculty.shortName || null,
    designation: faculty.designation,
    department: faculty.department || 'Software Engineering',
    email: faculty.email,
    phone: faculty.phone || null,
    office_room: faculty.officeRoom || '',
    photo_url: faculty.photoUrl || null,
    specialization: faculty.specialization || null,
    assigned_courses: faculty.assignedCourses || [],
  };
}

export async function fetchAllFaculty(): Promise<Faculty[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('faculty').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        const faculty = data.map(mapFacultyFromSupabase);
        const local = db.getData();
        local.faculty = faculty;
        db.save();
        return faculty;
      }
      if (error) console.error('[Supabase fetchAllFaculty Error]:', error);
    } catch (e) {
      console.error('[Supabase fetchAllFaculty Exception]:', e);
    }
  }
  return db.getData().faculty || [];
}

export async function createFacultyInDB(faculty: Faculty): Promise<Faculty> {
  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapFacultyToSupabase(faculty);
    const { data, error } = await supabase.from('faculty').insert(payload).select().single();
    if (error) throw new Error(error.message || 'Supabase faculty insert failed');
    const created = data ? mapFacultyFromSupabase(data) : faculty;
    const local = db.getData();
    local.faculty = local.faculty.filter(f => f.id !== created.id);
    local.faculty.push(created);
    db.save();
    return created;
  }
  const local = db.getData();
  local.faculty.push(faculty);
  db.save();
  return faculty;
}

export async function updateFacultyInDB(id: string, updates: Partial<Faculty>): Promise<Faculty> {
  const existing = (await fetchAllFaculty()).find(f => f.id === id);
  if (!existing) throw new Error('Faculty not found');
  const updated: Faculty = { ...existing, ...updates };

  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapFacultyToSupabase(updated);
    const { data, error } = await supabase.from('faculty').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message || 'Supabase faculty update failed');
    const result = data ? mapFacultyFromSupabase(data) : updated;
    const local = db.getData();
    const idx = local.faculty.findIndex(f => f.id === id);
    if (idx >= 0) local.faculty[idx] = result;
    db.save();
    return result;
  }
  const local = db.getData();
  const idx = local.faculty.findIndex(f => f.id === id);
  if (idx >= 0) local.faculty[idx] = updated;
  db.save();
  return updated;
}

export async function deleteFacultyFromDB(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from('faculty').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Supabase faculty delete failed');
  }
  const local = db.getData();
  local.faculty = local.faculty.filter(f => f.id !== id);
  db.save();
  return true;
}

// ==============================================================================
// 4. USERS & STUDENTS
// ==============================================================================

export function mapUserFromSupabase(row: any): User {
  return {
    id: row.id,
    studentId: row.student_id || '',
    name: row.name || '',
    email: row.email || undefined,
    phone: row.phone || undefined,
    role: row.role || 'STUDENT',
    batchId: row.batch_id || undefined,
    batchName: row.batch_name || undefined,
    currentSemester: Number(row.current_semester || 1),
    profileImage: row.profile_image || undefined,
    status: row.status || 'ACTIVE',
    points: Number(row.points || 0),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function mapUserToSupabase(user: User): any {
  return {
    id: user.id,
    student_id: user.studentId,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    batch_id: user.batchId || null,
    batch_name: user.batchName || null,
    current_semester: user.currentSemester || 1,
    profile_image: user.profileImage || null,
    status: user.status || 'ACTIVE',
    points: user.points || 0,
    created_at: user.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function fetchAllUsers(): Promise<User[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').order('student_id', { ascending: true });
      if (!error && data && data.length > 0) {
        const users = data.map(mapUserFromSupabase);
        const local = db.getData();
        local.users = users;
        db.save();
        return users;
      }
    } catch (e) {
      console.error('[Supabase fetchAllUsers Exception]:', e);
    }
  }
  return db.getData().users || [];
}

export async function fetchUserByIdOrStudentId(idOrStudentId: string): Promise<User | null> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${idOrStudentId},student_id.eq.${idOrStudentId}`)
        .maybeSingle();
      if (!error && data) return mapUserFromSupabase(data);
    } catch (e) {
      console.error('[Supabase fetchUserByIdOrStudentId Exception]:', e);
    }
  }
  return (
    (db.getData().users || []).find(
      u => u.id === idOrStudentId || u.studentId.toLowerCase() === idOrStudentId.toLowerCase()
    ) || null
  );
}

export async function createUserInDB(user: User): Promise<User> {
  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapUserToSupabase(user);
    const { data, error } = await supabase.from('users').insert(payload).select().single();
    if (error) throw new Error(error.message || 'Supabase user insert failed');
    const created = data ? mapUserFromSupabase(data) : user;
    const local = db.getData();
    local.users = local.users.filter(u => u.id !== created.id);
    local.users.push(created);
    db.save();
    return created;
  }
  const local = db.getData();
  local.users.push(user);
  db.save();
  return user;
}

export async function updateUserInDB(id: string, updates: Partial<User>): Promise<User> {
  const existing = await fetchUserByIdOrStudentId(id);
  if (!existing) throw new Error('User not found');
  const updated: User = { ...existing, ...updates, updatedAt: new Date().toISOString() };

  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapUserToSupabase(updated);
    const { data, error } = await supabase.from('users').update(payload).eq('id', existing.id).select().single();
    if (error) throw new Error(error.message || 'Supabase user update failed');
    const result = data ? mapUserFromSupabase(data) : updated;
    const local = db.getData();
    const idx = local.users.findIndex(u => u.id === existing.id);
    if (idx >= 0) local.users[idx] = result;
    db.save();
    return result;
  }
  const local = db.getData();
  const idx = local.users.findIndex(u => u.id === existing.id);
  if (idx >= 0) local.users[idx] = updated;
  db.save();
  return updated;
}

export async function deleteUserFromDB(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Supabase user delete failed');
  }
  const local = db.getData();
  local.users = local.users.filter(u => u.id !== id);
  db.save();
  return true;
}

// ==============================================================================
// 5. ROUTINE SLOTS
// ==============================================================================

export function mapRoutineSlotFromSupabase(row: any): RoutineSlot {
  return {
    id: row.id,
    batchId: row.batch_id || '',
    day: (row.day || 'SUNDAY').toUpperCase() as any,
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    courseId: row.course_id || '',
    courseCode: row.course_code || '',
    courseShortName: row.course_short_name || undefined,
    courseTitle: row.course_title || '',
    teacherName: row.teacher_name || '',
    teacherShortName: row.teacher_short_name || undefined,
    room: row.room || '',
  };
}

export function mapRoutineSlotToSupabase(slot: RoutineSlot): any {
  return {
    id: slot.id,
    batch_id: slot.batchId,
    day: slot.day,
    start_time: slot.startTime,
    end_time: slot.endTime,
    course_id: slot.courseId,
    course_code: slot.courseCode,
    course_short_name: slot.courseShortName || null,
    course_title: slot.courseTitle,
    teacher_name: slot.teacherName,
    teacher_short_name: slot.teacherShortName || null,
    room: slot.room,
  };
}

export async function fetchAllRoutineSlots(batchId?: string): Promise<RoutineSlot[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      let query = supabase.from('routine_slots').select('*');
      if (batchId) query = query.eq('batch_id', batchId);
      const { data, error } = await query;
      if (!error && data) {
        const slots = data.map(mapRoutineSlotFromSupabase);
        return slots;
      }
    } catch (e) {
      console.error('[Supabase fetchAllRoutineSlots Exception]:', e);
    }
  }
  const local = db.getData().routines || [];
  return batchId ? local.filter(s => s.batchId === batchId) : local;
}

export async function createRoutineSlotInDB(slot: RoutineSlot): Promise<RoutineSlot> {
  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapRoutineSlotToSupabase(slot);
    const { data, error } = await supabase.from('routine_slots').insert(payload).select().single();
    if (error) throw new Error(error.message || 'Supabase routine slot insert failed');
    const created = data ? mapRoutineSlotFromSupabase(data) : slot;
    const local = db.getData();
    local.routines = (local.routines || []).filter(s => s.id !== created.id);
    local.routines.push(created);
    db.save();
    return created;
  }
  const local = db.getData();
  if (!local.routines) local.routines = [];
  local.routines.push(slot);
  db.save();
  return slot;
}

export async function updateRoutineSlotInDB(id: string, updates: Partial<RoutineSlot>): Promise<RoutineSlot> {
  const local = db.getData();
  const existing = (local.routines || []).find(s => s.id === id);
  if (!existing) throw new Error('Routine slot not found');
  const updated: RoutineSlot = { ...existing, ...updates };

  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapRoutineSlotToSupabase(updated);
    const { data, error } = await supabase.from('routine_slots').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message || 'Supabase routine slot update failed');
    const result = data ? mapRoutineSlotFromSupabase(data) : updated;
    const idx = local.routines.findIndex(s => s.id === id);
    if (idx >= 0) local.routines[idx] = result;
    db.save();
    return result;
  }
  const idx = local.routines.findIndex(s => s.id === id);
  if (idx >= 0) local.routines[idx] = updated;
  db.save();
  return updated;
}

export async function deleteRoutineSlotFromDB(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from('routine_slots').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Supabase routine slot delete failed');
  }
  const local = db.getData();
  local.routines = (local.routines || []).filter(s => s.id !== id);
  db.save();
  return true;
}

// ==============================================================================
// 6. EXAMS
// ==============================================================================

export function mapExamFromSupabase(row: any): Exam {
  return {
    id: row.id,
    batchId: row.batch_id || '',
    courseId: row.course_id || '',
    courseCode: row.course_code || '',
    courseTitle: row.course_title || '',
    type: row.type || 'CT',
    title: row.title || '',
    date: row.date || row.exam_date || '',
    startTime: row.start_time || undefined,
    room: row.room || undefined,
    description: row.description || row.syllabus_topics || undefined,
    createdBy: row.created_by || '',
    createdByName: row.created_by_name || 'Faculty / CR',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapExamToSupabase(exam: Exam): any {
  return {
    id: exam.id,
    batch_id: exam.batchId,
    course_id: exam.courseId,
    course_code: exam.courseCode,
    course_title: exam.courseTitle,
    type: exam.type,
    title: exam.title,
    date: exam.date,
    start_time: exam.startTime || null,
    room: exam.room || null,
    description: exam.description || null,
    created_by: exam.createdBy,
    created_by_name: exam.createdByName,
    created_at: exam.createdAt || new Date().toISOString(),
  };
}

export async function fetchAllExams(batchId?: string): Promise<Exam[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      let query = supabase.from('exams').select('*').order('date', { ascending: true });
      if (batchId) query = query.eq('batch_id', batchId);
      const { data, error } = await query;
      if (!error && data) {
        const exams = data.map(mapExamFromSupabase);
        return exams;
      }
    } catch (e) {
      console.error('[Supabase fetchAllExams Exception]:', e);
    }
  }
  const local = db.getData().exams || [];
  return batchId ? local.filter(e => e.batchId === batchId) : local;
}

export async function createExamInDB(exam: Exam): Promise<Exam> {
  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapExamToSupabase(exam);
    const { data, error } = await supabase.from('exams').insert(payload).select().single();
    if (error) throw new Error(error.message || 'Supabase exam insert failed');
    const created = data ? mapExamFromSupabase(data) : exam;
    const local = db.getData();
    local.exams = (local.exams || []).filter(e => e.id !== created.id);
    local.exams.push(created);
    db.save();
    return created;
  }
  const local = db.getData();
  if (!local.exams) local.exams = [];
  local.exams.push(exam);
  db.save();
  return exam;
}

export async function updateExamInDB(id: string, updates: Partial<Exam>): Promise<Exam> {
  const local = db.getData();
  const existing = (local.exams || []).find(e => e.id === id);
  if (!existing) throw new Error('Exam not found');
  const updated: Exam = { ...existing, ...updates };

  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapExamToSupabase(updated);
    const { data, error } = await supabase.from('exams').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message || 'Supabase exam update failed');
    const result = data ? mapExamFromSupabase(data) : updated;
    const idx = local.exams.findIndex(e => e.id === id);
    if (idx >= 0) local.exams[idx] = result;
    db.save();
    return result;
  }
  const idx = local.exams.findIndex(e => e.id === id);
  if (idx >= 0) local.exams[idx] = updated;
  db.save();
  return updated;
}

export async function deleteExamFromDB(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Supabase exam delete failed');
  }
  const local = db.getData();
  local.exams = (local.exams || []).filter(e => e.id !== id);
  db.save();
  return true;
}

// ==============================================================================
// 7. ANNOUNCEMENTS
// ==============================================================================

export function mapAnnouncementFromSupabase(row: any): BatchAnnouncement {
  return {
    id: row.id,
    batchId: row.batch_id || '',
    title: row.title || '',
    description: row.description || row.content || '',
    publishDate: row.publish_date || new Date().toISOString().split('T')[0],
    expiryDate: row.expiry_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    priority: row.priority || 'NORMAL',
    createdBy: row.created_by || row.author_id || '',
    createdByName: row.created_by_name || row.author_name || 'CR',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapAnnouncementToSupabase(ann: BatchAnnouncement): any {
  return {
    id: ann.id,
    batch_id: ann.batchId,
    title: ann.title,
    description: ann.description,
    publish_date: ann.publishDate,
    expiry_date: ann.expiryDate,
    priority: ann.priority,
    created_by: ann.createdBy,
    created_by_name: ann.createdByName,
    created_at: ann.createdAt || new Date().toISOString(),
  };
}

export async function fetchAllAnnouncements(batchId?: string): Promise<BatchAnnouncement[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (batchId) query = query.eq('batch_id', batchId);
      const { data, error } = await query;
      if (!error && data) {
        return data.map(mapAnnouncementFromSupabase);
      }
    } catch (e) {
      console.error('[Supabase fetchAllAnnouncements Exception]:', e);
    }
  }
  const local = db.getData().announcements || [];
  return batchId ? local.filter(a => a.batchId === batchId) : local;
}

export async function createAnnouncementInDB(ann: BatchAnnouncement): Promise<BatchAnnouncement> {
  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapAnnouncementToSupabase(ann);
    const { data, error } = await supabase.from('announcements').insert(payload).select().single();
    if (error) throw new Error(error.message || 'Supabase announcement insert failed');
    const created = data ? mapAnnouncementFromSupabase(data) : ann;
    const local = db.getData();
    local.announcements = (local.announcements || []).filter(a => a.id !== created.id);
    local.announcements.push(created);
    db.save();
    return created;
  }
  const local = db.getData();
  if (!local.announcements) local.announcements = [];
  local.announcements.push(ann);
  db.save();
  return ann;
}

export async function deleteAnnouncementFromDB(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Supabase announcement delete failed');
  }
  const local = db.getData();
  local.announcements = (local.announcements || []).filter(a => a.id !== id);
  db.save();
  return true;
}

// ==============================================================================
// 8. DEPARTMENT NOTICES
// ==============================================================================

export function mapNoticeFromSupabase(row: any): DepartmentNotice {
  return {
    id: row.id,
    title: row.title || '',
    content: row.content || '',
    category: row.category || 'GENERAL',
    publishDate: row.publish_date || new Date().toISOString().split('T')[0],
    isImportant: Boolean(row.is_important),
    attachmentUrl: row.attachment_url || undefined,
    createdBy: row.created_by || 'Admin',
    createdByName: row.created_by_name || 'Department Admin',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapNoticeToSupabase(notice: DepartmentNotice): any {
  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    category: notice.category,
    publish_date: notice.publishDate,
    is_important: notice.isImportant,
    attachment_url: notice.attachmentUrl || null,
    created_by: notice.createdBy,
    created_by_name: notice.createdByName,
    created_at: notice.createdAt || new Date().toISOString(),
  };
}

export async function fetchAllNotices(): Promise<DepartmentNotice[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('department_notices').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.map(mapNoticeFromSupabase);
      }
    } catch (e) {
      console.error('[Supabase fetchAllNotices Exception]:', e);
    }
  }
  return db.getData().departmentNotices || [];
}

export async function createNoticeInDB(notice: DepartmentNotice): Promise<DepartmentNotice> {
  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapNoticeToSupabase(notice);
    const { data, error } = await supabase.from('department_notices').insert(payload).select().single();
    if (error) throw new Error(error.message || 'Supabase notice insert failed');
    const created = data ? mapNoticeFromSupabase(data) : notice;
    const local = db.getData();
    local.departmentNotices = (local.departmentNotices || []).filter(n => n.id !== created.id);
    local.departmentNotices.push(created);
    db.save();
    return created;
  }
  const local = db.getData();
  if (!local.departmentNotices) local.departmentNotices = [];
  local.departmentNotices.push(notice);
  db.save();
  return notice;
}

export async function deleteNoticeFromDB(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from('department_notices').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Supabase notice delete failed');
  }
  const local = db.getData();
  local.departmentNotices = (local.departmentNotices || []).filter(n => n.id !== id);
  db.save();
  return true;
}

// ==============================================================================
// 9. RESOURCES
// ==============================================================================

export function mapResourceFromSupabase(row: any): Resource {
  return {
    id: row.id,
    title: row.title || '',
    type: row.type || row.category || 'NOTE',
    courseId: row.course_id || '',
    courseCode: row.course_code || '',
    courseTitle: row.course_title || '',
    semester: Number(row.semester || 1),
    academicYear: Number(row.academic_year || 2024),
    examType: row.exam_type || undefined,
    facultyName: row.faculty_name || undefined,
    targetBatch: row.target_batch || undefined,
    labCategory: row.lab_category || undefined,
    description: row.description || undefined,
    fileUrl: row.file_url || row.drive_link || '',
    fileName: row.file_name || 'document.pdf',
    fileSize: row.file_size || '1.0 MB',
    fileType: row.file_type || 'application/pdf',
    uploaderId: row.uploader_id || row.uploaded_by_id || '',
    uploaderStudentId: row.uploader_student_id || '',
    uploaderName: row.uploader_name || row.uploaded_by || 'Student',
    uploaderBatchName: row.uploader_batch_name || 'SWE Batch',
    status: row.status || 'APPROVED',
    rejectionReason: row.rejection_reason || undefined,
    downloadCount: Number(row.download_count || row.upvotes || 0),
    createdAt: row.created_at || new Date().toISOString(),
    verifiedAt: row.verified_at || undefined,
  };
}

export function mapResourceToSupabase(res: Resource): any {
  return {
    id: res.id,
    title: res.title,
    type: res.type,
    course_id: res.courseId,
    course_code: res.courseCode,
    course_title: res.courseTitle,
    semester: res.semester,
    academic_year: res.academicYear,
    exam_type: res.examType || null,
    faculty_name: res.facultyName || null,
    target_batch: res.targetBatch || null,
    lab_category: res.labCategory || null,
    description: res.description || null,
    file_url: res.fileUrl,
    file_name: res.fileName,
    file_size: res.fileSize,
    file_type: res.fileType,
    uploader_id: res.uploaderId,
    uploader_student_id: res.uploaderStudentId,
    uploader_name: res.uploaderName,
    uploader_batch_name: res.uploaderBatchName,
    status: res.status,
    rejection_reason: res.rejectionReason || null,
    download_count: res.downloadCount,
    created_at: res.createdAt || new Date().toISOString(),
    verified_at: res.verifiedAt || null,
  };
}

export async function fetchAllResources(): Promise<Resource[]> {
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.map(mapResourceFromSupabase);
      }
    } catch (e) {
      console.error('[Supabase fetchAllResources Exception]:', e);
    }
  }
  return db.getData().resources || [];
}

export async function createResourceInDB(res: Resource): Promise<Resource> {
  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapResourceToSupabase(res);
    const { data, error } = await supabase.from('resources').insert(payload).select().single();
    if (error) throw new Error(error.message || 'Supabase resource insert failed');
    const created = data ? mapResourceFromSupabase(data) : res;
    const local = db.getData();
    local.resources = (local.resources || []).filter(r => r.id !== created.id);
    local.resources.push(created);
    db.save();
    return created;
  }
  const local = db.getData();
  if (!local.resources) local.resources = [];
  local.resources.push(res);
  db.save();
  return res;
}

export async function updateResourceInDB(id: string, updates: Partial<Resource>): Promise<Resource> {
  const local = db.getData();
  const existing = (local.resources || []).find(r => r.id === id);
  if (!existing) throw new Error('Resource not found');
  const updated: Resource = { ...existing, ...updates };

  const supabase = getServerSupabase();
  if (supabase) {
    const payload = mapResourceToSupabase(updated);
    const { data, error } = await supabase.from('resources').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message || 'Supabase resource update failed');
    const result = data ? mapResourceFromSupabase(data) : updated;
    const idx = local.resources.findIndex(r => r.id === id);
    if (idx >= 0) local.resources[idx] = result;
    db.save();
    return result;
  }
  const idx = local.resources.findIndex(r => r.id === id);
  if (idx >= 0) local.resources[idx] = updated;
  db.save();
  return updated;
}

export async function deleteResourceFromDB(id: string): Promise<boolean> {
  const supabase = getServerSupabase();
  if (supabase) {
    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Supabase resource delete failed');
  }
  const local = db.getData();
  local.resources = (local.resources || []).filter(r => r.id !== id);
  db.save();
  return true;
}
