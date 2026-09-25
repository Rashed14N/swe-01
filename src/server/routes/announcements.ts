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
} from '../supabaseData';
import { sendRetakeCourseUpdateEmail } from '../emailService';

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

  const { batchId, title, description, publishDate, expiryDate, priority, sendNotification } = req.body;
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

    // Only create notifications if explicitly requested with sendNotification === true
    // By default, announcements are displayed directly in the announcement section without sending notifications / + badge
    if (sendNotification === true) {
      const allUsers = await fetchAllUsers().catch(() => []);
      const batchStudents = allUsers.filter(u =>
        (targetBatchId === 'ALL' || u.batchId === targetBatchId) && u.id !== req.user!.id
      );
      const local = db.getData();
      if (!local.notifications) local.notifications = [];
      batchStudents.forEach(st => {
        local.notifications.unshift({
          id: `notif-${Date.now()}-${Math.random()}`,
          userId: st.id,
          title: `${priority === 'URGENT' ? '🚨 URGENT Announcement' : '📢 Batch Announcement'}`,
          message: title,
          type: 'ANNOUNCEMENT',
          linkUrl: '/announcements',
          read: false,
          createdAt: new Date().toISOString(),
        });
      });
      db.save();
    }

    // Check if announcement relates to any retake course (by course code in title/description or matching batch)
    try {
      const allRetakes = db.getRetakes();
      const allUsers = await fetchAllUsers().catch(() => []);
      const allBatches = await fetchAllBatches().catch(() => db.getBatches());
      const batchObj = allBatches.find(b => b.id === targetBatchId);
      const batchLabel = batchObj?.name || 'Academic Batch';

      const matchedRetakes = allRetakes.filter(r => {
        if (r.status === 'DROPPED') return false;
        const codeInText =
          (r.courseCode && title.toLowerCase().includes(r.courseCode.toLowerCase())) ||
          (r.courseCode && description.toLowerCase().includes(r.courseCode.toLowerCase())) ||
          (r.courseTitle && title.toLowerCase().includes(r.courseTitle.toLowerCase())) ||
          (r.retakeBatchId && r.retakeBatchId === targetBatchId);
        return codeInText;
      });

      if (matchedRetakes.length > 0) {
        const local = db.getData();
        if (!local.notifications) local.notifications = [];

        for (const retake of matchedRetakes) {
          local.notifications.unshift({
            id: `notif-ann-retake-${Date.now()}-${Math.random()}`,
            userId: retake.studentId,
            title: `Course Announcement: ${retake.courseCode} 📢`,
            message: `${title} (${batchLabel})`,
            type: 'ANNOUNCEMENT',
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
              courseCode: retake.courseCode,
              courseTitle: retake.courseTitle,
              updateType: 'ANNOUNCEMENT',
              title,
              description,
              batchName: batchLabel,
              actorName: `${req.user.name} (${req.user.role === 'CR' ? 'Class Representative' : 'Admin'})`,
            }).catch(e => console.warn('[Announcement Retake Email Error]:', e));
          }
        }
        db.save();
      }
    } catch (notifErr) {
      console.warn('[Retake announcement notice error]:', notifErr);
    }

    db.addAuditLog(req.user.id, req.user.name, 'ANNOUNCEMENT_CREATED', `${title} (${targetBatchId})`);

    res.status(201).json({ announcement: created });
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
