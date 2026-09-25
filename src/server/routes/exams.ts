import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Exam } from '../../types';
import {
  fetchAllExams,
  createExamInDB,
  updateExamInDB,
  deleteExamFromDB,
  fetchAllUsers,
  fetchAllBatches,
  fetchBatchById,
  fetchAllCourses,
} from '../supabaseData';
import { sendRetakeCourseUpdateEmail } from '../emailService';

const normalizeCode = (val?: string) => (val || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

const router = Router();

// GET /api/exams (Batch isolated, auto-sorted by date, past exams optional filter, strictly matched to student's enrolled & retake courses)
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

    // STUDENT-SPECIFIC STRICT COURSE MATCHING (Enrolled batch semester courses + registered retake courses)
    if (req.user && req.user.role === 'STUDENT') {
      try {
        const [allBatches, allCourses] = await Promise.all([
          fetchAllBatches().catch(() => db.getBatches()),
          fetchAllCourses().catch(() => db.getCourses()),
        ]);

        const userBatch = targetBatchId ? (allBatches.find(b => b.id === targetBatchId) || null) : null;
        const activeSem = userBatch?.currentSemester || req.user.currentSemester;

        // 1. Determine student's enrolled courses in their primary batch semester
        const enrolledBatchCourses = allCourses.filter(c =>
          activeSem !== undefined ? c.semester === activeSem : (targetBatchId && c.batchIds?.includes(targetBatchId))
        );

        // 2. Determine student's active retake/improvement courses
        const userRetakes = (db.getRetakes?.() || []).filter(r => r.studentId === req.user!.id && r.status !== 'DROPPED');

        const normalize = (val?: string) => (val || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        // Check if an exam matches any enrolled course in the student's batch
        const isEnrolledMatch = (e: Exam) => {
          const eCode = normalize(e.courseCode);
          const eTitle = normalize(e.courseTitle);
          const eId = e.courseId;

          return enrolledBatchCourses.some(c =>
            (eId && c.id === eId) ||
            (eCode && (normalize(c.code) === eCode || normalize(c.shortName) === eCode)) ||
            (eTitle && normalize(c.title).includes(eTitle))
          );
        };

        // Filter primary batch exams strictly to courses the student is enrolled in
        // If enrolled courses exist, only keep exams for those courses
        if (enrolledBatchCourses.length > 0) {
          exams = exams.filter(e => isEnrolledMatch(e));
        }

        // 3. Include exams from junior/other batches where the student's retake course is being taken
        if (userRetakes.length > 0) {
          const allDepartmentExams = await fetchAllExams();
          const retakeExams = allDepartmentExams.filter(e => {
            if (e.batchId === targetBatchId) return false;
            if (!includePast && e.date < todayStr) return false;
            return userRetakes.some(r => {
              const rCode = normalize(r.courseCode);
              const rTitle = normalize(r.courseTitle);
              const eCode = normalize(e.courseCode);
              const eTitle = normalize(e.courseTitle);
              return (
                (r.courseId && e.courseId && r.courseId === e.courseId) ||
                (rCode && eCode && (rCode === eCode || eCode.includes(rCode) || rCode.includes(eCode))) ||
                (rTitle && eTitle && (rTitle.includes(eTitle) || eTitle.includes(rTitle)))
              );
            });
          }).map(e => {
            const matchingRetake = userRetakes.find(r => {
              const rCode = normalize(r.courseCode);
              const rTitle = normalize(r.courseTitle);
              const eCode = normalize(e.courseCode);
              const eTitle = normalize(e.courseTitle);
              return (
                (r.courseId && e.courseId && r.courseId === e.courseId) ||
                (rCode && eCode && (rCode === eCode || eCode.includes(rCode) || rCode.includes(eCode))) ||
                (rTitle && eTitle && (rTitle.includes(eTitle) || eTitle.includes(rTitle)))
              );
            });
            const examBatch = allBatches.find(b => b.id === e.batchId);
            const batchName = examBatch?.name || matchingRetake?.retakeBatchName || 'Junior Batch';
            return {
              ...e,
              isRetakeCourse: true,
              retakeType: matchingRetake?.type || 'RETAKE',
              retakeBatchName: batchName,
              batchName,
              isUpdatedByCR: true,
            };
          });

          exams = [...exams, ...retakeExams];
        }
      } catch (retakeExamErr) {
        console.warn('[Exams API course matching error]:', retakeExamErr);
      }
    }

    exams.sort((a, b) => a.date.localeCompare(b.date));

    const examsWithDaysLeft = exams.map(e => {
      const examDate = new Date(e.date);
      const now = new Date(todayStr);
      const diffTime = examDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isArchived = e.date < todayStr;
      return { ...e, daysLeft, isArchived };
    });

    const upcomingCount = examsWithDaysLeft.filter(e => !e.isArchived).length;
    const archivedCount = examsWithDaysLeft.filter(e => e.isArchived).length;

    res.json({ exams: examsWithDaysLeft, upcomingCount, archivedCount });
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
    const allBatches = await fetchAllBatches().catch(() => db.getBatches());
    const targetBatch = allBatches.find(b => b.id === targetBatchId);
    const batchName = targetBatch?.name || 'Junior Batch';

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

    // Alert Retake/Improvement students enrolled in this course & send Resend email
    const allRetakes = db.getRetakes();

    const enrolledRetakes = allRetakes.filter(r => {
      if (r.status === 'DROPPED') return false;
      const rCodeNorm = normalizeCode(r.courseCode);
      const examCodeNorm = normalizeCode(courseCode);
      const codeMatches = rCodeNorm && examCodeNorm && (rCodeNorm === examCodeNorm || rCodeNorm.includes(examCodeNorm) || examCodeNorm.includes(rCodeNorm));
      const idMatches = courseId && r.courseId && r.courseId === courseId;
      return codeMatches || idMatches;
    });

    for (const retake of enrolledRetakes) {
      // In-app alert
      local.notifications.unshift({
        id: `notif-retake-${Date.now()}-${Math.random()}`,
        userId: retake.studentId,
        title: `Retake Alert: ${type} Scheduled 📅`,
        message: `CR added ${type} - "${title}" on ${date} for your retake course ${courseCode || courseTitle} (${batchName}).`,
        type: 'EXAM',
        linkUrl: '/retake-courses',
        read: false,
        createdAt: new Date().toISOString(),
      });

      // Resend Email notification
      const studentUser = allUsers.find(u => u.id === retake.studentId);
      const studentEmail = retake.studentEmail || studentUser?.email;
      if (studentEmail) {
        sendRetakeCourseUpdateEmail({
          to: studentEmail,
          studentName: retake.studentName || studentUser?.name || 'Student',
          courseCode: courseCode || retake.courseCode,
          courseTitle: courseTitle || retake.courseTitle,
          updateType: 'EXAM',
          title: `${type}: ${title}`,
          description,
          date,
          time: startTime,
          room,
          batchName,
          actorName: `${req.user.name} (${req.user.role === 'CR' ? 'Class Representative' : 'Admin'})`,
        }).catch(err => console.warn('[Exam Retake Email Notice Error]:', err));
      }
    }

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

    // Notify enrolled retake students of exam update via in-app & Resend email
    const allRetakes = db.getRetakes();
    const allUsers = await fetchAllUsers().catch(() => []);
    const allBatches = await fetchAllBatches().catch(() => db.getBatches());
    const batch = allBatches.find(b => b.id === existing.batchId);
    const targetCode = updates.courseCode || existing.courseCode;

    const enrolledRetakes = allRetakes.filter(r => {
      if (r.status === 'DROPPED') return false;
      const rCodeNorm = normalizeCode(r.courseCode);
      const targetCodeNorm = normalizeCode(targetCode);
      const codeMatches = rCodeNorm && targetCodeNorm && (rCodeNorm === targetCodeNorm || rCodeNorm.includes(targetCodeNorm) || targetCodeNorm.includes(rCodeNorm));
      return codeMatches || (existing.courseId && r.courseId && r.courseId === existing.courseId);
    });

    const local = db.getData();
    if (!local.notifications) local.notifications = [];

    for (const retake of enrolledRetakes) {
      local.notifications.unshift({
        id: `notif-retake-upd-${Date.now()}-${Math.random()}`,
        userId: retake.studentId,
        title: `Exam Schedule Updated 🔄`,
        message: `CR updated ${updates.type || existing.type} - "${updates.title || existing.title}" in ${targetCode}. Date: ${updates.date || existing.date}, Room: ${updates.room || existing.room || 'TBA'}.`,
        type: 'EXAM',
        linkUrl: '/retake-courses',
        read: false,
        createdAt: new Date().toISOString(),
      });

      const studentUser = allUsers.find(u => u.id === retake.studentId);
      const studentEmail = retake.studentEmail || studentUser?.email;
      if (studentEmail) {
        sendRetakeCourseUpdateEmail({
          to: studentEmail,
          studentName: retake.studentName || studentUser?.name || 'Student',
          courseCode: targetCode || retake.courseCode,
          courseTitle: updates.courseTitle || existing.courseTitle || retake.courseTitle,
          updateType: 'EXAM_UPDATED',
          title: `Updated: ${updates.type || existing.type} - ${updates.title || existing.title}`,
          description: updates.description !== undefined ? updates.description : existing.description,
          date: updates.date || existing.date,
          time: updates.startTime || existing.startTime,
          room: updates.room || existing.room,
          batchName: batch?.name,
          actorName: `${req.user!.name} (${req.user!.role === 'CR' ? 'Class Representative' : 'Admin'})`,
        }).catch(err => console.warn('[Exam Update Retake Email Error]:', err));
      }
    }
    db.save();

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
