import fs from 'fs';
import path from 'path';
import { getServerSupabase, initSupabase } from '../src/server/supabaseSync';
import type { RoutineSlot, Course, Faculty } from '../src/types';

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
    courseCode: 'DBMS',
    courseTitle: 'DBMS',
    teacherName: 'NHN',
    room: '504',
  },
  {
    day: 'SUNDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'ALGO',
    courseTitle: 'ALGO',
    teacherName: 'AAC',
    room: '504',
  },
  {
    day: 'MONDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'ALGO',
    courseTitle: 'ALGO LAB',
    teacherName: 'AAC',
    room: '301',
  },
  {
    day: 'MONDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'ALGO',
    courseTitle: 'ALGO LAB',
    teacherName: 'AAC',
    room: '301',
  },
  {
    day: 'MONDAY',
    startTime: '12:00 PM',
    endTime: '01:30 PM',
    courseCode: 'SRE',
    courseTitle: 'SRE',
    teacherName: 'WIC',
    room: '403',
  },
  {
    day: 'TUESDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'DBMS',
    courseTitle: 'DBMS',
    teacherName: 'NHN',
    room: '403',
  },
  {
    day: 'TUESDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'ALGO',
    courseTitle: 'ALGO',
    teacherName: 'AAC',
    room: '501',
  },
  {
    day: 'WEDNESDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'NA',
    courseTitle: 'NA',
    teacherName: 'SSJ',
    room: 'E4',
  },
  {
    day: 'WEDNESDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'DBMS',
    courseTitle: 'DBMS LAB',
    teacherName: 'NHN',
    room: '301',
  },
  {
    day: 'WEDNESDAY',
    startTime: '12:00 PM',
    endTime: '01:30 PM',
    courseCode: 'DBMS',
    courseTitle: 'DBMS LAB',
    teacherName: 'NHN',
    room: '301',
  },
  {
    day: 'THURSDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'SRE',
    courseTitle: 'SRE',
    teacherName: 'WIC',
    room: '403',
  },
  {
    day: 'THURSDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'NA',
    courseTitle: 'NA',
    teacherName: 'SSJ',
    room: '403',
  },
];

const COURSE_MAP: Record<
  string,
  { code: string; shortName: string; title: string; id: string; credits: number; type: 'THEORY' | 'LAB' }
> = {
  DBMS: {
    code: 'SWE-225',
    shortName: 'DBMS',
    title: 'Database Management System',
    id: 'course-sem4-swe-225',
    credits: 3,
    type: 'THEORY',
  },
  'DBMS LAB': {
    code: 'SWE-226',
    shortName: 'DBMS LAB',
    title: 'Database Management System Lab',
    id: 'course-sem4-swe-226',
    credits: 1.5,
    type: 'LAB',
  },
  ALGO: {
    code: 'SWE-221',
    shortName: 'ALGO',
    title: 'Algorithm',
    id: 'course-sem4-swe-221',
    credits: 3,
    type: 'THEORY',
  },
  'ALGO LAB': {
    code: 'SWE-222',
    shortName: 'ALGO LAB',
    title: 'Algorithm Lab',
    id: 'course-sem4-swe-222',
    credits: 1.5,
    type: 'LAB',
  },
  SRE: {
    code: 'SWE-231',
    shortName: 'SRE',
    title: 'Software Requirement Engineering',
    id: 'course-sem4-swe-231',
    credits: 3,
    type: 'THEORY',
  },
  NA: {
    code: 'MAT-211',
    shortName: 'NA',
    title: 'Numerical Analysis',
    id: 'course-sem4-mat-211',
    credits: 3,
    type: 'THEORY',
  },
};

const TEACHER_MAP: Record<
  string,
  { id: string; name: string; shortName: string; designation: string; email: string }
> = {
  NHN: {
    id: 'fac-7',
    name: 'Nazia Hassan',
    shortName: 'NHN',
    designation: 'Lecturer',
    email: 'naziahassan@metrouni.edu.bd',
  },
  AAC: {
    id: 'fac-4',
    name: 'Al Akram Chowdhury',
    shortName: 'AAC',
    designation: 'Assistant Professor',
    email: 'alakram@metrouni.edu.bd',
  },
  WIC: {
    id: 'fac-5',
    name: 'Wadia Iqbal Chowdhury',
    shortName: 'WIC',
    designation: 'Assistant Professor',
    email: 'wadia@metrouni.edu.bd',
  },
  SSJ: {
    id: 'fac-8',
    name: 'Syeda Sanjida Rahman',
    shortName: 'SSJ',
    designation: 'Lecturer',
    email: 'sanjida@metrouni.edu.bd',
  },
};

function formatPortalRoom(r: string): string {
  const clean = r.trim().toUpperCase();
  if (clean === 'E4' || clean === 'EXTEN-4') return 'Exten-4';
  if (clean === 'E3' || clean === 'EXTEN-3') return 'Exten-3';
  if (clean === 'E2' || clean === 'EXTEN-2') return 'Exten-2';
  if (clean.startsWith('ROOM ')) return clean;
  return `Room ${clean}`;
}

