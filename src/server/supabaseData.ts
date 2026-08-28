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
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        const courses = data.map(mapCourseFromSupabase);
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
  return local.courses && local.courses.length > 0 ? local.courses : [];
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
  const local = db.getData();
  if (!local.courses) local.courses = [];
  local.courses = local.courses.filter(c => c.id !== course.id);
  local.courses.push(course);
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapCourseToSupabase(course);
      const { data, error } = await supabase.from('courses').insert(payload).select().maybeSingle();
      if (error) {
        console.warn('[Supabase createCourse Warning]:', error.message);
      } else if (data) {
        const created = mapCourseFromSupabase(data);
        const idx = local.courses.findIndex(c => c.id === course.id || c.id === created.id);
        if (idx >= 0) local.courses[idx] = created;
        db.save();
        return created;
      }
    } catch (e: any) {
      console.warn('[Supabase createCourse Exception]:', e?.message);
    }
  }
  return course;
}

export async function updateCourseInDB(id: string, updates: Partial<Course>): Promise<Course> {
  const local = db.getData();
  if (!local.courses) local.courses = [];
  let existing = local.courses.find(c => c.id === id);
  if (!existing) {
    existing = {
      id,
      code: updates.code || 'SWE',
      title: updates.title || 'Course',
      credits: updates.credits || 3,
      type: updates.type || 'THEORY',
      semester: updates.semester || 1,
      batchIds: updates.batchIds || [],
      assignedFacultyName: updates.assignedFacultyName,
    };
    local.courses.push(existing);
  }

  const updated: Course = { ...existing, ...updates };
  const idx = local.courses.findIndex(c => c.id === id);
  if (idx >= 0) local.courses[idx] = updated;
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapCourseToSupabase(updated);
      const { data, error } = await supabase.from('courses').update(payload).eq('id', id).select().maybeSingle();
      if (error) {
        console.warn('[Supabase updateCourse Warning]:', error.message);
      } else if (data) {
        const result = mapCourseFromSupabase(data);
        const curIdx = local.courses.findIndex(c => c.id === id);
        if (curIdx >= 0) local.courses[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e: any) {
      console.warn('[Supabase updateCourse Exception]:', e?.message);
    }
  }
  return updated;
}

export async function deleteCourseFromDB(id: string): Promise<boolean> {
  const local = db.getData();
  if (local.courses) {
    local.courses = local.courses.filter(c => c.id !== id);
    db.save();
  }

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) console.warn('[Supabase deleteCourse Warning]:', error.message);
    } catch (e: any) {
      console.warn('[Supabase deleteCourse Exception]:', e?.message);
    }
  }
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
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('batches').select('*').order('admission_year', { ascending: false });
      if (!error && data && data.length > 0) {
        const batches = data.map(mapBatchFromSupabase);
        local.batches = batches;
        db.save();
        return batches;
      }
      if (error) console.error('[Supabase fetchAllBatches Error]:', error);
    } catch (e) {
      console.error('[Supabase fetchAllBatches Exception]:', e);
    }
  }
  return local.batches && local.batches.length > 0 ? local.batches : [];
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
  const local = db.getData();
  if (!local.batches) local.batches = [];
  local.batches = local.batches.filter(b => b.id !== batch.id);
  local.batches.push(batch);
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapBatchToSupabase(batch);
      const { data, error } = await supabase.from('batches').insert(payload).select().maybeSingle();
      if (error) {
        console.warn('[Supabase createBatch Warning]:', error.message);
      } else if (data) {
        const created = mapBatchFromSupabase(data);
        const idx = local.batches.findIndex(b => b.id === batch.id || b.id === created.id);
        if (idx >= 0) local.batches[idx] = created;
        db.save();
        return created;
      }
    } catch (e: any) {
      console.warn('[Supabase createBatch Exception]:', e?.message);
    }
  }
  return batch;
}

