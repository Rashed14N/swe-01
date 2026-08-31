import { Router, Response } from 'express';
<<<<<<< HEAD
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
=======
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import {
  fetchNotificationsForUser,
  markNotificationAsReadInDB,
  markAllNotificationsAsReadInDB,
} from '../supabaseData';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

const router = Router();

// GET /api/notifications (User's notifications)
<<<<<<< HEAD
router.get('/', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const notificationsList = db.getData().notifications || [];
  const notifications = notificationsList.filter(n => n.userId === req.user!.id);
  const unreadCount = notifications.filter(n => !n.read).length;

  res.json({ notifications, unreadCount });
});

// POST /api/notifications/:id/read (Mark as read)
router.post('/:id/read', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const notifId = req.params.id;
  const notificationsList = db.getData().notifications || [];
  const notif = notificationsList.find(n => n.id === notifId && n.userId === req.user!.id);

  if (notif) {
    notif.read = true;
    db.save();
  }

  res.json({ message: 'Marked as read' });
});

// POST /api/notifications/read-all
router.post('/read-all', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const notificationsList = db.getData().notifications || [];
  notificationsList.forEach(n => {
    if (n.userId === req.user!.id) {
      n.read = true;
    }
  });
  db.save();

  res.json({ message: 'All notifications marked as read' });
});

export default router;
=======
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const notifications = await fetchNotificationsForUser(userId);
    const unreadCount = notifications.filter(n => !n.read).length;

    return res.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error({
      route: '/api/notifications',
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || err?.details || null,
    });
    return res.status(200).json({ notifications: [], unreadCount: 0 });
  }
});

// POST /api/notifications/:id/read (Mark single as read)
router.post('/:id/read', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifId = req.params.id;
    const userId = req.user?.id;
    await markNotificationAsReadInDB(notifId, userId);
    return res.json({ message: 'Marked as read' });
  } catch (err: any) {
    console.error({
      route: `/api/notifications/${req.params.id}/read`,
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null,
    });
    return res.status(200).json({ message: 'Marked as read' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await markAllNotificationsAsReadInDB(userId);
    }
    return res.json({ message: 'All notifications marked as read' });
  } catch (err: any) {
    console.error({
      route: '/api/notifications/read-all',
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || null,
    });
    return res.status(200).json({ message: 'All notifications marked as read' });
  }
});

export default router;

>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
