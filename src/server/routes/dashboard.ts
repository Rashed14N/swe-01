import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { Exam, BatchAnnouncement } from '../../types';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const user = req.user;
  const data = db.getData();

  const userBatchId = user.batchId || 'batch-9';
  const batch = data.batches.find(b => b.id === userBatchId);
  const activeSemester = batch ? batch.currentSemester : (user.currentSemester || 5);
  const batchName = batch ? batch.name : (user.batchName || 'SWE Department');

  // Determine current day of week (SUNDAY, MONDAY, etc.)
  const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
  const todayIndex = new Date().getDay(); // 0 is Sunday
  const todayName = daysOfWeek[todayIndex];

  // 1. Today's Routine
  const todaysRoutine = data.routines.filter(
    r => r.batchId === userBatchId && r.day === todayName
  );

  // 2. Current Courses (match batch ID or active semester)
  const currentCourses = data.courses.filter(c => 
    c.batchIds?.includes(userBatchId) || c.semester === activeSemester
  );

  // 3. Upcoming Exams sorted by date & calculated daysLeft
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingExams = data.exams
    .filter(e => e.batchId === userBatchId && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(e => {
      const examDate = new Date(e.date);
      const now = new Date(todayStr);
      const diffTime = examDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { ...e, daysLeft };
    });

  // 4. Active Announcements (expiryDate >= todayStr)
  const activeAnnouncements = data.announcements.filter(
    a => a.batchId === userBatchId && a.expiryDate >= todayStr
  );

  // Department Notices
  const recentNotices = data.departmentNotices.slice(0, 5);

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
});

export default router;
