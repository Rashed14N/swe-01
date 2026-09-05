import bcrypt from 'bcryptjs';
import { getServerSupabase } from '../supabaseSync';
import { db } from '../db';
import { sortFacultyByHierarchy } from '../../types';
import type {
  User,
  Batch,
  Course,
  Faculty,
  RoutineSlot,
  Exam,
  BatchAnnouncement,
  DepartmentNotice,
  Resource,
  NotificationItem,
  AuditLog,
  UserRole,
} from '../../types';

// ==============================================================================
// AUDIT LOG HELPER (Immutable PostgreSQL storage)
// ==============================================================================

export async function createAuditLog(
  actorId: string,
  actorName: string,
  action: string,
  target: string,
  details?: string
): Promise<void> {
  const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // 1. Write directly to Supabase audit_logs table
  const supabase = getServerSupabase();
  if (supabase) {
    try {
      await supabase.from('audit_logs').insert({
        id: logId,
        actor_id: actorId,
        actor_name: actorName,
        action,
        target,
        details: details || null,
        timestamp: now,
      });
    } catch (err) {
      console.error('[AdminService] Error saving audit log to Supabase:', err);
    }
  }

  // 2. Also keep in memory/db.json as local mirror
  db.addAuditLog(actorId, actorName, action, target, details);
}

// ==============================================================================
// 1. STATS / OVERVIEW
// ==============================================================================

export async function getAdminStats() {
  const supabase = getServerSupabase();
  if (!supabase) {
    throw new Error('Supabase client is not available on server.');
  }

  const [
    usersRes,
    batchesRes,
    coursesRes,
    facultyRes,
    routineRes,
    examsRes,
    announcementsRes,
    noticesRes,
    resourcesRes,
    notificationsRes,
    auditLogsRes,
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: false }),
    supabase.from('batches').select('*', { count: 'exact', head: false }),
    supabase.from('courses').select('*', { count: 'exact', head: false }),
    supabase.from('faculty').select('*', { count: 'exact', head: false }),
    supabase.from('routine_slots').select('*', { count: 'exact', head: false }),
    supabase.from('exams').select('*', { count: 'exact', head: false }),
    supabase.from('announcements').select('*', { count: 'exact', head: false }),
    supabase.from('department_notices').select('*', { count: 'exact', head: false }),
    supabase.from('resources').select('*', { count: 'exact', head: false }),
    supabase.from('notifications').select('*', { count: 'exact', head: false }),
    supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(15),
  ]);

  const users = usersRes.data || [];
  const batches = batchesRes.data || [];
  const courses = coursesRes.data || [];
  const faculty = facultyRes.data || [];
  const routine = routineRes.data || [];
  const exams = examsRes.data || [];
  const announcements = announcementsRes.data || [];
  const notices = noticesRes.data || [];
  const resources = resourcesRes.data || [];
  const notifications = notificationsRes.data || [];
  const recentAuditLogs = (auditLogsRes.data || []).map((row: any): AuditLog => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    target: row.target,
    details: row.details || undefined,
    timestamp: row.timestamp || new Date().toISOString(),
  }));

  const totalStudents = users.filter((u: any) => u.role === 'STUDENT' || u.role === 'CR').length;
  const totalAdmins = users.filter((u: any) => u.role === 'ADMIN').length;
  const totalCRs = users.filter((u: any) => u.role === 'CR').length;
  const pendingResources = resources.filter((r: any) => r.status === 'PENDING').length;
  const activeBatches = batches.length;

  return {
    totalUsers: users.length,
    totalStudents,
    totalCRs,
    totalAdmins,
    totalBatches: batches.length,
    activeBatches,
    totalCourses: courses.length,
    totalFaculty: faculty.length,
    totalRoutineSlots: routine.length,
    totalExams: exams.length,
    totalAnnouncements: announcements.length,
    totalNotices: notices.length,
    totalResources: resources.length,
    pendingResources,
    totalNotifications: notifications.length,
    recentAuditLogs,
  };
}

// ==============================================================================
// 2. USERS CRUD
// ==============================================================================

export async function getAllUsers(): Promise<User[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): User => ({
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    role: row.role as UserRole,
    batchId: row.batch_id || undefined,
    batchName: row.batch_name || undefined,
    currentSemester: Number(row.current_semester || 1),
    profileImage: row.profile_image || undefined,
    status: row.status as 'ACTIVE' | 'DISABLED',
    points: Number(row.points || 0),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  }));
}

export async function createUser(userData: Partial<User>, adminUser: { id: string; name: string }): Promise<User> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!userData.studentId || !userData.name) {
    throw new Error('Student ID and Name are required.');
  }

  const cleanStudentId = userData.studentId.trim();
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const insertPayload = {
    id,
    student_id: cleanStudentId,
    name: userData.name.trim(),
    email: userData.email ? userData.email.trim().toLowerCase() : null,
    phone: userData.phone ? userData.phone.trim() : null,
    role: userData.role || 'STUDENT',
    batch_id: userData.batchId || null,
    batch_name: userData.batchName || null,
    current_semester: Number(userData.currentSemester || 1),
    profile_image: userData.profileImage || null,
    status: userData.status || 'ACTIVE',
    points: Number(userData.points || 0),
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase.from('users').insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create user: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'USER_CREATED',
    `User: ${data.name} (${data.student_id})`,
    `Role: ${data.role}, Batch: ${data.batch_name || 'N/A'}`
  );

  return {
    id: data.id,
    studentId: data.student_id,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    role: data.role,
    batchId: data.batch_id || undefined,
    batchName: data.batch_name || undefined,
    currentSemester: Number(data.current_semester || 1),
    profileImage: data.profile_image || undefined,
    status: data.status,
    points: Number(data.points || 0),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateUser(id: string, updates: Partial<User>, adminUser: { id: string; name: string }): Promise<User> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.studentId !== undefined) updatePayload.student_id = updates.studentId.trim();
  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.email !== undefined) updatePayload.email = updates.email ? updates.email.trim().toLowerCase() : null;
  if (updates.phone !== undefined) updatePayload.phone = updates.phone ? updates.phone.trim() : null;
  if (updates.role !== undefined) updatePayload.role = updates.role;
  if (updates.batchId !== undefined) updatePayload.batch_id = updates.batchId || null;
  if (updates.batchName !== undefined) updatePayload.batch_name = updates.batchName || null;
  if (updates.currentSemester !== undefined) updatePayload.current_semester = Number(updates.currentSemester);
  if (updates.profileImage !== undefined) updatePayload.profile_image = updates.profileImage || null;
  if (updates.status !== undefined) updatePayload.status = updates.status;
  if (updates.points !== undefined) updatePayload.points = Number(updates.points);

  const { data, error } = await supabase.from('users').update(updatePayload).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update user: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'USER_UPDATED',
    `User: ${data.name} (${data.student_id})`,
    `Updated fields: ${Object.keys(updatePayload).filter(k => k !== 'updated_at').join(', ')}`
  );

  return {
    id: data.id,
    studentId: data.student_id,
    name: data.name,
    email: data.email || undefined,
    phone: data.phone || undefined,
    role: data.role,
    batchId: data.batch_id || undefined,
    batchName: data.batch_name || undefined,
    currentSemester: Number(data.current_semester || 1),
    profileImage: data.profile_image || undefined,
    status: data.status,
    points: Number(data.points || 0),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteUser(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  // Fetch record first to know name for audit log
  const { data: existing } = await supabase.from('users').select('name, student_id').eq('id', id).single();

  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete user: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'USER_DELETED',
    `User: ${existing?.name || id} (${existing?.student_id || ''})`,
    `Permanently removed from database`
  );
}