export async function updateBatchInDB(id: string, updates: Partial<Batch>): Promise<Batch> {
  const local = db.getData();
  if (!local.batches) local.batches = [];
  let existing = local.batches.find(b => b.id === id);
  if (!existing) {
    existing = {
      id,
      name: updates.name || 'SWE Batch',
      admissionYear: updates.admissionYear || 2024,
      currentSemester: updates.currentSemester || 1,
      academicSession: updates.academicSession || '2024-2025',
      semesterMode: updates.semesterMode || 'SEQUENCE',
      status: updates.status || 'ACTIVE',
      crIds: updates.crIds || [],
      createdAt: new Date().toISOString(),
    };
    local.batches.push(existing);
  }

  const updated: Batch = { ...existing, ...updates };
  const idx = local.batches.findIndex(b => b.id === id);
  if (idx >= 0) local.batches[idx] = updated;
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapBatchToSupabase(updated);
      const { data, error } = await supabase.from('batches').update(payload).eq('id', id).select().maybeSingle();
      if (error) {
        console.warn('[Supabase updateBatch Warning]:', error.message);
      } else if (data) {
        const result = mapBatchFromSupabase(data);
        const curIdx = local.batches.findIndex(b => b.id === id);
        if (curIdx >= 0) local.batches[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e: any) {
      console.warn('[Supabase updateBatch Exception]:', e?.message);
    }
  }
  return updated;
}

export async function deleteBatchFromDB(id: string): Promise<boolean> {
  const local = db.getData();
  if (local.batches) {
    local.batches = local.batches.filter(b => b.id !== id);
    db.save();
  }

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('batches').delete().eq('id', id);
      if (error) console.warn('[Supabase deleteBatch Warning]:', error.message);
    } catch (e: any) {
      console.warn('[Supabase deleteBatch Exception]:', e?.message);
    }
  }
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
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('faculty').select('*').order('name', { ascending: true });
      if (!error && data && data.length > 0) {
        const faculty = data.map(mapFacultyFromSupabase);
        local.faculty = faculty;
        db.save();
        return faculty;
      }
      if (error) console.error('[Supabase fetchAllFaculty Error]:', error);
    } catch (e) {
      console.error('[Supabase fetchAllFaculty Exception]:', e);
    }
  }
  return local.faculty && local.faculty.length > 0 ? local.faculty : [];
}

export async function createFacultyInDB(faculty: Faculty): Promise<Faculty> {
  const local = db.getData();
  if (!local.faculty) local.faculty = [];
  local.faculty = local.faculty.filter(f => f.id !== faculty.id);
  local.faculty.push(faculty);
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapFacultyToSupabase(faculty);
      const { data, error } = await supabase.from('faculty').insert(payload).select().maybeSingle();
      if (error) {
        console.warn('[Supabase createFaculty Warning]:', error.message);
      } else if (data) {
        const created = mapFacultyFromSupabase(data);
        const idx = local.faculty.findIndex(f => f.id === faculty.id || f.id === created.id);
        if (idx >= 0) local.faculty[idx] = created;
        db.save();
        return created;
      }
    } catch (e: any) {
      console.warn('[Supabase createFaculty Exception]:', e?.message);
    }
  }
  return faculty;
}

export async function updateFacultyInDB(id: string, updates: Partial<Faculty>): Promise<Faculty> {
  const local = db.getData();
  if (!local.faculty) local.faculty = [];
  let existing = local.faculty.find(f => f.id === id);
  if (!existing) {
    existing = {
      id,
      name: updates.name || 'Faculty Member',
      designation: updates.designation || 'Lecturer',
      department: updates.department || 'Software Engineering',
      email: updates.email || 'faculty@swe.edu.bd',
      officeRoom: updates.officeRoom || '',
      photoUrl: updates.photoUrl || '',
      assignedCourses: updates.assignedCourses || [],
    };
    local.faculty.push(existing);
  }

  const updated: Faculty = { ...existing, ...updates };
  const idx = local.faculty.findIndex(f => f.id === id);
  if (idx >= 0) local.faculty[idx] = updated;
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapFacultyToSupabase(updated);
      const { data, error } = await supabase.from('faculty').update(payload).eq('id', id).select().maybeSingle();
      if (error) {
        console.warn('[Supabase updateFaculty Warning]:', error.message);
      } else if (data) {
        const result = mapFacultyFromSupabase(data);
        const curIdx = local.faculty.findIndex(f => f.id === id);
        if (curIdx >= 0) local.faculty[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e: any) {
      console.warn('[Supabase updateFaculty Exception]:', e?.message);
    }
  }
  return updated;
}

