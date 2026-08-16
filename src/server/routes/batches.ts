import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Batch } from '../../types';

const router = Router();

// GET /api/batches (Admin gets all, Student/CR gets list or own batch)
router.get('/', optionalAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  res.json({ batches: data.batches || [] });
});

// GET /api/batches/:id (Enforce Batch Isolation for student/CR!)
router.get('/:id', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const batchId = req.params.id;
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  // Batch isolation check
  if (req.user.role !== 'ADMIN' && req.user.batchId !== batchId) {
    return res.status(403).json({
      error: '403 Forbidden: You do not have permission to access another batch\'s private information.',
    });
  }

  const batch = db.getData().batches.find(b => b.id === batchId);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });

  const data = db.getData();
  const students = data.users.filter(u => u.batchId === batchId);
  const crs = students.filter(u => u.role === 'CR' || (batch.crIds && batch.crIds.includes(u.id)));
  const courses = data.courses.filter(c => c.batchIds.includes(batchId) || c.semester === batch.currentSemester);
  const routines = data.routines.filter(r => r.batchId === batchId);
  const exams = data.exams.filter(e => e.batchId === batchId);
  const announcements = data.announcements.filter(a => a.batchId === batchId);

  res.json({ batch, students, crs, courses, routines, exams, announcements });
});

// POST /api/batches (Admin only)
router.post('/', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { name, admissionYear, currentSemester, academicSession } = req.body;

  if (!name || !admissionYear || !currentSemester) {
    return res.status(400).json({ error: 'Name, admission year, and current semester are required' });
  }

  const newBatch: Batch = {
    id: `batch-${Date.now()}`,
    name,
    admissionYear: Number(admissionYear),
    currentSemester: Number(currentSemester),
    academicSession: academicSession || `${admissionYear}-${Number(admissionYear) + 1}`,
    crIds: [],
    createdAt: new Date().toISOString(),
  };

  db.getData().batches.push(newBatch);
  db.save();

  db.addAuditLog(req.user!.id, req.user!.name, 'BATCH_CREATED', newBatch.name);

  res.status(201).json({ batch: newBatch });
});

// PUT /api/batches/:id (Admin only)
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const batchId = req.params.id;
  const { name, admissionYear, currentSemester, academicSession, crIds } = req.body;

  const data = db.getData();
  const batchIndex = data.batches.findIndex(b => b.id === batchId);
  if (batchIndex === -1) return res.status(404).json({ error: 'Batch not found' });

  const updated: Batch = {
    ...data.batches[batchIndex],
    name: name ?? data.batches[batchIndex].name,
    admissionYear: admissionYear ? Number(admissionYear) : data.batches[batchIndex].admissionYear,
    currentSemester: currentSemester ? Number(currentSemester) : data.batches[batchIndex].currentSemester,
    academicSession: academicSession ?? data.batches[batchIndex].academicSession,
    crIds: crIds ?? data.batches[batchIndex].crIds,
  };

  data.batches[batchIndex] = updated;
  db.save();

  db.addAuditLog(req.user!.id, req.user!.name, 'BATCH_UPDATED', updated.name);

  res.json({ batch: updated });
});

export default router;
