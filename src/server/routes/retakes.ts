import { Router, Response } from 'express';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { db } from '../db';
import {
  fetchAllCourses,
  fetchAllBatches,
  fetchAllRoutineSlots,
  fetchAllExams,
  fetchAllAnnouncements,
} from '../supabaseData';
import type {
  RetakeRegistration,
  RetakeRoutineSlot,
  RetakeExamItem,
  RetakeAnnouncementItem,
  RetakeSummaryOverview,
} from '../../types';

const router = Router();

// Helper to convert time string e.g. "10:00 AM" or "01:30 PM" into minutes from midnight
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// Helper to check if two time windows overlap
function checkTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);

  if (s1 >= e1 || s2 >= e2) return false;
  return Math.max(s1, s2) < Math.min(e1, e2);
}

// GET /api/retakes
// Returns current student's retake registrations with live routine slots, upcoming exams, and announcements
router.get('/', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const studentId = req.user.id;
    const userBatchId = req.user.batchId || '';

    // Fetch all needed entities in parallel
    const [allCourses, allBatches, allRoutines, allExams, allAnnouncements] = await Promise.all([
      fetchAllCourses().catch(() => db.getCourses()),
      fetchAllBatches().catch(() => db.getBatches()),
      fetchAllRoutineSlots().catch(() => db.getRoutines()),
      fetchAllExams().catch(() => db.getExams()),
      fetchAllAnnouncements().catch(() => db.getAnnouncements()),
    ]);

    // Get current student's registrations
    const allRetakes = db.getRetakes();
    const userRegistrations = allRetakes.filter(r => r.studentId === studentId);

    // Regular batch routine for conflict checking
    const regularBatchRoutines = userBatchId
      ? allRoutines.filter(r => r.batchId === userBatchId)
      : [];

    const routineSlots: RetakeRoutineSlot[] = [];
    const upcomingExams: RetakeExamItem[] = [];
    const matchedAnnouncements: RetakeAnnouncementItem[] = [];

    const now = new Date();
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const currentDayName = daysOfWeek[now.getDay()];

    // Loop through each registered retake course to find associated routine, exams, and notices
    for (const reg of userRegistrations) {
      if (reg.status === 'DROPPED') continue;

      // 1. Matched Routine Slots (across any batch taking this course)
      const courseRoutines = allRoutines.filter(r => {
        const courseMatches =
          (reg.courseId && r.courseId === reg.courseId) ||
          (r.courseCode && r.courseCode.trim().toLowerCase() === reg.courseCode.trim().toLowerCase());
        return courseMatches;
      });

      for (const slot of courseRoutines) {
        const slotBatch = allBatches.find(b => b.id === slot.batchId);
        const batchName = slotBatch?.name || reg.retakeBatchName || 'Active Batch';

        // Check conflict with regular batch classes
        let hasConflict = false;
        for (const regularSlot of regularBatchRoutines) {
          if (regularSlot.day?.toUpperCase() === slot.day?.toUpperCase()) {
            if (checkTimeOverlap(slot.startTime, slot.endTime, regularSlot.startTime, regularSlot.endTime)) {
              hasConflict = true;
              break;
            }
          }
        }

        routineSlots.push({
          ...slot,
          retakeCourseCode: reg.courseCode,
          retakeCourseTitle: reg.courseTitle,
          batchName,
          isToday: slot.day?.toUpperCase() === currentDayName,
          hasConflictWithRegularRoutine: hasConflict,
        });
      }

      // 2. Matched Exams (CR added exams for this course code from any batch)
      const courseExams = allExams.filter(e => {
        const courseMatches =
          (reg.courseId && e.courseId === reg.courseId) ||
          (e.courseCode && e.courseCode.trim().toLowerCase() === reg.courseCode.trim().toLowerCase());
        return courseMatches;
      });

      for (const exam of courseExams) {
        const examBatch = allBatches.find(b => b.id === exam.batchId);
        const batchName = examBatch?.name || reg.retakeBatchName || 'Target Batch';

        const examDate = new Date(exam.date);
        const todayStr = now.toISOString().split('T')[0];
        const diffMs = examDate.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isArchived = Boolean(exam.date && exam.date < todayStr);

        upcomingExams.push({
          ...exam,
          retakeCourseCode: reg.courseCode,
          retakeCourseTitle: reg.courseTitle,
          batchName,
          daysLeft: isNaN(daysLeft) ? 0 : daysLeft,
          isArchived,
        });
      }

      // 3. Matched Announcements
      const courseAnnouncements = allAnnouncements.filter(a => {
        const textMatches =
          (a.title && a.title.toLowerCase().includes(reg.courseCode.toLowerCase())) ||
          (a.description && a.description.toLowerCase().includes(reg.courseCode.toLowerCase()));
        const batchMatches = reg.retakeBatchId && a.batchId === reg.retakeBatchId;
        return textMatches || batchMatches;
      });

      for (const ann of courseAnnouncements) {
        if (!matchedAnnouncements.some(existing => existing.id === ann.id)) {
          const annBatch = allBatches.find(b => b.id === ann.batchId);
          matchedAnnouncements.push({
            ...ann,
            retakeCourseCode: reg.courseCode,
            batchName: annBatch?.name || reg.retakeBatchName || 'Batch Notice',
          });
        }
      }
    }

    // Sort routine by standard day order
    const dayOrder: Record<string, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };
    routineSlots.sort((a, b) => {
      const dA = dayOrder[a.day?.toUpperCase()] ?? 99;
      const dB = dayOrder[b.day?.toUpperCase()] ?? 99;
      if (dA !== dB) return dA - dB;
      return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    });

    // Sort exams by date ascending
    upcomingExams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate Summary Stats
    const activeRegs = userRegistrations.filter(r => r.status !== 'DROPPED');
    const retakeCount = activeRegs.filter(r => r.type === 'RETAKE').length;
    const improvementCount = activeRegs.filter(r => r.type === 'IMPROVEMENT').length;
    const totalCredits = activeRegs.reduce((acc, curr) => acc + (curr.courseCredits || 3), 0);
    const conflictsCount = routineSlots.filter(s => s.hasConflictWithRegularRoutine).length;

    const overview: RetakeSummaryOverview = {
      registrations: userRegistrations,
      routineSlots,
      upcomingExams,
      announcements: matchedAnnouncements,
      stats: {
        totalRegistered: activeRegs.length,
        retakeCount,
        improvementCount,
        totalCredits,
        upcomingExamsCount: upcomingExams.filter(e => e.daysLeft >= 0).length,
        classesPerWeek: routineSlots.length,
        conflictsCount,
      },
    };

    return res.json({
      success: true,
      data: overview,
      availableCourses: allCourses,
      availableBatches: allBatches.filter(b => b.status === 'ACTIVE' || !b.status),
    });
  } catch (err: any) {
    console.error('[Retake API GET Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to load retake courses and updates',
    });
  }
});

