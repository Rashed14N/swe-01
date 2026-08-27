import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { User, Faculty, UserRole } from '../../types';
import { syncToSupabase, deleteFromSupabase } from '../supabaseSync';

const router = Router();

// Ensure all routes in /api/admin are ADMIN ONLY
router.use(verifyAuthToken, requireRole('ADMIN'));

// GET /api/admin/overview or /api/admin/stats
router.get(['/overview', '/stats'], (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();

  const totalStudents = data.users.filter(u => u.role !== 'ADMIN').length;
  const totalBatches = data.batches.length;
  const totalFaculty = data.faculty.length;
  const pendingResourcesCount = data.resources.filter(r => r.status === 'PENDING').length;
  const activeNoticesCount = data.departmentNotices.length;
  const totalApprovedResources = data.resources.filter(r => r.status === 'APPROVED').length;

  res.json({
    stats: {
      totalStudents,
      totalBatches,
      totalFaculty,
      pendingResourcesCount,
      activeNoticesCount,
      totalApprovedResources,
    },
    totalStudents,
    totalBatches,
    totalFaculty,
    pendingResourcesCount,
    activeNoticesCount,
    totalApprovedResources,
    recentAuditLogs: data.auditLogs.slice(0, 10),
  });
});

// GET /api/admin/users or /api/admin/students (Search & filter students)
router.get(['/users', '/students'], (req: AuthenticatedRequest, res: Response) => {
  const { batchId, role, search, status } = req.query;
  let users = db.getData().users;

  if (batchId) {
    users = users.filter(u => u.batchId === batchId);
  }

  if (role) {
    users = users.filter(u => u.role === role);
  }

  if (status) {
    users = users.filter(u => u.status === status);
  }

  if (search) {
    const q = (search as string).toLowerCase().trim();
    users = users.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.studentId.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q))
    );
  }

  res.json({ users, students: users });
});

// GET /api/admin/batches
router.get('/batches', (req: AuthenticatedRequest, res: Response) => {
  res.json({ batches: db.getData().batches });
});

// GET /api/admin/courses
router.get('/courses', (req: AuthenticatedRequest, res: Response) => {
  res.json({ courses: db.getData().courses });
});

