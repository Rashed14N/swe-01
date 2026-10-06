import fs from 'fs';
import path from 'path';
import { getServerSupabase, initSupabase } from '../src/server/supabaseSync';
import type { RoutineSlot, Course, Batch } from '../src/types';

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
    courseCode: 'DS',
    courseTitle: 'DS LAB',
    teacherName: 'IAC',
    room: '405',
  },
  {
    day: 'MONDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'DS',
    courseTitle: 'DS LAB',
    teacherName: 'IAC',
    room: '405',
  },
  {
    day: 'TUESDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'DS',
    courseTitle: 'DS',
    teacherName: 'IAC',
    room: 'E5',
  },
  {
    day: 'TUESDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'MIS',
    courseTitle: 'MIS',
    teacherName: 'WIC',
    room: 'E3',
  },
  {
    day: 'WEDNESDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'NA',
    courseTitle: 'NA',
    teacherName: 'SSJ',
    room: '502',
  },
  {
    day: 'WEDNESDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'DS',
    courseTitle: 'DS',
    teacherName: 'IAC',
    room: '502',
  },
  {
    day: 'WEDNESDAY',
    startTime: '12:00 PM',
    endTime: '01:30 PM',
    courseCode: 'MIS',
    courseTitle: 'MIS',
    teacherName: 'WIC',
    room: 'E3',
  },
  {
    day: 'THURSDAY',
    startTime: '09:00 AM',
    endTime: '10:30 AM',
    courseCode: 'NA',
    courseTitle: 'NA',
    teacherName: 'SSJ',
    room: 'E3',
  },
  {
    day: 'THURSDAY',
    startTime: '10:30 AM',
    endTime: '12:00 PM',
    courseCode: 'PPD',
    courseTitle: 'PPD LAB',
    teacherName: 'AAC',
    room: '309',
  },
  {
    day: 'THURSDAY',
    startTime: '12:00 PM',
    endTime: '01:30 PM',
    courseCode: 'PPD',
    courseTitle: 'PPD LAB',
    teacherName: 'AAC',
    room: '309',
  },
];

const COURSE_MAP: Record<
  string,
  { code: string; shortName: string; title: string; id: string; credits: number; type: 'THEORY' | 'LAB' | 'PROJECT' }
> = {
  DS: {
    code: 'SWE-123',
    shortName: 'DS',
    title: 'Data Structures',
    id: 'course-sem3-swe-123',
    credits: 3,
    type: 'THEORY',
  },
  'DS LAB': {
    code: 'SWE-124',
    shortName: 'DS LAB',
    title: 'Data Structure Lab',
    id: 'course-sem3-swe-124',
    credits: 1.5,
    type: 'LAB',
  },
  MIS: {
    code: 'SWE-235',
    shortName: 'MIS',
    title: 'Management Information Systems',
    id: 'course-sem3-swe-235',
    credits: 3,
    type: 'THEORY',
  },
  'PPD LAB': {
    code: 'SWE-182',
    shortName: 'PPD',
    title: 'Project on Python Development',
    id: 'course-sem3-swe-182',
    credits: 3,
    type: 'PROJECT',
  },
  NA: {
    code: 'MAT-211',
    shortName: 'NA',
    title: 'Numerical Analysis',
    id: 'course-sem3-mat-211',
    credits: 3,
    type: 'THEORY',
  },
};

const TEACHER_MAP: Record<
  string,
  { id: string; name: string; shortName: string }
> = {
  IAC: {
    id: 'fac-6',
    name: 'Iffat Ahmed Chowdhury Nahid',
    shortName: 'IAC',
  },
  WIC: {
    id: 'fac-5',
    name: 'Wadia Iqbal Chowdhury',
    shortName: 'WIC',
  },
  SSJ: {
    id: 'fac-8',
    name: 'Syeda Sanjida Rahman',
    shortName: 'SSJ',
  },
  AAC: {
    id: 'fac-4',
    name: 'Al Akram Chowdhury',
    shortName: 'AAC',
  },
};

function formatPortalRoom(r: string): string {
  const clean = r.trim().toUpperCase();
  if (clean === 'E3' || clean === 'EXTEN-3') return 'Exten-3';
  if (clean === 'E5' || clean === 'EXTEN-5') return 'Exten-5';
  if (clean.startsWith('ROOM ')) return clean;
  return `Room ${clean}`;
}

