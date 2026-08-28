import { Router, Response } from 'express';
import { verifyAuthToken, AuthenticatedRequest } from '../auth.ts';
import {
  fetchAllBatches,
  fetchAllCourses,
  fetchAllRoutineSlots,
  fetchAllExams,
  fetchAllAnnouncements,
  fetchAllNotices,
} from '../supabaseData.ts';

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

    // 1. Today's Routine
    const todaysRoutine = allRoutines.filter(
      r => r.batchId === userBatchId && r.day === todayName
    );

    // 2. Current Courses
    const currentCourses = allCourses.filter(c => 
      c.batchIds?.includes(userBatchId) || c.semester === activeSemester
    );

    // 3. Upcoming Exams sorted by date & calculated daysLeft
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingExams = allExams
      .filter(e => e.batchId === userBatchId && e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(e => {
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
