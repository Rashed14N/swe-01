import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { Resource } from '../../types';
import {
  fetchAllResources,
  fetchAllCourses,
  createResourceInDB,
  updateResourceInDB,
  deleteResourceFromDB,
  fetchAllUsers,
  updateUserInDB,
} from '../supabaseData';

const router = Router();

// GET /api/resources (APPROVED ONLY for general users, with filtering by type, semester, course, year, search)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, semester, courseCode, examType, year, search, category } = req.query;

    const allResources = await fetchAllResources();
    let list = allResources.filter(r => r.status === 'APPROVED');

    if (type) {
      list = list.filter(r => r.type === (type as string).toUpperCase());
    }

    if (semester) {
      list = list.filter(r => r.semester === Number(semester));
    }

    if (courseCode) {
      const normQuery = (courseCode as string).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      list = list.filter(r => {
        const normCode = (r.courseCode || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return normCode === normQuery || normCode.includes(normQuery) || normQuery.includes(normCode);
      });
    }

    if (examType) {
      list = list.filter(r => r.examType === examType);
    }

    if (year) {
      list = list.filter(r => r.academicYear === Number(year));
    }

    if (category) {
      list = list.filter(r => r.labCategory === category);
    }

    if (search) {
      const query = (search as string).toLowerCase().trim();
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(query) ||
          r.courseTitle.toLowerCase().includes(query) ||
          r.courseCode.toLowerCase().includes(query) ||
          (r.description && r.description.toLowerCase().includes(query)) ||
          r.uploaderName.toLowerCase().includes(query)
      );
    }

    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({ resources: list });
  } catch (err: any) {
    console.error('[Resources API GET / Error]:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET /api/resources/my-contributions or /api/resources/my-uploads
router.get(['/my-contributions', '/my-uploads'], verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const allResources = await fetchAllResources();
    const contributions = allResources.filter(r => r.uploaderId === req.user!.id);
    contributions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    res.json({
      resources: contributions,
      contributions,
      stats: {
        total: contributions.length,
        approved: contributions.filter(c => c.status === 'APPROVED').length,
        pending: contributions.filter(c => c.status === 'PENDING').length,
        rejected: contributions.filter(c => c.status === 'REJECTED').length,
      },
    });
  } catch (err: any) {
    console.error('[Resources API GET /my-contributions Error]:', err);
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// GET /api/resources/pending-verification (For CR and Admin verification queues)
router.get(['/pending-verification', '/pending'], verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const allResources = await fetchAllResources();
    const pending = allResources.filter(r => r.status === 'PENDING');
    res.json({ resources: pending });
  } catch (err: any) {
    console.error('[Resources API GET /pending Error]:', err);
    res.status(500).json({ error: 'Failed to fetch pending resources' });
  }
});

// GET /api/resources/leaderboard (Top Student Contributors)
router.get(['/leaderboard', '/top-contributors'], optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [allUsers, allResources] = await Promise.all([
      fetchAllUsers(),
      fetchAllResources(),
    ]);

    const students = allUsers.filter(u => u.role === 'STUDENT' || u.role === 'CR');

    const leaderboardMap = students.map(st => {
      const userResources = allResources.filter(r => r.uploaderId === st.id);
      const approved = userResources.filter(r => r.status === 'APPROVED');
      
      const totalPts = st.points ?? (approved.length * 25 + (userResources.length - approved.length) * 10);

      let badge: 'LEGEND' | 'GOLD' | 'SILVER' | 'BRONZE' = 'BRONZE';
      if (totalPts >= 150) badge = 'LEGEND';
      else if (totalPts >= 80) badge = 'GOLD';
      else if (totalPts >= 30) badge = 'SILVER';

      return {
        id: st.id,
        studentId: st.studentId,
        name: st.name,
        batchName: st.batchName || 'SWE Department',
        profileImage: st.profileImage,
        points: totalPts,
        approvedCount: approved.length,
        totalUploads: userResources.length,
        badge,
        rank: 0,
      };
    });

    leaderboardMap.sort((a, b) => b.points - a.points || b.approvedCount - a.approvedCount);

    const leaderboard = leaderboardMap.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    res.json({ leaderboard });
  } catch (err: any) {
    console.error('[Resources API GET /leaderboard Error]:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// POST /api/resources or /api/resources/upload (Student Contribution Upload -> Status = PENDING)
router.post(['/', '/upload'], verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const {
    title, type, courseId, courseCode, courseTitle, semester,
    academicYear, examType, facultyName, targetBatch, labCategory, description, fileUrl, fileName, fileSize, fileType
  } = req.body;

  if (!title || !type || (!courseTitle && !courseCode)) {
    return res.status(400).json({ error: 'Title, type, and course details are required' });
  }

  try {
    const isAdmin = req.user.role === 'ADMIN';
    const initialStatus = isAdmin ? 'APPROVED' : 'PENDING';

    // Auto-resolve course if available
    const allCourses = await fetchAllCourses().catch(() => []);
    const normalize = (val?: string) => (val || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const queryCodeNorm = normalize(courseCode);

    const matchingCourse = allCourses.find(c => {
      const cNorm = normalize(c.code);
      return cNorm === queryCodeNorm || (queryCodeNorm && (cNorm.includes(queryCodeNorm) || queryCodeNorm.includes(cNorm)));
    });

    const resolvedCourseId = courseId && courseId !== 'course-gen' ? courseId : (matchingCourse?.id || 'course-gen');
    const resolvedCourseCode = courseCode ? String(courseCode).trim().toUpperCase() : (matchingCourse?.code || 'SWE 300');
    const resolvedCourseTitle = courseTitle ? String(courseTitle).trim() : (matchingCourse?.title || 'Course Material');
    const resolvedSemester = Number(semester || matchingCourse?.semester || req.user.currentSemester || 1);

    const newResource: Resource = {
      id: `res-${Date.now()}`,
      title: String(title).trim(),
      type,
      courseId: resolvedCourseId,
      courseCode: resolvedCourseCode,
      courseTitle: resolvedCourseTitle,
      semester: resolvedSemester,
      academicYear: Number(academicYear || new Date().getFullYear()),
      examType,
      facultyName: facultyName?.trim() || undefined,
      targetBatch: targetBatch || req.user.batchName || 'SWE 9th Batch',
      labCategory,
      description,
      fileUrl: fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: fileName || `${title.replace(/\s+/g, '_')}.pdf`,
      fileSize: fileSize || '1.5 MB',
      fileType: fileType || 'application/pdf',
      uploaderId: req.user.id,
      uploaderStudentId: req.user.studentId,
      uploaderName: req.user.name,
      uploaderBatchName: req.user.batchName || 'SWE Department',
      status: initialStatus,
      verifiedAt: isAdmin ? new Date().toISOString() : undefined,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
    };

    const created = await createResourceInDB(newResource);

    // Award +10 points to student for uploading
    const allUsers = await fetchAllUsers().catch(() => []);
    const uploader = allUsers.find(u => u.id === req.user!.id);
    if (uploader) {
      await updateUserInDB(uploader.id, {
        points: (uploader.points || 0) + 10,
      });
    }

    db.addAuditLog(req.user.id, req.user.name, 'RESOURCE_SUBMITTED', title, '+10 contribution points earned');

    res.status(201).json({
      message: 'Resource submitted successfully for verification! (+10 Contribution Points Earned)',
      resource: created,
      earnedPoints: 10,
    });
  } catch (err: any) {
    console.error('[Resources API POST / Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error uploading resource' });
  }
});

// Review/Verify Resource (handles PATCH /:id/verify, POST /:id/verify, POST /:id/review)
router.all(['/:id/verify', '/:id/review'], verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const resourceId = req.params.id;
  const statusInput = req.body.status || (req.body.action === 'APPROVE' ? 'APPROVED' : req.body.action === 'REJECT' ? 'REJECTED' : null);

  if (!statusInput || !['APPROVED', 'REJECTED', 'APPROVE', 'REJECT'].includes(statusInput)) {
    return res.status(400).json({ error: 'Valid status (APPROVED or REJECTED) is required' });
  }

  const targetStatus = statusInput === 'APPROVE' ? 'APPROVED' : statusInput === 'REJECT' ? 'REJECTED' : statusInput;

  try {
    const allResources = await fetchAllResources();
    const resource = allResources.find(r => r.id === resourceId);
    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    const updates: Partial<Resource> = {
      status: targetStatus,
    };

    const local = db.getData();
    if (!local.notifications) local.notifications = [];

    if (targetStatus === 'APPROVED') {
      updates.verifiedAt = new Date().toISOString();

      // Award +25 bonus points to uploader upon verification
      const allUsers = await fetchAllUsers().catch(() => []);
      const uploader = allUsers.find(u => u.id === resource.uploaderId);
      if (uploader) {
        await updateUserInDB(uploader.id, {
          points: (uploader.points || 0) + 25,
        });
      }

      local.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: resource.uploaderId,
        title: 'Resource Approved 🎉 (+25 Points!)',
        message: `Your contribution "${resource.title}" was verified and published. You earned +25 contributor bonus points!`,
        type: 'RESOURCE_APPROVED',
        linkUrl: '/profile',
        read: false,
        createdAt: new Date().toISOString(),
      });
    } else {
      updates.rejectionReason = req.body.rejectionReason || 'Does not meet academic department guidelines.';

      local.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: resource.uploaderId,
        title: 'Resource Needs Revision ⚠️',
        message: `Your contribution "${resource.title}" was rejected: ${updates.rejectionReason}`,
        type: 'RESOURCE_REJECTED',
        linkUrl: '/profile',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = await updateResourceInDB(resourceId, updates);
    db.save();
    db.addAuditLog(req.user!.id, req.user!.name, `RESOURCE_${targetStatus}`, resource.title);

    res.json({ message: `Resource ${targetStatus.toLowerCase()} successfully`, resource: updated });
  } catch (err: any) {
    console.error('[Resources API review Error]:', err);
    res.status(500).json({ error: err?.message || 'Server error updating resource verification' });
  }
});

