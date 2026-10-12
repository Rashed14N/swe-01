import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { fetchAllCourses } from '../supabaseData';
import type { Course } from '../../types';

const router = Router();

// Metropolitan University (UGC Standard) Grading System
export const MU_GRADING_SCALE = [
  { grade: 'A+', minMarks: 80, gradePoint: 4.00, remarks: 'Outstanding' },
  { grade: 'A',  minMarks: 75, gradePoint: 3.75, remarks: 'Excellent' },
  { grade: 'A-', minMarks: 70, gradePoint: 3.50, remarks: 'Very Good' },
  { grade: 'B+', minMarks: 65, gradePoint: 3.25, remarks: 'Good' },
  { grade: 'B',  minMarks: 60, gradePoint: 3.00, remarks: 'Satisfactory' },
  { grade: 'B-', minMarks: 55, gradePoint: 2.75, remarks: 'Above Average' },
  { grade: 'C+', minMarks: 50, gradePoint: 2.50, remarks: 'Average' },
  { grade: 'C',  minMarks: 45, gradePoint: 2.25, remarks: 'Below Average' },
  { grade: 'D',  minMarks: 40, gradePoint: 2.00, remarks: 'Pass' },
  { grade: 'F',  minMarks: 0,  gradePoint: 0.00, remarks: 'Fail' },
];

export function lookupGradePoint(gradeStr: string): number {
  const normalized = (gradeStr || '').trim().toUpperCase();
  const found = MU_GRADING_SCALE.find(g => g.grade === normalized);
  return found ? found.gradePoint : 0;
}