export async function resetUserPassword(
  id: string,
  newPassword: string,
  adminUser: { id: string; name: string }
): Promise<{ success: boolean; message: string }> {
  const supabase = getServerSupabase();
  const cleanPass = (newPassword || '').trim();
  if (!cleanPass) {
    throw new Error('Password cannot be empty');
  }

  // Update in local db password store if exists
  if (db && (db as any).data && (db as any).data.passwords) {
    (db as any).data.passwords[id] = bcrypt.hashSync(cleanPass, 10);
    (db as any).save?.();
  }

  const { data: userRecord } = supabase ? await supabase.from('users').select('name, student_id').eq('id', id).single() : { data: null };

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'PASSWORD_RESET',
    `User: ${userRecord?.name || id} (${userRecord?.student_id || ''})`,
    'Admin reset user access credentials'
  );

  return { success: true, message: 'Password updated successfully' };
}

export async function bulkImportUsers(
  csvText: string,
  defaultBatchId: string,
  adminUser: { id: string; name: string }
): Promise<{ importedCount: number; errors: string[] }> {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error('CSV text is required');
  }

  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('CSV data is empty');
  }

  let importedCount = 0;
  const errors: string[] = [];

  let startIndex = 0;
  const firstLineLower = lines[0].toLowerCase();
  if (firstLineLower.includes('student') || firstLineLower.includes('name') || firstLineLower.includes('id')) {
    startIndex = 1; // skip header
  }

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cols = rawLine.includes('\t') ? rawLine.split('\t') : rawLine.split(',');
    const studentId = (cols[0] || '').trim().replace(/['"]/g, '');
    const name = (cols[1] || '').trim().replace(/['"]/g, '');
    const email = (cols[2] || '').trim().replace(/['"]/g, '');
    const phone = (cols[3] || '').trim().replace(/['"]/g, '');

    if (!studentId || !name) {
      errors.push(`Line ${i + 1}: Missing student ID or name`);
      continue;
    }

    try {
      await createUser({
        studentId,
        name,
        email: email || undefined,
        phone: phone || undefined,
        batchId: defaultBatchId || undefined,
        role: 'STUDENT',
        status: 'ACTIVE',
      }, adminUser);
      importedCount++;
    } catch (err: any) {
      errors.push(`Line ${i + 1} (${studentId}): ${err.message || 'Import error'}`);
    }
  }

  return { importedCount, errors };
}

// ==============================================================================
// 3. BATCHES CRUD
// ==============================================================================

export async function getAllBatches(): Promise<Batch[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data, error } = await supabase.from('batches').select('*').order('admission_year', { ascending: false });
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): Batch => ({
    id: row.id,
    name: row.name,
    admissionYear: Number(row.admission_year),
    currentSemester: Number(row.current_semester || 1),
    academicSession: row.academic_session || '',
    crIds: Array.isArray(row.cr_ids) ? row.cr_ids : [],
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function createBatch(batchData: Partial<Batch>, adminUser: { id: string; name: string }): Promise<Batch> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!batchData.name || !batchData.admissionYear || !batchData.academicSession) {
    throw new Error('Batch Name, Admission Year, and Academic Session are required.');
  }

  const id = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const insertPayload = {
    id,
    name: batchData.name.trim(),
    admission_year: Number(batchData.admissionYear),
    current_semester: Number(batchData.currentSemester || 1),
    academic_session: batchData.academicSession.trim(),
    cr_ids: Array.isArray(batchData.crIds) ? batchData.crIds : [],
    created_at: now,
  };

  const { data, error } = await supabase.from('batches').insert(insertPayload).select().maybeSingle();
  if (error || !data) {
    console.error('[Supabase createBatch error]:', error);
    throw new Error(`Failed to create batch in Supabase: ${error?.message || 'Database returned no data'}`);
  }

  const createdBatch: Batch = {
    id: data.id,
    name: data.name,
    admissionYear: Number(data.admission_year),
    currentSemester: Number(data.current_semester),
    academicSession: data.academic_session,
    crIds: Array.isArray(data.cr_ids) ? data.cr_ids : [],
    createdAt: data.created_at,
  };

  const local = db.getData();
  if (!local.batches) local.batches = [];
  local.batches = local.batches.filter(b => b.id !== createdBatch.id);
  local.batches.push(createdBatch);
  try { db.save(); } catch {}

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'BATCH_CREATED',
    `Batch: ${createdBatch.name}`,
    `Year: ${createdBatch.admissionYear}, Semester: ${createdBatch.currentSemester}`
  );

  return createdBatch;
}

export async function updateBatch(id: string, updates: Partial<Batch>, adminUser: { id: string; name: string }): Promise<Batch> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {};
  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.admissionYear !== undefined) updatePayload.admission_year = Number(updates.admissionYear);
  if (updates.currentSemester !== undefined) updatePayload.current_semester = Number(updates.currentSemester);
  if (updates.academicSession !== undefined) updatePayload.academic_session = updates.academicSession.trim();
  if (updates.crIds !== undefined) updatePayload.cr_ids = Array.isArray(updates.crIds) ? updates.crIds : [];

  const { data, error } = await supabase.from('batches').update(updatePayload).eq('id', id).select().maybeSingle();
  if (error || !data) {
    console.error('[Supabase updateBatch error]:', error);
    throw new Error(`Failed to update batch in Supabase: ${error?.message || 'Batch record not found'}`);
  }

  const updatedBatch: Batch = {
    id: data.id,
    name: data.name,
    admissionYear: Number(data.admission_year),
    currentSemester: Number(data.current_semester),
    academicSession: data.academic_session,
    crIds: Array.isArray(data.cr_ids) ? data.cr_ids : [],
    createdAt: data.created_at,
  };

  const local = db.getData();
  if (!local.batches) local.batches = [];
  const idx = local.batches.findIndex(b => b.id === id);
  if (idx >= 0) local.batches[idx] = updatedBatch;
  else local.batches.push(updatedBatch);
  try { db.save(); } catch {}

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'BATCH_UPDATED',
    `Batch: ${updatedBatch.name}`,
    `Updated fields: ${Object.keys(updatePayload).join(', ')}`
  );

  return updatedBatch;
}

export async function deleteBatch(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data: existing } = await supabase.from('batches').select('name').eq('id', id).maybeSingle();

  const { error } = await supabase.from('batches').delete().eq('id', id);
  if (error) {
    console.error('[Supabase deleteBatch error]:', error);
    throw new Error(`Failed to delete batch from Supabase: ${error.message}`);
  }

  const local = db.getData();
  if (local.batches) {
    local.batches = local.batches.filter(b => b.id !== id);
    try { db.save(); } catch {}
  }

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'BATCH_DELETED',
    `Batch: ${existing?.name || id}`,
    `Permanently removed from database`
  );
}

