import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { BatchAnnouncement } from '../../types';
import {
  fetchAllAnnouncements,
  createAnnouncementInDB,
  deleteAnnouncementFromDB,
  fetchAllUsers,
  fetchAllBatches,
  fetchAllCourses,
  createNotificationInDB,
} from '../supabaseData';
import { sendRetakeCourseUpdateEmail, sendExamAnnouncementEmail, getEnrolledStudentsForCourse } from '../emailService';

const router = Router();

// GET /api/announcements (Batch isolated, auto-expiring logic)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestedBatchId = req.query.batchId as string;

    let targetBatchId: string | undefined = undefined;
    if (requestedBatchId && requestedBatchId !== 'ALL') {
      if (req.user && req.user.role !== 'ADMIN' && req.user.batchId && req.user.batchId !== requestedBatchId) {
        return res.status(403).json({
          error: "403 Forbidden: You do not have permission to access another batch's announcements.",
        });
      }
      targetBatchId = requestedBatchId;
    } else if (req.user && req.user.role !== 'ADMIN') {
      targetBatchId = req.user.batchId || 'batch-9';
    }

    const batchAnnouncements = await fetchAllAnnouncements(targetBatchId);

    const showArchive = req.query.archive === 'true';
    const todayStr = new Date().toISOString().split('T')[0];

    let result: BatchAnnouncement[];
    if (showArchive) {
      result = batchAnnouncements.filter(a => a.expiryDate < todayStr);
    } else {
      result = batchAnnouncements.filter(a => a.expiryDate >= todayStr);
    }

    result.sort((a, b) => b.publishDate.localeCompare(a.publishDate));

    res.json({
      announcements: result,
      activeCount: batchAnnouncements.filter(a => a.expiryDate >= todayStr).length,
      archivedCount: batchAnnouncements.filter(a => a.expiryDate < todayStr).length,
    });
  } catch (err: any) {
    console.error('[Announcements API GET / Error]:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements (CR or ADMIN only)
router.post('/', verifyAuthToken, requireRole('CR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const {
    batchId,
    title,
    description,
    publishDate,
    expiryDate,
    priority,
    sendNotification,
    isExamRelated,
    courseCode: rawCourseCode,
    courseTitle: rawCourseTitle,
    courseId: rawCourseId,
    examType: rawExamType,
    examDate: rawExamDate,
    examTime: rawExamTime,
    room: rawRoom,
  } = req.body;
  const targetBatchId = (req.user.role === 'ADMIN' && (!batchId || batchId === 'ALL'))
    ? 'ALL'
    : (batchId || req.user.batchId);

  if (req.user.role === 'CR' && req.user.batchId !== targetBatchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only publish announcements for their assigned batch.' });
  }

  if (!targetBatchId || !title || !description || !expiryDate) {
    return res.status(400).json({ error: 'Batch ID, title, description, and expiry date are required' });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const newAnn: BatchAnnouncement = {
      id: `ann-${Date.now()}`,
      batchId: targetBatchId,
      title: String(title).trim(),
      description: String(description).trim(),
      publishDate: publishDate || todayStr,
      expiryDate,
      priority: priority || 'NORMAL',
      createdBy: req.user.id,
      createdByName: req.user.name,
      createdAt: new Date().toISOString(),
    };

    const created = await createAnnouncementInDB(newAnn);

    // 1. Check if this announcement is exam-related
    const titleLower = String(title || '').toLowerCase();
    const descLower = String(description || '').toLowerCase();
    const combinedText = `${titleLower} ${descLower}`;

    const isExplicitlyExam = isExamRelated === true || isExamRelated === 'true';
    const hasExamKeywords =
      combinedText.includes('exam') ||
      combinedText.includes('quiz') ||
      combinedText.includes('midterm') ||
      combinedText.includes('final') ||
      combinedText.includes('class test') ||
      combinedText.includes('ct') ||
      combinedText.includes('lab exam') ||
      combinedText.includes('পরীক্ষা');

    const isExamAnnouncement = isExplicitlyExam || hasExamKeywords;
    let emailsDispatched = 0;

    const allBatches = await fetchAllBatches().catch(() => db.getBatches());
    const batchObj = allBatches.find(b => b.id === targetBatchId);
    const batchLabel = batchObj?.name || 'Academic Batch';

    if (isExamAnnouncement) {
      let effectiveCourseTitle = rawCourseTitle ? String(rawCourseTitle).trim() : '';
      let effectiveCourseCode = rawCourseCode ? String(rawCourseCode).trim() : '';
      let effectiveExamType = rawExamType ? String(rawExamType).trim() : '';
      let effectiveExamDate = rawExamDate ? String(rawExamDate).trim() : '';
      const effectiveExamTime = rawExamTime ? String(rawExamTime).trim() : undefined;
      const effectiveRoom = rawRoom ? String(rawRoom).trim() : undefined;

      // Auto-detect course code and title if not explicitly provided
      if (!effectiveCourseTitle || !effectiveCourseCode) {
        const allCourses = await fetchAllCourses().catch(() => db.getCourses());
        for (const c of allCourses) {
          const cCode = c.code.toLowerCase();
          const cShort = (c.shortName || '').toLowerCase();
          const codeDigits = c.code.replace(/\D/g, '');
          if (
            (cCode && combinedText.includes(cCode)) ||
            (cShort && cShort.length >= 2 && combinedText.includes(cShort)) ||
            (codeDigits.length >= 3 && combinedText.includes(codeDigits))
          ) {
            effectiveCourseTitle = effectiveCourseTitle || c.title;
            effectiveCourseCode = effectiveCourseCode || c.code;
            break;
          }
        }
      }

      if (!effectiveCourseTitle) {
        effectiveCourseTitle = effectiveCourseCode || title;
      }

      if (!effectiveExamType) {
        if (combinedText.includes('quiz')) effectiveExamType = 'Quiz';
        else if (combinedText.includes('midterm')) effectiveExamType = 'Midterm';
        else if (combinedText.includes('final')) effectiveExamType = 'Final Exam';
        else if (combinedText.includes('class test') || combinedText.includes('ct')) effectiveExamType = 'Class Test';
        else if (combinedText.includes('lab test') || combinedText.includes('lab exam')) effectiveExamType = 'Lab Exam';
        else effectiveExamType = 'Exam';
      }

      if (!effectiveExamDate) {
        const dateMatch = combinedText.match(/\b202\d-\d{2}-\d{2}\b/);
        if (dateMatch) {
          effectiveExamDate = dateMatch[0];
        } else {
          effectiveExamDate = expiryDate || publishDate || todayStr;
        }
      }

      // Fetch all enrolled students for this course (both Batch students + Retake students)
      const enrolledStudents = await getEnrolledStudentsForCourse({
        courseCode: effectiveCourseCode,
        courseTitle: effectiveCourseTitle,
        courseId: rawCourseId,
        batchId: targetBatchId,
      });

      console.log(`[Exam Announcement] Found ${enrolledStudents.length} enrolled students for ${effectiveCourseTitle}. Dispatching Resend emails...`);

      for (const student of enrolledStudents) {
        // Create in-app notification
        await createNotificationInDB({
          id: `notif-exam-ann-${Date.now()}-${Math.random()}`,
          userId: student.id,
          title: `Exam Announcement: ${effectiveCourseTitle} 📅`,
          message: `${effectiveExamType} on ${effectiveExamDate} (${batchLabel}) - "${title}"`,
          type: 'EXAM',
          linkUrl: '/announcements',
          read: false,
          createdAt: new Date().toISOString(),
        }).catch(e => console.warn('[Exam In-App Notif Error]:', e));

        // Send Resend email with Course Title, Exam Type, Exam Date
        if (student.email) {
          sendExamAnnouncementEmail({
            to: student.email,
            studentName: student.name,
            courseTitle: effectiveCourseTitle,
            courseCode: effectiveCourseCode,
            examType: effectiveExamType,
            examDate: effectiveExamDate,
            examTime: effectiveExamTime,
            room: effectiveRoom,
            title,
            description,
            batchName: student.batchName || batchLabel,
            publisherName: `${req.user.name} (${req.user.role === 'CR' ? 'Class Representative' : 'Admin'})`,
            enrollmentType: student.enrollmentType,
          }).catch(err => console.warn('[Exam Announcement Email Error]:', err));

          emailsDispatched++;
        }
      }
    } else if (sendNotification === true) {
      // General announcement notifications
      const allUsers = await fetchAllUsers().catch(() => []);
      const batchStudents = allUsers.filter(u =>
        (targetBatchId === 'ALL' || u.batchId === targetBatchId) && u.id !== req.user!.id
      );
      for (const st of batchStudents) {
        await createNotificationInDB({
          id: `notif-${Date.now()}-${Math.random()}`,
          userId: st.id,
          title: `${priority === 'URGENT' ? '🚨 URGENT Announcement' : '📢 Batch Announcement'}`,
          message: title,
          type: 'ANNOUNCEMENT',
          linkUrl: '/announcements',
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    db.addAuditLog(req.user.id, req.user.name, 'ANNOUNCEMENT_CREATED', `${title} (${targetBatchId})`);

    res.status(201).json({
      announcement: created,
      isExamAnnouncement,
      emailsDispatched,
      message: isExamAnnouncement
        ? `Exam announcement published! Email notifications dispatched to ${emailsDispatched} enrolled students via Resend.`
        : 'Announcement published successfully!',
    });
  } catch (err: any) {
    console.error('[Announcements API POST / Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error creating announcement' });
  }
});

// DELETE /api/announcements/:id (CR or ADMIN only)
router.delete('/:id', verifyAuthToken, requireRole('CR', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const annId = req.params.id;

  try {
    const allAnnouncements = await fetchAllAnnouncements();
    const existing = allAnnouncements.find(a => a.id === annId);

    if (!existing) return res.status(404).json({ error: 'Announcement not found' });

    if (req.user!.role === 'CR' && req.user!.batchId !== existing.batchId) {
      return res.status(403).json({ error: '403 Forbidden: CRs can only delete announcements for their assigned batch.' });
    }

    await deleteAnnouncementFromDB(annId);
    db.addAuditLog(req.user!.id, req.user!.name, 'ANNOUNCEMENT_DELETED', `Announcement #${annId}`);

    res.json({ message: 'Announcement deleted successfully' });
  } catch (err: any) {
    console.error('[Announcements API DELETE /:id Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error deleting announcement' });
  }
});

export default router;