// POST /api/retakes
// General student registers a Retake or Improvement course
router.post('/', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const {
      courseId,
      type,
      retakeBatchId,
      previousGrade,
      targetGrade,
      notes,
    } = req.body;

    if (!courseId) {
      return res.status(400).json({ success: false, error: 'Course selection is required' });
    }

    if (!type || !['RETAKE', 'IMPROVEMENT'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Type must be RETAKE or IMPROVEMENT' });
    }

    // Look up course details
    const [allCourses, allBatches] = await Promise.all([
      fetchAllCourses().catch(() => db.getCourses()),
      fetchAllBatches().catch(() => db.getBatches()),
    ]);

    const course = allCourses.find(c => c.id === courseId || c.code === courseId);
    if (!course) {
      return res.status(404).json({ success: false, error: 'Selected course not found in catalog' });
    }

    // Check if student already registered this course
    const existing = db.getRetakes().find(
      r => r.studentId === req.user!.id &&
           r.courseId === course.id &&
           r.status !== 'DROPPED'
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        error: `You have already registered ${course.code} as a ${existing.type.toLowerCase()} course.`,
      });
    }

    let resolvedBatchId = retakeBatchId;
    let resolvedBatchName = '';

    if (resolvedBatchId) {
      const b = allBatches.find(batch => batch.id === resolvedBatchId);
      resolvedBatchName = b?.name || '';
    } else {
      // Auto-detect which batch currently has this course in its curriculum
      const matchedBatch = allBatches.find(b => b.currentSemester === course.semester);
      if (matchedBatch) {
        resolvedBatchId = matchedBatch.id;
        resolvedBatchName = matchedBatch.name;
      }
    }

    const studentEmail = req.user.email || 'rashedulhasanrashed0@gmail.com';

    const newRegistration: RetakeRegistration = {
      id: `retake-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: req.user.id,
      studentName: req.user.name,
      studentRoll: req.user.studentId,
      studentEmail,
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      courseCredits: Number(course.credits) || 3,
      courseSemester: course.semester,
      type: type as 'RETAKE' | 'IMPROVEMENT',
      retakeBatchId: resolvedBatchId,
      retakeBatchName: resolvedBatchName || 'Junior Batch',
      previousGrade: previousGrade?.trim() || undefined,
      targetGrade: targetGrade?.trim() || undefined,
      status: 'ENROLLED',
      notes: notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveRetake(newRegistration);

    // Audit log
    db.addAuditLog(
      req.user.id,
      req.user.name,
      'ADD_RETAKE_COURSE',
      course.code,
      `Student registered ${course.code} for ${type}`
    );

    return res.status(201).json({
      success: true,
      message: `Successfully registered ${course.code} for ${type.toLowerCase()}!`,
      registration: newRegistration,
    });
  } catch (err: any) {
    console.error('[Retake API POST Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to register retake course',
    });
  }
});

// PUT /api/retakes/:id
// Update notes, target grade, previous grade, retakeBatchId, or status
router.put('/:id', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const { previousGrade, targetGrade, status, notes, retakeBatchId } = req.body;

    const existing = db.getRetakes().find(r => r.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Registration not found' });
    }

    // Only owner or admin can update
    if (existing.studentId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    let updatedBatchName = existing.retakeBatchName;
    if (retakeBatchId && retakeBatchId !== existing.retakeBatchId) {
      const allBatches = await fetchAllBatches().catch(() => db.getBatches());
      const batch = allBatches.find(b => b.id === retakeBatchId);
      updatedBatchName = batch?.name || existing.retakeBatchName;
    }

    const updated: RetakeRegistration = {
      ...existing,
      previousGrade: previousGrade !== undefined ? previousGrade : existing.previousGrade,
      targetGrade: targetGrade !== undefined ? targetGrade : existing.targetGrade,
      status: status !== undefined ? status : existing.status,
      notes: notes !== undefined ? notes : existing.notes,
      retakeBatchId: retakeBatchId !== undefined ? retakeBatchId : existing.retakeBatchId,
      retakeBatchName: updatedBatchName,
      updatedAt: new Date().toISOString(),
    };

    db.saveRetake(updated);

    return res.json({
      success: true,
      message: 'Retake registration updated successfully',
      registration: updated,
    });
  } catch (err: any) {
    console.error('[Retake API PUT Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to update retake registration',
    });
  }
});

// DELETE /api/retakes/:id
// Drop or delete retake registration
router.delete('/:id', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { id } = req.params;
    const existing = db.getRetakes().find(r => r.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Registration not found' });
    }

    if (existing.studentId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    db.deleteRetake(id);

    return res.json({
      success: true,
      message: `Successfully removed ${existing.courseCode} from your retake list`,
    });
  } catch (err: any) {
    console.error('[Retake API DELETE Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove retake registration',
    });
  }
});

export default router;
