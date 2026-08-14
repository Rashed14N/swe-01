import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { BatchAnnouncement } from '../../types';
import { syncToSupabase, deleteFromSupabase } from '../supabaseSync';

const router = Router();

// GET /api/announcements (Batch isolated, auto-expiring logic)
router.get('/', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const requestedBatchId = (req.query.batchId as string) || req.user.batchId || 'batch-9';

  // Batch isolation check
  if (req.user.role !== 'ADMIN' && req.user.batchId !== requestedBatchId) {
    return res.status(403).json({
      error: '403 Forbidden: You do not have permission to access another batch\'s announcements.',
    });
  }

  const showArchive = req.query.archive === 'true';
  const todayStr = new Date().toISOString().split('T')[0];

  const allBatchAnnouncements = db.getData().announcements.filter(a => a.batchId === requestedBatchId);

  let result: BatchAnnouncement[];
  if (showArchive) {
    // Return expired announcements
    result = allBatchAnnouncements.filter(a => a.expiryDate < todayStr);
  } else {
    // Return active announcements (expiryDate >= todayStr)
    result = allBatchAnnouncements.filter(a => a.expiryDate >= todayStr);
  }

  // Sort by publishDate DESC
  result.sort((a, b) => b.publishDate.localeCompare(a.publishDate));

  res.json({
    announcements: result,
    activeCount: allBatchAnnouncements.filter(a => a.expiryDate >= todayStr).length,
    archivedCount: allBatchAnnouncements.filter(a => a.expiryDate < todayStr).length,
  });
});

// POST /api/announcements (CR or ADMIN only)
router.post('/', verifyAuthToken, requireRole('CR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
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

  const newAnn: BatchAnnouncement = {
    id: `ann-${Date.now()}`,
    batchId: targetBatchId,
    title,
    description,
    publishDate: publishDate || todayStr,
    expiryDate,
    priority: priority || 'NORMAL',
    createdBy: req.user.id,
    createdByName: req.user.name,
    createdAt: new Date().toISOString(),
  };

  db.getData().announcements.unshift(newAnn);

  // Notify students of this batch
  const batchStudents = db.getData().users.filter(u => u.batchId === targetBatchId && u.id !== req.user!.id);
  batchStudents.forEach(st => {
    db.getData().notifications.unshift({
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

  syncToSupabase('announcements', {
    id: newAnn.id,
    batch_id: newAnn.batchId,
    title: newAnn.title,
    description: newAnn.description,
    publish_date: newAnn.publishDate,
    expiry_date: newAnn.expiryDate,
    priority: newAnn.priority,
    created_by: newAnn.createdBy,
    created_by_name: newAnn.createdByName,
    created_at: newAnn.createdAt,
  }).catch(() => {});

  res.status(201).json({ announcement: newAnn });
});

// DELETE /api/announcements/:id (CR or ADMIN only)
router.delete('/:id', verifyAuthToken, requireRole('CR', 'ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const annId = req.params.id;
  const data = db.getData();
  const index = data.announcements.findIndex(a => a.id === annId);

  if (index === -1) return res.status(404).json({ error: 'Announcement not found' });

  const existing = data.announcements[index];
  if (req.user!.role === 'CR' && req.user!.batchId !== existing.batchId) {
    return res.status(403).json({ error: '403 Forbidden: CRs can only delete announcements for their assigned batch.' });
  }

  data.announcements.splice(index, 1);
  db.save();
  deleteFromSupabase('announcements', annId).catch(() => {});

  db.addAuditLog(req.user!.id, req.user!.name, 'ANNOUNCEMENT_DELETED', `Announcement #${annId}`);

  res.json({ message: 'Announcement deleted successfully' });
});

export default router;
