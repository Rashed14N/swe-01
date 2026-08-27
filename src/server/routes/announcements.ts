import { Router, Response } from 'express';
import { db } from '../db.ts';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth.ts';
import { requireRole } from '../middleware.ts';
import { BatchAnnouncement } from '../../types.ts';
import {
  fetchAllAnnouncements,
  createAnnouncementInDB,
  deleteAnnouncementFromDB,
  fetchAllUsers,
} from '../supabaseData.ts';

const router = Router();

// GET /api/announcements (Batch isolated, auto-expiring logic)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requestedBatchId = req.query.batchId as string;

    let targetBatchId: string | undefined = undefined;
    if (requestedBatchId) {
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

  const { batchId, title, description, publishDate, expiryDate, priority } = req.body;
  const targetBatchId = batchId || req.user.batchId;

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

    // Notify students of this batch
    const allUsers = await fetchAllUsers().catch(() => []);
    const batchStudents = allUsers.filter(u => u.batchId === targetBatchId && u.id !== req.user!.id);
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
