import { Router, Response } from 'express';
<<<<<<< HEAD
import bcrypt from 'bcryptjs';
import { db } from '../db.ts';
import { verifyAuthToken, AuthenticatedRequest } from '../auth.ts';
import { requireRole } from '../middleware.ts';
import { User, Faculty, UserRole, Resource, Course, Batch, DepartmentNotice } from '../../types.ts';
import {
  fetchAllUsers,
  fetchUserByIdOrStudentId,
  createUserInDB,
  updateUserInDB,
  deleteUserFromDB,
  fetchAllBatches,
  createBatchInDB,
  updateBatchInDB,
  deleteBatchFromDB,
  fetchAllCourses,
  createCourseInDB,
  updateCourseInDB,
  deleteCourseFromDB,
  fetchAllFaculty,
  createFacultyInDB,
  updateFacultyInDB,
  deleteFacultyFromDB,
  fetchAllResources,
  updateResourceInDB,
  fetchAllNotices,
  createNoticeInDB,
  deleteNoticeFromDB,
} from '../supabaseData.ts';

const router = Router();

// Ensure all routes in /api/admin are ADMIN ONLY
router.use(verifyAuthToken, requireRole('ADMIN'));

// GET /api/admin/overview or /api/admin/stats
router.get(['/overview', '/stats'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [allUsers, allBatches, allFaculty, allResources, allNotices, allCourses] = await Promise.all([
      fetchAllUsers(),
      fetchAllBatches(),
      fetchAllFaculty(),
      fetchAllResources(),
      fetchAllNotices(),
      fetchAllCourses(),
    ]);

    const totalStudents = allUsers.filter(u => u.role !== 'ADMIN').length;
    const totalBatches = allBatches.length;
    const totalFaculty = allFaculty.length;
    const totalCourses = allCourses.length;
    const pendingResourcesCount = allResources.filter(r => r.status === 'PENDING').length;
    const activeNoticesCount = allNotices.length;
    const totalApprovedResources = allResources.filter(r => r.status === 'APPROVED').length;

    const data = db.getData();

    res.json({
      stats: {
        totalStudents,
        totalBatches,
        totalFaculty,
        totalCourses,
        pendingResourcesCount,
        activeNoticesCount,
        totalApprovedResources,
      },
      totalStudents,
      totalBatches,
      totalFaculty,
      totalCourses,
      pendingResourcesCount,
      activeNoticesCount,
      totalApprovedResources,
      recentAuditLogs: (data.auditLogs || []).slice(0, 10),
    });
  } catch (err: any) {
    console.error('[Admin Overview Error]:', err);
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

// GET /api/admin/faculty
router.get('/faculty', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await fetchAllFaculty();
    res.json({ faculty });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch faculty roster' });
  }
});

// POST /api/admin/faculty
router.post('/faculty', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;
    if (!name || !designation || !email) {
      return res.status(400).json({ error: 'Name, designation, and email are required.' });
    }

    const newFaculty: Faculty = {
      id: `fac-${Date.now()}`,
      name: String(name).trim(),
      shortName: shortName ? String(shortName).trim() : undefined,
      designation: String(designation).trim(),
      department: department ? String(department).trim() : 'Software Engineering',
      email: String(email).trim(),
      phone: phone ? String(phone).trim() : '',
      officeRoom: officeRoom ? String(officeRoom).trim() : '',
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      specialization: specialization ? String(specialization).trim() : '',
      assignedCourses: Array.isArray(assignedCourses) ? assignedCourses : [],
    };

    const created = await createFacultyInDB(newFaculty);
    db.addAuditLog(req.user!.id, req.user!.name, 'FACULTY_CREATED', `${created.name} (${created.designation})`);

    res.status(201).json({ message: 'Faculty member added successfully!', faculty: created });
  } catch (err: any) {
    console.error('[Admin Create Faculty Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to create faculty member' });
  }
});

