import fs from 'fs';
import path from 'path';
import { getServerSupabase, initSupabase } from '../src/server/supabaseSync';
import type { RoutineSlot, Course, Batch, Faculty } from '../src/types';

initSupabase();

interface InputSlot {
  day: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY';
  startTime: string;
  endTime: string;
  courseCode: string;
  courseTitle: string;
  teacherName: string;
  room: string;
}

const INPUT_SLOTS: InputSlot[] = [
  {
    day: 'SUNDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'SADP',
    courseTitle: 'SADP LAB',
    teacherName: 'NSC',
    room: '301',
  },
  {
    day: 'SUNDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'SADP',
    courseTitle: 'SADP LAB',
    teacherName: 'NSC',
    room: '301',
  },
  {
    day: 'SUNDAY',
    startTime: '12:00 PM',
    endTime: '01:30 PM',
    courseCode: 'BEEC',
    courseTitle: 'BEEC',
    teacherName: 'AIR',
    room: 'E5',
  },
  {
    day: 'MONDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'BEEC',
    courseTitle: 'BEEC',
    teacherName: 'AIR',
    room: '403',
  },
  {
    day: 'MONDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'JGD',
    courseTitle: 'JGD LAB',
    teacherName: 'FA',
    room: '306',
  },
  {
    day: 'MONDAY',
    startTime: '12:00 PM',
    endTime: '01:30 PM',
    courseCode: 'JGD',
    courseTitle: 'JGD LAB',
    teacherName: 'FA',
    room: '306',
  },
  {
    day: 'TUESDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'SADP',
    courseTitle: 'SADP',
    teacherName: 'NSC',
    room: '403',
  },
  {
    day: 'TUESDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'CP',
    courseTitle: 'CP LAB',
    teacherName: 'IAC',
    room: 'Lab-2 405',
  },
  {
    day: 'TUESDAY',
    startTime: '12:00 PM',
    endTime: '01:30 PM',
    courseCode: 'CP',
    courseTitle: 'CP LAB',
    teacherName: 'IAC',
    room: 'Lab-2 405',
  },
  {
    day: 'THURSDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'SADP',
    courseTitle: 'SADP',
    teacherName: 'NSC',
    room: '508',
  },
  {
    day: 'THURSDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'BEEC',
    courseTitle: 'BEEC LAB',
    teacherName: 'AIR',
    room: '109',
  },
  {
    day: 'THURSDAY',
    startTime: '12:00 PM',
    endTime: '01:30 PM',
    courseCode: 'BEEC',
    courseTitle: 'BEEC LAB',
    teacherName: 'AIR',
    room: '109',
  },
];

const COURSE_MAP: Record<
  string,
  { code: string; shortName: string; title: string; id: string; credits: number; type: 'THEORY' | 'LAB' | 'PROJECT'; semester: number }
> = {
  SADP: {
    code: 'SWE-233',
    shortName: 'SADP',
    title: 'Software Architecture and Design Patterns',
    id: 'course-sem6-swe-233',
    credits: 3,
    type: 'THEORY',
    semester: 6,
  },
  'SADP LAB': {
    code: 'SWE-234',
    shortName: 'SADP Lab',
    title: 'Software Architecture and Design Patterns Lab',
    id: 'course-sem6-swe-234',
    credits: 1.5,
    type: 'LAB',
    semester: 6,
  },
  BEEC: {
    code: 'SWE-111',
    shortName: 'BEEC',
    title: 'Basic Electrical and Electronic Circuits',
    id: 'course-sem3-swe-111',
    credits: 3,
    type: 'THEORY',
    semester: 6,
  },
  'BEEC LAB': {
    code: 'SWE-112',
    shortName: 'BEEC Lab',
    title: 'Basic Electrical and Electronic Circuits Lab',
    id: 'course-sem3-swe-112',
    credits: 1.5,
    type: 'LAB',
    semester: 6,
  },
  'JGD LAB': {
    code: 'SWE-282',
    shortName: 'JGD Lab',
    title: 'Project on Java GUI Development Lab',
    id: 'course-sem6-swe-282',
    credits: 2,
    type: 'PROJECT',
    semester: 6,
  },
  'CP LAB': {
    code: 'SWE-228',
    shortName: 'CP Lab-2',
    title: 'Problem Solving with Competitive Programming Lab-2',
    id: 'course-sem6-swe-228',
    credits: 1.5,
    type: 'LAB',
    semester: 6,
  },
};

