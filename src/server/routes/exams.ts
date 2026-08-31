import { Router, Response } from 'express';
<<<<<<< HEAD
import { db } from '../db.ts';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth.ts';
import { requireRole } from '../middleware.ts';
import { Exam } from '../../types.ts';
=======
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Exam } from '../../types';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
import {
  fetchAllExams,
  createExamInDB,
  updateExamInDB,
  deleteExamFromDB,
  fetchAllUsers,
<<<<<<< HEAD
} from '../supabaseData.ts';
=======
} from '../supabaseData';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

const router = Router();

// GET /api/exams (Batch isolated, auto-sorted by date, past exams optional filter)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestedBatchId = req.query.batchId as string;

    let targetBatchId: string | undefined = undefined;
    if (requestedBatchId) {
      if (req.user && req.user.role !== 'ADMIN' && req.user.batchId && req.user.batchId !== requestedBatchId) {
        return res.status(403).json({
          error: "403 Forbidden: You do not have permission to access another batch's exam schedule.",
        });
      }
      targetBatchId = requestedBatchId;
    } else if (req.user && req.user.role !== 'ADMIN') {
      targetBatchId = req.user.batchId || 'batch-9';
    }

    let exams = await fetchAllExams(targetBatchId);

    const includePast = req.query.includePast === 'true';
    const todayStr = new Date().toISOString().split('T')[0];

    if (!includePast) {
      exams = exams.filter(e => e.date >= todayStr);
    }

    exams.sort((a, b) => a.date.localeCompare(b.date));

    const examsWithDaysLeft = exams.map(e => {
      const examDate = new Date(e.date);
      const now = new Date(todayStr);
      const diffTime = examDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...e, daysLeft };
    });

    res.json({ exams: examsWithDaysLeft });
  } catch (err: any) {
    console.error('[Exams API GET / Error]:', err);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
});

// POST /api/exams (CR or ADMIN only)
router.post('/', verifyAuthToken, requireRole('CR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { batchId, courseId, courseCode, courseTitle, type, title, date, startTime, room, description } = req.body;

  const targetBatchId = batchId || req.user.batchId;

  if (req.user.role === 'CR' && req.user.batchId !== targetBatchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only create exams for their assigned batch.' });
  }

  if (!targetBatchId || !courseTitle || !type || !title || !date) {
    return res.status(400).json({ error: 'Batch ID, course title, exam type, title, and date are required' });
  }

  try {
    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      batchId: targetBatchId,
      courseId: courseId || 'course-gen',
      courseCode: courseCode || 'SWE 300',
      courseTitle: String(courseTitle).trim(),
      type,
      title: String(title).trim(),
      date,
      startTime,
      room,
      description,
      createdBy: req.user.id,
      createdByName: req.user.name,
      createdAt: new Date().toISOString(),
    };

    const created = await createExamInDB(newExam);

    // Send notifications to all students in this batch
    const allUsers = await fetchAllUsers().catch(() => []);
    const batchStudents = allUsers.filter(u => u.batchId === targetBatchId && u.id !== req.user!.id);
    const local = db.getData();
    if (!local.notifications) local.notifications = [];
    batchStudents.forEach(st => {
      local.notifications.unshift({
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

    res.status(201).json({ exam: created });
  } catch (err: any) {
    console.error('[Exams API POST / Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error creating exam' });
  }
});

// PUT /api/exams/:id (CR or ADMIN only)
router.put('/:id', verifyAuthToken, requireRole('CR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const examId = req.params.id;

  try {
    const allExams = await fetchAllExams();
    const existing = allExams.find(e => e.id === examId);

    if (!existing) return res.status(404).json({ error: 'Exam not found' });

    if (req.user!.role === 'CR' && req.user!.batchId !== existing.batchId) {
      return res.status(403).json({ error: '403 Forbidden: CRs can only edit exams for their assigned batch.' });
    }

    const { courseCode, courseTitle, type, title, date, startTime, room, description } = req.body;

    const updates: Partial<Exam> = {};
    if (courseCode !== undefined) updates.courseCode = String(courseCode).trim();
    if (courseTitle !== undefined) updates.courseTitle = String(courseTitle).trim();
    if (type !== undefined) updates.type = type;
    if (title !== undefined) updates.title = String(title).trim();
    if (date !== undefined) updates.date = date;
    if (startTime !== undefined) updates.startTime = startTime;
    if (room !== undefined) updates.room = room;
    if (description !== undefined) updates.description = description;

    const updated = await updateExamInDB(examId, updates);
    db.addAuditLog(req.user!.id, req.user!.name, 'EXAM_UPDATED', `Exam #${examId}`);

    res.json({ exam: updated });
  } catch (err: any) {
    console.error('[Exams API PUT /:id Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error updating exam' });
  }
});

// DELETE /api/exams/:id (CR or ADMIN only)
router.delete('/:id', verifyAuthToken, requireRole('CR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const examId = req.params.id;

  try {
    const allExams = await fetchAllExams();
    const existing = allExams.find(e => e.id === examId);

    if (!existing) return res.status(404).json({ error: 'Exam not found' });

    if (req.user!.role === 'CR' && req.user!.batchId !== existing.batchId) {
      return res.status(403).json({ error: '403 Forbidden: CRs can only delete exams for their assigned batch.' });
    }

    await deleteExamFromDB(examId);
    db.addAuditLog(req.user!.id, req.user!.name, 'EXAM_DELETED', `Exam #${examId}`);

    res.json({ message: 'Exam deleted successfully' });
  } catch (err: any) {
    console.error('[Exams API DELETE /:id Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error deleting exam' });
  }
});

export default router;