// PUT /api/admin/faculty/:id
router.put('/faculty/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { name, shortName, designation, department, email, phone, officeRoom, photoUrl, specialization, assignedCourses } = req.body;
    const updates: Partial<Faculty> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (shortName !== undefined) updates.shortName = String(shortName).trim();
    if (designation !== undefined) updates.designation = String(designation).trim();
    if (department !== undefined) updates.department = String(department).trim();
    if (email !== undefined) updates.email = String(email).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();
    if (officeRoom !== undefined) updates.officeRoom = String(officeRoom).trim();
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;
    if (specialization !== undefined) updates.specialization = String(specialization).trim();
    if (assignedCourses !== undefined) updates.assignedCourses = Array.isArray(assignedCourses) ? assignedCourses : [];

    const updated = await updateFacultyInDB(id, updates);
    db.addAuditLog(req.user!.id, req.user!.name, 'FACULTY_UPDATED', `${updated.name}`);

    res.json({ message: 'Faculty member updated successfully!', faculty: updated });
  } catch (err: any) {
    console.error('[Admin Update Faculty Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to update faculty member' });
  }
});

// DELETE /api/admin/faculty/:id
router.delete('/faculty/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await deleteFacultyFromDB(id);
    db.addAuditLog(req.user!.id, req.user!.name, 'FACULTY_DELETED', `Faculty ID: ${id}`);
    res.json({ message: 'Faculty member removed successfully!' });
  } catch (err: any) {
    console.error('[Admin Delete Faculty Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete faculty member' });
  }
});

// GET /api/admin/notices
router.get('/notices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notices = await fetchAllNotices();
    res.json({ notices });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch department notices' });
  }
});

// POST /api/admin/notices
router.post('/notices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, content, category, isImportant, attachmentUrl } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Notice title and content are required.' });
    }

    const newNotice: DepartmentNotice = {
      id: `notice-${Date.now()}`,
      title: String(title).trim(),
      content: String(content).trim(),
      category: category || 'ACADEMIC',
      publishDate: new Date().toISOString().split('T')[0],
      isImportant: Boolean(isImportant),
      attachmentUrl: attachmentUrl || undefined,
      createdBy: req.user!.id,
      createdByName: req.user!.name,
      createdAt: new Date().toISOString(),
    };

    const created = await createNoticeInDB(newNotice);

    // Also broadcast notification to all users
    const allUsers = await fetchAllUsers();
    const local = db.getData();
    if (!local.notifications) local.notifications = [];
    allUsers.forEach(u => {
      if (u.id !== req.user!.id) {
        local.notifications.unshift({
          id: `notif-${Date.now()}-${Math.random()}`,
          userId: u.id,
          title: '🏛️ New Department Notice',
          message: newNotice.title,
          type: 'NOTICE',
          linkUrl: '/notices',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    });
    db.save();

    db.addAuditLog(req.user!.id, req.user!.name, 'NOTICE_PUBLISHED', newNotice.title);

    res.status(201).json({ message: 'Notice published successfully!', notice: created });
  } catch (err: any) {
    console.error('[Admin Create Notice Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to publish notice' });
  }
});

// DELETE /api/admin/notices/:id
router.delete('/notices/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await deleteNoticeFromDB(id);
    db.addAuditLog(req.user!.id, req.user!.name, 'NOTICE_DELETED', `Notice ID: ${id}`);
    res.json({ message: 'Notice deleted successfully!' });
  } catch (err: any) {
    console.error('[Admin Delete Notice Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete notice' });
  }
});

// GET /api/admin/users or /api/admin/students
router.get(['/users', '/students'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId, role, search, status } = req.query;
    let users = await fetchAllUsers();

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
  } catch (err: any) {
    console.error('[Admin Users GET Error]:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/batches
router.get('/batches', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await fetchAllBatches();
    res.json({ batches });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch batches' });
  }
});

// POST /api/admin/batches
router.post('/batches', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, admissionYear, currentSemester, academicSession, semesterMode, status } = req.body;
    if (!name || !admissionYear) {
      return res.status(400).json({ error: 'Batch Name and Admission Year are required.' });
    }

    const newBatch: Batch = {
      id: `batch-${Date.now()}`,
      name: String(name).trim(),
      admissionYear: Number(admissionYear),
      currentSemester: currentSemester ? Number(currentSemester) : 1,
      academicSession: academicSession ? String(academicSession).trim() : `${admissionYear}-${Number(admissionYear) + 1}`,
      semesterMode: semesterMode || 'SEQUENCE',
      status: status || 'ACTIVE',
      crIds: [],
      createdAt: new Date().toISOString(),
    };

    const created = await createBatchInDB(newBatch);
    db.addAuditLog(req.user!.id, req.user!.name, 'BATCH_CREATED', created.name);

    res.status(201).json({ message: 'Batch created successfully!', batch: created });
  } catch (err: any) {
    console.error('[Admin Create Batch Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to create batch' });
  }
});

