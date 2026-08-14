import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Exam } from '../../types';
import { syncToSupabase, deleteFromSupabase } from '../supabaseSync';

const router = Router();

// GET /api/exams (Batch isolated, auto-sorted by date, past exams optional filter)
router.get('/', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const requestedBatchId = (req.query.batchId as string) || req.user.batchId || 'batch-9';

  // Batch isolation check
  if (req.user.role !== 'ADMIN' && req.user.batchId !== requestedBatchId) {
    return res.status(403).json({
      error: '403 Forbidden: You do not have permission to access another batch\'s exam schedule.',
    });
  }

  const includePast = req.query.includePast === 'true';
  const todayStr = new Date().toISOString().split('T')[0];

  let exams = db.getData().exams.filter(e => e.batchId === requestedBatchId);

  if (!includePast) {
    exams = exams.filter(e => e.date >= todayStr);
  }

  // Sort by date ASC (nearest exam first)
  exams.sort((a, b) => a.date.localeCompare(b.date));

  // Add calculated daysLeft
  const examsWithDaysLeft = exams.map(e => {
    const examDate = new Date(e.date);
    const now = new Date(todayStr);
    const diffTime = examDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { ...e, daysLeft };
  });

  res.json({ exams: examsWithDaysLeft });
});

// POST /api/exams (CR or ADMIN only)
router.post('/', verifyAuthToken, requireRole('CR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { batchId, courseId, courseCode, courseTitle, type, title, date, startTime, room, description } = req.body;

  const targetBatchId = batchId || req.user.batchId;

  // CR can ONLY create exam for their own assigned batch
  if (req.user.role === 'CR' && req.user.batchId !== targetBatchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only create exams for their assigned batch.' });
  }

  if (!targetBatchId || !courseTitle || !type || !title || !date) {
    return res.status(400).json({ error: 'Batch ID, course title, exam type, title, and date are required' });
  }

  const newExam: Exam = {
    id: `exam-${Date.now()}`,
    batchId: targetBatchId,
    courseId: courseId || 'course-gen',
    courseCode: courseCode || 'SWE 300',
    courseTitle,
    type,
    title,
    date,
    startTime,
    room,
    description,
    createdBy: req.user.id,
    createdByName: req.user.name,
    createdAt: new Date().toISOString(),
  };

  db.getData().exams.push(newExam);

  // Send notifications to all students in this batch
  const batchStudents = db.getData().users.filter(u => u.batchId === targetBatchId && u.id !== req.user!.id);
  batchStudents.forEach(st => {
    db.getData().notifications.unshift({
      id: `notif-${Date.now()}-${Math.random()}`,
      userId: st.id,
      title: 'New Exam Scheduled 📅',
      message: `${type} - "${title}" scheduled for ${date} in ${courseCode || courseTitle}.`,
      type: 'EXAM',
      linkUrl: '/exams',
      read: false,
      createdAt: new Date().toISOString(),
    });
  });

  db.save();
  db.addAuditLog(req.user.id, req.user.name, 'EXAM_CREATED', `${type}: ${title} (${targetBatchId})`);

  syncToSupabase('exams', {
    id: newExam.id,
    batch_id: newExam.batchId,
    course_id: newExam.courseId,
    course_code: newExam.courseCode,
    course_title: newExam.courseTitle,
    type: newExam.type,
    title: newExam.title,
    date: newExam.date,
    start_time: newExam.startTime,
    room: newExam.room,
    description: newExam.description,
    created_by: newExam.createdBy,
    created_by_name: newExam.createdByName,
    created_at: newExam.createdAt,
  }).catch(() => {});

  res.status(201).json({ exam: newExam });
});

// PUT /api/exams/:id (CR or ADMIN only)
router.put('/:id', verifyAuthToken, requireRole('CR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const examId = req.params.id;
  const data = db.getData();
  const examIndex = data.exams.findIndex(e => e.id === examId);

  if (examIndex === -1) return res.status(404).json({ error: 'Exam not found' });

  const existing = data.exams[examIndex];

  if (req.user!.role === 'CR' && req.user!.batchId !== existing.batchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only edit exams for their assigned batch.' });
  }

  const { courseCode, courseTitle, type, title, date, startTime, room, description } = req.body;

  const updated: Exam = {
    ...existing,
    courseCode: courseCode ?? existing.courseCode,
    courseTitle: courseTitle ?? existing.courseTitle,
    type: type ?? existing.type,
    title: title ?? existing.title,
    date: date ?? existing.date,
    startTime: startTime ?? existing.startTime,
    room: room ?? existing.room,
    description: description ?? existing.description,
  };

  data.exams[examIndex] = updated;
  db.save();

  syncToSupabase('exams', {
    id: updated.id,
    batch_id: updated.batchId,
    course_id: updated.courseId,
    course_code: updated.courseCode,
    course_title: updated.courseTitle,
    type: updated.type,
    title: updated.title,
    date: updated.date,
    start_time: updated.startTime,
    room: updated.room,
    description: updated.description,
  }).catch(() => {});

  db.addAuditLog(req.user!.id, req.user!.name, 'EXAM_UPDATED', `Exam #${examId}`);

  res.json({ exam: updated });
});

// DELETE /api/exams/:id (CR or ADMIN only)
router.delete('/:id', verifyAuthToken, requireRole('CR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const examId = req.params.id;
  const data = db.getData();
  const examIndex = data.exams.findIndex(e => e.id === examId);

  if (examIndex === -1) return res.status(404).json({ error: 'Exam not found' });

  const existing = data.exams[examIndex];

  if (req.user!.role === 'CR' && req.user!.batchId !== existing.batchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only delete exams for their assigned batch.' });
  }

  data.exams.splice(examIndex, 1);
  db.save();
  deleteFromSupabase('exams', examId).catch(() => {});

  db.addAuditLog(req.user!.id, req.user!.name, 'EXAM_DELETED', `Exam #${examId}`);

  res.json({ message: 'Exam deleted successfully' });
});

export default router;