// ==============================================================================
// 4. COURSES CRUD
// ==============================================================================

export async function getAllCourses(): Promise<Course[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data, error } = await supabase.from('courses').select('*').order('semester', { ascending: true }).order('code', { ascending: true });
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): Course => ({
    id: row.id,
    code: row.code,
    shortName: row.short_name || undefined,
    title: row.title,
    credits: Number(row.credits || 3.0),
    type: row.type || 'THEORY',
    semester: Number(row.semester || 1),
    assignedFacultyId: row.assigned_faculty_id || undefined,
    assignedFacultyName: row.assigned_faculty_name || undefined,
    batchIds: Array.isArray(row.batch_ids) ? row.batch_ids : [],
  }));
}

export async function createCourse(courseData: Partial<Course>, adminUser: { id: string; name: string }): Promise<Course> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!courseData.code || !courseData.title) {
    throw new Error('Course Code and Title are required.');
  }

  const id = `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const insertPayload = {
    id,
    code: courseData.code.trim().toUpperCase(),
    short_name: courseData.shortName ? courseData.shortName.trim() : null,
    title: courseData.title.trim(),
    credits: Number(courseData.credits || 3.0),
    type: courseData.type || 'THEORY',
    semester: Number(courseData.semester || 1),
    assigned_faculty_id: courseData.assignedFacultyId || null,
    assigned_faculty_name: courseData.assignedFacultyName || null,
    batch_ids: Array.isArray(courseData.batchIds) ? courseData.batchIds : [],
    created_at: now,
  };

  const { data, error } = await supabase.from('courses').insert(insertPayload).select().maybeSingle();
  if (error || !data) {
    console.error('[Supabase createCourse error]:', error);
    throw new Error(`Failed to create course in Supabase: ${error?.message || 'Database returned no data'}`);
  }

  const createdCourse: Course = {
    id: data.id,
    code: data.code,
    shortName: data.short_name || undefined,
    title: data.title,
    credits: Number(data.credits),
    type: data.type,
    semester: Number(data.semester),
    assignedFacultyId: data.assigned_faculty_id || undefined,
    assignedFacultyName: data.assigned_faculty_name || undefined,
    batchIds: Array.isArray(data.batch_ids) ? data.batch_ids : [],
  };

  const local = db.getData();
  if (!local.courses) local.courses = [];
  local.courses = local.courses.filter(c => c.id !== createdCourse.id);
  local.courses.push(createdCourse);
  try { db.save(); } catch {}

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'COURSE_CREATED',
    `Course: ${createdCourse.code} - ${createdCourse.title}`,
    `Credits: ${createdCourse.credits}, Semester: ${createdCourse.semester}, Type: ${createdCourse.type}`
  );

  return createdCourse;
}

export async function updateCourse(id: string, updates: Partial<Course>, adminUser: { id: string; name: string }): Promise<Course> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {};
  if (updates.code !== undefined) updatePayload.code = updates.code.trim().toUpperCase();
  if (updates.shortName !== undefined) updatePayload.short_name = updates.shortName ? updates.shortName.trim() : null;
  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.credits !== undefined) updatePayload.credits = Number(updates.credits);
  if (updates.type !== undefined) updatePayload.type = updates.type;
  if (updates.semester !== undefined) updatePayload.semester = Number(updates.semester);
  if (updates.assignedFacultyId !== undefined) updatePayload.assigned_faculty_id = updates.assignedFacultyId || null;
  if (updates.assignedFacultyName !== undefined) updatePayload.assigned_faculty_name = updates.assignedFacultyName || null;
  if (updates.batchIds !== undefined) updatePayload.batch_ids = Array.isArray(updates.batchIds) ? updates.batchIds : [];

  const { data, error } = await supabase.from('courses').update(updatePayload).eq('id', id).select().maybeSingle();
  if (error || !data) {
    console.error('[Supabase updateCourse error]:', error);
    throw new Error(`Failed to update course in Supabase: ${error?.message || 'Course record not found'}`);
  }

  const updatedCourse: Course = {
    id: data.id,
    code: data.code,
    shortName: data.short_name || undefined,
    title: data.title,
    credits: Number(data.credits),
    type: data.type,
    semester: Number(data.semester),
    assignedFacultyId: data.assigned_faculty_id || undefined,
    assignedFacultyName: data.assigned_faculty_name || undefined,
    batchIds: Array.isArray(data.batch_ids) ? data.batch_ids : [],
  };

  const local = db.getData();
  if (!local.courses) local.courses = [];
  const idx = local.courses.findIndex(c => c.id === id);
  if (idx >= 0) local.courses[idx] = updatedCourse;
  else local.courses.push(updatedCourse);
  try { db.save(); } catch {}

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'COURSE_UPDATED',
    `Course: ${updatedCourse.code} - ${updatedCourse.title}`,
    `Updated fields: ${Object.keys(updatePayload).join(', ')}`
  );

  return updatedCourse;
}

export async function deleteCourse(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data: existing } = await supabase.from('courses').select('code, title').eq('id', id).maybeSingle();

  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) {
    console.error('[Supabase deleteCourse error]:', error);
    throw new Error(`Failed to delete course from Supabase: ${error.message}`);
  }

  const local = db.getData();
  if (local.courses) {
    local.courses = local.courses.filter(c => c.id !== id);
    try { db.save(); } catch {}
  }

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'COURSE_DELETED',
    `Course: ${existing?.code || id} - ${existing?.title || ''}`,
    `Permanently removed from database`
  );
}

// ==============================================================================
// 5. FACULTY CRUD
// ==============================================================================

export async function getAllFaculty(): Promise<Faculty[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data, error } = await supabase.from('faculty').select('*').order('name', { ascending: true });
  if (error) throw new Error(`Supabase error: ${error.message}`);

  const mapped = (data || []).map((row: any): Faculty => ({
    id: row.id,
    name: row.name,
    shortName: row.short_name || undefined,
    designation: row.designation,
    department: row.department || 'Software Engineering',
    email: row.email || '',
    phone: row.phone || undefined,
    officeRoom: row.office_room || undefined,
    photoUrl: row.photo_url || undefined,
    specialization: row.specialization || undefined,
    assignedCourses: Array.isArray(row.assigned_courses) ? row.assigned_courses : [],
  }));

  return sortFacultyByHierarchy(mapped);
}

export async function createFaculty(facultyData: Partial<Faculty>, adminUser: { id: string; name: string }): Promise<Faculty> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!facultyData.name || !facultyData.designation || !facultyData.email) {
    throw new Error('Faculty Name, Designation, and Email are required.');
  }

  const id = `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const insertPayload = {
    id,
    name: facultyData.name.trim(),
    short_name: facultyData.shortName ? facultyData.shortName.trim() : null,
    designation: facultyData.designation.trim(),
    department: facultyData.department ? facultyData.department.trim() : 'Software Engineering',
    email: facultyData.email.trim().toLowerCase(),
    phone: facultyData.phone ? facultyData.phone.trim() : null,
    office_room: facultyData.officeRoom ? facultyData.officeRoom.trim() : 'SWE Faculty Room',
    photo_url: facultyData.photoUrl || null,
    specialization: facultyData.specialization ? facultyData.specialization.trim() : null,
    assigned_courses: Array.isArray(facultyData.assignedCourses) ? facultyData.assignedCourses : [],
    created_at: now,
  };

  const { data, error } = await supabase.from('faculty').insert(insertPayload).select().maybeSingle();
  if (error || !data) {
    console.error('[Supabase createFaculty error]:', error);
    throw new Error(`Failed to create faculty in Supabase: ${error?.message || 'Database returned no data'}`);
  }

  const createdFaculty: Faculty = {
    id: data.id,
    name: data.name,
    shortName: data.short_name || undefined,
    designation: data.designation,
    department: data.department,
    email: data.email,
    phone: data.phone || undefined,
    officeRoom: data.office_room || undefined,
    photoUrl: data.photo_url || undefined,
    specialization: data.specialization || undefined,
    assignedCourses: Array.isArray(data.assigned_courses) ? data.assigned_courses : [],
  };

  const local = db.getData();
  if (!local.faculty) local.faculty = [];
  local.faculty = local.faculty.filter(f => f.id !== createdFaculty.id);
  local.faculty.push(createdFaculty);
  try { db.save(); } catch {}

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'FACULTY_CREATED',
    `Faculty: ${createdFaculty.name} (${createdFaculty.designation})`,
    `Email: ${createdFaculty.email}, Office: ${createdFaculty.officeRoom}`
  );

  return createdFaculty;
}

