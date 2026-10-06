import fs from 'fs';
import path from 'path';
import { getServerSupabase, initSupabase } from '../src/server/supabaseSync';
import type { RoutineSlot, Course, Faculty } from '../src/types';

initSupabase();

interface InputSlot {
  day: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY';
  startTime: string;
  endTime: string;
  courseCode: string;
  courseTitle: string;
  teacherName: string;
  room: string;
}

const INPUT_SLOTS: InputSlot[] = [
  {
    day: 'MONDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'NA',
    courseTitle: 'NA',
    teacherName: 'RP',
    room: 'E6',
  },
  {
    day: 'MONDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'CA',
    courseTitle: 'CA',
    teacherName: 'NSC',
    room: 'E3',
  },
  {
    day: 'TUESDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'NA',
    courseTitle: 'NA',
    teacherName: 'RP',
    room: 'E2',
  },
  {
    day: 'TUESDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'OOP',
    courseTitle: 'OOP',
    teacherName: 'FA',
    room: 'E2',
  },
  {
    day: 'WEDNESDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'OOP',
    courseTitle: 'OOP LAB',
    teacherName: 'FA',
    room: '301',
  },
  {
    day: 'WEDNESDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'OOP',
    courseTitle: 'OOP LAB',
    teacherName: 'FA',
    room: '301',
  },
  {
    day: 'THURSDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'OOP',
    courseTitle: 'OOP',
    teacherName: 'FA',
    room: '506',
  },
  {
    day: 'THURSDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'CA',
    courseTitle: 'CA',
    teacherName: 'NSC',
    room: '506',
  },
  {
    day: 'THURSDAY',
    startTime: '12:00 PM',
    endTime: '01:30 PM',
    courseCode: 'CP',
    courseTitle: 'CP LAB',
    teacherName: 'OHR',
    room: 'Lab-1 301',
  },
  {
    day: 'THURSDAY',
    startTime: '01:30 PM',
    endTime: '03:00 PM',
    courseCode: 'CP',
    courseTitle: 'CP LAB',
    teacherName: 'OHR',
    room: 'Lab-1 301',
  },
];

const COURSE_MAP: Record<
  string,
  { code: string; shortName: string; title: string; id: string }
> = {
  NA: {
    code: 'MAT-211',
    shortName: 'NA',
    title: 'Numerical Analysis',
    id: 'course-sem5-mat-211',
  },
  CA: {
    code: 'SWE-211',
    shortName: 'CA',
    title: 'Computer Architecture',
    id: 'course-sem5-swe-211',
  },
  OOP: {
    code: 'SWE-223',
    shortName: 'OOP',
    title: 'Object Oriented Programming',
    id: 'course-sem5-swe-223',
  },
  'OOP LAB': {
    code: 'SWE-224',
    shortName: 'OOP LAB',
    title: 'Object Oriented Programming Lab',
    id: 'course-sem5-swe-224',
  },
  'CP LAB': {
    code: 'SWE-230',
    shortName: 'CP-I',
    title: 'Problem Solving with Competitive Programming Lab-1',
    id: 'course-sem5-swe-230',
  },
};

const TEACHER_MAP: Record<
  string,
  { id: string; name: string; shortName: string; designation: string; email: string; officeRoom: string }
> = {
  RP: {
    id: 'fac-3',
    name: 'Rina Paul',
    shortName: 'RP',
    designation: 'Assistant Professor',
    email: 'rina@metrouni.edu.bd',
    officeRoom: 'Room 408',
  },
  NSC: {
    id: 'fac-2',
    name: 'Nazia Sultana Chowdhury',
    shortName: 'NSC',
    designation: 'Assistant Professor',
    email: 'nazia@metrouni.edu.bd',
    officeRoom: 'Room 503',
  },
  FA: {
    id: 'fac-1',
    name: 'Fuad Ahmed',
    shortName: 'FA',
    designation: 'Associate Professor & Head',
    email: 'fuad@metrouni.edu.bd',
    officeRoom: 'Room 502',
  },
  OHR: {
    id: 'fac-ohr',
    name: 'Obaidur Rahman',
    shortName: 'OHR',
    designation: 'Lecturer',
    email: 'obaidur@metrouni.edu.bd',
    officeRoom: 'Room 301',
  },
};

