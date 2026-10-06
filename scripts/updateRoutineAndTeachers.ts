import fs from 'fs';
import path from 'path';
import { getServerSupabase, initSupabase } from '../src/server/supabaseSync';
import type { RoutineSlot, Course, Faculty } from '../src/types';

// Initialize Supabase client
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
    courseCode: 'DM',
    courseTitle: 'DM',
    teacherName: 'SSJ',
    room: '505',
  },
  {
    day: 'SUNDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'SP',
    courseTitle: 'SP',
    teacherName: 'IAC',
    room: '505',
  },
  {
    day: 'MONDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'BP',
    courseTitle: 'BP',
    teacherName: 'CMW',
    room: 'E2',
  },
  {
    day: 'MONDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'LADE',
    courseTitle: 'LADE',
    teacherName: 'RP',
    room: 'E2',
  },
  {
    day: 'TUESDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'DM',
    courseTitle: 'DM',
    teacherName: 'SSJ',
    room: 'E3',
  },
  {
    day: 'TUESDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'BP',
    courseTitle: 'BP',
    teacherName: 'CMW',
    room: 'E5',
  },
  {
    day: 'WEDNESDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'LADE',
    courseTitle: 'LADE',
    teacherName: 'RP',
    room: '408',
  },
  {
    day: 'WEDNESDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'SP',
    courseTitle: 'SP',
    teacherName: 'IAC',
    room: '507',
  },
  {
    day: 'THURSDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'SP',
    courseTitle: 'SP LAB',
    teacherName: 'IAC',
    room: '301',
  },
  {
    day: 'THURSDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'SP',
    courseTitle: 'SP LAB',
    teacherName: 'IAC',
    room: '301',
  },
];

// Mapping helper for course codes, titles and full names
const COURSE_MAP: Record<
  string,
  { code: string; shortName: string; title: string; id: string }
> = {
  DM: {
    code: 'MAT-113',
    shortName: 'DM',
    title: 'Discrete Mathematics',
    id: 'course-sem2-mat-113',
  },
  SP: {
    code: 'SWE-121',
    shortName: 'SP',
    title: 'Structured Programming',
    id: 'course-sem2-swe-121',
  },
  'SP LAB': {
    code: 'SWE-122',
    shortName: 'SP LAB',
    title: 'Structured Programming Lab',
    id: 'course-sem2-swe-122',
  },
  BP: {
    code: 'PHY-111',
    shortName: 'BP',
    title: 'Basic Physics',
    id: 'course-sem2-phy-111',
  },
  LADE: {
    code: 'MAT-112',
    shortName: 'LADE',
    title: 'Linear Algebra & Differential Equations',
    id: 'course-sem2-mat-112',
  },
};

// Teacher mapping: Short Name -> Full Name, ID, Designation
const TEACHER_MAP: Record<
  string,
  { id: string; name: string; shortName: string; designation: string; email: string; officeRoom: string }
> = {
  SSJ: {
    id: 'fac-8',
    name: 'Syeda Sanjida Rahman',
    shortName: 'SSJ',
    designation: 'Lecturer',
    email: 'sanjida@metrouni.edu.bd',
    officeRoom: 'Room 505',
  },
  IAC: {
    id: 'fac-6',
    name: 'Iffat Ahmed Chowdhury Nahid',
    shortName: 'IAC',
    designation: 'Lecturer',
    email: 'nahid@metrouni.edu.bd',
    officeRoom: 'Room 505',
  },
  CMW: {
    id: 'fac-cmw',
    name: 'Chowdhury Mahir Wahid',
    shortName: 'CMW',
    designation: 'Lecturer',
    email: 'mahir.wahid@metrouni.edu.bd',
    officeRoom: 'Exten-2',
  },
  RP: {
    id: 'fac-3',
    name: 'Rina Paul',
    shortName: 'RP',
    designation: 'Assistant Professor',
    email: 'rina@metrouni.edu.bd',
    officeRoom: 'Room 408',
  },
};

// Format room according to portal standard rooms
function formatPortalRoom(r: string): string {
  const clean = r.trim().toUpperCase();
  if (clean === 'E2' || clean === 'EXTEN-2') return 'Exten-2';
  if (clean === 'E3' || clean === 'EXTEN-3') return 'Exten-3';
  if (clean === 'E4' || clean === 'EXTEN-4') return 'Exten-4';
  if (clean === 'E5' || clean === 'EXTEN-5') return 'Exten-5';
  if (clean.startsWith('ROOM ')) return clean;
  return `Room ${clean}`;
}