export async function updateFaculty(id: string, updates: Partial<Faculty>, adminUser: { id: string; name: string }): Promise<Faculty> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {};
  if (updates.name !== undefined) updatePayload.name = updates.name.trim();
  if (updates.shortName !== undefined) updatePayload.short_name = updates.shortName ? updates.shortName.trim() : null;
  if (updates.designation !== undefined) updatePayload.designation = updates.designation.trim();
  if (updates.department !== undefined) updatePayload.department = updates.department.trim();
  if (updates.email !== undefined) updatePayload.email = updates.email.trim().toLowerCase();
  if (updates.phone !== undefined) updatePayload.phone = updates.phone ? updates.phone.trim() : null;
  if (updates.officeRoom !== undefined) updatePayload.office_room = updates.officeRoom ? updates.officeRoom.trim() : null;
  if (updates.photoUrl !== undefined) updatePayload.photo_url = updates.photoUrl || null;
  if (updates.specialization !== undefined) updatePayload.specialization = updates.specialization ? updates.specialization.trim() : null;
  if (updates.assignedCourses !== undefined) updatePayload.assigned_courses = Array.isArray(updates.assignedCourses) ? updates.assignedCourses : [];

  const { data, error } = await supabase.from('faculty').update(updatePayload).eq('id', id).select().maybeSingle();
  if (error || !data) {
    console.error('[Supabase updateFaculty error]:', error);
    throw new Error(`Failed to update faculty in Supabase: ${error?.message || 'Faculty record not found'}`);
  }

  const updatedFaculty: Faculty = {
    id: data.id,
    name: data.name,
    shortName: data.short_name || undefined,
    designation: data.designation,
    department: data.department,
    email: data.email,
    phone: data.phone || undefined,
    officeRoom: data.office_room || undefined,
    photoUrl: data.photo_url || undefined,
    specialization: data.specialization || undefined,
    assignedCourses: Array.isArray(data.assigned_courses) ? data.assigned_courses : [],
  };

  const local = db.getData();
  if (!local.faculty) local.faculty = [];
  const idx = local.faculty.findIndex(f => f.id === id);
  if (idx >= 0) local.faculty[idx] = updatedFaculty;
  else local.faculty.push(updatedFaculty);
  try { db.save(); } catch {}

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'FACULTY_UPDATED',
    `Faculty: ${updatedFaculty.name} (${updatedFaculty.designation})`,
    `Updated fields: ${Object.keys(updatePayload).join(', ')}`
  );

  return updatedFaculty;
}

export async function deleteFaculty(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data: existing } = await supabase.from('faculty').select('name, designation').eq('id', id).maybeSingle();

  const { error } = await supabase.from('faculty').delete().eq('id', id);
  if (error) {
    console.error('[Supabase deleteFaculty error]:', error);
    throw new Error(`Failed to delete faculty from Supabase: ${error.message}`);
  }

  const local = db.getData();
  if (local.faculty) {
    local.faculty = local.faculty.filter(f => f.id !== id);
    try { db.save(); } catch {}
  }

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'FACULTY_DELETED',
    `Faculty: ${existing?.name || id} (${existing?.designation || ''})`,
    `Permanently removed from database`
  );
}

// ==============================================================================
// 6. ROUTINE SLOTS CRUD
// ==============================================================================

export async function getAllRoutineSlots(batchId?: string): Promise<RoutineSlot[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  let query = supabase.from('routine_slots').select('*');
  if (batchId) {
    query = query.eq('batch_id', batchId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): RoutineSlot => ({
    id: row.id,
    batchId: row.batch_id,
    day: (row.day || 'SUNDAY').toUpperCase() as any,
    startTime: row.start_time,
    endTime: row.end_time,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseShortName: row.course_short_name || undefined,
    courseTitle: row.course_title,
    teacherName: row.teacher_name,
    teacherShortName: row.teacher_short_name || undefined,
    room: row.room,
  }));
}

