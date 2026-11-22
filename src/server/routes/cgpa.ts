import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { fetchAllCourses } from '../supabaseData';
import {
  loadStudentCGPA,
  saveStudentCGPA,
  normalizeCourseCode,
  StoredStudentCGPA,
  StoredGradeEntry,
} from '../cgpaStore';
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

const VALID_GRADES = new Set([
  'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F', 'N/A', 'NOT_PUBLISHED',
]);

export function lookupGradePoint(gradeStr: string): number {
  const normalized = (gradeStr || '').trim().toUpperCase();
  const found = MU_GRADING_SCALE.find(g => g.grade === normalized);
  return found ? found.gradePoint : 0;
}

function isAcmItem(c: { code?: string; title?: string }): boolean {
  const code = (c.code || '').toUpperCase();
  const title = (c.title || '').toUpperCase();
  return code === 'ACM' || code.startsWith('ACM-') || code.includes('ACM') || title.includes('ACM');
}

function calculateMetrics(
  courses: Course[],
  studentGrades: Record<string, StoredGradeEntry>,
  currentSemester: number
) {
  // Exclude ACM (ACM has no academic credit, not counted in any result/CGPA calculation)
  const academicCourses = courses.filter(c => !isAcmItem(c));

  // Build normalized lookup table so "SWE-111", "SWE 111", "swe-111" all match reliably
  const normalizedGrades: Record<string, StoredGradeEntry> = {};
  for (const [key, val] of Object.entries(studentGrades || {})) {
    if (!val) continue;
    normalizedGrades[key] = val;
    normalizedGrades[normalizeCourseCode(key)] = val;
  }

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

    const gradeInfo =
      normalizedGrades[normalizeCourseCode(c.code)] ||
      normalizedGrades[c.code] ||
      normalizedGrades[c.id];

    const hasGrade =
      !!gradeInfo &&
      !!gradeInfo.grade &&
      gradeInfo.grade !== 'N/A' &&
      gradeInfo.grade !== 'NOT_PUBLISHED';

    if (hasGrade) {
      const gp =
        typeof gradeInfo.gradePoint === 'number' && Number.isFinite(gradeInfo.gradePoint)
          ? gradeInfo.gradePoint
          : lookupGradePoint(gradeInfo.grade);
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

  const cgpa =
    totalGradedCredits > 0 ? Number((totalQualityPoints / totalGradedCredits).toFixed(2)) : 0.0;

  let academicStanding = 'Regular Student';
  if (cgpa >= 3.85) academicStanding = "Dean's High Honours • First Class";
  else if (cgpa >= 3.75) academicStanding = "Dean's Merit List • First Class";
  else if (cgpa >= 3.50) academicStanding = 'First Class Standing';
  else if (cgpa >= 3.00) academicStanding = 'Good Academic Standing';
  else if (cgpa >= 2.50) academicStanding = 'Average Academic Standing';
  else if (cgpa > 0) academicStanding = 'Academic Warning / Probation';
  else academicStanding = 'No Published Grades Yet';

  // Semester by semester breakdown (1 through 12)
  const semesterMap: Record<
    number,
    {
      semester: number;
      semesterName: string;
      courses: typeof enrichedCourses;
      totalCredits: number;
      completedCredits: number;
      gradedCredits: number;
      qualityPoints: number;
      sgpa: number | null;
      isPublished: boolean;
    }
  > = {};

  for (let s = 1; s <= 12; s++) {
    const semName =
      s === 1 ? '1st Semester' : s === 2 ? '2nd Semester' : s === 3 ? '3rd Semester' : `${s}th Semester`;
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

  let runningQualityPoints = 0;
  let runningGradedCredits = 0;

  const semesterBreakdown = Object.values(semesterMap)
    .sort((a, b) => a.semester - b.semester)
    .map(sem => {
      const sgpa =
        sem.gradedCredits > 0 ? Number((sem.qualityPoints / sem.gradedCredits).toFixed(2)) : null;
      runningQualityPoints += sem.qualityPoints;
      runningGradedCredits += sem.gradedCredits;
      const cumulativeCgpa =
        runningGradedCredits > 0
          ? Number((runningQualityPoints / runningGradedCredits).toFixed(2))
          : null;

      return {
        ...sem,
        sgpa,
        cumulativeCgpa,
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
    totalCourses: enrichedCourses.length,
    gradedCourseCount,
    pendingCourseCount: Math.max(0, enrichedCourses.length - gradedCourseCount),
    completedSemestersCount,
    currentBatchSemester: currentSemester,
    academicStanding,
    enrichedCourses,
    semesterBreakdown,
  };
}

async function getFullCoursesForRecord(record: StoredStudentCGPA): Promise<Course[]> {
  const rawCourses = await fetchAllCourses();
  const baseCourses = rawCourses.filter(c => !isAcmItem(c));
  const excludedSet = new Set(
    (record.excludedCourses || []).map(c => normalizeCourseCode(c))
  );
  const customCourses = record.customCourses || [];

  const courseMap = new Map<string, Course>();

  // Add base courses that haven't been excluded by the student
  for (const c of baseCourses) {
    const key = normalizeCourseCode(c.code);
    if (!excludedSet.has(key)) {
      courseMap.set(key, c);
    }
  }

  // Add or override custom courses
  for (const cc of customCourses) {
    const key = normalizeCourseCode(cc.code);
    if (!excludedSet.has(key)) {
      courseMap.set(key, cc);
    }
  }

  return Array.from(courseMap.values()).sort(
    (a, b) => (a.semester - b.semester) || (a.code || '').localeCompare(b.code || '')
  );
}

function buildSummaryPayload(
  metrics: ReturnType<typeof calculateMetrics>,
  req: AuthenticatedRequest,
  record: StoredStudentCGPA
) {
  return {
    cgpa: metrics.cgpa,
    totalCompletedCredits: metrics.totalCompletedCredits,
    totalGradedCredits: metrics.totalGradedCredits,
    totalDegreeCredits: metrics.totalDegreeCredits,
    totalCourses: metrics.totalCourses,
    gradedCourseCount: metrics.gradedCourseCount,
    pendingCourseCount: metrics.pendingCourseCount,
    completedSemestersCount: metrics.completedSemestersCount,
    currentSemester: req.user?.currentSemester || 5,
    batchName: req.user?.batchName || 'SWE Batch',
    academicStanding: metrics.academicStanding,
    sessionName: 'Autumn 2026',
    excludedCount: (record.excludedCourses || []).length,
  };
}

// GET /api/cgpa
router.get('/', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const studentId = req.user.id;
    const rollNo = req.user.studentId;
    const record = await loadStudentCGPA(studentId, rollNo);
    const allCourses = await getFullCoursesForRecord(record);
    const currentSemester = req.user.currentSemester || 5;

    const metrics = calculateMetrics(allCourses, record.grades, currentSemester);
    if (metrics.cgpa > 0) {
      db.setStudentCGPA(studentId, metrics.cgpa, rollNo);
    }
    const documents = db.getStudentCGPADocs(studentId);

    return res.json({
      success: true,
      cgpaSummary: buildSummaryPayload(metrics, req, record),
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
    if (!grades || typeof grades !== 'object' || Array.isArray(grades)) {
      return res.status(400).json({ success: false, error: 'Grades payload is required' });
    }

    const entries = Object.entries(grades as Record<string, any>);
    if (entries.length > 200) {
      return res.status(400).json({ success: false, error: 'Too many course grades in one request' });
    }

    const studentId = req.user.id;
    const rollNo = req.user.studentId;
    const record = await loadStudentCGPA(studentId, rollNo);
    const allCourses = await getFullCoursesForRecord(record);
    const nextGrades: Record<string, StoredGradeEntry> = { ...record.grades };
    const now = new Date().toISOString();

    for (const [courseCode, info] of entries) {
      const normalizedCode = normalizeCourseCode(courseCode);
      if (!normalizedCode || normalizedCode.length > 40) continue;

      const rawGrade = typeof info === 'string' ? info : info?.grade;
      const grade = String(rawGrade || '').trim().toUpperCase();

      if (!grade || grade === 'N/A' || grade === 'NOT_PUBLISHED') {
        delete nextGrades[normalizedCode];
        delete nextGrades[courseCode];
        continue;
      }

      if (!VALID_GRADES.has(grade)) {
        return res.status(400).json({
          success: false,
          error: `Invalid grade "${grade}" for course ${courseCode}`,
        });
      }

      const gp =
        typeof info === 'object' && typeof info?.gradePoint === 'number' && Number.isFinite(info.gradePoint)
          ? Math.max(0, Math.min(4, info.gradePoint))
          : lookupGradePoint(grade);
      const course = allCourses.find(c => normalizeCourseCode(c.code) === normalizedCode);

      nextGrades[normalizedCode] = {
        grade,
        gradePoint: gp,
        semester: course?.semester,
        updatedAt: now,
      };
    }

    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, nextGrades, currentSemester);

    const updatedRecord: StoredStudentCGPA = {
      ...record,
      studentId,
      rollNo,
      grades: nextGrades,
      cgpa: metrics.cgpa,
      updatedAt: now,
    };

    const saveResult = await saveStudentCGPA(updatedRecord);
    if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && !saveResult.persistedToSupabase) {
      return res.status(503).json({
        success: false,
        error: 'Unable to save grades to cloud database right now. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: 'Course grades updated successfully',
      cgpaSummary: buildSummaryPayload(metrics, req, updatedRecord),
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
    const rollNo = req.user.studentId;
    const { code, title, shortName, credits, semester, type, grade, gradePoint } = req.body;

    if (!code || !title) {
      return res.status(400).json({ success: false, error: 'Course code and title are required' });
    }

    const cleanCode = normalizeCourseCode(String(code));
    if (!cleanCode || cleanCode.length > 30) {
      return res.status(400).json({ success: false, error: 'Invalid course code' });
    }

    const cleanTitle = String(title).trim().slice(0, 150);
    const cleanCredits = Math.max(0.5, Math.min(12, Number(credits) || 3.0));
    const cleanSemester = Math.max(1, Math.min(12, Math.round(Number(semester) || 1)));

    const record = await loadStudentCGPA(studentId, rollNo);
    const now = new Date().toISOString();

    // Un-exclude if it was previously excluded
    const nextExcluded = (record.excludedCourses || []).filter(
      c => normalizeCourseCode(c) !== cleanCode
    );

    const courseObj: Course = {
      id: `custom-${cleanCode.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`,
      code: cleanCode,
      title: cleanTitle,
      shortName: shortName ? String(shortName).trim().toUpperCase().slice(0, 30) : cleanCode,
      credits: cleanCredits,
      semester: cleanSemester,
      type: type === 'LAB' ? 'LAB' : 'THEORY',
      batchIds: [req.user.batchId || 'batch-9'],
      isRetakeCourse: false,
    };
    (courseObj as any).isCustom = true;

    const nextCustom = [...(record.customCourses || [])];
    const existingIdx = nextCustom.findIndex(
      c => normalizeCourseCode(c.code) === cleanCode
    );
    if (existingIdx >= 0) {
      nextCustom[existingIdx] = { ...nextCustom[existingIdx], ...courseObj };
    } else {
      nextCustom.push(courseObj);
    }

    const nextGrades: Record<string, StoredGradeEntry> = { ...record.grades };
    if (grade && grade !== 'N/A' && grade !== 'NOT_PUBLISHED') {
      const cleanGrade = String(grade).trim().toUpperCase();
      if (!VALID_GRADES.has(cleanGrade)) {
        return res.status(400).json({ success: false, error: `Invalid grade "${cleanGrade}"` });
      }
      const gp =
        typeof gradePoint === 'number' && Number.isFinite(gradePoint)
          ? Math.max(0, Math.min(4, gradePoint))
          : lookupGradePoint(cleanGrade);
      nextGrades[cleanCode] = {
        grade: cleanGrade,
        gradePoint: gp,
        semester: cleanSemester,
        updatedAt: now,
      };
    }

    const draftRecord: StoredStudentCGPA = {
      ...record,
      studentId,
      rollNo,
      grades: nextGrades,
      customCourses: nextCustom,
      excludedCourses: nextExcluded,
      updatedAt: now,
    };

    const allCourses = await getFullCoursesForRecord(draftRecord);
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, draftRecord.grades, currentSemester);
    draftRecord.cgpa = metrics.cgpa;

    const saveResult = await saveStudentCGPA(draftRecord);
    if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && !saveResult.persistedToSupabase) {
      return res.status(503).json({
        success: false,
        error: 'Unable to save course to cloud database right now. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: `Course ${cleanCode} added to your curriculum!`,
      cgpaSummary: buildSummaryPayload(metrics, req, draftRecord),
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
    const rollNo = req.user.studentId;
    const courseCode = normalizeCourseCode(req.params.code);

    const record = await loadStudentCGPA(studentId, rollNo);
    const now = new Date().toISOString();

    const nextCustom = (record.customCourses || []).filter(
      c => normalizeCourseCode(c.code) !== courseCode
    );
    const nextExcluded = Array.from(
      new Set([...(record.excludedCourses || []).map(normalizeCourseCode), courseCode])
    );
    const nextGrades = { ...record.grades };
    delete nextGrades[courseCode];
    delete nextGrades[req.params.code];

    const draftRecord: StoredStudentCGPA = {
      ...record,
      studentId,
      rollNo,
      grades: nextGrades,
      customCourses: nextCustom,
      excludedCourses: nextExcluded,
      updatedAt: now,
    };

    const allCourses = await getFullCoursesForRecord(draftRecord);
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, draftRecord.grades, currentSemester);
    draftRecord.cgpa = metrics.cgpa;

    const saveResult = await saveStudentCGPA(draftRecord);
    if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && !saveResult.persistedToSupabase) {
      return res.status(503).json({
        success: false,
        error: 'Unable to update curriculum in cloud database right now. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: `Course ${courseCode} removed from your curriculum`,
      cgpaSummary: buildSummaryPayload(metrics, req, draftRecord),
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
    const rollNo = req.user.studentId;
    const record = await loadStudentCGPA(studentId, rollNo);
    const now = new Date().toISOString();

    const draftRecord: StoredStudentCGPA = {
      ...record,
      studentId,
      rollNo,
      excludedCourses: [],
      updatedAt: now,
    };

    const allCourses = await getFullCoursesForRecord(draftRecord);
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, draftRecord.grades, currentSemester);
    draftRecord.cgpa = metrics.cgpa;

    const saveResult = await saveStudentCGPA(draftRecord);
    if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && !saveResult.persistedToSupabase) {
      return res.status(503).json({
        success: false,
        error: 'Unable to restore curriculum in cloud database right now. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: 'Standard curriculum restored for your batch',
      courses: metrics.enrichedCourses,
      semesterBreakdown: metrics.semesterBreakdown,
      cgpaSummary: buildSummaryPayload(metrics, req, draftRecord),
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
    const rollNo = req.user.studentId;
    const { results } = req.body; // Map of courseCode -> grade

    if (!results || typeof results !== 'object' || Array.isArray(results)) {
      return res.status(400).json({ success: false, error: 'Results payload is required' });
    }

    const record = await loadStudentCGPA(studentId, rollNo);
    const allCourses = await getFullCoursesForRecord(record);
    const nextGrades: Record<string, StoredGradeEntry> = { ...record.grades };
    const now = new Date().toISOString();
    let recordedCount = 0;

    for (const [courseCode, gradeRaw] of Object.entries(results as Record<string, string>)) {
      const normalizedCode = normalizeCourseCode(courseCode);
      if (
        !normalizedCode ||
        normalizedCode === 'ACM' ||
        normalizedCode.startsWith('ACM-') ||
        normalizedCode.includes('ACM')
      ) {
        continue;
      }
      const grade = String(gradeRaw).trim().toUpperCase();
      if (grade && grade !== 'N/A' && VALID_GRADES.has(grade)) {
        const gp = lookupGradePoint(grade);
        const course = allCourses.find(c => normalizeCourseCode(c.code) === normalizedCode);
        nextGrades[normalizedCode] = {
          grade,
          gradePoint: gp,
          semester: course?.semester,
          updatedAt: now,
        };
        recordedCount += 1;
      }
    }

    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, nextGrades, currentSemester);

    const updatedRecord: StoredStudentCGPA = {
      ...record,
      studentId,
      rollNo,
      grades: nextGrades,
      cgpa: metrics.cgpa,
      updatedAt: now,
    };

    const saveResult = await saveStudentCGPA(updatedRecord);
    if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && !saveResult.persistedToSupabase) {
      return res.status(503).json({
        success: false,
        error: 'Unable to save pasted results to cloud database right now. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: `Successfully recorded ${recordedCount} course grades!`,
      cgpaSummary: buildSummaryPayload(metrics, req, updatedRecord),
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
    const rollNo = req.user.studentId;
    const record = await loadStudentCGPA(studentId, rollNo);
    const now = new Date().toISOString();

    const updatedRecord: StoredStudentCGPA = {
      ...record,
      studentId,
      rollNo,
      grades: {},
      cgpa: 0,
      updatedAt: now,
    };

    const allCourses = await getFullCoursesForRecord(updatedRecord);
    const currentSemester = req.user.currentSemester || 5;
    const metrics = calculateMetrics(allCourses, {}, currentSemester);

    const saveResult = await saveStudentCGPA(updatedRecord);
    if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && !saveResult.persistedToSupabase) {
      return res.status(503).json({
        success: false,
        error: 'Unable to reset grades in cloud database right now. Please try again.',
      });
    }

    return res.json({
      success: true,
      message: 'All course grades reset to 0.00',
      courses: metrics.enrichedCourses,
      semesterBreakdown: metrics.semesterBreakdown,
      cgpaSummary: buildSummaryPayload(metrics, req, updatedRecord),
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