const TEACHER_MAP: Record<
  string,
  { id: string; name: string; shortName: string; designation: string; email: string; officeRoom: string }
> = {
  NSC: {
    id: 'fac-2',
    name: 'Nazia Sultana Chowdhury',
    shortName: 'NSC',
    designation: 'Assistant Professor',
    email: 'nazia@metrouni.edu.bd',
    officeRoom: 'Room 503',
  },
  AIR: {
    id: 'fac-air',
    name: 'A.I. Rahman',
    shortName: 'AIR',
    designation: 'Lecturer',
    email: 'air@metrouni.edu.bd',
    officeRoom: 'Room 109',
  },
  FA: {
    id: 'fac-1',
    name: 'Fuad Ahmed',
    shortName: 'FA',
    designation: 'Professor & Head',
    email: 'fuad@metrouni.edu.bd',
    officeRoom: 'Room 302',
  },
  IAC: {
    id: 'fac-6',
    name: 'Iffat Ahmed Chowdhury Nahid',
    shortName: 'IAC',
    designation: 'Lecturer',
    email: 'nahid@metrouni.edu.bd',
    officeRoom: 'Room 505',
  },
};

function formatPortalRoom(r: string): string {
  const clean = r.trim().toUpperCase();
  if (clean === 'E2' || clean === 'EXTEN-2') return 'Exten-2';
  if (clean === 'E3' || clean === 'EXTEN-3') return 'Exten-3';
  if (clean === 'E5' || clean === 'EXTEN-5') return 'Exten-5';
  if (clean === 'E6' || clean === 'EXTEN-6') return 'Exten-6';
  if (clean.includes('LAB-2') || clean.includes('405')) return 'Room 405';
  if (clean.startsWith('ROOM ')) return clean;
  return `Room ${clean}`;
}