export async function createRoutineSlot(slotData: Partial<RoutineSlot>, adminUser: { id: string; name: string }): Promise<RoutineSlot> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!slotData.batchId || !slotData.day || !slotData.startTime || !slotData.endTime || !slotData.courseTitle || !slotData.room) {
    throw new Error('Batch, Day, Time, Course Title, and Room are required.');
  }

  const id = `slot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Normalize day to uppercase (SUNDAY, MONDAY, etc.) as required by Supabase check constraint
  const rawDay = slotData.day ? String(slotData.day).trim().toUpperCase() : 'SUNDAY';

  const insertPayload = {
    id,
    batch_id: slotData.batchId,
    day: rawDay,
    start_time: slotData.startTime.trim(),
    end_time: slotData.endTime.trim(),
    course_id: slotData.courseId || `course_ref_${Date.now()}`,
    course_code: slotData.courseCode ? slotData.courseCode.trim() : 'SWE',
    course_short_name: slotData.courseShortName ? slotData.courseShortName.trim() : null,
    course_title: slotData.courseTitle.trim(),
    teacher_name: slotData.teacherName ? slotData.teacherName.trim() : 'Faculty',
    teacher_short_name: slotData.teacherShortName ? slotData.teacherShortName.trim() : null,
    room: slotData.room.trim(),
    created_at: now,
  };

  const { data, error } = await supabase.from('routine_slots').insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create routine slot: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'ROUTINE_SLOT_CREATED',
    `Slot: ${data.course_code} on ${data.day} (${data.start_time}-${data.end_time})`,
    `Room: ${data.room}, Batch: ${data.batch_id}`
  );

  return {
    id: data.id,
    batchId: data.batch_id,
    day: (data.day || 'SUNDAY').toUpperCase() as any,
    startTime: data.start_time,
    endTime: data.end_time,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseShortName: data.course_short_name || undefined,
    courseTitle: data.course_title,
    teacherName: data.teacher_name,
    teacherShortName: data.teacher_short_name || undefined,
    room: data.room,
  };
}

export async function updateRoutineSlot(id: string, updates: Partial<RoutineSlot>, adminUser: { id: string; name: string }): Promise<RoutineSlot> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {};
  if (updates.batchId !== undefined) updatePayload.batch_id = updates.batchId;
  if (updates.day !== undefined) {
    updatePayload.day = String(updates.day).trim().toUpperCase();
  }
  if (updates.startTime !== undefined) updatePayload.start_time = updates.startTime.trim();
  if (updates.endTime !== undefined) updatePayload.end_time = updates.endTime.trim();
  if (updates.courseId !== undefined) updatePayload.course_id = updates.courseId;
  if (updates.courseCode !== undefined) updatePayload.course_code = updates.courseCode.trim();
  if (updates.courseShortName !== undefined) updatePayload.course_short_name = updates.courseShortName ? updates.courseShortName.trim() : null;
  if (updates.courseTitle !== undefined) updatePayload.course_title = updates.courseTitle.trim();
  if (updates.teacherName !== undefined) updatePayload.teacher_name = updates.teacherName.trim();
  if (updates.teacherShortName !== undefined) updatePayload.teacher_short_name = updates.teacherShortName ? updates.teacherShortName.trim() : null;
  if (updates.room !== undefined) updatePayload.room = updates.room.trim();

  const { data, error } = await supabase.from('routine_slots').update(updatePayload).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update routine slot: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'ROUTINE_SLOT_UPDATED',
    `Slot: ${data.course_code} (${data.day})`,
    `Updated fields: ${Object.keys(updatePayload).join(', ')}`
  );

  return {
    id: data.id,
    batchId: data.batch_id,
    day: (data.day || 'SUNDAY').toUpperCase() as any,
    startTime: data.start_time,
    endTime: data.end_time,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseShortName: data.course_short_name || undefined,
    courseTitle: data.course_title,
    teacherName: data.teacher_name,
    teacherShortName: data.teacher_short_name || undefined,
    room: data.room,
  };
}

export async function deleteRoutineSlot(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data: existing } = await supabase.from('routine_slots').select('course_code, day').eq('id', id).single();

  const { error } = await supabase.from('routine_slots').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete routine slot: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'ROUTINE_SLOT_DELETED',
    `Slot: ${existing?.course_code || id} (${existing?.day || ''})`,
    `Permanently removed from schedule`
  );
}

export async function bulkImportRoutines(
  batchId: string,
  slots: any[],
  mode: 'REPLACE' | 'APPEND',
  adminUser: { id: string; name: string }
): Promise<{ message: string; count: number }> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');
  if (!batchId) throw new Error('Batch ID is required');
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error('No routine slots provided');
  }

  if (mode === 'REPLACE') {
    await supabase.from('routine_slots').delete().eq('batch_id', batchId);
  }

  let count = 0;
  for (const s of slots) {
    try {
      await createRoutineSlot({
        ...s,
        batchId,
      }, adminUser);
      count++;
    } catch (err) {
      console.warn('Failed to insert slot in bulk import:', err);
    }
  }

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'ROUTINE_BULK_IMPORT',
    `Batch: ${batchId}`,
    `Imported ${count} routine slots (${mode} mode)`
  );

  return { message: `Successfully imported ${count} routine slots`, count };
}

// ==============================================================================
// 7. EXAMS CRUD
// ==============================================================================

export async function getAllExams(batchId?: string): Promise<Exam[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  let query = supabase.from('exams').select('*').order('date', { ascending: true });
  if (batchId) {
    query = query.eq('batch_id', batchId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): Exam => ({
    id: row.id,
    batchId: row.batch_id,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    type: row.type as any,
    title: row.title || `${row.course_code} ${row.type}`,
    date: row.date,
    startTime: row.start_time || undefined,
    room: row.room || undefined,
    description: row.description || undefined,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function createExam(examData: Partial<Exam>, adminUser: { id: string; name: string }): Promise<Exam> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!examData.batchId || !examData.courseTitle || !examData.date) {
    throw new Error('Batch, Course Title, and Exam Date are required.');
  }

  const id = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const insertPayload = {
    id,
    batch_id: examData.batchId,
    course_id: examData.courseId || `course_ref_${Date.now()}`,
    course_code: examData.courseCode ? examData.courseCode.trim() : 'SWE',
    course_title: examData.courseTitle.trim(),
    type: examData.type || 'MID',
    title: examData.title ? examData.title.trim() : `${examData.courseCode || 'Course'} Exam`,
    date: examData.date.trim(),
    start_time: examData.startTime ? examData.startTime.trim() : null,
    room: examData.room ? examData.room.trim() : null,
    description: examData.description ? examData.description.trim() : null,
    created_by: adminUser.id,
    created_by_name: adminUser.name,
    created_at: now,
  };

  const { data, error } = await supabase.from('exams').insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create exam: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'EXAM_SCHEDULED',
    `Exam: ${data.course_code} ${data.type} (${data.date})`,
    `Batch: ${data.batch_id}, Room: ${data.room || 'TBD'}`
  );

  return {
    id: data.id,
    batchId: data.batch_id,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseTitle: data.course_title,
    type: data.type,
    title: data.title,
    date: data.date,
    startTime: data.start_time || undefined,
    room: data.room || undefined,
    description: data.description || undefined,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at,
  };
}

export async function updateExam(id: string, updates: Partial<Exam>, adminUser: { id: string; name: string }): Promise<Exam> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {};
  if (updates.batchId !== undefined) updatePayload.batch_id = updates.batchId;
  if (updates.courseId !== undefined) updatePayload.course_id = updates.courseId;
  if (updates.courseCode !== undefined) updatePayload.course_code = updates.courseCode.trim();
  if (updates.courseTitle !== undefined) updatePayload.course_title = updates.courseTitle.trim();
  if (updates.type !== undefined) updatePayload.type = updates.type;
  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.date !== undefined) updatePayload.date = updates.date.trim();
  if (updates.startTime !== undefined) updatePayload.start_time = updates.startTime ? updates.startTime.trim() : null;
  if (updates.room !== undefined) updatePayload.room = updates.room ? updates.room.trim() : null;
  if (updates.description !== undefined) updatePayload.description = updates.description ? updates.description.trim() : null;

  const { data, error } = await supabase.from('exams').update(updatePayload).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update exam: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'EXAM_UPDATED',
    `Exam: ${data.course_code} ${data.type} (${data.date})`,
    `Updated fields: ${Object.keys(updatePayload).join(', ')}`
  );

  return {
    id: data.id,
    batchId: data.batch_id,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseTitle: data.course_title,
    type: data.type,
    title: data.title,
    date: data.date,
    startTime: data.start_time || undefined,
    room: data.room || undefined,
    description: data.description || undefined,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at,
  };
}

export async function deleteExam(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data: existing } = await supabase.from('exams').select('course_code, type, date').eq('id', id).single();

  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete exam: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'EXAM_DELETED',
    `Exam: ${existing?.course_code || id} ${existing?.type || ''} (${existing?.date || ''})`,
    `Permanently removed from database`
  );
}

// ==============================================================================
// 8. ANNOUNCEMENTS CRUD
// ==============================================================================

export async function getAllAnnouncements(batchId?: string): Promise<BatchAnnouncement[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (batchId) {
    query = query.eq('batch_id', batchId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): BatchAnnouncement => ({
    id: row.id,
    batchId: row.batch_id,
    title: row.title,
    description: row.description || row.content || '',
    publishDate: row.publish_date || row.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    expiryDate: row.expiry_date || '',
    priority: (row.priority || 'NORMAL') as any,
    createdBy: row.created_by || row.author_id || 'admin',
    createdByName: row.created_by_name || row.author_name || 'Central Admin',
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function createAnnouncement(annData: Partial<BatchAnnouncement>, adminUser: { id: string; name: string }): Promise<BatchAnnouncement> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!annData.batchId || !annData.title || !annData.description) {
    throw new Error('Batch, Title, and Description are required.');
  }

  const id = `ann_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const insertPayload = {
    id,
    batch_id: annData.batchId,
    title: annData.title.trim(),
    description: annData.description.trim(),
    publish_date: annData.publishDate || today,
    expiry_date: annData.expiryDate || null,
    priority: annData.priority || 'NORMAL',
    created_by: adminUser.id,
    created_by_name: adminUser.name,
    created_at: now,
  };

  const { data, error } = await supabase.from('announcements').insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create announcement: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'ANNOUNCEMENT_POSTED',
    `Announcement: ${data.title}`,
    `Batch: ${data.batch_id}, Priority: ${data.priority}`
  );

  return {
    id: data.id,
    batchId: data.batch_id,
    title: data.title,
    description: data.description,
    publishDate: data.publish_date,
    expiryDate: data.expiry_date || '',
    priority: data.priority,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at,
  };
}

