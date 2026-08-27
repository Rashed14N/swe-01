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
router.post('/', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const reqUrl = req.originalUrl || req.url;
  const reqMethod = req.method;
  const reqBody = req.body;

  console.log(`[Courses API] Incoming Request: ${reqMethod} ${reqUrl}`, {
    user: req.user?.name,
    role: req.user?.role,
    body: reqBody,
  });

  try {
    const { code, title, shortName, credits, type, semester, assignedFacultyId, batchIds } = reqBody;

    if (!code || !title || !credits || !type || !semester) {
      console.warn(`[Courses API 400] Validation failed: Code, title, credits, type, and semester are required`, reqBody);
      return res.status(400).json({ error: 'Code, title, credits, type, and semester are required' });
    }

    const data = db.getData();
    const faculty = assignedFacultyId ? data.faculty.find(f => f.id === assignedFacultyId) : null;

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      code: String(code).trim(),
      title: String(title).trim(),
      shortName: shortName ? String(shortName).trim() : undefined,
      credits: Number(credits),
      type,
      semester: Number(semester),
      assignedFacultyId: assignedFacultyId ? String(assignedFacultyId) : undefined,
      assignedFacultyName: faculty ? faculty.name : undefined,
      batchIds: Array.isArray(batchIds) ? batchIds : [],
    };

    data.courses.push(newCourse);
    db.save();

    const supabasePayload = {
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
    };

    console.log(`[Courses API] Attempting Supabase sync for course: ${newCourse.code}`, supabasePayload);

    syncToSupabase('courses', supabasePayload).catch(err => {
      console.error(`[Supabase Course Sync Error]:`, {
        url: reqUrl,
        method: reqMethod,
        route: 'POST /api/courses',
        supabaseData: supabasePayload,
        error: err?.message || err,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
    });

    db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_CREATED', `${newCourse.code} - ${newCourse.title}`);

    console.log(`[Courses API 201] Course created successfully: ${newCourse.id} (${newCourse.code})`);
    return res.status(201).json({ course: newCourse });
  } catch (err: any) {
    console.error(`[Courses API 500] Unexpected error in POST /api/courses:`, {
      url: reqUrl,
      method: reqMethod,
      body: reqBody,
      errorName: err?.name,
      errorMessage: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ error: err?.message || 'Server error creating course' });
  }
});

// PUT /api/courses/:id (Admin edit course)
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const reqUrl = req.originalUrl || req.url;
  const reqMethod = req.method;
  const reqBody = req.body;
  const courseId = req.params.id;

  console.log(`[Courses API] Incoming Request: ${reqMethod} ${reqUrl}`, {
    courseId,
    user: req.user?.name,
    body: reqBody,
  });

  try {
    const { code, title, shortName, credits, type, semester, assignedFacultyId, batchIds } = reqBody;

    const data = db.getData();
    const course = data.courses.find(c => c.id === courseId);

    if (!course) {
      console.warn(`[Courses API 404] Course not found: ${courseId}`);
      return res.status(404).json({ error: 'Course not found' });
    }

    if (code !== undefined) course.code = String(code).trim();
    if (title !== undefined) course.title = String(title).trim();
    if (shortName !== undefined) course.shortName = shortName ? String(shortName).trim() : undefined;
    if (credits !== undefined) course.credits = Number(credits);
    if (type !== undefined) course.type = type;
    if (semester !== undefined) course.semester = Number(semester);
    
    if (assignedFacultyId !== undefined) {
      course.assignedFacultyId = assignedFacultyId ? String(assignedFacultyId) : undefined;
      const faculty = assignedFacultyId ? data.faculty.find(f => f.id === assignedFacultyId) : null;
      course.assignedFacultyName = faculty ? faculty.name : undefined;
    }

    if (Array.isArray(batchIds)) {
      course.batchIds = batchIds;
    }

    db.save();

    const supabasePayload = {
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
    };

    syncToSupabase('courses', supabasePayload).catch(err => {
      console.error(`[Supabase Course Update Sync Error]:`, {
        url: reqUrl,
        method: reqMethod,
        route: `PUT /api/courses/${courseId}`,
        supabaseData: supabasePayload,
        error: err?.message || err,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
      });
    });

    db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_UPDATED', `${course.code} - ${course.title}`);

    console.log(`[Courses API 200] Course updated successfully: ${course.id} (${course.code})`);
    return res.json({ message: 'Course updated successfully', course });
  } catch (err: any) {
    console.error(`[Courses API 500] Unexpected error in PUT /api/courses/${courseId}:`, {
      url: reqUrl,
      method: reqMethod,
      body: reqBody,
      errorMessage: err?.message,
      stack: err?.stack,
    });
    return res.status(500).json({ error: err?.message || 'Server error updating course' });
  }
});

// DELETE /api/courses/:id (Admin delete course)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const reqUrl = req.originalUrl || req.url;
  const reqMethod = req.method;
  const courseId = req.params.id;

  console.log(`[Courses API] Incoming Request: ${reqMethod} ${reqUrl}`, { courseId, user: req.user?.name });

  try {
    const data = db.getData();
    const index = data.courses.findIndex(c => c.id === courseId);

    if (index === -1) {
      console.warn(`[Courses API 404] Course not found for deletion: ${courseId}`);
      return res.status(404).json({ error: 'Course not found' });
    }

    const [removed] = data.courses.splice(index, 1);
    db.save();

    deleteFromSupabase('courses', courseId).catch(err => {
      console.error(`[Supabase Course Delete Error]:`, {
        url: reqUrl,
        method: reqMethod,
        route: `DELETE /api/courses/${courseId}`,
        error: err?.message || err,
      });
    });

    db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_DELETED', `${removed.code}`);

    console.log(`[Courses API 200] Course deleted successfully: ${removed.id} (${removed.code})`);
    return res.json({ message: 'Course deleted successfully', course: removed });
  } catch (err: any) {
    console.error(`[Courses API 500] Unexpected error in DELETE /api/courses/${courseId}:`, err);
    return res.status(500).json({ error: err?.message || 'Server error deleting course' });
  }
});

export default router;