async function updateBatch8() {
  console.log('--- Step 1: Loading Local Database ---');
  const dbPath = path.join(process.cwd(), 'data', 'database.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // 1. Ensure batch-8 exists in db.batches
  if (!db.batches) db.batches = [];
  let batch8 = db.batches.find((b: Batch) => b.id === 'batch-8');
  if (!batch8) {
    batch8 = {
      id: 'batch-8',
      name: 'SWE 8th Batch',
      admissionYear: 2022,
      currentSemester: 6,
      academicSession: '2022-2023',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2022-01-15T00:00:00Z',
    };
    db.batches.push(batch8);
    console.log('Added SWE 8th Batch to database.json batches');
  } else {
    batch8.currentSemester = 6;
  }

  // 2. Ensure AIR is in db.faculty
  if (!db.faculty) db.faculty = [];
  let airFaculty = db.faculty.find((f: Faculty) => f.shortName === 'AIR' || f.id === 'fac-air');
  if (!airFaculty) {
    airFaculty = {
      id: 'fac-air',
      name: 'A.I. Rahman',
      shortName: 'AIR',
      designation: 'Lecturer',
      department: 'Electrical & Electronic Engineering',
      email: 'air@metrouni.edu.bd',
      phone: null,
      officeRoom: 'Room 109',
      photoUrl: null,
      specialization: 'Electrical Circuits & Systems',
      assignedCourses: ['SWE-111', 'SWE-112'],
      createdAt: '2026-10-06T18:00:00.000Z',
    };
    db.faculty.push(airFaculty);
    console.log('Added A.I. Rahman (AIR) to database.json faculty');
  }

  // 3. Assign teachers to the courses and associate with batch-8
  console.log('--- Step 2: Assigning Teachers to Courses ---');
  if (!db.courses) db.courses = [];

  const courseAssignments: { courseKey: string; teacherKey: string }[] = [
    { courseKey: 'SADP', teacherKey: 'NSC' },
    { courseKey: 'SADP LAB', teacherKey: 'NSC' },
    { courseKey: 'BEEC', teacherKey: 'AIR' },
    { courseKey: 'BEEC LAB', teacherKey: 'AIR' },
    { courseKey: 'JGD LAB', teacherKey: 'FA' },
    { courseKey: 'CP LAB', teacherKey: 'IAC' },
  ];

  courseAssignments.forEach(({ courseKey, teacherKey }) => {
    const courseMeta = COURSE_MAP[courseKey];
    const teacherMeta = TEACHER_MAP[teacherKey];
    if (!courseMeta || !teacherMeta) return;

    let matchCourse = db.courses.find(
      (c: Course) =>
        c.id === courseMeta.id ||
        c.code === courseMeta.code ||
        (c.title && c.title.toLowerCase() === courseMeta.title.toLowerCase())
    );

    if (matchCourse) {
      matchCourse.assignedFacultyId = teacherMeta.id;
      matchCourse.assignedFacultyName = teacherMeta.name;
      if (!matchCourse.batchIds) matchCourse.batchIds = [];
      if (!matchCourse.batchIds.includes('batch-8')) {
        matchCourse.batchIds.push('batch-8');
      }
      console.log(
        `Assigned ${teacherMeta.name} (${teacherMeta.shortName}) -> ${matchCourse.code} (${matchCourse.title}) for batch-8`
      );
    } else {
      matchCourse = {
        id: courseMeta.id,
        code: courseMeta.code,
        shortName: courseMeta.shortName,
        title: courseMeta.title,
        credits: courseMeta.credits,
        type: courseMeta.type,
        semester: 6,
        assignedFacultyId: teacherMeta.id,
        assignedFacultyName: teacherMeta.name,
        batchIds: ['batch-8'],
      };
      db.courses.push(matchCourse);
      console.log(`Created course and assigned ${teacherMeta.name} -> ${courseMeta.code}`);
    }
  });

  // 4. Generate the 12 routine slots for batch-8
  console.log('--- Step 3: Updating Routine Slots for batch-8 ---');
  const updatedSlotsForBatch8: RoutineSlot[] = INPUT_SLOTS.map((slot, index) => {
    const isLab = slot.courseTitle.includes('LAB');
    let courseKey = slot.courseCode;
    if (isLab) {
      if (slot.courseCode === 'SADP') courseKey = 'SADP LAB';
      else if (slot.courseCode === 'BEEC') courseKey = 'BEEC LAB';
      else if (slot.courseCode === 'JGD') courseKey = 'JGD LAB';
      else if (slot.courseCode === 'CP') courseKey = 'CP LAB';
    }

    const courseMeta = COURSE_MAP[courseKey] || COURSE_MAP[slot.courseCode];
    const teacherMeta = TEACHER_MAP[slot.teacherName];
    const roomStr = formatPortalRoom(slot.room);

    return {
      id: `rout-batch-8-${index + 1}`,
      batchId: 'batch-8',
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseId: courseMeta?.id || `course-sem6-${slot.courseCode.toLowerCase()}`,
      courseCode: courseMeta?.code || slot.courseCode,
      courseShortName: courseMeta?.shortName || slot.courseTitle,
      courseTitle: courseMeta?.title || slot.courseTitle,
      teacherName: teacherMeta?.name || slot.teacherName,
      teacherShortName: slot.teacherName,
      room: roomStr,
    };
  });

  // Remove existing routines for batch-8
  db.routines = (db.routines || []).filter(
    (r: RoutineSlot) => r.batchId !== 'batch-8'
  );

  // Add the newly updated routine slots for batch-8
  db.routines.push(...updatedSlotsForBatch8);

  // Save local database.json
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Saved database.json with ${db.routines.length} total routine slots.`);

  // Also update src/server/db.ts
  const dbTsPath = path.join(process.cwd(), 'src', 'server', 'db.ts');
  if (fs.existsSync(dbTsPath)) {
    let dbTsContent = fs.readFileSync(dbTsPath, 'utf8');

    // Make sure AIR faculty exists in db.ts default faculty if needed
    if (!dbTsContent.includes("'fac-air'") && !dbTsContent.includes('"fac-air"')) {
      const airFacultyJson = `  {
    id: 'fac-air',
    name: 'A.I. Rahman',
    shortName: 'AIR',
    designation: 'Lecturer',
    department: 'Electrical & Electronic Engineering',
    email: 'air@metrouni.edu.bd',
    officeRoom: 'Room 109',
    assignedCourses: ['SWE-111', 'SWE-112'],
  },`;
      dbTsContent = dbTsContent.replace(
        /export const DEFAULT_FACULTY: Faculty\[\] = \[/,
        `export const DEFAULT_FACULTY: Faculty[] = [\n${airFacultyJson}`
      );
    }

    fs.writeFileSync(dbTsPath, dbTsContent, 'utf8');
    console.log('Updated src/server/db.ts');
  }

  // 5. Sync with Supabase
  console.log('--- Step 4: Syncing with Supabase ---');
  const sb = getServerSupabase();
  if (sb) {
    try {
      // Upsert batch-8
      const batchRow = {
        id: batch8.id,
        name: batch8.name,
        admission_year: batch8.admissionYear,
        current_semester: batch8.currentSemester,
        academic_session: batch8.academicSession,
        semester_mode: batch8.semesterMode,
        status: batch8.status,
      };
      await sb.from('batches').upsert(batchRow);
      console.log('[Supabase Batch Success] Upserted batch-8 to Supabase.');

      // Upsert faculty
      const facultyRows = db.faculty.map((f: Faculty) => ({
        id: f.id,
        name: f.name,
        short_name: f.shortName,
        designation: f.designation,
        department: f.department || 'Software Engineering',
        email: f.email,
        office_room: f.officeRoom,
      }));
      await sb.from('faculty').upsert(facultyRows);
      console.log('[Supabase Faculty Success] Upserted faculty to Supabase.');

      // Upsert courses with assigned teachers
      const courseRows = db.courses.map((c: Course) => ({
        id: c.id,
        code: c.code,
        short_name: c.shortName || null,
        title: c.title,
        credits: c.credits,
        type: c.type,
        semester: c.semester,
        assigned_faculty_id: c.assignedFacultyId || null,
        assigned_faculty_name: c.assignedFacultyName || null,
        batch_ids: c.batchIds || [],
      }));
      await sb.from('courses').upsert(courseRows);
      console.log('[Supabase Courses Success] Upserted courses with teachers to Supabase.');

      // Delete old routine slots in Supabase for batch-8
      await sb.from('routine_slots').delete().eq('batch_id', 'batch-8');

      // Upsert new routine slots
      const routineRows = updatedSlotsForBatch8.map((r) => ({
        id: r.id,
        batch_id: r.batchId,
        day: r.day,
        start_time: r.startTime,
        end_time: r.endTime,
        course_id: r.courseId,
        course_code: r.courseCode,
        course_short_name: r.courseShortName || null,
        course_title: r.courseTitle,
        teacher_name: r.teacherName,
        teacher_short_name: r.teacherShortName,
        room: r.room,
      }));
      const { error: rErr } = await sb.from('routine_slots').upsert(routineRows);
      if (rErr) {
        console.error('[Supabase Routine Error]', rErr);
      } else {
        console.log(`[Supabase Routine Success] Upserted ${routineRows.length} slots for batch-8.`);
      }
    } catch (err) {
      console.error('[Supabase Sync Exception]', err);
    }
  } else {
    console.log('Supabase client not initialized or offline, local database.json updated.');
  }

  console.log('\n=== Batch 8 Routine and Teacher Assignment Complete ===');
}

updateBatch8().catch(console.error);