export async function updateAnnouncement(id: string, updates: Partial<BatchAnnouncement>, adminUser: { id: string; name: string }): Promise<BatchAnnouncement> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {};
  if (updates.batchId !== undefined) updatePayload.batch_id = updates.batchId;
  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.description !== undefined) updatePayload.description = updates.description.trim();
  if (updates.publishDate !== undefined) updatePayload.publish_date = updates.publishDate;
  if (updates.expiryDate !== undefined) updatePayload.expiry_date = updates.expiryDate || null;
  if (updates.priority !== undefined) updatePayload.priority = updates.priority;

  const { data, error } = await supabase.from('announcements').update(updatePayload).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update announcement: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'ANNOUNCEMENT_UPDATED',
    `Announcement: ${data.title}`,
    `Updated fields: ${Object.keys(updatePayload).join(', ')}`
  );

  return {
    id: data.id,
    batchId: data.batch_id,
    title: data.title,
    description: data.description,
    publishDate: data.publish_date,
    expiryDate: data.expiry_date || '',
    priority: data.priority,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at,
  };
}

export async function deleteAnnouncement(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data: existing } = await supabase.from('announcements').select('title').eq('id', id).single();

  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete announcement: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'ANNOUNCEMENT_DELETED',
    `Announcement: ${existing?.title || id}`,
    `Permanently removed from database`
  );
}

// ==============================================================================
// 9. DEPARTMENT NOTICES CRUD
// ==============================================================================

