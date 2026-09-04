import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, optionalAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { Course } from '../../types';
import {
  fetchAllCourses,
  fetchCourseById,
  fetchBatchById,
  createCourseInDB,
  updateCourseInDB,
  deleteCourseFromDB,
  fetchAllFaculty,
  fetchAllResources,
} from '../supabaseData';

const router = Router();

// GET /api/courses (List courses for student batch/semester or all if Admin/Public)
router.get('/', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allCourses = await fetchAllCourses();
    const batchId = (req.query.batchId as string) || req.user?.batchId;
    const semesterQuery = req.query.semester ? Number(req.query.semester) : undefined;

    let courses = Array.isArray(allCourses) ? allCourses : [];
    
    if (batchId) {
      const targetBatch = await fetchBatchById(batchId);
      const activeSem = semesterQuery || targetBatch?.currentSemester || req.user?.currentSemester;
      courses = courses.filter(c => 
        activeSem !== undefined ? c.semester === activeSem : (c.batchIds && c.batchIds.includes(batchId))
      );
    } else if (req.user && req.user.role !== 'ADMIN') {
      const userBatch = req.user.batchId ? await fetchBatchById(req.user.batchId) : null;
      const targetSem = semesterQuery || userBatch?.currentSemester || req.user.currentSemester;
      courses = courses.filter(c => 
        targetSem !== undefined ? c.semester === targetSem : (req.user!.batchId && c.batchIds?.includes(req.user!.batchId))
      );
    } else if (semesterQuery) {
      courses = courses.filter(c => c.semester === semesterQuery);
    }

    return res.json({ courses });
  } catch (err: any) {
    console.error({
      route: '/api/courses',
      error: err?.message || err,
      stack: err?.stack,
      supabaseError: err?.supabaseError || err?.details || null,
    });
    const fallbackList = db.getData()?.courses || [];
    return res.status(200).json({ courses: fallbackList });
  }
});

// GET /api/courses/:id (Course Details with related approved resources)
router.get('/:id', optionalAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;

  try {
    const course = await fetchCourseById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Fetch related resources and faculty
    const [allResources, allFaculty] = await Promise.all([
      fetchAllResources().catch(() => []),
      fetchAllFaculty().catch(() => []),
    ]);

    const resources = allResources.filter(
      r => (r.courseId === course.id || r.courseCode === course.code) && r.status === 'APPROVED'
    );

    const faculty = allFaculty.find(f => f.id === course.assignedFacultyId);

    res.json({
      course,
      faculty,
      resources: {
        questions: resources.filter(r => r.type === 'QUESTION'),
        notes: resources.filter(r => r.type === 'NOTE'),
        labs: resources.filter(r => r.type === 'LAB'),
      },
    });
  } catch (err: any) {
    console.error(`[Courses API GET /:id Error]:`, err);
    res.status(500).json({ error: 'Failed to fetch course details' });
  }
});

// POST /api/courses (Admin only)
router.post('/', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const reqBody = req.body;

  try {
    const { code, title, shortName, type, semester, assignedFacultyId, batchIds } = reqBody;
    const credits = reqBody.credits !== undefined ? reqBody.credits : reqBody.credit;

    if (!code || !title || credits === undefined || credits === null || !type || !semester) {
      return res.status(400).json({ error: 'Code, title, credits, type, and semester are required' });
    }

    let facultyName: string | undefined = reqBody.assignedFacultyName ? String(reqBody.assignedFacultyName).trim() : undefined;
    if (assignedFacultyId) {
      const allFaculty = await fetchAllFaculty().catch(() => []);
      const faculty = allFaculty.find(f => f.id === assignedFacultyId || f.name === assignedFacultyId);
      if (faculty) facultyName = faculty.name;
    }

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      code: String(code).trim().toUpperCase(),
      title: String(title).trim(),
      shortName: shortName ? String(shortName).trim() : undefined,
      credits: Number(credits),
      type,
      semester: Number(semester),
      assignedFacultyId: assignedFacultyId ? String(assignedFacultyId) : undefined,
      assignedFacultyName: facultyName,
      batchIds: Array.isArray(batchIds) ? batchIds : [],
    };

    const created = await createCourseInDB(newCourse);
    db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_CREATED', `${created.code} - ${created.title}`);

    console.log(`[Courses API 201] Course created in Supabase: ${created.id} (${created.code})`);
    return res.status(201).json({ course: created });
  } catch (err: any) {
    console.error(`[Courses API 500] POST /api/courses error:`, err);
    return res.status(500).json({ error: err?.message || 'Server error creating course' });
  }
});

// PUT /api/courses/:id (Admin edit course)
router.put('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;
  const reqBody = req.body;

  try {
    const { code, title, shortName, type, semester, assignedFacultyId, batchIds } = reqBody;
    const credits = reqBody.credits !== undefined ? reqBody.credits : reqBody.credit;

    const updates: Partial<Course> = {};
    if (code !== undefined) updates.code = String(code).trim();
    if (title !== undefined) updates.title = String(title).trim();
    if (shortName !== undefined) updates.shortName = shortName ? String(shortName).trim() : undefined;
    if (credits !== undefined) updates.credits = Number(credits);
    if (type !== undefined) updates.type = type;
    if (semester !== undefined) updates.semester = Number(semester);
    
    if (assignedFacultyId !== undefined) {
      updates.assignedFacultyId = assignedFacultyId ? String(assignedFacultyId) : undefined;
      if (assignedFacultyId) {
        const allFaculty = await fetchAllFaculty().catch(() => []);
        const faculty = allFaculty.find(f => f.id === assignedFacultyId);
        updates.assignedFacultyName = faculty ? faculty.name : undefined;
      } else {
        updates.assignedFacultyName = undefined;
      }
    }

    if (Array.isArray(batchIds)) {
      updates.batchIds = batchIds;
    }

    const updated = await updateCourseInDB(courseId, updates);
    db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_UPDATED', `${updated.code} - ${updated.title}`);

    return res.json({ message: 'Course updated successfully', course: updated });
  } catch (err: any) {
    console.error(`[Courses API 500] PUT /api/courses/:id error:`, err);
    return res.status(500).json({ error: err?.message || 'Server error updating course' });
  }
});

// DELETE /api/courses/:id (Admin delete course)
router.delete('/:id', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const courseId = req.params.id;

  try {
    const course = await fetchCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    await deleteCourseFromDB(courseId);
    db.addAuditLog(req.user!.id, req.user!.name, 'COURSE_DELETED', `${course.code}`);

    console.log(`[Courses API 200] Course deleted from Supabase: ${courseId}`);
    return res.json({ message: 'Course deleted successfully', course });
  } catch (err: any) {
    console.error(`[Courses API 500] DELETE /api/courses/:id error:`, err);
    return res.status(500).json({ error: err?.message || 'Server error deleting course' });
  }
});

export default router;