function formatPortalRoom(r: string): string {
  const clean = r.trim().toUpperCase();
  if (clean === 'E6' || clean === 'EXTEN-6') return 'Exten-6';
  if (clean === 'E3' || clean === 'EXTEN-3') return 'Exten-3';
  if (clean === 'E2' || clean === 'EXTEN-2') return 'Exten-2';
  if (clean === 'E4' || clean === 'EXTEN-4') return 'Exten-4';
  if (clean === 'E5' || clean === 'EXTEN-5') return 'Exten-5';
  if (clean.includes('LAB-1') || clean.includes('LAB 1')) return 'Room 301 (Lab-1)';
  if (clean.startsWith('ROOM ')) return clean;
  return `Room ${clean}`;
}

async function updateBatch9() {
  console.log('--- Step 1: Loading Local Database ---');
  const dbPath = path.join(process.cwd(), 'data', 'database.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // 1. Ensure faculty entries exist and have proper shortName
  if (!db.faculty) db.faculty = [];
  Object.values(TEACHER_MAP).forEach((teacher) => {
    const existingIdx = db.faculty.findIndex(
      (f: Faculty) => f.id === teacher.id || f.name.toLowerCase() === teacher.name.toLowerCase()
    );
    if (existingIdx >= 0) {
      db.faculty[existingIdx].shortName = teacher.shortName;
      db.faculty[existingIdx].name = teacher.name;
      db.faculty[existingIdx].officeRoom = db.faculty[existingIdx].officeRoom || teacher.officeRoom;
    } else {
      db.faculty.push({
        id: teacher.id,
        name: teacher.name,
        shortName: teacher.shortName,
        designation: teacher.designation,
        department: 'Software Engineering',
        email: teacher.email,
        officeRoom: teacher.officeRoom,
        photoUrl: '',
        assignedCourses: [],
      });
    }
  });

  // 2. Assign teachers to the courses
  console.log('--- Step 2: Assigning Teachers to Courses ---');
  if (!db.courses) db.courses = [];
  const courseAssignments: { courseKey: string; teacherKey: string }[] = [
    { courseKey: 'NA', teacherKey: 'RP' },
    { courseKey: 'CA', teacherKey: 'NSC' },
    { courseKey: 'OOP', teacherKey: 'FA' },
    { courseKey: 'OOP LAB', teacherKey: 'FA' },
    { courseKey: 'CP LAB', teacherKey: 'OHR' },
  ];

  courseAssignments.forEach(({ courseKey, teacherKey }) => {
    const courseMeta = COURSE_MAP[courseKey];
    const teacherMeta = TEACHER_MAP[teacherKey];
    if (!courseMeta || !teacherMeta) return;

    const matchCourse = db.courses.find(
      (c: Course) =>
        c.id === courseMeta.id ||
        c.code === courseMeta.code ||
        c.shortName === courseMeta.shortName
    );

    if (matchCourse) {
      matchCourse.assignedFacultyId = teacherMeta.id;
      matchCourse.assignedFacultyName = teacherMeta.name;
      console.log(`Assigned ${teacherMeta.name} (${teacherMeta.shortName}) -> ${matchCourse.code} (${matchCourse.title})`);
    } else {
      db.courses.push({
        id: courseMeta.id,
        code: courseMeta.code,
        shortName: courseMeta.shortName,
        title: courseMeta.title,
        credits: courseKey.includes('LAB') ? 1.5 : 3,
        type: courseKey.includes('LAB') ? 'LAB' : 'THEORY',
        semester: 5,
        assignedFacultyId: teacherMeta.id,
        assignedFacultyName: teacherMeta.name,
        batchIds: ['batch-9', 'batch-8'],
      });
      console.log(`Created course and assigned ${teacherMeta.name} -> ${courseMeta.code}`);
    }
  });

  // 3. Generate the 10 routine slots for batch-9
  console.log('--- Step 3: Updating Routine Slots for batch-9 ---');
  const updatedSlotsForBatch9: RoutineSlot[] = INPUT_SLOTS.map((slot, index) => {
    const isLab = slot.courseTitle.includes('LAB');
    const courseKey = isLab ? (slot.courseCode === 'CP' ? 'CP LAB' : 'OOP LAB') : slot.courseCode;
    const courseMeta = COURSE_MAP[courseKey];
    const teacherMeta = TEACHER_MAP[slot.teacherName];
    const roomStr = formatPortalRoom(slot.room);

    return {
      id: `rout-batch-9-${index + 1}`,
      batchId: 'batch-9',
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseId: courseMeta?.id || `course-${slot.courseCode.toLowerCase()}`,
      courseCode: courseMeta?.code || slot.courseCode,
      courseShortName: isLab ? (slot.courseCode === 'CP' ? 'CP Lab-1' : 'OOP Lab') : slot.courseCode,
      courseTitle: courseMeta?.title || slot.courseTitle,
      teacherName: teacherMeta?.name || slot.teacherName,
      teacherShortName: slot.teacherName,
      room: roomStr,
    };
  });

  // Remove existing routines for batch-9
  db.routines = (db.routines || []).filter(
    (r: RoutineSlot) => r.batchId !== 'batch-9'
  );

  // Add the newly updated routine slots for batch-9
  db.routines.push(...updatedSlotsForBatch9);

  // Save local database.json
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Saved database.json with ${db.routines.length} total routine slots.`);

  // 4. Sync with Supabase
  console.log('--- Step 4: Syncing with Supabase ---');
  const sb = getServerSupabase();
  if (sb) {
    try {
      // Upsert faculty
      const facultyRows = db.faculty.map((f: Faculty) => ({
        id: f.id,
        name: f.name,
        short_name: f.shortName || null,
        designation: f.designation,
        department: f.department || 'Software Engineering',
        email: f.email || null,
        phone: f.phone || null,
        office_room: f.officeRoom || '',
        photo_url: f.photoUrl || null,
        specialization: f.specialization || null,
        assigned_courses: f.assignedCourses || [],
      }));
      const { error: fErr } = await sb.from('faculty').upsert(facultyRows);
      if (fErr) console.warn('[Supabase Faculty Upsert Warning]:', fErr.message);
      else console.log('[Supabase Faculty Success] Upserted faculty to Supabase.');

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
      const { error: cErr } = await sb.from('courses').upsert(courseRows);
      if (cErr) console.warn('[Supabase Courses Upsert Warning]:', cErr.message);
      else console.log('[Supabase Courses Success] Upserted courses with teachers to Supabase.');

      // Delete old routine slots in Supabase for batch-9
      await sb.from('routine_slots').delete().eq('batch_id', 'batch-9');

      // Upsert new routine slots
      const routineRows = updatedSlotsForBatch9.map((r) => ({
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
        teacher_short_name: r.teacherShortName || null,
        room: r.room,
      }));

      const { error: rErr } = await sb.from('routine_slots').upsert(routineRows);
      if (rErr) console.warn('[Supabase Routine Slots Warning]:', rErr.message);
      else console.log('[Supabase Routine Slots Success] Upserted new routine slots for batch-9 to Supabase.');
    } catch (sbErr: any) {
      console.error('[Supabase Exception]:', sbErr.message);
    }
  }

  console.log('Batch 9 routine and teacher assignment update completed successfully!');
}

updateBatch9();
