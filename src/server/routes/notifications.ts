import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/notifications (User's notifications)
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
