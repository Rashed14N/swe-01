import { Router, Response } from 'express';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import {
  fetchAllBatches,
  fetchAllCourses,
  fetchAllRoutineSlots,
  fetchAllExams,
  fetchAllAnnouncements,
  fetchAllNotices,
} from '../supabaseData';
import { db } from '../db';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const user = req.user;

  try {
    const userBatchId = (req.query.batchId as string) || user.batchId || 'batch-9';

    const [allBatches, allCourses, allRoutines, allExams, allAnnouncements, allNotices] = await Promise.all([
      fetchAllBatches(),
      fetchAllCourses(),
      fetchAllRoutineSlots(userBatchId),
      fetchAllExams(userBatchId),
      fetchAllAnnouncements(userBatchId),
      fetchAllNotices(),
    ]);

    const batch = allBatches.find(b => b.id === userBatchId);
    const activeSemester = batch ? batch.currentSemester : (user.currentSemester || 5);
    const batchName = batch ? batch.name : (user.batchName || 'SWE Department');

    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
    const todayIndex = new Date().getDay();
    const todayName = daysOfWeek[todayIndex];

    // 1. Today's Routine (strictly matching today's weekday)
    const todaysRoutine = allRoutines.filter(
      r => r.day?.toUpperCase() === todayName
    );

    // 2. Current Courses
    let currentCourses = allCourses.filter(c => 
      c.batchIds?.includes(userBatchId) || c.semester === activeSemester
    );

    // 6. Student Retake Courses
    const userRetakes = (db.getRetakes?.() || []).filter(r => r.studentId === user.id && r.status !== 'DROPPED');
    const retakeCoursesCount = userRetakes.length;

    // Append retakes to currentCourses for student view
    if (user.role === 'STUDENT' && userRetakes.length > 0) {
      const normalize = (val?: string) => (val || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      for (const retake of userRetakes) {
        const rCode = normalize(retake.courseCode);
        const rId = retake.courseId;
        const existing = currentCourses.find(c => (rId && c.id === rId) || (rCode && normalize(c.code) === rCode));
        if (!existing) {
          const matched = allCourses.find(c => (rId && c.id === rId) || (rCode && normalize(c.code) === rCode));
          if (matched) {
            currentCourses.push({
              ...matched,
              isRetakeCourse: true,
              retakeType: retake.type || 'RETAKE',
              retakeBatchId: retake.retakeBatchId,
              retakeBatchName: retake.retakeBatchName || 'Junior Batch',
            });
          } else {
            currentCourses.push({
              id: retake.courseId || `course-${retake.id}`,
              code: retake.courseCode,
              title: retake.courseTitle,
              credits: 3,
              type: 'THEORY',
              semester: 1,
              batchIds: retake.retakeBatchId ? [retake.retakeBatchId] : [],
              isRetakeCourse: true,
              retakeType: retake.type || 'RETAKE',
              retakeBatchId: retake.retakeBatchId,
              retakeBatchName: retake.retakeBatchName || 'Junior Batch',
            });
          }
        }
      }
    }

    // 3. Upcoming Exams strictly matching enrolled courses + retakes
    const todayStr = new Date().toISOString().split('T')[0];
    const normalize = (val?: string) => (val || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Only keep batch exams for courses the student is actually enrolled in
    let candidateExams = allExams.filter(e => {
      if (e.batchId !== userBatchId || e.date < todayStr) return false;
      if (user.role !== 'STUDENT') return true;
      const eCode = normalize(e.courseCode);
      const eTitle = normalize(e.courseTitle);
      const eId = e.courseId;
      return currentCourses.some(c =>
        (eId && c.id === eId) ||
        (eCode && (normalize(c.code) === eCode || normalize(c.shortName) === eCode)) ||
        (eTitle && normalize(c.title).includes(eTitle))
      );
    });

    if (userRetakes.length > 0) {
      try {
        const departmentExams = await fetchAllExams();
        const retakeExams = departmentExams.filter(e => {
          if (e.batchId === userBatchId) return false;
          if (e.date < todayStr) return false;
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

        candidateExams = [...candidateExams, ...retakeExams];
      } catch (e) {
        console.warn('[Dashboard retake exams fetch error]:', e);
      }
    }

    candidateExams.sort((a, b) => a.date.localeCompare(b.date));

    const upcomingExams = candidateExams.map(e => {
      const examDate = new Date(e.date);
      const now = new Date(todayStr);
      const diffTime = examDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...e, daysLeft };
    });

    // 4. Active Announcements
    const activeAnnouncements = allAnnouncements.filter(
      a => a.batchId === userBatchId && a.expiryDate >= todayStr
    );

    // 5. Department Notices
    const recentNotices = allNotices.slice(0, 5);

    res.json({
      todaysClassesCount: todaysRoutine.length,
      currentCoursesCount: currentCourses.length,
      upcomingExamsCount: upcomingExams.length,
      newAnnouncementsCount: activeAnnouncements.length,
      retakeCoursesCount,
      todaysRoutine,
      upcomingExams,
      currentCourses,
      recentAnnouncements: activeAnnouncements,
      recentNotices,
      batchName,
      currentSemester: activeSemester,
    });
  } catch (err: any) {
    console.error('[Dashboard Summary Error]:', err);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

export default router;
