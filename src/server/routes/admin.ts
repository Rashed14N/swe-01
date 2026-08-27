import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.ts';
import { verifyAuthToken, AuthenticatedRequest } from '../auth.ts';
import { requireRole } from '../middleware.ts';
import { User, Faculty, UserRole, Resource } from '../../types.ts';
import {
  fetchAllUsers,
  fetchUserByIdOrStudentId,
  createUserInDB,
  updateUserInDB,
  deleteUserFromDB,
  fetchAllBatches,
  fetchAllCourses,
  fetchAllFaculty,
  fetchAllResources,
  updateResourceInDB,
  fetchAllNotices,
} from '../supabaseData.ts';

const router = Router();

// Ensure all routes in /api/admin are ADMIN ONLY
router.use(verifyAuthToken, requireRole('ADMIN'));

// GET /api/admin/overview or /api/admin/stats
router.get(['/overview', '/stats'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [allUsers, allBatches, allFaculty, allResources, allNotices] = await Promise.all([
      fetchAllUsers(),
      fetchAllBatches(),
      fetchAllFaculty(),
      fetchAllResources(),
      fetchAllNotices(),
    ]);

    const totalStudents = allUsers.filter(u => u.role !== 'ADMIN').length;
    const totalBatches = allBatches.length;
    const totalFaculty = allFaculty.length;
    const pendingResourcesCount = allResources.filter(r => r.status === 'PENDING').length;
    const activeNoticesCount = allNotices.length;
    const totalApprovedResources = allResources.filter(r => r.status === 'APPROVED').length;

    const data = db.getData();

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
      recentAuditLogs: (data.auditLogs || []).slice(0, 10),
    });
  } catch (err: any) {
    console.error('[Admin Overview Error]:', err);
    res.status(500).json({ error: 'Failed to load admin stats' });
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

// GET /api/admin/courses
router.get('/courses', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const courses = await fetchAllCourses();
    res.json({ courses });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch courses' });
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
});

export default router;