function calculateMetrics(
  courses: Course[],
  studentGrades: Record<string, { grade: string; gradePoint: number; semester?: number }>,
  currentSemester: number
) {
  // Exclude ACM (ACM has no academic credit, not counted in any result/CGPA calculation)
  const academicCourses = courses.filter(
    c => c.code.toUpperCase() !== 'ACM' && !c.code.toUpperCase().startsWith('ACM-') && !c.code.toUpperCase().includes('ACM') && !c.title.toUpperCase().includes('ACM')
  );

  // Sort courses by semester, then by code
  const sorted = [...academicCourses].sort((a, b) => {
    if (a.semester !== b.semester) return a.semester - b.semester;
    return a.code.localeCompare(b.code);
  });

  let totalQualityPoints = 0;
  let totalGradedCredits = 0;
  let totalCompletedCredits = 0;
  let totalDegreeCredits = 0;
  let gradedCourseCount = 0;

  // Enriched course items
  const enrichedCourses = sorted.map(c => {
    const cred = Number(c.credits) || 3.0;
    totalDegreeCredits += cred;

    const gradeInfo = studentGrades[c.code] || studentGrades[c.id];
    const hasGrade = !!gradeInfo && gradeInfo.grade && gradeInfo.grade !== 'N/A' && gradeInfo.grade !== 'NOT_PUBLISHED';

    if (hasGrade) {
      const gp = typeof gradeInfo.gradePoint === 'number' ? gradeInfo.gradePoint : lookupGradePoint(gradeInfo.grade);
      totalQualityPoints += cred * gp;
      totalGradedCredits += cred;
      gradedCourseCount += 1;
      if (gp > 0) {
        totalCompletedCredits += cred;
      }

      return {
        id: c.id,
        code: c.code,
        shortName: c.shortName || c.code,
        title: c.title,
        credits: cred,
        type: c.type || 'THEORY',
        semester: c.semester,
        grade: gradeInfo.grade,
        gradePoint: gp,
        isPublished: true,
        isCustom: (c as any).isCustom || false,
      };
    }

    return {
      id: c.id,
      code: c.code,
      shortName: c.shortName || c.code,
      title: c.title,
      credits: cred,
      type: c.type || 'THEORY',
      semester: c.semester,
      grade: 'Not Published',
      gradePoint: null,
      isPublished: false,
      isCustom: (c as any).isCustom || false,
    };
  });

  const cgpa = totalGradedCredits > 0 ? Number((totalQualityPoints / totalGradedCredits).toFixed(2)) : 0.00;

  let academicStanding = 'Regular Student';
  if (cgpa >= 3.85) academicStanding = "Dean's High Honours • First Class";
  else if (cgpa >= 3.75) academicStanding = "Dean's Merit List • First Class";
  else if (cgpa >= 3.50) academicStanding = 'First Class Standing';
  else if (cgpa >= 3.00) academicStanding = 'Good Academic Standing';
  else if (cgpa >= 2.50) academicStanding = 'Average Academic Standing';
  else if (cgpa > 0) academicStanding = 'Academic Warning / Probation';
  else academicStanding = 'No Published Grades Yet';

  // Semester by semester breakdown (1 through 8)
  const semesterMap: Record<number, {
    semester: number;
    semesterName: string;
    courses: typeof enrichedCourses;
    totalCredits: number;
    completedCredits: number;
    gradedCredits: number;
    qualityPoints: number;
    sgpa: number | null;
    isPublished: boolean;
  }> = {};

  for (let s = 1; s <= 8; s++) {
    const semName = s === 1 ? '1st Semester' : s === 2 ? '2nd Semester' : s === 3 ? '3rd Semester' : `${s}th Semester`;
    semesterMap[s] = {
      semester: s,
      semesterName: semName,
      courses: [],
      totalCredits: 0,
      completedCredits: 0,
      gradedCredits: 0,
      qualityPoints: 0,
      sgpa: null,
      isPublished: false,
    };
  }

  for (const ec of enrichedCourses) {
    const sem = ec.semester || 1;
    if (!semesterMap[sem]) {
      semesterMap[sem] = {
        semester: sem,
        semesterName: `Semester ${sem}`,
        courses: [],
        totalCredits: 0,
        completedCredits: 0,
        gradedCredits: 0,
        qualityPoints: 0,
        sgpa: null,
        isPublished: false,
      };
    }
    const semObj = semesterMap[sem];
    semObj.courses.push(ec);
    semObj.totalCredits += ec.credits;

    if (ec.isPublished && typeof ec.gradePoint === 'number') {
      semObj.gradedCredits += ec.credits;
      semObj.qualityPoints += ec.credits * ec.gradePoint;
      if (ec.gradePoint > 0) {
        semObj.completedCredits += ec.credits;
      }
    }
  }

  const completedSemestersCount = Object.values(semesterMap).filter(s => s.gradedCredits > 0).length;

  const semesterBreakdown = Object.values(semesterMap)
    .sort((a, b) => a.semester - b.semester)
    .map(sem => {
      const sgpa = sem.gradedCredits > 0 ? Number((sem.qualityPoints / sem.gradedCredits).toFixed(2)) : null;
      return {
        ...sem,
        sgpa,
        isPublished: sem.gradedCredits > 0,
        totalCredits: Number(sem.totalCredits.toFixed(1)),
        completedCredits: Number(sem.completedCredits.toFixed(1)),
      };
    });

  return {
    cgpa,
    totalGradedCredits: Number(totalGradedCredits.toFixed(1)),
    totalCompletedCredits: Number(totalCompletedCredits.toFixed(1)),
    totalDegreeCredits: Number(totalDegreeCredits.toFixed(1)) || 148.0,
    totalCourses: courses.length,
    gradedCourseCount,
    pendingCourseCount: courses.length - gradedCourseCount,
    completedSemestersCount,
    currentBatchSemester: currentSemester,
    academicStanding,
    enrichedCourses,
    semesterBreakdown,
  };
}

async function getFullCoursesForStudent(studentId: string): Promise<Course[]> {
  const rawCourses = await fetchAllCourses();
  const baseCourses = rawCourses.filter(
    c => c.code.toUpperCase() !== 'ACM' && !c.code.toUpperCase().startsWith('ACM-') && !c.code.toUpperCase().includes('ACM') && !c.title.toUpperCase().includes('ACM')
  );
  const excludedCodes = (db.getStudentExcludedCourses(studentId) || []).map(c => c.toUpperCase());
  const customCourses = db.getStudentCustomCourses(studentId) || [];

  const courseMap = new Map<string, Course>();

  // Add base courses that haven't been excluded by the student
  for (const c of baseCourses) {
    if (!excludedCodes.includes(c.code.toUpperCase())) {
      courseMap.set(c.code.toUpperCase(), c);
    }
  }

  // Add or override custom courses
  for (const cc of customCourses) {
    if (!excludedCodes.includes(cc.code.toUpperCase())) {
      courseMap.set(cc.code.toUpperCase(), cc);
    }
  }

  return Array.from(courseMap.values());
}

