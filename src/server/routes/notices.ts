import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { DepartmentNotice } from '../../types';
import { syncToSupabase, deleteFromSupabase } from '../supabaseSync';

const router = Router();

// GET /api/notices (Public / All students)
router.get('/', optionalAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const notices = db.getData().departmentNotices;
  // Sort by publishDate DESC
  notices.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
  res.json({ notices });
});

// POST /api/notices (CENTRAL ADMIN ONLY)
router.post('/', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { title, content, category, isImportant, attachmentUrl } = req.body;

  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Title, content, and category are required' });
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const newNotice: DepartmentNotice = {
    id: `notice-${Date.now()}`,
    title,
    content,
    category,
    publishDate: todayStr,
    isImportant: Boolean(isImportant),
    attachmentUrl,
    createdBy: req.user!.id,
    createdByName: req.user!.name,
    createdAt: new Date().toISOString(),
  };

  db.getData().departmentNotices.unshift(newNotice);

  // Notify ALL students and CRs in department
  const allUsers = db.getData().users.filter(u => u.role !== 'ADMIN');
  allUsers.forEach(u => {
    db.getData().notifications.unshift({
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

  syncToSupabase('department_notices', {
    id: newNotice.id,
    title: newNotice.title,
    content: newNotice.content,
    category: newNotice.category,
    publish_date: newNotice.publishDate,
    is_important: newNotice.isImportant,
    attachment_url: newNotice.attachmentUrl,
    created_by: newNotice.createdBy,
    created_by_name: newNotice.createdByName,
    created_at: newNotice.createdAt,
  }).catch(() => {});

  res.status(201).json({ notice: newNotice });
});

// DELETE /api/notices/:id (CENTRAL ADMIN ONLY)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const noticeId = req.params.id;
  const data = db.getData();
  const idx = data.departmentNotices.findIndex(n => n.id === noticeId);

  if (idx === -1) return res.status(404).json({ error: 'Department notice not found' });

  data.departmentNotices.splice(idx, 1);
  db.save();
  deleteFromSupabase('department_notices', noticeId).catch(() => {});

  db.addAuditLog(req.user!.id, req.user!.name, 'DEPARTMENT_NOTICE_DELETED', `Notice #${noticeId}`);

  res.json({ message: 'Notice deleted' });
});

export default router;