async function updateBatch10() {
  console.log('--- Step 1: Loading Local Database ---');
  const dbPath = path.join(process.cwd(), 'data', 'database.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // 1. Update batch-10 semester to 4 if needed
  const batch10 = (db.batches || []).find((b: any) => b.id === 'batch-10');
  if (batch10) {
    batch10.currentSemester = 4;
    console.log('Updated SWE 10th Batch currentSemester to 4');
  }

  // 2. Ensure faculty entries exist and have proper shortName
  if (!db.faculty) db.faculty = [];
  Object.values(TEACHER_MAP).forEach((teacher) => {
    const existing = db.faculty.find((f: Faculty) => f.id === teacher.id);
    if (existing) {
      existing.shortName = teacher.shortName;
      existing.name = teacher.name;
    }
  });

  // 3. Assign teachers to the courses and associate with batch-10
  console.log('--- Step 2: Assigning Teachers to Courses ---');
  if (!db.courses) db.courses = [];
  const courseAssignments: { courseKey: string; teacherKey: string }[] = [
    { courseKey: 'DBMS', teacherKey: 'NHN' },
    { courseKey: 'DBMS LAB', teacherKey: 'NHN' },
    { courseKey: 'ALGO', teacherKey: 'AAC' },
    { courseKey: 'ALGO LAB', teacherKey: 'AAC' },
    { courseKey: 'SRE', teacherKey: 'WIC' },
    { courseKey: 'NA', teacherKey: 'SSJ' },
  ];

  courseAssignments.forEach(({ courseKey, teacherKey }) => {
    const courseMeta = COURSE_MAP[courseKey];
    const teacherMeta = TEACHER_MAP[teacherKey];
    if (!courseMeta || !teacherMeta) return;

    let matchCourse = db.courses.find(
      (c: Course) =>
        c.id === courseMeta.id ||
        (c.code === courseMeta.code && (c.semester === 4 || courseKey === 'NA'))
    );

    if (matchCourse) {
      matchCourse.assignedFacultyId = teacherMeta.id;
      matchCourse.assignedFacultyName = teacherMeta.name;
      if (!matchCourse.batchIds) matchCourse.batchIds = [];
      if (!matchCourse.batchIds.includes('batch-10')) {
        matchCourse.batchIds.push('batch-10');
      }
      console.log(`Assigned ${teacherMeta.name} (${teacherMeta.shortName}) -> ${matchCourse.code} (${matchCourse.title}) for batch-10`);
    } else {
      matchCourse = {
        id: courseMeta.id,
        code: courseMeta.code,
        shortName: courseMeta.shortName,
        title: courseMeta.title,
        credits: courseMeta.credits,
        type: courseMeta.type,
        semester: 4,
        assignedFacultyId: teacherMeta.id,
        assignedFacultyName: teacherMeta.name,
        batchIds: ['batch-10'],
      };
      db.courses.push(matchCourse);
      console.log(`Created course and assigned ${teacherMeta.name} -> ${courseMeta.code}`);
    }
  });

  // 4. Generate the 12 routine slots for batch-10
  console.log('--- Step 3: Updating Routine Slots for batch-10 ---');
  const updatedSlotsForBatch10: RoutineSlot[] = INPUT_SLOTS.map((slot, index) => {
    const isLab = slot.courseTitle.includes('LAB');
    const courseKey = isLab ? `${slot.courseCode} LAB` : slot.courseCode;
    const courseMeta = COURSE_MAP[courseKey] || COURSE_MAP[slot.courseCode];
    const teacherMeta = TEACHER_MAP[slot.teacherName];
    const roomStr = formatPortalRoom(slot.room);

    return {
      id: `rout-batch-10-${index + 1}`,
      batchId: 'batch-10',
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseId: courseMeta?.id || `course-${slot.courseCode.toLowerCase()}`,
      courseCode: courseMeta?.code || slot.courseCode,
      courseShortName: isLab ? `${slot.courseCode} Lab` : slot.courseCode,
      courseTitle: courseMeta?.title || slot.courseTitle,
      teacherName: teacherMeta?.name || slot.teacherName,
      teacherShortName: slot.teacherName,
      room: roomStr,
    };
  });

  // Remove existing routines for batch-10
  db.routines = (db.routines || []).filter(
    (r: RoutineSlot) => r.batchId !== 'batch-10'
  );

  // Add the newly updated routine slots for batch-10
  db.routines.push(...updatedSlotsForBatch10);

  // Save local database.json
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Saved database.json with ${db.routines.length} total routine slots.`);

  // 5. Sync with Supabase
  console.log('--- Step 4: Syncing with Supabase ---');
  const sb = getServerSupabase();
  if (sb) {
    try {
      // Update batch-10 semester
      await sb.from('batches').update({ current_semester: 4 }).eq('id', 'batch-10');

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

      // Delete old routine slots in Supabase for batch-10
      await sb.from('routine_slots').delete().eq('batch_id', 'batch-10');

      // Upsert new routine slots
      const routineRows = updatedSlotsForBatch10.map((r) => ({
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
      else console.log('[Supabase Routine Slots Success] Upserted new routine slots for batch-10 to Supabase.');
    } catch (sbErr: any) {
      console.error('[Supabase Exception]:', sbErr.message);
    }
  }

  console.log('Batch 10 routine and teacher assignment update completed successfully!');
}

updateBatch10();