// GET /api/cgpa
router.get('/', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const studentId = req.user.id;
    const allCourses = await getFullCoursesForStudent(studentId);
    // Student's personal saved grades only
    const savedGrades = db.getStudentGrades(studentId) || {};
    const currentSemester = req.user.currentSemester || 5;

    const metrics = calculateMetrics(allCourses, savedGrades, currentSemester);
    const documents = db.getStudentCGPADocs(studentId);
    const excludedCount = (db.getStudentExcludedCourses(studentId) || []).length;

    return res.json({
      success: true,
      cgpaSummary: {
        cgpa: metrics.cgpa,
        totalCompletedCredits: metrics.totalCompletedCredits,
        totalGradedCredits: metrics.totalGradedCredits,
        totalDegreeCredits: metrics.totalDegreeCredits,
        totalCourses: metrics.totalCourses,
        gradedCourseCount: metrics.gradedCourseCount,
        pendingCourseCount: metrics.pendingCourseCount,
        completedSemestersCount: metrics.completedSemestersCount,
        currentSemester,
        batchName: req.user.batchName || 'SWE Batch',
        academicStanding: metrics.academicStanding,
        sessionName: 'Autumn 2026',
        excludedCount,
      },
      courses: metrics.enrichedCourses,
      semesterBreakdown: metrics.semesterBreakdown,
      documents,
      gradingScale: MU_GRADING_SCALE,
    });
  } catch (err: any) {
    console.error('[CGPA GET Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch CGPA details' });
  }
});

// POST /api/cgpa (Update individual or multiple course grades)
router.post('/', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const { grades } = req.body;
    if (!grades || typeof grades !== 'object') {
      return res.status(400).json({ success: false, error: 'Grades payload is required' });
    }

    const studentId = req.user.id;
    const allCourses = await getFullCoursesForStudent(studentId);
    const formatted: Record<string, { grade: string; gradePoint: number; semester?: number }> = {};

    for (const [courseCode, info] of Object.entries(grades as Record<string, any>)) {
      const grade = typeof info === 'string' ? info : info.grade;
      if (!grade || grade === 'N/A' || grade === 'NOT_PUBLISHED') {
        formatted[courseCode] = { grade: 'N/A', gradePoint: 0 };
      } else {
        const gp = typeof info.gradePoint === 'number' ? info.gradePoint : lookupGradePoint(grade);
        const course = allCourses.find(c => c.code.toUpperCase() === courseCode.toUpperCase());
        formatted[courseCode] = {
          grade: grade.trim().toUpperCase(),
          gradePoint: gp,
          semester: course?.semester,
        };
      }
    }

    const updated = db.saveStudentGrades(studentId, formatted);
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, updated, currentSemester);

    return res.json({
      success: true,
      message: 'Course grades updated successfully',
      cgpaSummary: {
        cgpa: metrics.cgpa,
        totalCompletedCredits: metrics.totalCompletedCredits,
        totalGradedCredits: metrics.totalGradedCredits,
        totalDegreeCredits: metrics.totalDegreeCredits,
        totalCourses: metrics.totalCourses,
        gradedCourseCount: metrics.gradedCourseCount,
        pendingCourseCount: metrics.pendingCourseCount,
        completedSemestersCount: metrics.completedSemestersCount,
        currentSemester,
        academicStanding: metrics.academicStanding,
      },
      courses: metrics.enrichedCourses,
      semesterBreakdown: metrics.semesterBreakdown,
    });
  } catch (err: any) {
    console.error('[CGPA POST Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to update course grades' });
  }
});

