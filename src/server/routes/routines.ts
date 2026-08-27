import { Router, Response } from 'express';
import { db } from '../db.ts';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth.ts';
import { requireRole } from '../middleware.ts';
import { RoutineSlot, RoutineRequest } from '../../types.ts';
import {
  fetchAllRoutineSlots,
  createRoutineSlotInDB,
  updateRoutineSlotInDB,
  deleteRoutineSlotFromDB,
} from '../supabaseData.ts';

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

  const batch = (data.batches || []).find(b => b.id === req.user!.batchId);

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
  const adminUsers = (data.users || []).filter(u => u.role === 'ADMIN');
  adminUsers.forEach(a => {
    if (!data.notifications) data.notifications = [];
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
  const targetUsers = (data.users || []).filter(u => u.batchId === request.batchId || u.id === request.crId);
  targetUsers.forEach(u => {
    if (!data.notifications) data.notifications = [];
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
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestedBatchId = req.query.batchId as string;

    if (!requestedBatchId) {
      if (req.user?.role === 'ADMIN') {
        const allRoutines = await fetchAllRoutineSlots();
        return res.json({ routines: allRoutines });
      }
      const userBatch = req.user?.batchId || 'batch-9';
      const userRoutines = await fetchAllRoutineSlots(userBatch);
      return res.json({ routines: userRoutines, batchId: userBatch });
    }

    // Strict Batch Isolation Enforcement
    if (req.user && req.user.role !== 'ADMIN' && req.user.batchId && req.user.batchId !== requestedBatchId) {
      return res.status(403).json({
        error: '403 Forbidden: You do not have permission to access another batch\'s routine.',
      });
    }

    const routines = await fetchAllRoutineSlots(requestedBatchId);
    res.json({ routines, batchId: requestedBatchId });
  } catch (err: any) {
    console.error('[Routines API GET / Error]:', err);
    res.status(500).json({ error: 'Failed to fetch routines' });
  }
});

// POST /api/routines/bulk or /api/routines/import (Admin or CR for own batch)
router.post('/bulk', verifyAuthToken, requireRole('ADMIN', 'CR'), async (req: AuthenticatedRequest, res: Response) => {
  const { batchId, slots, mode = 'REPLACE' } = req.body;
  const inputSlots = Array.isArray(slots) ? slots : (Array.isArray(req.body) ? req.body : []);
  const targetBatchId = batchId || (Array.isArray(req.body) ? req.body[0]?.batchId : undefined) || req.user?.batchId;

  if (!targetBatchId) {
    return res.status(400).json({ error: 'Target batchId is required for importing routine.' });
  }

  if (req.user!.role === 'CR' && req.user!.batchId !== targetBatchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only import routine for their own batch.' });
  }

  if (!Array.isArray(inputSlots) || inputSlots.length === 0) {
    return res.status(400).json({ error: 'No routine slots provided in the JSON array.' });
  }

  const validDays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const processedSlots: RoutineSlot[] = [];
  const errors: string[] = [];

  inputSlots.forEach((slot: any, idx: number) => {
    const rawDay = String(slot.day || '').trim().toUpperCase();
    if (!validDays.includes(rawDay)) {
      errors.push(`Slot #${idx + 1}: Invalid or missing day "${slot.day}". Allowed: ${validDays.join(', ')}`);
      return;
    }

    if (!slot.startTime || !slot.endTime) {
      errors.push(`Slot #${idx + 1} (${rawDay}): Both startTime and endTime are required.`);
      return;
    }

    if (!slot.courseTitle && !slot.courseCode) {
      errors.push(`Slot #${idx + 1} (${rawDay}): Course Title or Course Code is required.`);
      return;
    }

    const newSlot: RoutineSlot = {
      id: slot.id && typeof slot.id === 'string' && slot.id.startsWith('rout-') ? slot.id : `rout-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      batchId: targetBatchId,
      day: rawDay as any,
      startTime: String(slot.startTime).trim(),
      endTime: String(slot.endTime).trim(),
      courseId: slot.courseId || `course-${Date.now()}-${idx}`,
      courseCode: slot.courseCode ? String(slot.courseCode).trim() : 'SWE 101',
      courseTitle: slot.courseTitle ? String(slot.courseTitle).trim() : (slot.courseCode || 'Class Session'),
      courseShortName: slot.courseShortName ? String(slot.courseShortName).trim() : undefined,
      teacherName: slot.teacherName ? String(slot.teacherName).trim() : 'Faculty Instructor',
      teacherShortName: slot.teacherShortName ? String(slot.teacherShortName).trim() : undefined,
      room: slot.room ? String(slot.room).trim() : 'Room 502',
    };

    processedSlots.push(newSlot);
  });

  if (processedSlots.length === 0) {
    return res.status(400).json({ error: 'No valid routine slots found in JSON.', details: errors });
  }

  try {
    if (mode === 'REPLACE') {
      const existing = await fetchAllRoutineSlots(targetBatchId);
      for (const slot of existing) {
        await deleteRoutineSlotFromDB(slot.id);
      }
    }

    for (const slot of processedSlots) {
      await createRoutineSlotInDB(slot);
    }

    const actorId = req.user?.id || 'admin';
    const actorName = req.user?.name || 'Admin';
    db.addAuditLog(actorId, actorName, 'ROUTINE_BULK_IMPORTED', `${processedSlots.length} slots imported for ${targetBatchId} (${mode})`);

    const updatedBatchRoutines = await fetchAllRoutineSlots(targetBatchId);

    res.status(201).json({
      message: `Successfully imported ${processedSlots.length} class slots.`,
      count: processedSlots.length,
      routines: updatedBatchRoutines,
      warnings: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('[Routines API POST /bulk Error]:', err);
    res.status(500).json({ error: err?.message || 'Failed to bulk import routine slots' });
  }
});

// POST /api/routines (Admin or CR for own batch)
router.post('/', verifyAuthToken, requireRole('ADMIN', 'CR'), async (req: AuthenticatedRequest, res: Response) => {
  const { batchId, day, startTime, endTime, courseId, courseCode, courseTitle, courseShortName, teacherName, teacherShortName, room } = req.body;

  if (!batchId || !day || !startTime || !endTime || !courseTitle || !teacherName || !room) {
    return res.status(400).json({ error: 'All routine slot fields are required' });
  }

  if (req.user!.role === 'CR' && req.user!.batchId !== batchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only create routine slots for their assigned batch.' });
  }

  try {
    const newSlot: RoutineSlot = {
      id: `rout-${Date.now()}`,
      batchId,
      day: day.toUpperCase(),
      startTime: String(startTime).trim(),
      endTime: String(endTime).trim(),
      courseId: courseId || 'course-gen',
      courseCode: courseCode || 'SWE 101',
      courseTitle: String(courseTitle).trim(),
      courseShortName: courseShortName ? String(courseShortName).trim() : undefined,
      teacherName: String(teacherName).trim(),
      teacherShortName: teacherShortName ? String(teacherShortName).trim() : undefined,
      room: String(room).trim(),
    };

    const created = await createRoutineSlotInDB(newSlot);

    const actorId = req.user?.id || 'admin';
    const actorName = req.user?.name || 'Admin';
    db.addAuditLog(actorId, actorName, 'ROUTINE_ADDED', `Slot for ${batchId} on ${day}`);

    res.status(201).json({ routine: created });
  } catch (err: any) {
    console.error('[Routines API POST / Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error creating routine slot' });
  }
});

// PUT /api/routines/:id (Admin or CR for own batch)
router.put('/:id', verifyAuthToken, requireRole('ADMIN', 'CR'), async (req: AuthenticatedRequest, res: Response) => {
  const slotId = req.params.id;
  const { day, startTime, endTime, courseCode, courseTitle, courseShortName, teacherName, teacherShortName, room } = req.body;

  try {
    const allSlots = await fetchAllRoutineSlots();
    const slot = allSlots.find(s => s.id === slotId);

    if (!slot) {
      return res.status(404).json({ error: 'Routine slot not found' });
    }

    if (req.user!.role === 'CR' && req.user!.batchId !== slot.batchId) {
      return res.status(403).json({ error: '403 Forbidden: CRs can only edit routine slots for their assigned batch.' });
    }

    const updates: Partial<RoutineSlot> = {};
    if (day) updates.day = day.toUpperCase();
    if (startTime) updates.startTime = String(startTime).trim();
    if (endTime) updates.endTime = String(endTime).trim();
    if (courseCode) updates.courseCode = String(courseCode).trim();
    if (courseTitle) updates.courseTitle = String(courseTitle).trim();
    if (courseShortName !== undefined) updates.courseShortName = courseShortName ? String(courseShortName).trim() : undefined;
    if (teacherName) updates.teacherName = String(teacherName).trim();
    if (teacherShortName !== undefined) updates.teacherShortName = teacherShortName ? String(teacherShortName).trim() : undefined;
    if (room) updates.room = String(room).trim();

    const updated = await updateRoutineSlotInDB(slotId, updates);
    db.addAuditLog(req.user!.id, req.user!.name, 'ROUTINE_UPDATED', `Slot #${slotId} for batch ${slot.batchId}`);

    res.json({ message: 'Routine slot updated successfully', routine: updated });
  } catch (err: any) {
    console.error('[Routines API PUT /:id Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error updating routine slot' });
  }
});

// DELETE /api/routines/:id (Admin or CR for own batch)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN', 'CR'), async (req: AuthenticatedRequest, res: Response) => {
  const slotId = req.params.id;

  try {
    const allSlots = await fetchAllRoutineSlots();
    const slot = allSlots.find(s => s.id === slotId);

    if (!slot) return res.status(404).json({ error: 'Routine slot not found' });

    if (req.user!.role === 'CR' && req.user!.batchId !== slot.batchId) {
      return res.status(403).json({ error: '403 Forbidden: CRs can only delete routine slots for their assigned batch.' });
    }

    await deleteRoutineSlotFromDB(slotId);
    db.addAuditLog(req.user!.id, req.user!.name, 'ROUTINE_DELETED', `Slot #${slotId}`);

    res.json({ message: 'Routine slot deleted', removed: slot });
  } catch (err: any) {
    console.error('[Routines API DELETE /:id Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error deleting routine slot' });
  }
});

export default router;
