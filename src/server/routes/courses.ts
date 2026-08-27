import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Course } from '../../types';
import { syncToSupabase, deleteFromSupabase } from '../supabaseSync';

const router = Router();

// GET /api/courses (List courses for student batch or all if Admin/Public)
router.get('/', optionalAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const batchId = (req.query.batchId as string) || req.user?.batchId;

  let courses = data.courses || [];
  if (batchId && req.user && req.user.role !== 'ADMIN') {
    courses = courses.filter(c => c.batchIds?.includes(batchId) || c.semester === req.user?.currentSemester);
  }

  res.json({ courses });
});

// GET /api/courses/:id (Course Details with related approved resources)
router.get('/:id', optionalAuthToken, (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;
  const data = db.getData();

  const course = data.courses.find(c => c.id === courseId || c.code.replace(/\s+/g, '').toLowerCase() === courseId.replace(/\s+/g, '').toLowerCase());
  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Get related resources for this course (APPROVED ONLY)
  const resources = (data.resources || []).filter(
    r => (r.courseId === course.id || r.courseCode === course.code) && r.status === 'APPROVED'
  );

  const faculty = (data.faculty || []).find(f => f.id === course.assignedFacultyId);

  res.json({
    course,
    faculty,
    resources: {
      questions: resources.filter(r => r.type === 'QUESTION'),
      notes: resources.filter(r => r.type === 'NOTE'),
      labs: resources.filter(r => r.type === 'LAB'),
    },
  });
});

// POST /api/courses (Admin only)
router.post('/', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const { code, title, credits, type, semester, assignedFacultyId, batchIds } = req.body;

  if (!code || !title || !credits || !type || !semester) {
    return res.status(400).json({ error: 'Code, title, credits, type, and semester are required' });
  }

  const data = db.getData();
  const faculty = data.faculty.find(f => f.id === assignedFacultyId);

  const newCourse: Course = {
    id: `course-${Date.now()}`,
    code,
    title,
    credits: Number(credits),
    type,
    semester: Number(semester),
    assignedFacultyId,
    assignedFacultyName: faculty ? faculty.name : undefined,
    batchIds: Array.isArray(batchIds) ? batchIds : [],
  };

  data.courses.push(newCourse);
  db.save();

  syncToSupabase('courses', {
    id: newCourse.id,
    code: newCourse.code,
    title: newCourse.title,
    short_name: newCourse.shortName || null,
    credits: newCourse.credits,
    type: newCourse.type,
    semester: newCourse.semester,
    assigned_faculty_id: newCourse.assignedFacultyId || null,
    assigned_faculty_name: newCourse.assignedFacultyName || null,
    batch_ids: newCourse.batchIds || [],
  }).catch(err => console.error('[Supabase Course Sync Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_CREATED', `${code} - ${title}`);

  res.status(201).json({ course: newCourse });
});

// PUT /api/courses/:id (Admin edit course)
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;
  const { code, title, credits, type, semester, assignedFacultyId, batchIds } = req.body;

  const data = db.getData();
  const course = data.courses.find(c => c.id === courseId);

  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  if (code) course.code = code;
  if (title) course.title = title;
  if (credits !== undefined) course.credits = Number(credits);
  if (type) course.type = type;
  if (semester !== undefined) course.semester = Number(semester);
  
  if (assignedFacultyId !== undefined) {
    course.assignedFacultyId = assignedFacultyId;
    const faculty = data.faculty.find(f => f.id === assignedFacultyId);
    course.assignedFacultyName = faculty ? faculty.name : undefined;
  }

  if (Array.isArray(batchIds)) {
    course.batchIds = batchIds;
  }

  db.save();

  syncToSupabase('courses', {
    id: course.id,
    code: course.code,
    title: course.title,
    short_name: course.shortName || null,
    credits: course.credits,
    type: course.type,
    semester: course.semester,
    assigned_faculty_id: course.assignedFacultyId || null,
    assigned_faculty_name: course.assignedFacultyName || null,
    batch_ids: course.batchIds || [],
  }).catch(err => console.error('[Supabase Course Update Sync Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_UPDATED', `${course.code} - ${course.title}`);

  res.json({ message: 'Course updated successfully', course });
});

// DELETE /api/courses/:id (Admin delete course)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN'), (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;
  const data = db.getData();
  const index = data.courses.findIndex(c => c.id === courseId);

  if (index === -1) {
    return res.status(404).json({ error: 'Course not found' });
  }

  const [removed] = data.courses.splice(index, 1);
  db.save();

  deleteFromSupabase('courses', courseId).catch(err => console.error('[Supabase Course Delete Error]:', err));

  db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_DELETED', `${removed.code}`);

  res.json({ message: 'Course deleted successfully', course: removed });
});

export default router;