async function updateAll() {
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
    { courseKey: 'DM', teacherKey: 'SSJ' },
    { courseKey: 'SP', teacherKey: 'IAC' },
    { courseKey: 'SP LAB', teacherKey: 'IAC' },
    { courseKey: 'BP', teacherKey: 'CMW' },
    { courseKey: 'LADE', teacherKey: 'RP' },
  ];

  courseAssignments.forEach(({ courseKey, teacherKey }) => {
    const courseMeta = COURSE_MAP[courseKey];
    const teacherMeta = TEACHER_MAP[teacherKey];
    if (!courseMeta || !teacherMeta) return;

    // Find in db.courses
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
      // Create course if not found
      db.courses.push({
        id: courseMeta.id,
        code: courseMeta.code,
        shortName: courseMeta.shortName,
        title: courseMeta.title,
        credits: courseKey.includes('LAB') ? 1.5 : 3,
        type: courseKey.includes('LAB') ? 'LAB' : 'THEORY',
        semester: 2,
        assignedFacultyId: teacherMeta.id,
        assignedFacultyName: teacherMeta.name,
        batchIds: ['batch-12', 'batch-1788449554669', 'batch-11'],
      });
      console.log(`Created course and assigned ${teacherMeta.name} -> ${courseMeta.code}`);
    }
  });

  // 3. Generate the 10 routine slots
  console.log('--- Step 3: Updating Routine Slots ---');
  const targetBatchIds = ['batch-12', 'batch-1788449554669'];

  const updatedSlotsForBatch12: RoutineSlot[] = INPUT_SLOTS.map((slot, index) => {
    const isLab = slot.courseTitle.includes('LAB');
    const courseMeta = isLab ? COURSE_MAP['SP LAB'] : COURSE_MAP[slot.courseCode];
    const teacherMeta = TEACHER_MAP[slot.teacherName];
    const roomStr = formatPortalRoom(slot.room);

    return {
      id: `rout-batch-12-${index + 1}`,
      batchId: 'batch-12',
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseId: courseMeta?.id || `course-${slot.courseCode.toLowerCase()}`,
      courseCode: courseMeta?.code || slot.courseCode,
      courseShortName: isLab ? 'SP Lab' : slot.courseCode,
      courseTitle: courseMeta?.title || slot.courseTitle,
      teacherName: teacherMeta?.name || slot.teacherName,
      teacherShortName: slot.teacherName,
      room: roomStr,
    };
  });

  const updatedSlotsForBatchAlias: RoutineSlot[] = INPUT_SLOTS.map((slot, index) => {
    const isLab = slot.courseTitle.includes('LAB');
    const courseMeta = isLab ? COURSE_MAP['SP LAB'] : COURSE_MAP[slot.courseCode];
    const teacherMeta = TEACHER_MAP[slot.teacherName];
    const roomStr = formatPortalRoom(slot.room);

    return {
      id: `rout-batch-1788449554669-${index + 1}`,
      batchId: 'batch-1788449554669',
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseId: courseMeta?.id || `course-${slot.courseCode.toLowerCase()}`,
      courseCode: courseMeta?.code || slot.courseCode,
      courseShortName: isLab ? 'SP Lab' : slot.courseCode,
      courseTitle: courseMeta?.title || slot.courseTitle,
      teacherName: teacherMeta?.name || slot.teacherName,
      teacherShortName: slot.teacherName,
      room: roomStr,
    };
  });

  // Remove existing routines for batch-12 and batch-1788449554669
  db.routines = (db.routines || []).filter(
    (r: RoutineSlot) => !targetBatchIds.includes(r.batchId)
  );

  // Add the newly updated routine slots
  db.routines.push(...updatedSlotsForBatch12, ...updatedSlotsForBatchAlias);

  // Save local database.json
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Saved database.json with ${db.routines.length} total routine slots.`);

  // 4. Sync with Supabase if configured
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

      // Delete old routine slots in Supabase for batch-12 and batch-1788449554669
      await sb.from('routine_slots').delete().in('batch_id', targetBatchIds);

      // Upsert new routine slots
      const routineRows = [...updatedSlotsForBatch12, ...updatedSlotsForBatchAlias].map((r) => ({
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
      else console.log('[Supabase Routine Slots Success] Upserted new routine slots to Supabase.');
    } catch (sbErr: any) {
      console.error('[Supabase Exception]:', sbErr.message);
    }
  }

  console.log('Routine and teacher assignment update completed successfully!');
}

updateAll();