export async function getAllNotices(): Promise<DepartmentNotice[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data, error } = await supabase.from('department_notices').select('*').order('publish_date', { ascending: false });
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): DepartmentNotice => ({
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category || 'GENERAL',
    publishDate: row.publish_date,
    isImportant: Boolean(row.is_important),
    attachmentUrl: row.attachment_url || undefined,
    createdBy: row.created_by || 'admin',
    createdByName: row.created_by_name || 'Department Admin',
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function createNotice(noticeData: Partial<DepartmentNotice>, adminUser: { id: string; name: string }): Promise<DepartmentNotice> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!noticeData.title || !noticeData.content) {
    throw new Error('Notice Title and Content are required.');
  }

  const id = `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  const insertPayload = {
    id,
    title: noticeData.title.trim(),
    content: noticeData.content.trim(),
    category: noticeData.category || 'GENERAL',
    publish_date: noticeData.publishDate || today,
    is_important: Boolean(noticeData.isImportant),
    attachment_url: noticeData.attachmentUrl ? noticeData.attachmentUrl.trim() : null,
    created_by: adminUser.id,
    created_by_name: adminUser.name,
    created_at: now,
  };

  const { data, error } = await supabase.from('department_notices').insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create notice: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'NOTICE_PUBLISHED',
    `Notice: ${data.title}`,
    `Category: ${data.category}, Important: ${data.is_important}`
  );

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    category: data.category,
    publishDate: data.publish_date,
    isImportant: Boolean(data.is_important),
    attachmentUrl: data.attachment_url || undefined,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at,
  };
}

export async function updateNotice(id: string, updates: Partial<DepartmentNotice>, adminUser: { id: string; name: string }): Promise<DepartmentNotice> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {};
  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.content !== undefined) updatePayload.content = updates.content.trim();
  if (updates.category !== undefined) updatePayload.category = updates.category;
  if (updates.publishDate !== undefined) updatePayload.publish_date = updates.publishDate;
  if (updates.isImportant !== undefined) updatePayload.is_important = Boolean(updates.isImportant);
  if (updates.attachmentUrl !== undefined) updatePayload.attachment_url = updates.attachmentUrl ? updates.attachmentUrl.trim() : null;

  const { data, error } = await supabase.from('department_notices').update(updatePayload).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update notice: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'NOTICE_UPDATED',
    `Notice: ${data.title}`,
    `Updated fields: ${Object.keys(updatePayload).join(', ')}`
  );

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    category: data.category,
    publishDate: data.publish_date,
    isImportant: Boolean(data.is_important),
    attachmentUrl: data.attachment_url || undefined,
    createdBy: data.created_by,
    createdByName: data.created_by_name,
    createdAt: data.created_at,
  };
}

export async function deleteNotice(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data: existing } = await supabase.from('department_notices').select('title').eq('id', id).single();

  const { error } = await supabase.from('department_notices').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete notice: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'NOTICE_DELETED',
    `Notice: ${existing?.title || id}`,
    `Permanently removed from database`
  );
}

// ==============================================================================
// 10. RESOURCES CRUD & VERIFICATION
// ==============================================================================

export async function getAllResources(): Promise<Resource[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data, error } = await supabase.from('resources').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): Resource => ({
    id: row.id,
    title: row.title,
    type: row.type,
    courseId: row.course_id,
    courseCode: row.course_code,
    courseTitle: row.course_title,
    semester: Number(row.semester || 1),
    academicYear: Number(row.academic_year || new Date().getFullYear()),
    examType: row.exam_type || undefined,
    facultyName: row.faculty_name || undefined,
    targetBatch: row.target_batch || undefined,
    labCategory: row.lab_category || undefined,
    description: row.description || undefined,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileSize: row.file_size || '1.0 MB',
    fileType: row.file_type || 'application/pdf',
    uploaderId: row.uploader_id,
    uploaderStudentId: row.uploader_student_id,
    uploaderName: row.uploader_name,
    uploaderBatchName: row.uploader_batch_name || '',
    status: row.status,
    rejectionReason: row.rejection_reason || undefined,
    downloadCount: Number(row.download_count || 0),
    createdAt: row.created_at || new Date().toISOString(),
    verifiedAt: row.verified_at || undefined,
  }));
}

export async function createResource(resData: Partial<Resource>, adminUser: { id: string; name: string }): Promise<Resource> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!resData.title || !resData.fileUrl || !resData.courseTitle) {
    throw new Error('Resource Title, File URL, and Course Title are required.');
  }

  const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const insertPayload = {
    id,
    title: resData.title.trim(),
    type: resData.type || 'NOTE',
    course_id: resData.courseId || `course_ref_${Date.now()}`,
    course_code: resData.courseCode ? resData.courseCode.trim() : 'SWE',
    course_title: resData.courseTitle.trim(),
    semester: Number(resData.semester || 1),
    academic_year: Number(resData.academicYear || new Date().getFullYear()),
    exam_type: resData.examType || null,
    faculty_name: resData.facultyName ? resData.facultyName.trim() : null,
    target_batch: resData.targetBatch ? resData.targetBatch.trim() : null,
    lab_category: resData.labCategory || null,
    description: resData.description ? resData.description.trim() : null,
    file_url: resData.fileUrl.trim(),
    file_name: resData.fileName ? resData.fileName.trim() : 'document.pdf',
    file_size: resData.fileSize || '1.5 MB',
    file_type: resData.fileType || 'application/pdf',
    uploader_id: resData.uploaderId || adminUser.id,
    uploader_student_id: resData.uploaderStudentId || 'ADMIN',
    uploader_name: resData.uploaderName || adminUser.name,
    uploader_batch_name: resData.uploaderBatchName || 'Department Admin',
    status: resData.status || 'APPROVED',
    rejection_reason: null,
    download_count: 0,
    created_at: now,
    verified_at: resData.status === 'APPROVED' ? now : null,
  };

  const { data, error } = await supabase.from('resources').insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to create resource: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'RESOURCE_CREATED',
    `Resource: ${data.title} (${data.type})`,
    `Course: ${data.course_code}, Status: ${data.status}`
  );

  return {
    id: data.id,
    title: data.title,
    type: data.type,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseTitle: data.course_title,
    semester: Number(data.semester),
    academicYear: Number(data.academic_year),
    examType: data.exam_type || undefined,
    facultyName: data.faculty_name || undefined,
    targetBatch: data.target_batch || undefined,
    labCategory: data.lab_category || undefined,
    description: data.description || undefined,
    fileUrl: data.file_url,
    fileName: data.file_name,
    fileSize: data.file_size,
    fileType: data.file_type,
    uploaderId: data.uploader_id,
    uploaderStudentId: data.uploader_student_id,
    uploaderName: data.uploader_name,
    uploaderBatchName: data.uploader_batch_name,
    status: data.status,
    rejectionReason: data.rejection_reason || undefined,
    downloadCount: Number(data.download_count || 0),
    createdAt: data.created_at,
    verifiedAt: data.verified_at || undefined,
  };
}

export async function updateResource(id: string, updates: Partial<Resource>, adminUser: { id: string; name: string }): Promise<Resource> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {};
  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.type !== undefined) updatePayload.type = updates.type;
  if (updates.courseId !== undefined) updatePayload.course_id = updates.courseId;
  if (updates.courseCode !== undefined) updatePayload.course_code = updates.courseCode.trim();
  if (updates.courseTitle !== undefined) updatePayload.course_title = updates.courseTitle.trim();
  if (updates.semester !== undefined) updatePayload.semester = Number(updates.semester);
  if (updates.academicYear !== undefined) updatePayload.academic_year = Number(updates.academicYear);
  if (updates.examType !== undefined) updatePayload.exam_type = updates.examType || null;
  if (updates.facultyName !== undefined) updatePayload.faculty_name = updates.facultyName ? updates.facultyName.trim() : null;
  if (updates.targetBatch !== undefined) updatePayload.target_batch = updates.targetBatch ? updates.targetBatch.trim() : null;
  if (updates.labCategory !== undefined) updatePayload.lab_category = updates.labCategory || null;
  if (updates.description !== undefined) updatePayload.description = updates.description ? updates.description.trim() : null;
  if (updates.fileUrl !== undefined) updatePayload.file_url = updates.fileUrl.trim();
  if (updates.fileName !== undefined) updatePayload.file_name = updates.fileName.trim();
  if (updates.status !== undefined) {
    updatePayload.status = updates.status;
    if (updates.status === 'APPROVED') {
      updatePayload.verified_at = new Date().toISOString();
      updatePayload.rejection_reason = null;
    } else if (updates.status === 'REJECTED') {
      updatePayload.rejection_reason = updates.rejectionReason ? updates.rejectionReason.trim() : 'Does not meet academic criteria';
    }
  }
  if (updates.rejectionReason !== undefined) updatePayload.rejection_reason = updates.rejectionReason ? updates.rejectionReason.trim() : null;

  const { data, error } = await supabase.from('resources').update(updatePayload).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update resource: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    updates.status ? `RESOURCE_${updates.status}` : 'RESOURCE_UPDATED',
    `Resource: ${data.title} (${data.type})`,
    `Status: ${data.status}`
  );

  return {
    id: data.id,
    title: data.title,
    type: data.type,
    courseId: data.course_id,
    courseCode: data.course_code,
    courseTitle: data.course_title,
    semester: Number(data.semester),
    academicYear: Number(data.academic_year),
    examType: data.exam_type || undefined,
    facultyName: data.faculty_name || undefined,
    targetBatch: data.target_batch || undefined,
    labCategory: data.lab_category || undefined,
    description: data.description || undefined,
    fileUrl: data.file_url,
    fileName: data.file_name,
    fileSize: data.file_size,
    fileType: data.file_type,
    uploaderId: data.uploader_id,
    uploaderStudentId: data.uploader_student_id,
    uploaderName: data.uploader_name,
    uploaderBatchName: data.uploader_batch_name,
    status: data.status,
    rejectionReason: data.rejection_reason || undefined,
    downloadCount: Number(data.download_count || 0),
    createdAt: data.created_at,
    verifiedAt: data.verified_at || undefined,
  };
}

export async function deleteResource(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  const local = db.getData();
  
  // Track existing metadata for audit logging
  let existingTitle = '';
  let existingType = '';
  if (local.resources) {
    const found = local.resources.find(r => r.id === id);
    if (found) {
      existingTitle = found.title;
      existingType = found.type;
    }
    local.resources = local.resources.filter(r => r.id !== id);
    try { db.save(); } catch {}
  }

  if (supabase) {
    if (!existingTitle) {
      try {
        const { data: existing } = await supabase.from('resources').select('title, type').eq('id', id).maybeSingle();
        if (existing) {
          existingTitle = existing.title;
          existingType = existing.type;
        }
      } catch {}
    }

    const { error } = await supabase.from('resources').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase deleteResource Error]:', error.message);
      throw new Error(`Failed to delete resource from Supabase: ${error.message}`);
    }
  }

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'RESOURCE_DELETED',
    `Resource: ${existingTitle || id} (${existingType || ''})`,
    `Permanently removed from Supabase and academic vault`
  );
}

export async function getPendingResources(): Promise<Resource[]> {
  const all = await getAllResources();
  return (all || []).filter(r => r.status === 'PENDING');
}

export async function verifyResource(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason?: string,
  adminUser?: { id: string; name: string }
): Promise<Resource> {
  const u = adminUser || { id: 'admin', name: 'Admin' };
  return updateResource(id, { status, rejectionReason }, u);
}

// ==============================================================================
// 11. NOTIFICATIONS CRUD
// ==============================================================================

export async function getAllNotifications(userId?: string): Promise<NotificationItem[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): NotificationItem => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type as any,
    linkUrl: row.link_url || undefined,
    read: Boolean(row.read),
    createdAt: row.created_at || new Date().toISOString(),
  }));
}

export async function createNotification(notifData: Partial<NotificationItem>, adminUser: { id: string; name: string }): Promise<NotificationItem> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  if (!notifData.userId || !notifData.title || !notifData.message) {
    throw new Error('Recipient User ID, Title, and Message are required.');
  }

  const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const insertPayload = {
    id,
    user_id: notifData.userId,
    title: notifData.title.trim(),
    message: notifData.message.trim(),
    type: notifData.type || 'ANNOUNCEMENT',
    link_url: notifData.linkUrl ? notifData.linkUrl.trim() : null,
    read: false,
    created_at: now,
  };

  const { data, error } = await supabase.from('notifications').insert(insertPayload).select().single();
  if (error) throw new Error(`Failed to dispatch notification: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'NOTIFICATION_DISPATCHED',
    `Notification: ${data.title} -> ${data.user_id}`,
    `Type: ${data.type}`
  );

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    linkUrl: data.link_url || undefined,
    read: Boolean(data.read),
    createdAt: data.created_at,
  };
}