// POST /api/resources/:id/download (Tracks download stats)
router.post('/:id/download', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const resourceId = req.params.id;

  try {
    const allResources = await fetchAllResources();
    const resource = allResources.find(r => r.id === resourceId);

    if (!resource) return res.status(404).json({ error: 'Resource not found' });

    const newCount = (resource.downloadCount || 0) + 1;
    await updateResourceInDB(resourceId, { downloadCount: newCount });

    res.json({ message: 'Download count incremented', downloadCount: newCount, fileUrl: resource.fileUrl });
  } catch (err: any) {
    console.error('[Resources API download Error]:', err);
    res.status(500).json({ error: 'Failed to record download' });
  }
});

// DELETE /api/resources/:id (Admin only or Resource Uploader)
router.delete('/:id', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const resourceId = req.params.id;
  try {
    const allResources = await fetchAllResources();
    const resource = allResources.find(r => r.id === resourceId);

    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = resource && resource.uploaderId === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Only administrators or the uploader can delete this question' });
    }

    // Delete permanently from Supabase & local DB
    await deleteResourceFromDB(resourceId);

    db.addAuditLog(
      req.user.id,
      req.user.name,
      'RESOURCE_DELETED',
      resource?.title || resourceId,
      `Permanently deleted from Supabase & vault by ${req.user.role}`
    );

    return res.json({
      success: true,
      message: 'Question resource deleted permanently from Supabase database.',
      id: resourceId,
    });
  } catch (err: any) {
    console.error('[Resources API delete Error]:', err);
    return res.status(500).json({ error: err?.message || 'Failed to delete resource' });
  }
});

export default router;