// PUT /api/admin/batches/:id
router.put('/batches/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { name, admissionYear, currentSemester, academicSession, semesterMode, status } = req.body;
    const updates: Partial<Batch> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (admissionYear !== undefined) updates.admissionYear = Number(admissionYear);
    if (currentSemester !== undefined) updates.currentSemester = Number(currentSemester);
    if (academicSession !== undefined) updates.academicSession = String(academicSession).trim();
    if (semesterMode !== undefined) updates.semesterMode = semesterMode;
    if (status !== undefined) updates.status = status;

    const updated = await updateBatchInDB(id, updates);
    db.addAuditLog(req.user!.id, req.user!.name, 'BATCH_UPDATED', updated.name);

    res.json({ message: 'Batch updated successfully!', batch: updated });
  } catch (err: any) {
    console.error('[Admin Update Batch Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to update batch' });
  }
});

// DELETE /api/admin/batches/:id
router.delete('/batches/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await deleteBatchFromDB(id);
    db.addAuditLog(req.user!.id, req.user!.name, 'BATCH_DELETED', `Batch ID: ${id}`);
    res.json({ message: 'Batch deleted successfully!' });
  } catch (err: any) {
    console.error('[Admin Delete Batch Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete batch' });
  }
});

// GET /api/admin/courses
router.get('/courses', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courses = await fetchAllCourses();
    res.json({ courses });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// POST /api/admin/courses
router.post('/courses', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, title, credits, type, semester, batchIds, assignedFacultyName } = req.body;
    if (!code || !title) {
      return res.status(400).json({ error: 'Course Code and Title are required.' });
    }

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      code: String(code).trim().toUpperCase(),
      title: String(title).trim(),
      credits: credits ? Number(credits) : 3,
      type: type || 'THEORY',
      semester: semester ? Number(semester) : 1,
      batchIds: Array.isArray(batchIds) ? batchIds : [],
      assignedFacultyName: assignedFacultyName ? String(assignedFacultyName).trim() : undefined,
    };

    const created = await createCourseInDB(newCourse);
    db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_CREATED', `${created.code} - ${created.title}`);

    res.status(201).json({ message: 'Course created successfully!', course: created });
  } catch (err: any) {
    console.error('[Admin Create Course Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to create course' });
  }
});

// PUT /api/admin/courses/:id
router.put('/courses/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const { code, title, credits, type, semester, batchIds, assignedFacultyName } = req.body;
    const updates: Partial<Course> = {};
    if (code !== undefined) updates.code = String(code).trim().toUpperCase();
    if (title !== undefined) updates.title = String(title).trim();
    if (credits !== undefined) updates.credits = Number(credits);
    if (type !== undefined) updates.type = type;
    if (semester !== undefined) updates.semester = Number(semester);
    if (batchIds !== undefined) updates.batchIds = Array.isArray(batchIds) ? batchIds : [];
    if (assignedFacultyName !== undefined) updates.assignedFacultyName = assignedFacultyName ? String(assignedFacultyName).trim() : undefined;

    const updated = await updateCourseInDB(id, updates);
    db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_UPDATED', `${updated.code} - ${updated.title}`);

    res.json({ message: 'Course updated successfully!', course: updated });
  } catch (err: any) {
    console.error('[Admin Update Course Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to update course' });
  }
});

// DELETE /api/admin/courses/:id
router.delete('/courses/:id', async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await deleteCourseFromDB(id);
    db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_DELETED', `Course ID: ${id}`);
    res.json({ message: 'Course deleted successfully!' });
  } catch (err: any) {
    console.error('[Admin Delete Course Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete course' });
  }
});