async function updateBatch11() {
  console.log('--- Step 1: Loading Local Database ---');
  const dbPath = path.join(process.cwd(), 'data', 'database.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // 1. Ensure batch-11 exists in db.batches
  if (!db.batches) db.batches = [];
  let batch11 = db.batches.find((b: Batch) => b.id === 'batch-11');
  if (!batch11) {
    batch11 = {
      id: 'batch-11',
      name: 'SWE 11th Batch',
      admissionYear: 2025,
      currentSemester: 3,
      academicSession: '2025-2026',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2025-01-15T00:00:00Z',
    };
    db.batches.push(batch11);
    console.log('Added SWE 11th Batch to database.json batches');
  } else {
    batch11.currentSemester = 3;
  }

  // 2. Assign teachers to the courses and associate with batch-11
  console.log('--- Step 2: Assigning Teachers to Courses ---');
  if (!db.courses) db.courses = [];
  const courseAssignments: { courseKey: string; teacherKey: string }[] = [
    { courseKey: 'DS', teacherKey: 'IAC' },
    { courseKey: 'DS LAB', teacherKey: 'IAC' },
    { courseKey: 'MIS', teacherKey: 'WIC' },
    { courseKey: 'PPD LAB', teacherKey: 'AAC' },
    { courseKey: 'NA', teacherKey: 'SSJ' },
  ];

  courseAssignments.forEach(({ courseKey, teacherKey }) => {
    const courseMeta = COURSE_MAP[courseKey];
    const teacherMeta = TEACHER_MAP[teacherKey];
    if (!courseMeta || !teacherMeta) return;

    let matchCourse = db.courses.find(
      (c: Course) =>
        c.id === courseMeta.id ||
        (c.code === courseMeta.code && (c.semester === 3 || courseKey === 'NA'))
    );

    if (matchCourse) {
      matchCourse.assignedFacultyId = teacherMeta.id;
      matchCourse.assignedFacultyName = teacherMeta.name;
      if (!matchCourse.batchIds) matchCourse.batchIds = [];
      if (!matchCourse.batchIds.includes('batch-11')) {
        matchCourse.batchIds.push('batch-11');
      }
      console.log(`Assigned ${teacherMeta.name} (${teacherMeta.shortName}) -> ${matchCourse.code} (${matchCourse.title}) for batch-11`);
    } else {
      matchCourse = {
        id: courseMeta.id,
        code: courseMeta.code,
        shortName: courseMeta.shortName,
        title: courseMeta.title,
        credits: courseMeta.credits,
        type: courseMeta.type,
        semester: 3,
        assignedFacultyId: teacherMeta.id,
        assignedFacultyName: teacherMeta.name,
        batchIds: ['batch-11'],
      };
      db.courses.push(matchCourse);
      console.log(`Created course and assigned ${teacherMeta.name} -> ${courseMeta.code}`);
    }
  });

  // 3. Generate the 10 routine slots for batch-11
  console.log('--- Step 3: Updating Routine Slots for batch-11 ---');
  const updatedSlotsForBatch11: RoutineSlot[] = INPUT_SLOTS.map((slot, index) => {
    const isLab = slot.courseTitle.includes('LAB');
    const courseKey = isLab ? (slot.courseCode === 'DS' ? 'DS LAB' : 'PPD LAB') : slot.courseCode;
    const courseMeta = COURSE_MAP[courseKey] || COURSE_MAP[slot.courseCode];
    const teacherMeta = TEACHER_MAP[slot.teacherName];
    const roomStr = formatPortalRoom(slot.room);

    return {
      id: `rout-batch-11-${index + 1}`,
      batchId: 'batch-11',
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseId: courseMeta?.id || `course-${slot.courseCode.toLowerCase()}`,
      courseCode: courseMeta?.code || slot.courseCode,
      courseShortName: isLab ? (slot.courseCode === 'DS' ? 'DS Lab' : 'PPD Lab') : slot.courseCode,
      courseTitle: courseMeta?.title || slot.courseTitle,
      teacherName: teacherMeta?.name || slot.teacherName,
      teacherShortName: slot.teacherName,
      room: roomStr,
    };
  });

  // Remove existing routines for batch-11
  db.routines = (db.routines || []).filter(
    (r: RoutineSlot) => r.batchId !== 'batch-11'
  );

  // Add the newly updated routine slots for batch-11
  db.routines.push(...updatedSlotsForBatch11);

  // Save local database.json
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Saved database.json with ${db.routines.length} total routine slots.`);

  // 4. Sync with Supabase
  console.log('--- Step 4: Syncing with Supabase ---');
  const sb = getServerSupabase();
  if (sb) {
    try {
      // Upsert batch-11
      const batchRow = {
        id: batch11.id,
        name: batch11.name,
        admission_year: batch11.admissionYear,
        current_semester: batch11.currentSemester,
        academic_session: batch11.academicSession,
        semester_mode: batch11.semesterMode,
        status: batch11.status,
      };
      await sb.from('batches').upsert(batchRow);
      console.log('[Supabase Batch Success] Upserted batch-11 to Supabase.');

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

      // Delete old routine slots in Supabase for batch-11
      await sb.from('routine_slots').delete().eq('batch_id', 'batch-11');

      // Upsert new routine slots
      const routineRows = updatedSlotsForBatch11.map((r) => ({
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
      else console.log('[Supabase Routine Slots Success] Upserted new routine slots for batch-11 to Supabase.');
    } catch (sbErr: any) {
      console.error('[Supabase Exception]:', sbErr.message);
    }
  }

  console.log('Batch 11 routine and teacher assignment update completed successfully!');
}

updateBatch11();
