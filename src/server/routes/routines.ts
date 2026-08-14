import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { RoutineSlot, RoutineRequest } from '../../types';
import { syncToSupabase, deleteFromSupabase } from '../supabaseSync';

const router = Router();

// GET /api/routines/requests (CR sees own batch, Admin sees all)
router.get('/requests', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const data = db.getData();
  if (!data.routineRequests) data.routineRequests = [];

  let requests = data.routineRequests;

  if (req.user.role === 'CR') {
    requests = requests.filter(r => r.batchId === req.user!.batchId);
  }

  res.json({ requests });
});

// POST /api/routines/requests (CR submits request)
router.post('/requests', verifyAuthToken, requireRole('CR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { courseTitle, currentSchedule, requestedSchedule, requestedRoom, reason } = req.body;

  if (!courseTitle || !currentSchedule || !requestedSchedule || !reason) {
    return res.status(400).json({ error: 'Course, current schedule, requested schedule, and reason are required.' });
  }

  const data = db.getData();
  if (!data.routineRequests) data.routineRequests = [];

  const batch = data.batches.find(b => b.id === req.user!.batchId);

  const newReq: RoutineRequest = {
    id: `req-${Date.now()}`,
    batchId: req.user.batchId || 'batch-9',
    batchName: batch?.name || req.user.batchName || 'SWE Batch',
    crId: req.user.id,
    crName: req.user.name,
    courseTitle,
    currentSchedule,
    requestedSchedule,
    requestedRoom,
    reason,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  data.routineRequests.unshift(newReq);

  // Notify Admin
  const adminUsers = data.users.filter(u => u.role === 'ADMIN');
  adminUsers.forEach(a => {
    data.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random()}`,
      userId: a.id,
      title: '🗓️ New Routine Change Request',
      message: `${req.user!.name} requested routine change for ${courseTitle}.`,
      type: 'ANNOUNCEMENT',
      linkUrl: '/admin/routine',
      read: false,
      createdAt: new Date().toISOString(),
    });
  });

  db.save();
  db.addAuditLog(req.user.id, req.user.name, 'ROUTINE_REQUEST_SUBMITTED', `${courseTitle} (${newReq.batchName})`);

  res.status(201).json({ request: newReq });
});

// PATCH /api/routines/requests/:id (Admin approves or rejects)
router.patch('/requests/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const reqId = req.params.id;
  const { status, rejectionReason } = req.body;

  if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Valid status (APPROVED or REJECTED) is required' });
  }

  const data = db.getData();
  if (!data.routineRequests) data.routineRequests = [];

  const request = data.routineRequests.find(r => r.id === reqId);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  request.status = status;
  request.reviewedAt = new Date().toISOString();
  if (rejectionReason) request.rejectionReason = rejectionReason;

  // Notify CR and batch students
  const targetUsers = data.users.filter(u => u.batchId === request.batchId || u.id === request.crId);
  targetUsers.forEach(u => {
    data.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random()}`,
      userId: u.id,
      title: status === 'APPROVED' ? '✅ Routine Change Approved' : '❌ Routine Change Rejected',
      message: status === 'APPROVED'
        ? `The routine change request for "${request.courseTitle}" was approved by Department Head.`
        : `The routine change request for "${request.courseTitle}" was rejected: ${rejectionReason || 'Schedule conflict'}`,
      type: 'ANNOUNCEMENT',
      linkUrl: '/routine',
      read: false,
      createdAt: new Date().toISOString(),
    });
  });

  db.save();
  db.addAuditLog(req.user!.id, req.user!.name, `ROUTINE_REQUEST_${status}`, `Request #${reqId}`);

  res.json({ message: `Routine request ${status.toLowerCase()}`, request });
});

// GET /api/routines?batchId=... (With strict Batch Isolation)
router.get('/', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const requestedBatchId = (req.query.batchId as string) || req.user.batchId || 'batch-9';

  // Strict Batch Isolation Enforcement
  if (req.user.role !== 'ADMIN' && req.user.batchId !== requestedBatchId) {
    return res.status(403).json({
      error: '403 Forbidden: You do not have permission to access another batch\'s routine.',
    });
  }

  const routines = db.getData().routines.filter(r => r.batchId === requestedBatchId);
  res.json({ routines, batchId: requestedBatchId });
});