// POST /api/admin/users (Create Student)
router.post('/users', async (req: AuthenticatedRequest, res: Response) => {
  const { studentId, name, email, phone, role, batchId, currentSemester, password } = req.body;

  if (!studentId || !name || !batchId) {
    return res.status(400).json({ error: 'Student ID, Name, and Batch are required' });
  }

  try {
    const existing = await fetchUserByIdOrStudentId(studentId);
    if (existing) {
      return res.status(400).json({ error: `Student ID "${studentId}" already exists.` });
    }

    const allBatches = await fetchAllBatches();
    const batch = allBatches.find(b => b.id === batchId);

    const newUserRole: UserRole = role || 'STUDENT';
    const newUserId = `user-${Date.now()}`;

    const newUser: User = {
      id: newUserId,
      studentId: String(studentId).trim(),
      name: String(name).trim(),
      email: email ? String(email).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      role: newUserRole,
      batchId,
      batchName: batch ? batch.name : 'SWE Batch',
      currentSemester: currentSemester ? Number(currentSemester) : (batch ? batch.currentSemester : 1),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const passHash = bcrypt.hashSync(password || 'password123', 10);
    db.setPasswordHash(newUserId, passHash);

    const created = await createUserInDB(newUser);
    db.addAuditLog(req.user!.id, req.user!.name, 'USER_CREATED', `${newUser.name} (${studentId})`);

    res.status(201).json({ user: created });
  } catch (err: any) {
    console.error('[Admin Create User Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error creating user' });
  }
});