// POST /api/admin/users (Create Student)
router.post('/users', (req: AuthenticatedRequest, res: Response) => {
  const { studentId, name, email, phone, role, batchId, currentSemester, password } = req.body;

  if (!studentId || !name || !batchId) {
    return res.status(400).json({ error: 'Student ID, Name, and Batch are required' });
  }

  const existing = db.getUserByStudentId(studentId);
  if (existing) {
    return res.status(400).json({ error: `Student ID "${studentId}" already exists.` });
  }

  const data = db.getData();
  const batch = data.batches.find(b => b.id === batchId);

  const newUserRole: UserRole = role || 'STUDENT';
  const newUserId = `user-${Date.now()}`;

  const newUser: User = {
    id: newUserId,
    studentId,
    name,
    email,
    phone,
    role: newUserRole,
    batchId,
    batchName: batch ? batch.name : 'SWE Batch',
    currentSemester: currentSemester ? Number(currentSemester) : (batch ? batch.currentSemester : 1),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const passHash = bcrypt.hashSync(password || 'password123', 10);
  db.addUser(newUser, passHash);

  // If role is CR, add to batch.crIds
  if (newUserRole === 'CR' && batch) {
    if (!batch.crIds.includes(newUserId)) {
      batch.crIds.push(newUserId);
    }
  }

  syncToSupabase('users', {
    id: newUser.id,
    student_id: newUser.studentId,
    name: newUser.name,
    email: newUser.email || null,
    phone: newUser.phone || null,
    role: newUser.role,
    batch_id: newUser.batchId,
    batch_name: newUser.batchName,
    current_semester: newUser.currentSemester,
    status: newUser.status,
    created_at: newUser.createdAt,
    updated_at: newUser.updatedAt,
  }).catch(err => console.error('[Supabase Admin User Sync Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, 'USER_CREATED', `${newUser.name} (${studentId})`);

  res.status(201).json({ user: newUser });
});

// PUT /api/admin/users/:id (Edit Student Info / ID / Name / Role / Batch)
router.put('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { studentId, name, email, phone, role, batchId, currentSemester, status } = req.body;

  if (studentId && studentId !== user.studentId) {
    const existing = db.getUserByStudentId(studentId);
    if (existing && existing.id !== user.id) {
      return res.status(400).json({ error: `Student ID "${studentId}" is already assigned to another user.` });
    }
  }

  const data = db.getData();
  const batch = data.batches.find(b => b.id === (batchId || user.batchId));

  // Handle CR assignment sync
  if (role && role !== user.role) {
    if (role === 'CR' && batch) {
      if (!batch.crIds.includes(user.id)) batch.crIds.push(user.id);
    } else if (user.role === 'CR') {
      // Remove CR status from batch
      const oldBatch = data.batches.find(b => b.id === user.batchId);
      if (oldBatch) {
        oldBatch.crIds = oldBatch.crIds.filter(id => id !== user.id);
      }
    }
  }

  const updatedUser: User = {
    ...user,
    studentId: studentId ?? user.studentId,
    name: name ?? user.name,
    email: email ?? user.email,
    phone: phone ?? user.phone,
    role: role ?? user.role,
    batchId: batchId ?? user.batchId,
    batchName: batch ? batch.name : user.batchName,
    currentSemester: currentSemester ? Number(currentSemester) : user.currentSemester,
    status: status ?? user.status,
    updatedAt: new Date().toISOString(),
  };

  db.updateUser(updatedUser);

  syncToSupabase('users', {
    id: updatedUser.id,
    student_id: updatedUser.studentId,
    name: updatedUser.name,
    email: updatedUser.email || null,
    phone: updatedUser.phone || null,
    role: updatedUser.role,
    batch_id: updatedUser.batchId,
    batch_name: updatedUser.batchName,
    current_semester: updatedUser.currentSemester,
    status: updatedUser.status,
    updated_at: updatedUser.updatedAt,
  }).catch(err => console.error('[Supabase Admin User Update Sync Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, 'USER_UPDATED', `${updatedUser.name} (${updatedUser.studentId})`);

  res.json({ user: updatedUser });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const data = db.getData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    data.users.splice(idx, 1);
    db.save();
    deleteFromSupabase('users', userId).catch(err => console.error('[Supabase Delete User Error]:', err));
  }

  db.addAuditLog(req.user!.id, req.user!.name, 'USER_DELETED', `${user.name} (${user.studentId})`);

  res.json({ message: 'User deleted successfully' });
});

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;
  const user = db.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const newPassword = req.body.newPassword || 'password123';
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.setPasswordHash(userId, newHash);

  db.addAuditLog(req.user!.id, req.user!.name, 'USER_PASSWORD_RESET', `${user.name} (${user.studentId})`);

  res.json({ message: `Password reset successfully for ${user.name}` });
});

// POST /api/admin/users/bulk-import (CSV Import Validation & Execution)
router.post('/users/bulk-import', (req: AuthenticatedRequest, res: Response) => {
  const { csvText, defaultBatchId } = req.body;

  if (!csvText) {
    return res.status(400).json({ error: 'CSV text content is required' });
  }

  const lines = csvText.split('\n').map((l: string) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV must contain a header and at least one student row' });
  }

  const importedUsers: User[] = [];
  const errors: string[] = [];

  const data = db.getData();
  const defaultBatch = data.batches.find(b => b.id === defaultBatchId) || data.batches[0];

  // Parse header
  const header = lines[0].toLowerCase().split(',').map((h: string) => h.trim());
  const idIdx = header.indexOf('student_id') !== -1 ? header.indexOf('student_id') : header.indexOf('id');
  const nameIdx = header.indexOf('name');
  const emailIdx = header.indexOf('email');

  if (idIdx === -1 || nameIdx === -1) {
    return res.status(400).json({ error: 'CSV header must include "student_id" and "name" columns.' });
  }

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(s => s.trim());
    const studentId = row[idIdx];
    const name = row[nameIdx];
    const email = emailIdx !== -1 ? row[emailIdx] : undefined;

    if (!studentId || !name) {
      errors.push(`Row ${i + 1}: Missing student_id or name`);
      continue;
    }

    if (db.getUserByStudentId(studentId)) {
      errors.push(`Row ${i + 1}: Student ID "${studentId}" already exists (skipped)`);
      continue;
    }

    const newUser: User = {
      id: `user-${Date.now()}-${i}`,
      studentId,
      name,
      email,
      role: 'STUDENT',
      batchId: defaultBatch.id,
      batchName: defaultBatch.name,
      currentSemester: defaultBatch.currentSemester,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const passHash = bcrypt.hashSync('password123', 10);
    db.addUser(newUser, passHash);
    importedUsers.push(newUser);
  }

  db.addAuditLog(req.user!.id, req.user!.name, 'BULK_IMPORT_EXECUTED', `Imported ${importedUsers.length} students`);

  res.json({
    importedCount: importedUsers.length,
    errors,
    users: importedUsers,
  });
});

// GET /api/admin/resources/pending or /api/admin/pending-verification
router.get(['/resources/pending', '/pending-verification'], (req: AuthenticatedRequest, res: Response) => {
  const pending = db.getData().resources.filter(r => r.status === 'PENDING');
  res.json({ resources: pending });
});

// POST /api/admin/resources/:id/review (Approve or Reject Resource)
router.post('/resources/:id/review', (req: AuthenticatedRequest, res: Response) => {
  const resourceId = req.params.id;
  const { action, rejectionReason } = req.body; // 'APPROVE' or 'REJECT'

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
  }

  const data = db.getData();
  const resource = data.resources.find(r => r.id === resourceId);
  if (!resource) return res.status(404).json({ error: 'Resource not found' });

  if (action === 'APPROVE') {
    resource.status = 'APPROVED';
    resource.verifiedAt = new Date().toISOString();

    // Send notification to uploader
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: resource.uploaderId,
      title: 'Resource Approved 🎉',
      message: `Your contribution "${resource.title}" was verified and published to the SWE Portal.`,
      type: 'RESOURCE_APPROVED',
      linkUrl: `/resources/${resource.type === 'QUESTION' ? 'questions' : resource.type === 'NOTE' ? 'notes' : 'labs'}`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } else {
    resource.status = 'REJECTED';
    resource.rejectionReason = rejectionReason || 'Does not meet academic department guidelines.';

    // Send notification to uploader
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: resource.uploaderId,
      title: 'Resource Needs Revision ⚠️',
      message: `Your contribution "${resource.title}" was not approved. Reason: ${resource.rejectionReason}`,
      type: 'RESOURCE_REJECTED',
      linkUrl: '/profile',
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  db.save();

  syncToSupabase('resources', {
    id: resource.id,
    status: resource.status,
    rejection_reason: resource.rejectionReason || null,
    verified_at: resource.verifiedAt || null,
  }).catch(err => console.error('[Supabase Resource Review Sync Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, `RESOURCE_${action}D`, resource.title);

  res.json({ message: `Resource ${action.toLowerCase()}d successfully`, resource });
});

// PUT /api/admin/resources/:id (Edit resource details during verification)
router.put('/resources/:id', (req: AuthenticatedRequest, res: Response) => {
  const resourceId = req.params.id;
  const data = db.getData();
  const resource = data.resources.find(r => r.id === resourceId);

  if (!resource) {
    return res.status(404).json({ error: 'Resource item not found' });
  }

  const { title, type, courseCode, courseTitle, semester, academicYear, examType, labCategory, description, fileUrl, uploaderName, status } = req.body;

  if (title) resource.title = title;
  if (type) resource.type = type;
  if (courseCode) resource.courseCode = courseCode;
  if (courseTitle) resource.courseTitle = courseTitle;
  if (semester) resource.semester = Number(semester);
  if (academicYear) resource.academicYear = Number(academicYear);
  if (examType) resource.examType = examType;
  if (labCategory) resource.labCategory = labCategory;
  if (description !== undefined) resource.description = description;
  if (fileUrl) resource.fileUrl = fileUrl;
  if (uploaderName) resource.uploaderName = uploaderName;
  if (status) resource.status = status;

  db.save();

  syncToSupabase('resources', {
    id: resource.id,
    title: resource.title,
    type: resource.type,
    course_code: resource.courseCode,
    course_title: resource.courseTitle,
    semester: resource.semester,
    academic_year: resource.academicYear,
    exam_type: resource.examType || null,
    lab_category: resource.labCategory || null,
    description: resource.description || null,
    file_url: resource.fileUrl,
    uploader_name: resource.uploaderName,
    status: resource.status,
  }).catch(err => console.error('[Supabase Resource Update Sync Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, 'RESOURCE_DETAILS_UPDATED', resource.title);

  res.json({ message: 'Resource details updated successfully', resource });
});

// Faculty CRUD
router.post('/faculty', (req: AuthenticatedRequest, res: Response) => {
  const { name, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;

  if (!name || !designation || !email) {
    return res.status(400).json({ error: 'Name, designation, and email are required' });
  }

  const newFaculty: Faculty = {
    id: `fac-${Date.now()}`,
    name,
    designation,
    department: department || 'Software Engineering',
    email,
    phone,
    officeRoom: officeRoom || 'Academic Building',
    photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    specialization,
    assignedCourses: assignedCourses || [],
  };

  db.getData().faculty.push(newFaculty);
  db.save();

  syncToSupabase('faculty', {
    id: newFaculty.id,
    name: newFaculty.name,
    designation: newFaculty.designation,
    department: newFaculty.department,
    email: newFaculty.email,
    phone: newFaculty.phone || null,
    office_room: newFaculty.officeRoom,
    photo_url: newFaculty.photoUrl,
    specialization: newFaculty.specialization || null,
    assigned_courses: newFaculty.assignedCourses || [],
  }).catch(err => console.error('[Supabase Faculty Add Sync Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, 'FACULTY_ADDED', name);

  res.status(201).json({ faculty: newFaculty });
});

// GET Audit Logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const logs = db.getData().auditLogs;
  res.json({ auditLogs: logs, logs });
});

export default router;