export async function updateNotification(id: string, updates: Partial<NotificationItem>, adminUser: { id: string; name: string }): Promise<NotificationItem> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const updatePayload: Record<string, any> = {};
  if (updates.title !== undefined) updatePayload.title = updates.title.trim();
  if (updates.message !== undefined) updatePayload.message = updates.message.trim();
  if (updates.type !== undefined) updatePayload.type = updates.type;
  if (updates.linkUrl !== undefined) updatePayload.link_url = updates.linkUrl ? updates.linkUrl.trim() : null;
  if (updates.read !== undefined) updatePayload.read = Boolean(updates.read);

  const { data, error } = await supabase.from('notifications').update(updatePayload).eq('id', id).select().single();
  if (error) throw new Error(`Failed to update notification: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'NOTIFICATION_UPDATED',
    `Notification: ${data.title}`,
    `Updated fields: ${Object.keys(updatePayload).join(', ')}`
  );

  return {
    id: data.id,
    userId: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    linkUrl: data.link_url || undefined,
    read: Boolean(data.read),
    createdAt: data.created_at,
  };
}

export async function deleteNotification(id: string, adminUser: { id: string; name: string }): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete notification: ${error.message}`);

  await createAuditLog(
    adminUser.id,
    adminUser.name,
    'NOTIFICATION_DELETED',
    `Notification ID: ${id}`,
    `Removed from notifications`
  );
}

// ==============================================================================
// 12. AUDIT LOGS (Read-Only)
// ==============================================================================

export async function getAllAuditLogs(limit: number = 100): Promise<AuditLog[]> {
  const supabase = getServerSupabase();
  if (!supabase) throw new Error('Supabase client unavailable');

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Supabase error: ${error.message}`);

  return (data || []).map((row: any): AuditLog => ({
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    target: row.target,
    details: row.details || undefined,
    timestamp: row.timestamp || new Date().toISOString(),
  }));
}