// PUT /api/admin/users/:id (Edit Student Info / ID / Name / Role / Batch)
router.put('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;

  try {
    const user = await fetchUserByIdOrStudentId(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { studentId, name, email, phone, role, batchId, currentSemester, status } = req.body;

    if (studentId && studentId !== user.studentId) {
      const existing = await fetchUserByIdOrStudentId(studentId);
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: `Student ID "${studentId}" is already assigned to another user.` });
      }
    }

    const allBatches = await fetchAllBatches();
    const batch = allBatches.find(b => b.id === (batchId || user.batchId));

    const updates: Partial<User> = {};
    if (studentId !== undefined) updates.studentId = String(studentId).trim();
    if (name !== undefined) updates.name = String(name).trim();
    if (email !== undefined) updates.email = email ? String(email).trim() : undefined;
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : undefined;
    if (role !== undefined) updates.role = role;
    if (batchId !== undefined) updates.batchId = batchId;
    if (batch) updates.batchName = batch.name;
    if (currentSemester !== undefined) updates.currentSemester = Number(currentSemester);
    if (status !== undefined) updates.status = status;

    const updated = await updateUserInDB(user.id, updates);
    db.addAuditLog(req.user!.id, req.user!.name, 'USER_UPDATED', `${updated.name} (${updated.studentId})`);

    res.json({ user: updated });
  } catch (err: any) {
    console.error('[Admin Update User Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error updating user' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;

  try {
    const user = await fetchUserByIdOrStudentId(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await deleteUserFromDB(user.id);
    db.addAuditLog(req.user!.id, req.user!.name, 'USER_DELETED', `${user.name} (${user.studentId})`);

    res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    console.error('[Admin Delete User Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error deleting user' });
  }
});

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.params.id;

  try {
    const user = await fetchUserByIdOrStudentId(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newPassword = req.body.newPassword || 'password123';
    const newHash = bcrypt.hashSync(newPassword, 10);
    db.setPasswordHash(user.id, newHash);

    db.addAuditLog(req.user!.id, req.user!.name, 'USER_PASSWORD_RESET', `${user.name} (${user.studentId})`);

    res.json({ message: `Password reset successfully for ${user.name}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// POST /api/admin/users/bulk-import (CSV Import)
router.post('/users/bulk-import', async (req: AuthenticatedRequest, res: Response) => {
  const { csvText, defaultBatchId } = req.body;

  if (!csvText) {
    return res.status(400).json({ error: 'CSV text content is required' });
  }

  const lines = csvText.split('\n').map((l: string) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV must contain a header and at least one student row' });
  }

  try {
    const allBatches = await fetchAllBatches();
    const defaultBatch = allBatches.find(b => b.id === defaultBatchId) || allBatches[0] || { id: 'batch-9', name: 'SWE 9th Batch', currentSemester: 5 };

    const importedUsers: User[] = [];
    const errors: string[] = [];

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

      const existing = await fetchUserByIdOrStudentId(studentId);
      if (existing) {
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
      db.setPasswordHash(newUser.id, passHash);
      const created = await createUserInDB(newUser);
      importedUsers.push(created);
    }

    db.addAuditLog(req.user!.id, req.user!.name, 'BULK_IMPORT_EXECUTED', `Imported ${importedUsers.length} students`);

    res.json({
      importedCount: importedUsers.length,
      errors,
      users: importedUsers,
    });
  } catch (err: any) {
    console.error('[Admin Bulk Import Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error during bulk import' });
  }
});

// GET /api/admin/resources/pending or /api/admin/pending-verification
router.get(['/resources/pending', '/pending-verification'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allResources = await fetchAllResources();
    const pending = allResources.filter(r => r.status === 'PENDING');
    res.json({ resources: pending });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch pending resources' });
  }
});

// POST /api/admin/resources/:id/review (Approve or Reject Resource)
router.post('/resources/:id/review', async (req: AuthenticatedRequest, res: Response) => {
  const resourceId = req.params.id;
  const { action, rejectionReason } = req.body;

  if (!['APPROVE', 'REJECT'].includes(action)) {
    return res.status(400).json({ error: 'Action must be APPROVE or REJECT' });
  }

  try {
    const allResources = await fetchAllResources();
    const resource = allResources.find(r => r.id === resourceId);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    const targetStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const updates: Partial<Resource> = {
      status: targetStatus,
    };

    const local = db.getData();
    if (!local.notifications) local.notifications = [];

    if (action === 'APPROVE') {
      updates.verifiedAt = new Date().toISOString();
      local.notifications.unshift({
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
      updates.rejectionReason = rejectionReason || 'Does not meet academic department guidelines.';
      local.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: resource.uploaderId,
        title: 'Resource Needs Revision ⚠️',
        message: `Your contribution "${resource.title}" was not approved. Reason: ${updates.rejectionReason}`,
        type: 'RESOURCE_REJECTED',
        linkUrl: '/profile',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = await updateResourceInDB(resourceId, updates);
    db.save();
    db.addAuditLog(req.user!.id, req.user!.name, `RESOURCE_${action}D`, resource.title);

    res.json({ message: `Resource ${action.toLowerCase()}d successfully`, resource: updated });
  } catch (err: any) {
    console.error('[Admin Review Resource Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error reviewing resource' });
  }
});

// GET Audit Logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const logs = db.getData().auditLogs || [];
  res.json({ auditLogs: logs, logs });
=======
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import * as adminService from '../services/adminService';

const router = Router();

// Strict Authentication & Role Gate: Only authenticated ADMIN can access /api/admin/*
router.use(verifyAuthToken, requireRole('ADMIN'));

// Helper to format success response
function sendSuccess(res: Response, data: any, status = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

// Helper to format error response
function sendError(res: Response, err: any, defaultCode = 'INTERNAL_ERROR', defaultStatus = 500) {
  const message = err?.message || 'An unexpected error occurred';
  const code = err?.code || defaultCode;
  const status = typeof err?.statusCode === 'number' ? err.statusCode : defaultStatus;

  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}

// ==============================================================================
// 1. STATS / OVERVIEW
// ==============================================================================
router.get(['/stats', '/overview'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await adminService.getAdminStats();
    return sendSuccess(res, stats);
  } catch (err: any) {
    return sendError(res, err, 'STATS_FETCH_ERROR');
  }
});

// ==============================================================================
// 2. USERS CRUD
// ==============================================================================
router.get(['/users', '/students'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await adminService.getAllUsers();
    return sendSuccess(res, users);
  } catch (err: any) {
    return sendError(res, err, 'USERS_FETCH_ERROR');
  }
});

router.post(['/users/bulk-import', '/students/bulk-import'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { csvText, defaultBatchId } = req.body;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const result = await adminService.bulkImportUsers(csvText, defaultBatchId, adminUser);
    return res.json({
      success: true,
      importedCount: result.importedCount,
      errors: result.errors,
      data: result,
    });
  } catch (err: any) {
    return sendError(res, err, 'USER_BULK_IMPORT_ERROR', 400);
  }
});

router.post(['/users/:id/reset-password', '/students/:id/reset-password'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const result = await adminService.resetUserPassword(id, newPassword, adminUser);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, err, 'PASSWORD_RESET_ERROR', 400);
  }
});

router.post(['/users', '/students'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newUser = await adminService.createUser(req.body, adminUser);
    return sendSuccess(res, newUser, 201);
  } catch (err: any) {
    return sendError(res, err, 'USER_CREATE_ERROR', 400);
  }
});

router.put(['/users/:id', '/students/:id'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateUser(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'USER_UPDATE_ERROR', 400);
  }
});

router.delete(['/users/:id', '/students/:id'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteUser(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'USER_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 3. BATCHES CRUD
// ==============================================================================
router.get('/batches', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await adminService.getAllBatches();
    return sendSuccess(res, batches);
  } catch (err: any) {
    return sendError(res, err, 'BATCHES_FETCH_ERROR');
  }
});

router.post('/batches', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newBatch = await adminService.createBatch(req.body, adminUser);
    return sendSuccess(res, newBatch, 201);
  } catch (err: any) {
    return sendError(res, err, 'BATCH_CREATE_ERROR', 400);
  }
});

router.put('/batches/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateBatch(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'BATCH_UPDATE_ERROR', 400);
  }
});

router.delete('/batches/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteBatch(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'BATCH_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 4. COURSES CRUD
// ==============================================================================
router.get('/courses', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courses = await adminService.getAllCourses();
    return sendSuccess(res, courses);
  } catch (err: any) {
    return sendError(res, err, 'COURSES_FETCH_ERROR');
  }
});

router.post('/courses', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newCourse = await adminService.createCourse(req.body, adminUser);
    return sendSuccess(res, newCourse, 201);
  } catch (err: any) {
    return sendError(res, err, 'COURSE_CREATE_ERROR', 400);
  }
});

router.put('/courses/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateCourse(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'COURSE_UPDATE_ERROR', 400);
  }
});

router.delete('/courses/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteCourse(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'COURSE_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 5. FACULTY CRUD
// ==============================================================================
router.get('/faculty', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const faculty = await adminService.getAllFaculty();
    return sendSuccess(res, faculty);
  } catch (err: any) {
    return sendError(res, err, 'FACULTY_FETCH_ERROR');
  }
});

router.post('/faculty', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newFaculty = await adminService.createFaculty(req.body, adminUser);
    return sendSuccess(res, newFaculty, 201);
  } catch (err: any) {
    return sendError(res, err, 'FACULTY_CREATE_ERROR', 400);
  }
});

router.put('/faculty/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateFaculty(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'FACULTY_UPDATE_ERROR', 400);
  }
});

router.delete('/faculty/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteFaculty(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'FACULTY_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 6. ROUTINE SLOTS CRUD
// ==============================================================================
router.get(['/routine-slots', '/routine'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batchId = req.query.batchId ? String(req.query.batchId) : undefined;
    const slots = await adminService.getAllRoutineSlots(batchId);
    return sendSuccess(res, slots);
  } catch (err: any) {
    return sendError(res, err, 'ROUTINE_FETCH_ERROR');
  }
});

router.post(['/routine-slots/bulk-import', '/routine/bulk-import'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { batchId, slots, mode } = req.body;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const result = await adminService.bulkImportRoutines(batchId, slots, mode || 'REPLACE', adminUser);
    return sendSuccess(res, result, 201);
  } catch (err: any) {
    return sendError(res, err, 'ROUTINE_BULK_IMPORT_ERROR', 400);
  }
});

router.post(['/routine-slots', '/routine'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newSlot = await adminService.createRoutineSlot(req.body, adminUser);
    return sendSuccess(res, newSlot, 201);
  } catch (err: any) {
    return sendError(res, err, 'ROUTINE_CREATE_ERROR', 400);
  }
});

router.put(['/routine-slots/:id', '/routine/:id'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateRoutineSlot(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'ROUTINE_UPDATE_ERROR', 400);
  }
});

router.delete(['/routine-slots/:id', '/routine/:id'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteRoutineSlot(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'ROUTINE_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 7. EXAMS CRUD
// ==============================================================================
router.get('/exams', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batchId = req.query.batchId ? String(req.query.batchId) : undefined;
    const exams = await adminService.getAllExams(batchId);
    return sendSuccess(res, exams);
  } catch (err: any) {
    return sendError(res, err, 'EXAMS_FETCH_ERROR');
  }
});

router.post('/exams', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newExam = await adminService.createExam(req.body, adminUser);
    return sendSuccess(res, newExam, 201);
  } catch (err: any) {
    return sendError(res, err, 'EXAM_CREATE_ERROR', 400);
  }
});

router.put('/exams/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateExam(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'EXAM_UPDATE_ERROR', 400);
  }
});

router.delete('/exams/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteExam(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'EXAM_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 8. ANNOUNCEMENTS CRUD
// ==============================================================================
router.get('/announcements', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batchId = req.query.batchId ? String(req.query.batchId) : undefined;
    const announcements = await adminService.getAllAnnouncements(batchId);
    return sendSuccess(res, announcements);
  } catch (err: any) {
    return sendError(res, err, 'ANNOUNCEMENTS_FETCH_ERROR');
  }
});

router.post('/announcements', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newAnn = await adminService.createAnnouncement(req.body, adminUser);
    return sendSuccess(res, newAnn, 201);
  } catch (err: any) {
    return sendError(res, err, 'ANNOUNCEMENT_CREATE_ERROR', 400);
  }
});

router.put('/announcements/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateAnnouncement(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'ANNOUNCEMENT_UPDATE_ERROR', 400);
  }
});

router.delete('/announcements/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteAnnouncement(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'ANNOUNCEMENT_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 9. DEPARTMENT NOTICES CRUD
// ==============================================================================
router.get('/department-notices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notices = await adminService.getAllNotices();
    return sendSuccess(res, notices);
  } catch (err: any) {
    return sendError(res, err, 'NOTICES_FETCH_ERROR');
  }
});

router.post('/department-notices', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newNotice = await adminService.createNotice(req.body, adminUser);
    return sendSuccess(res, newNotice, 201);
  } catch (err: any) {
    return sendError(res, err, 'NOTICE_CREATE_ERROR', 400);
  }
});

router.put('/department-notices/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateNotice(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'NOTICE_UPDATE_ERROR', 400);
  }
});

router.delete('/department-notices/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteNotice(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'NOTICE_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 10. RESOURCES CRUD & VERIFICATION
// ==============================================================================
router.get(['/resources/pending', '/resources/pending-verification'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingResources = await adminService.getPendingResources();
    return sendSuccess(res, pendingResources);
  } catch (err: any) {
    return sendError(res, err, 'PENDING_RESOURCES_FETCH_ERROR');
  }
});

router.patch(['/resources/:id/verify', '/resources/:id/verification'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.verifyResource(id, status, rejectionReason, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'RESOURCE_VERIFY_ERROR', 400);
  }
});

router.post(['/resources/:id/verify', '/resources/:id/verification'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.verifyResource(id, status, rejectionReason, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'RESOURCE_VERIFY_ERROR', 400);
  }
});

router.get('/resources', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const resources = await adminService.getAllResources();
    return sendSuccess(res, resources);
  } catch (err: any) {
    return sendError(res, err, 'RESOURCES_FETCH_ERROR');
  }
});

router.post('/resources', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newRes = await adminService.createResource(req.body, adminUser);
    return sendSuccess(res, newRes, 201);
  } catch (err: any) {
    return sendError(res, err, 'RESOURCE_CREATE_ERROR', 400);
  }
});

router.put('/resources/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateResource(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'RESOURCE_UPDATE_ERROR', 400);
  }
});

router.delete('/resources/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteResource(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'RESOURCE_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 11. NOTIFICATIONS CRUD
// ==============================================================================
router.get('/notifications', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const notifications = await adminService.getAllNotifications(userId);
    return sendSuccess(res, notifications);
  } catch (err: any) {
    return sendError(res, err, 'NOTIFICATIONS_FETCH_ERROR');
  }
});

router.post('/notifications', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const newNotif = await adminService.createNotification(req.body, adminUser);
    return sendSuccess(res, newNotif, 201);
  } catch (err: any) {
    return sendError(res, err, 'NOTIFICATION_CREATE_ERROR', 400);
  }
});

router.put('/notifications/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    const updated = await adminService.updateNotification(id, req.body, adminUser);
    return sendSuccess(res, updated);
  } catch (err: any) {
    return sendError(res, err, 'NOTIFICATION_UPDATE_ERROR', 400);
  }
});

router.delete('/notifications/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = { id: req.user!.id, name: req.user!.name };
    await adminService.deleteNotification(id, adminUser);
    return sendSuccess(res, { deleted: true, id });
  } catch (err: any) {
    return sendError(res, err, 'NOTIFICATION_DELETE_ERROR', 400);
  }
});

// ==============================================================================
// 12. AUDIT LOGS (Read-Only)
// ==============================================================================
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = await adminService.getAllAuditLogs(limit);
    return sendSuccess(res, logs);
  } catch (err: any) {
    return sendError(res, err, 'AUDIT_LOGS_FETCH_ERROR');
  }
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
});

export default router;
