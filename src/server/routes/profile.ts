import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';

const router = Router();

// GET /api/profile
router.get('/', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const contributions = db.getData().resources.filter(r => r.uploaderId === user.id);

  res.json({
    user,
    stats: {
      totalContributions: contributions.length,
      approvedCount: contributions.filter(c => c.status === 'APPROVED').length,
      pendingCount: contributions.filter(c => c.status === 'PENDING').length,
      rejectedCount: contributions.filter(c => c.status === 'REJECTED').length,
    },
    recentContributions: contributions.slice(0, 5),
  });
});

// PUT /api/profile (Allowed to edit email, phone, profileImage <= 100KB)
router.put('/', verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { email, phone, profileImage } = req.body;

  // Enforce 100KB limit for profile image
  if (profileImage && typeof profileImage === 'string') {
    let sizeInBytes = profileImage.length;
    if (profileImage.startsWith('data:image')) {
      const base64Data = profileImage.split(',')[1] || '';
      sizeInBytes = Math.floor((base64Data.length * 3) / 4);
    }

    if (sizeInBytes > 102400) { // 100KB = 100 * 1024 = 102,400 bytes
      return res.status(400).json({
        error: `Profile image size (${(sizeInBytes / 1024).toFixed(1)} KB) exceeds the 100 KB limit. Please select a smaller photo.`
      });
    }
    user.profileImage = profileImage;
  }

  user.email = email ?? user.email;
  user.phone = phone ?? user.phone;
  user.updatedAt = new Date().toISOString();

  db.updateUser(user);

  res.json({ message: 'Profile updated successfully', user });
});

export default router;
