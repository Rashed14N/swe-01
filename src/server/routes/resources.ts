import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { Resource } from '../../types';

const router = Router();

// GET /api/resources (APPROVED ONLY for general users, with filtering by type, semester, course, year, search)
router.get('/', optionalAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const { type, semester, courseCode, examType, year, search, category } = req.query;

  let list = db.getData().resources.filter(r => r.status === 'APPROVED');

  if (type) {
    list = list.filter(r => r.type === (type as string).toUpperCase());
  }

  if (semester) {
    list = list.filter(r => r.semester === Number(semester));
  }

  if (courseCode) {
    list = list.filter(
      r => r.courseCode.replace(/\s+/g, '').toLowerCase() === (courseCode as string).replace(/\s+/g, '').toLowerCase()
    );
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

  // Sort by createdAt DESC
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  res.json({ resources: list });
});

// GET /api/resources/my-contributions or /api/resources/my-uploads
router.get(['/my-contributions', '/my-uploads'], verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const contributions = db.getData().resources.filter(r => r.uploaderId === req.user!.id);
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
});

// GET /api/resources/pending-verification (For CR and Admin verification queues)
router.get(['/pending-verification', '/pending'], verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const pending = db.getData().resources.filter(r => r.status === 'PENDING');
  res.json({ resources: pending });
});

// GET /api/resources/leaderboard (Top Student Contributors)
router.get(['/leaderboard', '/top-contributors'], optionalAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const students = data.users.filter(u => u.role === 'STUDENT' || u.role === 'CR');

  const leaderboardMap = students.map(st => {
    const userResources = data.resources.filter(r => r.uploaderId === st.id);
    const approved = userResources.filter(r => r.status === 'APPROVED');
    
    // Total calculated points: (User points stored) or (approved * 25 + pending * 10)
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

  // Sort descending by points, then approved count
  leaderboardMap.sort((a, b) => b.points - a.points || b.approvedCount - a.approvedCount);

  // Assign ranks
  const leaderboard = leaderboardMap.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));

  res.json({ leaderboard });
});

// POST /api/resources or /api/resources/upload (Student Contribution Upload -> Status = PENDING)
router.post(['/', '/upload'], verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const {
    title, type, courseId, courseCode, courseTitle, semester,
    academicYear, examType, facultyName, targetBatch, labCategory, description, fileUrl, fileName, fileSize, fileType
  } = req.body;

  if (!title || !type || !courseTitle || !semester) {
    return res.status(400).json({ error: 'Title, type, course, and semester are required' });
  }

  const data = db.getData();

  const newResource: Resource = {
    id: `res-${Date.now()}`,
    title,
    type,
    courseId: courseId || 'course-gen',
    courseCode: courseCode || 'SWE 300',
    courseTitle,
    semester: Number(semester),
    academicYear: Number(academicYear || new Date().getFullYear()),
    examType,
    facultyName: facultyName || undefined,
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
    status: 'PENDING', // MUST BE PENDING
    downloadCount: 0,
    createdAt: new Date().toISOString(),
  };

  data.resources.unshift(newResource);

  // Award +10 points to student for uploading
  const uploader = data.users.find(u => u.id === req.user!.id);
  if (uploader) {
    uploader.points = (uploader.points || 0) + 10;
  }

  db.save();

  db.addAuditLog(req.user.id, req.user.name, 'RESOURCE_SUBMITTED', title, '+10 contribution points earned');

  res.status(201).json({
    message: 'Resource submitted successfully for verification! (+10 Contribution Points Earned)',
    resource: newResource,
    earnedPoints: 10,
  });
});

// Review/Verify Resource (handles PATCH /:id/verify, POST /:id/verify, POST /:id/review)
router.all(['/:id/verify', '/:id/review'], verifyAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const resourceId = req.params.id;
  const statusInput = req.body.status || (req.body.action === 'APPROVE' ? 'APPROVED' : req.body.action === 'REJECT' ? 'REJECTED' : null);

  if (!statusInput || !['APPROVED', 'REJECTED', 'APPROVE', 'REJECT'].includes(statusInput)) {
    return res.status(400).json({ error: 'Valid status (APPROVED or REJECTED) is required' });
  }

  const targetStatus = statusInput === 'APPROVE' ? 'APPROVED' : statusInput === 'REJECT' ? 'REJECTED' : statusInput;

  const data = db.getData();
  const resource = data.resources.find(r => r.id === resourceId);
  if (!resource) return res.status(404).json({ error: 'Resource not found' });

  if (targetStatus === 'APPROVED') {
    resource.status = 'APPROVED';
    resource.verifiedAt = new Date().toISOString();

    // Award +25 bonus points to uploader upon verification
    const uploader = data.users.find(u => u.id === resource.uploaderId);
    if (uploader) {
      uploader.points = (uploader.points || 0) + 25;
    }

    data.notifications.unshift({
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
    resource.status = 'REJECTED';
    resource.rejectionReason = req.body.rejectionReason || 'Does not meet academic department guidelines.';

    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: resource.uploaderId,
      title: 'Resource Needs Revision ⚠️',
      message: `Your contribution "${resource.title}" was rejected: ${resource.rejectionReason}`,
      type: 'RESOURCE_REJECTED',
      linkUrl: '/profile',
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  db.save();
  db.addAuditLog(req.user!.id, req.user!.name, `RESOURCE_${targetStatus}`, resource.title);

  res.json({ message: `Resource ${targetStatus.toLowerCase()} successfully`, resource });
});

// POST /api/resources/:id/download (Tracks download stats)
router.post('/:id/download', optionalAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const resourceId = req.params.id;
  const data = db.getData();
  const resource = data.resources.find(r => r.id === resourceId);

  if (!resource) return res.status(404).json({ error: 'Resource not found' });

  resource.downloadCount += 1;
  db.save();

  res.json({ message: 'Download count incremented', downloadCount: resource.downloadCount, fileUrl: resource.fileUrl });
});

export default router;