// POST /api/cgpa/course (Add or update a personalized course in student curriculum)
router.post('/course', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const studentId = req.user.id;
    const { code, title, shortName, credits, semester, type, grade, gradePoint } = req.body;

    if (!code || !title) {
      return res.status(400).json({ success: false, error: 'Course code and title are required' });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanCredits = Number(credits) || 3.0;
    const cleanSemester = Number(semester) || 1;

    // Un-exclude if it was previously excluded
    db.unexcludeCourseForStudent(studentId, cleanCode);

    const courseObj: Course = {
      id: `custom-${cleanCode.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
      code: cleanCode,
      title: String(title).trim(),
      shortName: shortName ? String(shortName).trim().toUpperCase() : cleanCode,
      credits: cleanCredits,
      semester: cleanSemester,
      type: type === 'LAB' ? 'LAB' : 'THEORY',
      batchIds: [req.user.batchId || 'batch-9'],
      isRetakeCourse: false,
    };
    (courseObj as any).isCustom = true;

    db.saveStudentCustomCourse(studentId, courseObj);

    if (grade && grade !== 'N/A' && grade !== 'NOT_PUBLISHED') {
      const gp = typeof gradePoint === 'number' ? gradePoint : lookupGradePoint(grade);
      db.saveStudentGrades(studentId, {
        [cleanCode]: {
          grade: grade.trim().toUpperCase(),
          gradePoint: gp,
          semester: cleanSemester,
        },
      });
    }

    const allCourses = await getFullCoursesForStudent(studentId);
    const savedGrades = db.getStudentGrades(studentId) || {};
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, savedGrades, currentSemester);

    return res.json({
      success: true,
      message: `Course ${cleanCode} added to your curriculum!`,
      cgpaSummary: {
        cgpa: metrics.cgpa,
        totalCompletedCredits: metrics.totalCompletedCredits,
        totalGradedCredits: metrics.totalGradedCredits,
        totalDegreeCredits: metrics.totalDegreeCredits,
        totalCourses: metrics.totalCourses,
        gradedCourseCount: metrics.gradedCourseCount,
        pendingCourseCount: metrics.pendingCourseCount,
        completedSemestersCount: metrics.completedSemestersCount,
        currentSemester,
        academicStanding: metrics.academicStanding,
      },
      courses: metrics.enrichedCourses,
      semesterBreakdown: metrics.semesterBreakdown,
    });
  } catch (err: any) {
    console.error('[Add Course Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to add course' });
  }
});

// DELETE /api/cgpa/course/:code (Remove ANY course from student's personalized curriculum)
router.delete('/course/:code', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const studentId = req.user.id;
    const courseCode = req.params.code.trim().toUpperCase();

    // 1. Remove from studentCustomCourses if it was custom
    db.deleteStudentCustomCourse(studentId, courseCode);

    // 2. Add to studentExcludedCourses so it disappears from this student's view
    db.excludeCourseForStudent(studentId, courseCode);

    // 3. Clear grades for this course
    db.saveStudentGrades(studentId, { [courseCode]: { grade: 'N/A', gradePoint: 0 } });

    const allCourses = await getFullCoursesForStudent(studentId);
    const savedGrades = db.getStudentGrades(studentId) || {};
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, savedGrades, currentSemester);

    return res.json({
      success: true,
      message: `Course ${courseCode} removed from your curriculum`,
      cgpaSummary: {
        cgpa: metrics.cgpa,
        totalCompletedCredits: metrics.totalCompletedCredits,
        totalGradedCredits: metrics.totalGradedCredits,
        totalDegreeCredits: metrics.totalDegreeCredits,
        totalCourses: metrics.totalCourses,
        gradedCourseCount: metrics.gradedCourseCount,
        pendingCourseCount: metrics.pendingCourseCount,
        completedSemestersCount: metrics.completedSemestersCount,
        currentSemester,
        academicStanding: metrics.academicStanding,
      },
      courses: metrics.enrichedCourses,
      semesterBreakdown: metrics.semesterBreakdown,
    });
  } catch (err: any) {
    console.error('[Delete Course Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to remove course' });
  }
});

// POST /api/cgpa/course/restore (Restore default curriculum courses for this student)
router.post('/course/restore', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const studentId = req.user.id;
    db.resetExcludedCoursesForStudent(studentId);

    const allCourses = await getFullCoursesForStudent(studentId);
    const savedGrades = db.getStudentGrades(studentId) || {};
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, savedGrades, currentSemester);

    return res.json({
      success: true,
      message: 'Standard curriculum restored for your batch',
      courses: metrics.enrichedCourses,
      semesterBreakdown: metrics.semesterBreakdown,
      cgpaSummary: {
        cgpa: metrics.cgpa,
        totalCompletedCredits: metrics.totalCompletedCredits,
        totalGradedCredits: metrics.totalGradedCredits,
        totalDegreeCredits: metrics.totalDegreeCredits,
        totalCourses: metrics.totalCourses,
        gradedCourseCount: metrics.gradedCourseCount,
        pendingCourseCount: metrics.pendingCourseCount,
        completedSemestersCount: metrics.completedSemestersCount,
        currentSemester,
        academicStanding: metrics.academicStanding,
      },
    });
  } catch (err: any) {
    console.error('[Restore Courses Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to restore default courses' });
  }
});

// POST /api/cgpa/paste-results (Direct Paste & Parse Results Handler)
router.post('/paste-results', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const studentId = req.user.id;
    const { results } = req.body; // Map of courseCode -> grade

    if (!results || typeof results !== 'object') {
      return res.status(400).json({ success: false, error: 'Results payload is required' });
    }

    const allCourses = await getFullCoursesForStudent(studentId);
    const formatted: Record<string, { grade: string; gradePoint: number; semester?: number }> = {};

    for (const [courseCode, gradeRaw] of Object.entries(results as Record<string, string>)) {
      if (courseCode.toUpperCase() === 'ACM' || courseCode.toUpperCase().startsWith('ACM-') || courseCode.toUpperCase().includes('ACM')) {
        continue;
      }
      const grade = String(gradeRaw).trim().toUpperCase();
      if (grade && grade !== 'N/A') {
        const gp = lookupGradePoint(grade);
        const course = allCourses.find(c => c.code.toUpperCase() === courseCode.toUpperCase());
        formatted[courseCode.toUpperCase()] = {
          grade,
          gradePoint: gp,
          semester: course?.semester,
        };
      }
    }

    if (Object.keys(formatted).length > 0) {
      db.saveStudentGrades(studentId, formatted);
    }

    const currentGrades = db.getStudentGrades(studentId) || {};
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, currentGrades, currentSemester);

    return res.json({
      success: true,
      message: `Successfully recorded ${Object.keys(formatted).length} course grades!`,
      cgpaSummary: {
        cgpa: metrics.cgpa,
        totalCompletedCredits: metrics.totalCompletedCredits,
        totalGradedCredits: metrics.totalGradedCredits,
        totalDegreeCredits: metrics.totalDegreeCredits,
        totalCourses: metrics.totalCourses,
        gradedCourseCount: metrics.gradedCourseCount,
        pendingCourseCount: metrics.pendingCourseCount,
        completedSemestersCount: metrics.completedSemestersCount,
        currentSemester,
        academicStanding: metrics.academicStanding,
      },
      courses: metrics.enrichedCourses,
      semesterBreakdown: metrics.semesterBreakdown,
    });
  } catch (err: any) {
    console.error('[Paste Results Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to record pasted results' });
  }
});

// POST /api/cgpa/reset (Reset student grades to blank)
router.post('/reset', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const studentId = req.user.id;
    db.saveStudentGrades(studentId, {});
    if (db['data']?.studentGrades) {
      db['data'].studentGrades[studentId] = {};
      db.save();
    }

    const allCourses = await getFullCoursesForStudent(studentId);
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, {}, currentSemester);

    return res.json({
      success: true,
      message: 'All course grades reset to 0.00',
      courses: metrics.enrichedCourses,
      semesterBreakdown: metrics.semesterBreakdown,
      cgpaSummary: {
        cgpa: metrics.cgpa,
        totalCompletedCredits: metrics.totalCompletedCredits,
        totalGradedCredits: metrics.totalGradedCredits,
        totalDegreeCredits: metrics.totalDegreeCredits,
        totalCourses: metrics.totalCourses,
        gradedCourseCount: metrics.gradedCourseCount,
        pendingCourseCount: metrics.pendingCourseCount,
        completedSemestersCount: metrics.completedSemestersCount,
        currentSemester,
        academicStanding: metrics.academicStanding,
      },
    });
  } catch (err: any) {
    console.error('[CGPA Reset Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to reset grades' });
  }
});

// POST /api/cgpa/report-bug (Submit a Bug / Grade Issue Report to Admin)
router.post('/report-bug', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { category, message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Bug report message is required' });
  }

  try {
    const report = {
      id: `bug-${Date.now()}`,
      studentId: req.user.studentId || req.user.id,
      studentName: req.user.name,
      studentEmail: req.user.email,
      batchName: req.user.batchName || 'SWE Batch',
      currentSemester: req.user.currentSemester || 5,
      category: category?.trim() || 'General Bug',
      message: message.trim(),
      status: 'PENDING' as const,
      createdAt: new Date().toISOString(),
    };

    db.addBugReport(report);

    // Create an in-portal notification for central admin
    const adminUser = db.getUsers().find(u => u.role === 'ADMIN');
    if (adminUser) {
      db.addNotification({
        id: `notif-bug-${Date.now()}`,
        userId: adminUser.id,
        title: `Bug Report: ${report.category}`,
        message: `${report.studentName} (${report.studentId}) reported: "${report.message.slice(0, 100)}..."`,
        type: 'NOTICE',
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: 'Bug report received! The Department Admin has been notified.',
      report,
    });
  } catch (err: any) {
    console.error('[Bug Report Submission Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit bug report' });
  }
});

export default router;