// POST /api/routines (Admin or CR for own batch)
router.post('/', verifyAuthToken, requireRole('ADMIN', 'CR'), (req: AuthenticatedRequest, res: Response) => {
  const { batchId, day, startTime, endTime, courseId, courseCode, courseTitle, teacherName, room } = req.body;

  if (!batchId || !day || !startTime || !endTime || !courseTitle || !teacherName || !room) {
    return res.status(400).json({ error: 'All routine slot fields are required' });
  }

  if (req.user!.role === 'CR' && req.user!.batchId !== batchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only create routine slots for their assigned batch.' });
  }

  const newSlot: RoutineSlot = {
    id: `rout-${Date.now()}`,
    batchId,
    day,
    startTime,
    endTime,
    courseId: courseId || 'course-gen',
    courseCode: courseCode || 'SWE 101',
    courseTitle,
    teacherName,
    room,
  };

  db.getData().routines.push(newSlot);
  db.save();

  syncToSupabase('routine_slots', {
    id: newSlot.id,
    batch_id: newSlot.batchId,
    day: newSlot.day,
    start_time: newSlot.startTime,
    end_time: newSlot.endTime,
    course_id: newSlot.courseId,
    course_code: newSlot.courseCode,
    course_title: newSlot.courseTitle,
    teacher_name: newSlot.teacherName,
    room: newSlot.room,
  }).catch(() => {});

  db.addAuditLog(req.user!.id, req.user!.name, 'ROUTINE_ADDED', `Slot for ${batchId} on ${day}`);

  res.status(201).json({ routine: newSlot });
});

// PUT /api/routines/:id (Admin or CR for own batch)
router.put('/:id', verifyAuthToken, requireRole('ADMIN', 'CR'), (req: AuthenticatedRequest, res: Response) => {
  const slotId = req.params.id;
  const { day, startTime, endTime, courseCode, courseTitle, teacherName, room } = req.body;

  const data = db.getData();
  const slot = data.routines.find(r => r.id === slotId);

  if (!slot) {
    return res.status(404).json({ error: 'Routine slot not found' });
  }

  if (req.user!.role === 'CR' && req.user!.batchId !== slot.batchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only edit routine slots for their assigned batch.' });
  }

  if (day) slot.day = day;
  if (startTime) slot.startTime = startTime;
  if (endTime) slot.endTime = endTime;
  if (courseCode) slot.courseCode = courseCode;
  if (courseTitle) slot.courseTitle = courseTitle;
  if (teacherName) slot.teacherName = teacherName;
  if (room) slot.room = room;

  db.save();

  syncToSupabase('routine_slots', {
    id: slot.id,
    batch_id: slot.batchId,
    day: slot.day,
    start_time: slot.startTime,
    end_time: slot.endTime,
    course_id: slot.courseId,
    course_code: slot.courseCode,
    course_title: slot.courseTitle,
    teacher_name: slot.teacherName,
    room: slot.room,
  }).catch(() => {});

  db.addAuditLog(req.user!.id, req.user!.name, 'ROUTINE_UPDATED', `Slot #${slotId} for batch ${slot.batchId}`);

  res.json({ message: 'Routine slot updated successfully', routine: slot });
});

// DELETE /api/routines/:id (Admin or CR for own batch)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN', 'CR'), (req: AuthenticatedRequest, res: Response) => {
  const slotId = req.params.id;
  const data = db.getData();
  const slot = data.routines.find(r => r.id === slotId);

  if (!slot) return res.status(404).json({ error: 'Routine slot not found' });

  if (req.user!.role === 'CR' && req.user!.batchId !== slot.batchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only delete routine slots for their assigned batch.' });
  }

  const index = data.routines.findIndex(r => r.id === slotId);
  const [removed] = data.routines.splice(index, 1);
  db.save();
  deleteFromSupabase('routine_slots', slotId).catch(() => {});

  db.addAuditLog(req.user!.id, req.user!.name, 'ROUTINE_DELETED', `Slot #${slotId}`);

  res.json({ message: 'Routine slot deleted', removed });
});

export default router;
