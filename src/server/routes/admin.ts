import { Router, Response } from 'express';
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
});

export default router;
