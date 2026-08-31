import { Router, Response } from 'express';
<<<<<<< HEAD
import { verifyAuthToken, AuthenticatedRequest } from '../auth.ts';
=======
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
import {
  fetchUserByIdOrStudentId,
  updateUserInDB,
  fetchAllResources,
<<<<<<< HEAD
} from '../supabaseData.ts';
=======
} from '../supabaseData';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

const router = Router();

// GET /api/profile
router.get('/', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await fetchUserByIdOrStudentId(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const allResources = await fetchAllResources();
    const contributions = allResources.filter(r => r.uploaderId === user.id);

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
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/profile (Allowed to edit email, phone, profileImage <= 100KB)
router.put('/', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await fetchUserByIdOrStudentId(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { email, phone, profileImage } = req.body;

    // Enforce 100KB limit for profile image
    if (profileImage && typeof profileImage === 'string') {
      let sizeInBytes = profileImage.length;
      if (profileImage.startsWith('data:image')) {
        const base64Data = profileImage.split(',')[1] || '';
        sizeInBytes = Math.floor((base64Data.length * 3) / 4);
      }

      if (sizeInBytes > 102400) {
        return res.status(400).json({
          error: `Profile image size (${(sizeInBytes / 1024).toFixed(1)} KB) exceeds the 100 KB limit. Please select a smaller photo.`,
        });
      }
    }

    const updates: any = {};
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (profileImage !== undefined) updates.profileImage = profileImage;

    const updated = await updateUserInDB(user.id, updates);

    res.json({ message: 'Profile updated successfully', user: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