export async function deleteFacultyFromDB(id: string): Promise<boolean> {
  const local = db.getData();
  if (local.faculty) {
    local.faculty = local.faculty.filter(f => f.id !== id);
    db.save();
  }

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('faculty').delete().eq('id', id);
      if (error) console.warn('[Supabase deleteFaculty Warning]:', error.message);
    } catch (e: any) {
      console.warn('[Supabase deleteFaculty Exception]:', e?.message);
    }
  }
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
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').order('student_id', { ascending: true });
      if (!error && data && data.length > 0) {
        const users = data.map(mapUserFromSupabase);
        local.users = users;
        db.save();
        return users;
      }
    } catch (e) {
      console.error('[Supabase fetchAllUsers Exception]:', e);
    }
  }
  return local.users && local.users.length > 0 ? local.users : [];
}

export async function fetchUserByIdOrStudentId(idOrStudentId: string): Promise<User | null> {
  const local = db.getData();
  const matched = (local.users || []).find(
    u => u.id === idOrStudentId || u.studentId.toLowerCase() === idOrStudentId.toLowerCase()
  );
  if (matched) return matched;

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${idOrStudentId},student_id.eq.${idOrStudentId}`)
        .maybeSingle();
      if (!error && data) {
        const user = mapUserFromSupabase(data);
        if (!local.users) local.users = [];
        local.users = local.users.filter(u => u.id !== user.id);
        local.users.push(user);
        db.save();
        return user;
      }
    } catch (e) {
      console.error('[Supabase fetchUserByIdOrStudentId Exception]:', e);
    }
  }
  return null;
}

export async function createUserInDB(user: User): Promise<User> {
  const local = db.getData();
  if (!local.users) local.users = [];
  local.users = local.users.filter(u => u.id !== user.id);
  local.users.push(user);
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapUserToSupabase(user);
      const { data, error } = await supabase.from('users').insert(payload).select().maybeSingle();
      if (error) {
        console.warn('[Supabase createUser Warning]:', error.message);
      } else if (data) {
        const created = mapUserFromSupabase(data);
        const idx = local.users.findIndex(u => u.id === user.id || u.id === created.id);
        if (idx >= 0) local.users[idx] = created;
        db.save();
        return created;
      }
    } catch (e: any) {
      console.warn('[Supabase createUser Exception]:', e?.message);
    }
  }
  return user;
}

export async function updateUserInDB(id: string, updates: Partial<User>): Promise<User> {
  const local = db.getData();
  if (!local.users) local.users = [];
  let existing = local.users.find(u => u.id === id || u.studentId.toLowerCase() === id.toLowerCase());
  
  if (!existing) {
    existing = {
      id,
      studentId: updates.studentId || id,
      name: updates.name || 'User',
      role: updates.role || 'STUDENT',
      currentSemester: updates.currentSemester || 1,
      status: updates.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    local.users.push(existing);
  }

  const updated: User = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const idx = local.users.findIndex(u => u.id === existing!.id);
  if (idx >= 0) local.users[idx] = updated;
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapUserToSupabase(updated);
      const { data, error } = await supabase.from('users').update(payload).eq('id', existing.id).select().maybeSingle();
      if (error) {
        console.warn('[Supabase updateUser Warning]:', error.message);
      } else if (data) {
        const result = mapUserFromSupabase(data);
        const curIdx = local.users.findIndex(u => u.id === existing!.id);
        if (curIdx >= 0) local.users[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e: any) {
      console.warn('[Supabase updateUser Exception]:', e?.message);
    }
  }
  return updated;
}

export async function deleteUserFromDB(id: string): Promise<boolean> {
  const local = db.getData();
  if (local.users) {
    local.users = local.users.filter(u => u.id !== id && u.studentId !== id);
    db.save();
  }

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) console.warn('[Supabase deleteUser Warning]:', error.message);
    } catch (e: any) {
      console.warn('[Supabase deleteUser Exception]:', e?.message);
    }
  }
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
  const local = db.getData();
  if (!local.routines) local.routines = [];
  local.routines = local.routines.filter(s => s.id !== slot.id);
  local.routines.push(slot);
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapRoutineSlotToSupabase(slot);
      const { data, error } = await supabase.from('routine_slots').insert(payload).select().maybeSingle();
      if (error) {
        console.warn('[Supabase createRoutineSlot Warning]:', error.message);
      } else if (data) {
        const created = mapRoutineSlotFromSupabase(data);
        const idx = local.routines.findIndex(s => s.id === slot.id || s.id === created.id);
        if (idx >= 0) local.routines[idx] = created;
        db.save();
        return created;
      }
    } catch (e: any) {
      console.warn('[Supabase createRoutineSlot Exception]:', e?.message);
    }
  }
  return slot;
}

export async function updateRoutineSlotInDB(id: string, updates: Partial<RoutineSlot>): Promise<RoutineSlot> {
  const local = db.getData();
  if (!local.routines) local.routines = [];
  let existing = local.routines.find(s => s.id === id);
  if (!existing) {
    existing = {
      id,
      batchId: updates.batchId || 'batch-all',
      day: updates.day || 'SUNDAY',
      startTime: updates.startTime || '09:00 AM',
      endTime: updates.endTime || '10:30 AM',
      courseId: updates.courseId || '',
      courseCode: updates.courseCode || '',
      courseTitle: updates.courseTitle || '',
      teacherName: updates.teacherName || '',
      room: updates.room || '',
    };
    local.routines.push(existing);
  }

  const updated: RoutineSlot = { ...existing, ...updates };
  const idx = local.routines.findIndex(s => s.id === id);
  if (idx >= 0) local.routines[idx] = updated;
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapRoutineSlotToSupabase(updated);
      const { data, error } = await supabase.from('routine_slots').update(payload).eq('id', id).select().maybeSingle();
      if (error) {
        console.warn('[Supabase updateRoutineSlot Warning]:', error.message);
      } else if (data) {
        const result = mapRoutineSlotFromSupabase(data);
        const curIdx = local.routines.findIndex(s => s.id === id);
        if (curIdx >= 0) local.routines[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e: any) {
      console.warn('[Supabase updateRoutineSlot Exception]:', e?.message);
    }
  }
  return updated;
}

export async function deleteRoutineSlotFromDB(id: string): Promise<boolean> {
  const local = db.getData();
  if (local.routines) {
    local.routines = local.routines.filter(s => s.id !== id);
    db.save();
  }

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('routine_slots').delete().eq('id', id);
      if (error) console.warn('[Supabase deleteRoutineSlot Warning]:', error.message);
    } catch (e: any) {
      console.warn('[Supabase deleteRoutineSlot Exception]:', e?.message);
    }
  }
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
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      let query = supabase.from('exams').select('*').order('date', { ascending: true });
      if (batchId) query = query.eq('batch_id', batchId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const exams = data.map(mapExamFromSupabase);
        return exams;
      }
    } catch (e) {
      console.error('[Supabase fetchAllExams Exception]:', e);
    }
  }
  const exams = local.exams || [];
  return batchId ? exams.filter(e => e.batchId === batchId) : exams;
}

export async function createExamInDB(exam: Exam): Promise<Exam> {
  const local = db.getData();
  if (!local.exams) local.exams = [];
  local.exams = local.exams.filter(e => e.id !== exam.id);
  local.exams.push(exam);
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapExamToSupabase(exam);
      const { data, error } = await supabase.from('exams').insert(payload).select().maybeSingle();
      if (error) {
        console.warn('[Supabase createExam Warning]:', error.message);
      } else if (data) {
        const created = mapExamFromSupabase(data);
        const idx = local.exams.findIndex(e => e.id === exam.id || e.id === created.id);
        if (idx >= 0) local.exams[idx] = created;
        db.save();
        return created;
      }
    } catch (e: any) {
      console.warn('[Supabase createExam Exception]:', e?.message);
    }
  }
  return exam;
}

export async function updateExamInDB(id: string, updates: Partial<Exam>): Promise<Exam> {
  const local = db.getData();
  if (!local.exams) local.exams = [];
  let existing = local.exams.find(e => e.id === id);
  if (!existing) {
    existing = {
      id,
      batchId: updates.batchId || '',
      courseId: updates.courseId || '',
      courseCode: updates.courseCode || '',
      courseTitle: updates.courseTitle || '',
      type: updates.type || 'CLASS_TEST',
      title: updates.title || 'Exam',
      date: updates.date || new Date().toISOString().split('T')[0],
      createdBy: updates.createdBy || 'admin',
      createdByName: updates.createdByName || 'Admin',
      createdAt: new Date().toISOString(),
    };
    local.exams.push(existing);
  }

  const updated: Exam = { ...existing, ...updates };
  const idx = local.exams.findIndex(e => e.id === id);
  if (idx >= 0) local.exams[idx] = updated;
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapExamToSupabase(updated);
      const { data, error } = await supabase.from('exams').update(payload).eq('id', id).select().maybeSingle();
      if (error) {
        console.warn('[Supabase updateExam Warning]:', error.message);
      } else if (data) {
        const result = mapExamFromSupabase(data);
        const curIdx = local.exams.findIndex(e => e.id === id);
        if (curIdx >= 0) local.exams[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e: any) {
      console.warn('[Supabase updateExam Exception]:', e?.message);
    }
  }
  return updated;
}

export async function deleteExamFromDB(id: string): Promise<boolean> {
  const local = db.getData();
  if (local.exams) {
    local.exams = local.exams.filter(e => e.id !== id);
    db.save();
  }

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) console.warn('[Supabase deleteExam Warning]:', error.message);
    } catch (e: any) {
      console.warn('[Supabase deleteExam Exception]:', e?.message);
    }
  }
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
  const rawPriority = (ann.priority || 'NORMAL').toUpperCase();
  const priority = (rawPriority === 'URGENT' || rawPriority === 'HIGH') ? 'URGENT' : 'NORMAL';

  return {
    id: ann.id,
    batch_id: ann.batchId,
    title: ann.title,
    description: ann.description,
    publish_date: ann.publishDate,
    expiry_date: ann.expiryDate,
    priority,
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
  const local = db.getData();
  if (!local.announcements) local.announcements = [];
  local.announcements = local.announcements.filter(a => a.id !== ann.id);
  local.announcements.push(ann);
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapAnnouncementToSupabase(ann);
      const { data, error } = await supabase.from('announcements').insert(payload).select().maybeSingle();
      if (error) {
        console.warn('[Supabase createAnnouncement Warning]:', error.message);
      } else if (data) {
        const created = mapAnnouncementFromSupabase(data);
        const idx = local.announcements.findIndex(a => a.id === ann.id || a.id === created.id);
        if (idx >= 0) local.announcements[idx] = created;
        db.save();
        return created;
      }
    } catch (e: any) {
      console.warn('[Supabase createAnnouncement Exception]:', e?.message);
    }
  }
  return ann;
}

export async function deleteAnnouncementFromDB(id: string): Promise<boolean> {
  const local = db.getData();
  if (local.announcements) {
    local.announcements = local.announcements.filter(a => a.id !== id);
    db.save();
  }

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) console.warn('[Supabase deleteAnnouncement Warning]:', error.message);
    } catch (e: any) {
      console.warn('[Supabase deleteAnnouncement Exception]:', e?.message);
    }
  }
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
  const rawCat = (notice.category || 'GENERAL').toUpperCase();
  let category = 'GENERAL';
  if (['EXAM', 'HOLIDAY', 'URGENT', 'GENERAL'].includes(rawCat)) {
    category = rawCat;
  }

  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    category,
    publish_date: notice.publishDate,
    is_important: notice.isImportant,
    attachment_url: notice.attachmentUrl || null,
    created_by: notice.createdBy,
    created_by_name: notice.createdByName,
    created_at: notice.createdAt || new Date().toISOString(),
  };
}

export async function fetchAllNotices(): Promise<DepartmentNotice[]> {
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('department_notices').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const notices = data.map(mapNoticeFromSupabase);
        local.departmentNotices = notices;
        db.save();
        return notices;
      }
    } catch (e) {
      console.error('[Supabase fetchAllNotices Exception]:', e);
    }
  }
  return local.departmentNotices && local.departmentNotices.length > 0 ? local.departmentNotices : [];
}

export async function createNoticeInDB(notice: DepartmentNotice): Promise<DepartmentNotice> {
  const local = db.getData();
  if (!local.departmentNotices) local.departmentNotices = [];
  local.departmentNotices = local.departmentNotices.filter(n => n.id !== notice.id);
  local.departmentNotices.push(notice);
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapNoticeToSupabase(notice);
      const { data, error } = await supabase.from('department_notices').insert(payload).select().maybeSingle();
      if (error) {
        console.warn('[Supabase createNotice Warning]:', error.message);
      } else if (data) {
        const created = mapNoticeFromSupabase(data);
        const idx = local.departmentNotices.findIndex(n => n.id === notice.id || n.id === created.id);
        if (idx >= 0) local.departmentNotices[idx] = created;
        db.save();
        return created;
      }
    } catch (e: any) {
      console.warn('[Supabase createNotice Exception]:', e?.message);
    }
  }
  return notice;
}

export async function deleteNoticeFromDB(id: string): Promise<boolean> {
  const local = db.getData();
  if (local.departmentNotices) {
    local.departmentNotices = local.departmentNotices.filter(n => n.id !== id);
    db.save();
  }

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('department_notices').delete().eq('id', id);
      if (error) console.warn('[Supabase deleteNotice Warning]:', error.message);
    } catch (e: any) {
      console.warn('[Supabase deleteNotice Exception]:', e?.message);
    }
  }
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
  const local = db.getData();
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        const resources = data.map(mapResourceFromSupabase);
        local.resources = resources;
        db.save();
        return resources;
      }
    } catch (e) {
      console.error('[Supabase fetchAllResources Exception]:', e);
    }
  }
  return local.resources && local.resources.length > 0 ? local.resources : [];
}

export async function createResourceInDB(res: Resource): Promise<Resource> {
  const local = db.getData();
  if (!local.resources) local.resources = [];
  local.resources = local.resources.filter(r => r.id !== res.id);
  local.resources.push(res);
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapResourceToSupabase(res);
      const { data, error } = await supabase.from('resources').insert(payload).select().maybeSingle();
      if (error) {
        console.warn('[Supabase createResource Warning]:', error.message);
      } else if (data) {
        const created = mapResourceFromSupabase(data);
        const idx = local.resources.findIndex(r => r.id === res.id || r.id === created.id);
        if (idx >= 0) local.resources[idx] = created;
        db.save();
        return created;
      }
    } catch (e: any) {
      console.warn('[Supabase createResource Exception]:', e?.message);
    }
  }
  return res;
}

export async function updateResourceInDB(id: string, updates: Partial<Resource>): Promise<Resource> {
  const local = db.getData();
  if (!local.resources) local.resources = [];
  let existing = local.resources.find(r => r.id === id);
  if (!existing) {
    existing = {
      id,
      title: updates.title || 'Resource',
      type: updates.type || 'NOTE',
      courseId: updates.courseId || '',
      courseCode: updates.courseCode || '',
      courseTitle: updates.courseTitle || '',
      semester: updates.semester || 1,
      academicYear: updates.academicYear || 2024,
      fileUrl: updates.fileUrl || '',
      fileName: updates.fileName || 'file.pdf',
      fileSize: updates.fileSize || '1 MB',
      fileType: updates.fileType || 'application/pdf',
      uploaderId: updates.uploaderId || 'admin',
      uploaderStudentId: updates.uploaderStudentId || 'ADMIN',
      uploaderName: updates.uploaderName || 'Admin',
      uploaderBatchName: updates.uploaderBatchName || 'SWE',
      status: updates.status || 'APPROVED',
      downloadCount: updates.downloadCount || 0,
      createdAt: new Date().toISOString(),
    };
    local.resources.push(existing);
  }

  const updated: Resource = { ...existing, ...updates };
  const idx = local.resources.findIndex(r => r.id === id);
  if (idx >= 0) local.resources[idx] = updated;
  db.save();

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const payload = mapResourceToSupabase(updated);
      const { data, error } = await supabase.from('resources').update(payload).eq('id', id).select().maybeSingle();
      if (error) {
        console.warn('[Supabase updateResource Warning]:', error.message);
      } else if (data) {
        const result = mapResourceFromSupabase(data);
        const curIdx = local.resources.findIndex(r => r.id === id);
        if (curIdx >= 0) local.resources[curIdx] = result;
        db.save();
        return result;
      }
    } catch (e: any) {
      console.warn('[Supabase updateResource Exception]:', e?.message);
    }
  }
  return updated;
}

export async function deleteResourceFromDB(id: string): Promise<boolean> {
  const local = db.getData();
  if (local.resources) {
    local.resources = local.resources.filter(r => r.id !== id);
    db.save();
  }

  const supabase = getServerSupabase();
  if (supabase) {
    try {
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) console.warn('[Supabase deleteResource Warning]:', error.message);
    } catch (e: any) {
      console.warn('[Supabase deleteResource Exception]:', e?.message);
    }
  }
  return true;
}
