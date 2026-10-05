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
  createNotificationInDB,
} from '../supabaseData';
import { sendRetakeCourseUpdateEmail, sendExamAnnouncementEmail, getEnrolledStudentsForCourse } from '../emailService';

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

    const allBatches = await fetchAllBatches().catch(() => db.getBatches());
    const targetBatch = allBatches.find(b => b.id === targetBatchId);
    const batchName = targetBatch?.name || 'Junior Batch';

    // Dispatch notifications & Resend emails to ALL students enrolled in this course (both Batch students + Retake students)
    const enrolledStudents = await getEnrolledStudentsForCourse({
      courseCode,
      courseTitle,
      courseId,
      batchId: targetBatchId,
    });

    console.log(`[Exam Creation] Found ${enrolledStudents.length} enrolled students for ${courseTitle}. Dispatching Resend emails...`);

    let emailsDispatched = 0;
    for (const student of enrolledStudents) {
      if (student.id === req.user!.id) continue;

      // In-app alert
      await createNotificationInDB({
        id: `notif-exam-${Date.now()}-${Math.random()}`,
        userId: student.id,
        title: `${student.enrollmentType === 'RETAKE' ? 'Retake Alert: ' : ''}New ${type} Scheduled 📅`,
        message: `${type} - "${title}" scheduled on ${date} for ${courseCode || courseTitle} (${student.batchName || batchName}).`,
        type: 'EXAM',
        linkUrl: student.enrollmentType === 'RETAKE' ? '/retake-courses' : '/exams',
        read: false,
        createdAt: new Date().toISOString(),
      }).catch(e => console.warn('[Exam In-App Notif Error]:', e));

      // Resend Email notification to all enrolled students with Course Title, Exam Type, Exam Date
      if (student.email) {
        sendExamAnnouncementEmail({
          to: student.email,
          studentName: student.name,
          courseTitle: courseTitle,
          courseCode: courseCode,
          examType: type,
          examDate: date,
          examTime: startTime,
          room,
          title,
          description,
          batchName: student.batchName || batchName,
          publisherName: `${req.user.name} (${req.user.role === 'CR' ? 'Class Representative' : 'Admin'})`,
          enrollmentType: student.enrollmentType,
        }).catch(err => console.warn('[Exam Email Notice Error]:', err));

        emailsDispatched++;
      }
    }

    db.save();

    db.addAuditLog(req.user.id, req.user.name, 'EXAM_CREATED', `${type}: ${title} (${targetBatchId})`);

    res.status(201).json({
      exam: created,
      emailsDispatched,
      message: `Exam scheduled! Email notifications dispatched to ${emailsDispatched} enrolled students via Resend.`,
    });
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

    // Notify ALL enrolled students of exam update via in-app & Resend email
    const allBatches = await fetchAllBatches().catch(() => db.getBatches());
    const batch = allBatches.find(b => b.id === existing.batchId);
    const targetCode = updates.courseCode || existing.courseCode;
    const targetTitle = updates.courseTitle || existing.courseTitle;
    const examDate = updates.date || existing.date;
    const examType = updates.type || existing.type;
    const examTitle = updates.title || existing.title;
    const examTime = updates.startTime || existing.startTime;
    const effectiveRoom = updates.room || existing.room;
    const effectiveDescription = updates.description !== undefined ? updates.description : existing.description;

    const enrolledStudents = await getEnrolledStudentsForCourse({
      courseCode: targetCode,
      courseTitle: targetTitle,
      courseId: existing.courseId,
      batchId: existing.batchId,
    });

    for (const student of enrolledStudents) {
      if (student.id === req.user!.id) continue;

      await createNotificationInDB({
        id: `notif-exam-upd-${Date.now()}-${Math.random()}`,
        userId: student.id,
        title: `Exam Schedule Updated 🔄`,
        message: `${examType} - "${examTitle}" in ${targetCode}. Date: ${examDate}, Room: ${effectiveRoom || 'TBA'}.`,
        type: 'EXAM',
        linkUrl: student.enrollmentType === 'RETAKE' ? '/retake-courses' : '/exams',
        read: false,
        createdAt: new Date().toISOString(),
      }).catch(e => console.warn('[Exam Update In-App Notif Error]:', e));

      if (student.email) {
        sendExamAnnouncementEmail({
          to: student.email,
          studentName: student.name,
          courseTitle: targetTitle,
          courseCode: targetCode,
          examType: `${examType} (UPDATED)`,
          examDate,
          examTime,
          room: effectiveRoom,
          title: `Updated: ${examTitle}`,
          description: effectiveDescription,
          batchName: student.batchName || batch?.name,
          publisherName: `${req.user!.name} (${req.user!.role === 'CR' ? 'Class Representative' : 'Admin'})`,
          enrollmentType: student.enrollmentType,
        }).catch(err => console.warn('[Exam Update Email Error]:', err));
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
