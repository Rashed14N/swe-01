import { Router, Response } from 'express';
import { db } from '../db.ts';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth.ts';
import { requireRole } from '../middleware.ts';
import { DepartmentNotice } from '../../types.ts';
import {
  fetchAllNotices,
  createNoticeInDB,
  deleteNoticeFromDB,
  fetchAllUsers,
} from '../supabaseData.ts';

const router = Router();

// GET /api/notices (Public / All students)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notices = await fetchAllNotices();
    notices.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
    res.json({ notices });
  } catch (err: any) {
    console.error('[Notices API GET / Error]:', err);
    res.status(500).json({ error: 'Failed to fetch notices' });
  }
});

// POST /api/notices (CENTRAL ADMIN ONLY)
router.post('/', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { title, content, category, isImportant, attachmentUrl } = req.body;

  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Title, content, and category are required' });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const newNotice: DepartmentNotice = {
      id: `notice-${Date.now()}`,
      title: String(title).trim(),
      content: String(content).trim(),
      category,
      publishDate: todayStr,
      isImportant: Boolean(isImportant),
      attachmentUrl,
      createdBy: req.user!.id,
      createdByName: req.user!.name,
      createdAt: new Date().toISOString(),
    };

    const created = await createNoticeInDB(newNotice);

    // Notify ALL students and CRs in department
    const allUsers = await fetchAllUsers().catch(() => []);
    const local = db.getData();
    if (!local.notifications) local.notifications = [];
    allUsers.filter(u => u.role !== 'ADMIN').forEach(u => {
      local.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random()}`,
        userId: u.id,
        title: '🏛️ New Department Notice',
        message: title,
        type: 'NOTICE',
        linkUrl: '/notices',
        read: false,
        createdAt: new Date().toISOString(),
      });
    });
    db.save();

    db.addAuditLog(req.user!.id, req.user!.name, 'DEPARTMENT_NOTICE_PUBLISHED', title);

    res.status(201).json({ notice: created });
  } catch (err: any) {
    console.error('[Notices API POST / Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error creating notice' });
  }
});

// DELETE /api/notices/:id (CENTRAL ADMIN ONLY)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const noticeId = req.params.id;

  try {
    const allNotices = await fetchAllNotices();
    const existing = allNotices.find(n => n.id === noticeId);

    if (!existing) return res.status(404).json({ error: 'Department notice not found' });

    await deleteNoticeFromDB(noticeId);
    db.addAuditLog(req.user!.id, req.user!.name, 'DEPARTMENT_NOTICE_DELETED', `Notice #${noticeId}`);

    res.json({ message: 'Notice deleted' });
  } catch (err: any) {
    console.error('[Notices API DELETE /:id Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error deleting notice' });
  }
});

export default router;
