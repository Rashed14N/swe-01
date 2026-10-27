import fs from 'fs';
import path from 'path';
import { getServerSupabase, initSupabase } from '../src/server/supabaseSync';
import type { RoutineSlot, Course, Faculty } from '../src/types';

initSupabase();

const routineFilePath = path.join(process.cwd(), 'public/assets/aistudio/swe_autumn_2026_batch_wise_routine_f8a3a9ff.json');
const routineJson = JSON.parse(fs.readFileSync(routineFilePath, 'utf8'));

const dbPath = path.join(process.cwd(), 'data/database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const timeMap: Record<string, { startTime: string; endTime: string }> = {
  '09:00-10:30': { startTime: '09:00 AM', endTime: '10:30 AM' },
  '10:30-12:00': { startTime: '10:30 AM', endTime: '12:00 PM' },
  '12:00-13:30': { startTime: '12:00 PM', endTime: '01:30 PM' },
  '13:30-15:00': { startTime: '01:30 PM', endTime: '03:00 PM' },
  '15:00-16:30': { startTime: '03:00 PM', endTime: '04:30 PM' },
  '16:30-18:00': { startTime: '04:30 PM', endTime: '06:00 PM' },
};

const teacherMap: Record<string, { id: string; name: string; shortName: string; designation: string; email?: string; officeRoom?: string }> = {
  FA: { id: 'fac-1', name: 'Fuad Ahmed', shortName: 'FA', designation: 'Professor & Head', email: 'fahmed@metrouni.edu.bd', officeRoom: 'Room 502' },
  NSC: { id: 'fac-2', name: 'Nazia Sultana Chowdhury', shortName: 'NSC', designation: 'Assistant Professor', email: 'nazia@metrouni.edu.bd', officeRoom: 'Room 503' },
  RP: { id: 'fac-3', name: 'Rina Paul', shortName: 'RP', designation: 'Assistant Professor', email: 'rina@metrouni.edu.bd', officeRoom: 'Room 408' },
  AAC: { id: 'fac-4', name: 'Al Akram Chowdhury', shortName: 'AAC', designation: 'Assistant Professor', email: 'akram@metrouni.edu.bd', officeRoom: 'Room 503' },
  WIC: { id: 'fac-5', name: 'Wadia Iqbal Chowdhury', shortName: 'WIC', designation: 'Assistant Professor', email: 'wadia@metrouni.edu.bd', officeRoom: 'Room 503' },
  IAC: { id: 'fac-6', name: 'Iffat Ahmed Chowdhury Nahid', shortName: 'IAC', designation: 'Lecturer', email: 'iffat@metrouni.edu.bd', officeRoom: 'Room 505' },
  NHN: { id: 'fac-7', name: 'Nazia Hassan Nisa', shortName: 'NHN', designation: 'Lecturer', email: 'nisa@metrouni.edu.bd', officeRoom: 'Room 505' },
  SSJ: { id: 'fac-8', name: 'Syeda Sanjida Rahman', shortName: 'SSJ', designation: 'Lecturer', email: 'sanjida@metrouni.edu.bd', officeRoom: 'Room 505' },
  LN: { id: 'fac-10', name: 'Lukman Hussain Nakib', shortName: 'LN', designation: 'Lecturer', email: 'nakib@metrouni.edu.bd', officeRoom: 'Room 505' },
  MKB: { id: 'fac-11', name: 'Mridul Kanti Bhattacharjee', shortName: 'MKB', designation: 'Adjunct Faculty', email: 'mridul@metrouni.edu.bd', officeRoom: '' },
  AIR: { id: 'fac-air', name: 'A.I. Rahman', shortName: 'AIR', designation: 'Lecturer', email: 'air@metrouni.edu.bd', officeRoom: 'Room 109' },
  CMW: { id: 'fac-cmw', name: 'Chowdhury Mahir Wahid', shortName: 'CMW', designation: 'Lecturer', email: 'mahir.wahid@metrouni.edu.bd', officeRoom: 'Exten-2' },
  OHR: { id: 'fac-ohr', name: 'Obaidur Rahman', shortName: 'OHR', designation: 'Lecturer', email: 'obaidur@metrouni.edu.bd', officeRoom: 'Room 301' },
  MZUK: { id: 'fac-mzuk', name: 'Md. Ziaul Karim', shortName: 'MZUK', designation: 'Assistant Professor', email: 'ziaul@metrouni.edu.bd', officeRoom: 'Room 405' },
  SAM: { id: 'fac-sam', name: 'Sheikh Ashikur Mahmud', shortName: 'SAM', designation: 'Assistant Professor (English)', email: 'sam@metrouni.edu.bd', officeRoom: 'Room 402' },
  ACM: { id: 'fac-acm', name: 'ACM Workshop / Trainer', shortName: 'ACM', designation: 'Competitive Programming Trainer', email: 'acm@metrouni.edu.bd', officeRoom: 'Room 301' },
};

const courseCatalog: Record<string, { code: string; title: string; shortName: string; credits: number; type: 'THEORY' | 'LAB' }> = {
  'NA': { code: 'MAT-211', title: 'Numerical Analysis', shortName: 'NA', credits: 3, type: 'THEORY' },
  'NN&DL': { code: 'SWE-443', title: 'Neural Networks & Deep Learning', shortName: 'NN&DL', credits: 3, type: 'THEORY' },
  'NN&DL Lab': { code: 'SWE-444', title: 'Neural Networks & Deep Learning Lab', shortName: 'NN&DL Lab', credits: 1.5, type: 'LAB' },
  'CP Lab-2': { code: 'SWE-232', title: 'Problem Solving with Competitive Programming Lab-2', shortName: 'CP Lab-2', credits: 1.5, type: 'LAB' },
  'ACM': { code: 'ACM', title: 'ACM Workshop', shortName: 'ACM', credits: 1.5, type: 'LAB' },
  'IC': { code: 'SWE-461', title: 'Introduction to Cryptography', shortName: 'IC', credits: 3, type: 'THEORY' },
  'MDP Lab': { code: 'SWE-422', title: 'Mobile App Development Practice Lab', shortName: 'MDP Lab', credits: 1.5, type: 'LAB' },
  'ML Lab': { code: 'SWE-432', title: 'Machine Learning Lab', shortName: 'ML Lab', credits: 1.5, type: 'LAB' },
  'ML': { code: 'SWE-431', title: 'Machine Learning & Predictive Systems', shortName: 'ML', credits: 3, type: 'THEORY' },
  'ED': { code: 'GED-403', title: 'Entrepreneurship Development', shortName: 'ED', credits: 3, type: 'THEORY' },
  'CN': { code: 'SWE-313', title: 'Computer Networking', shortName: 'CN', credits: 3, type: 'THEORY' },
  'CN Lab': { code: 'SWE-314', title: 'Computer Networking Lab', shortName: 'CN Lab', credits: 1.5, type: 'LAB' },
  'WP Lab': { code: 'SWE-322', title: 'Web Programming Practice Lab', shortName: 'WP Lab', credits: 1.5, type: 'LAB' },
  'SVT': { code: 'SWE-333', title: 'Software Verification & Testing', shortName: 'SVT', credits: 3, type: 'THEORY' },
  'SVT Lab': { code: 'SWE-334', title: 'Software Verification & Testing Lab', shortName: 'SVT Lab', credits: 1.5, type: 'LAB' },
  'DMT Lab': { code: 'SWE-342', title: 'Data Mining Tools Lab', shortName: 'DMT Lab', credits: 1.5, type: 'LAB' },
  'SADP Lab': { code: 'SWE-234', title: 'Software Architecture and Design Patterns Lab', shortName: 'SADP Lab', credits: 1.5, type: 'LAB' },
  'SADP': { code: 'SWE-233', title: 'Software Architecture and Design Patterns', shortName: 'SADP', credits: 3, type: 'THEORY' },
  'BEEC': { code: 'SWE-111', title: 'Basic Electrical and Electronic Circuits', shortName: 'BEEC', credits: 3, type: 'THEORY' },
  'BEEC Lab': { code: 'SWE-112', title: 'Basic Electrical and Electronic Circuits Lab', shortName: 'BEEC Lab', credits: 1.5, type: 'LAB' },
  'JGD Lab': { code: 'SWE-282', title: 'Project on Java GUI Development Lab', shortName: 'JGD Lab', credits: 1.5, type: 'LAB' },
  'CA': { code: 'SWE-211', title: 'Computer Architecture', shortName: 'CA', credits: 3, type: 'THEORY' },
  'OOP': { code: 'SWE-223', title: 'Object Oriented Programming', shortName: 'OOP', credits: 3, type: 'THEORY' },
  'OOP Lab': { code: 'SWE-224', title: 'Object Oriented Programming Lab', shortName: 'OOP Lab', credits: 1.5, type: 'LAB' },
  'CP Lab-1': { code: 'SWE-230', title: 'Problem Solving with Competitive Programming Lab-1', shortName: 'CP Lab-1', credits: 1.5, type: 'LAB' },
  'DBMS': { code: 'SWE-225', title: 'Database Management System', shortName: 'DBMS', credits: 3, type: 'THEORY' },
  'DBMS Lab': { code: 'SWE-226', title: 'Database Management System Lab', shortName: 'DBMS Lab', credits: 1.5, type: 'LAB' },
  'ALGO': { code: 'SWE-221', title: 'Algorithm', shortName: 'ALGO', credits: 3, type: 'THEORY' },
  'ALGO Lab': { code: 'SWE-222', title: 'Algorithm Lab', shortName: 'ALGO Lab', credits: 1.5, type: 'LAB' },
  'SRE': { code: 'SWE-231', title: 'Software Requirement Engineering', shortName: 'SRE', credits: 3, type: 'THEORY' },
  'DS': { code: 'SWE-123', title: 'Data Structures', shortName: 'DS', credits: 3, type: 'THEORY' },
  'DS Lab': { code: 'SWE-124', title: 'Data Structure Lab', shortName: 'DS Lab', credits: 1.5, type: 'LAB' },
  'MIS': { code: 'SWE-235', title: 'Management Information Systems', shortName: 'MIS', credits: 3, type: 'THEORY' },
  'PPD Lab': { code: 'SWE-182', title: 'Project on Python Development Lab', shortName: 'PPD Lab', credits: 1.5, type: 'LAB' },
  'DM': { code: 'MAT-113', title: 'Discrete Mathematics', shortName: 'DM', credits: 3, type: 'THEORY' },
  'SP': { code: 'SWE-121', title: 'Structured Programming', shortName: 'SP', credits: 3, type: 'THEORY' },
  'SP Lab': { code: 'SWE-122', title: 'Structured Programming Lab', shortName: 'SP Lab', credits: 1.5, type: 'LAB' },
  'BP': { code: 'PHY-111', title: 'Basic Physics', shortName: 'BP', credits: 3, type: 'THEORY' },
  'LADE': { code: 'MAT-112', title: 'Linear Algebra & Differential Equations', shortName: 'LADE', credits: 3, type: 'THEORY' },
  'DIC': { code: 'MAT-111', title: 'Differential & Integral Calculus', shortName: 'DIC', credits: 3, type: 'THEORY' },
  'CEL-I': { code: 'GED-101', title: 'Communicative English Language I', shortName: 'CEL-I', credits: 3, type: 'THEORY' },
  'BS': { code: 'GED-105', title: 'Bangladesh Studies', shortName: 'BS', credits: 3, type: 'THEORY' },
  'ISE': { code: 'SWE-131', title: 'Introduction to Software Engineering', shortName: 'ISE', credits: 3, type: 'THEORY' },
};

function formatPortalRoom(r: string): string {
  if (!r) return 'Room TBA';
  const trimmed = r.trim();
  if (/^E\d+$/i.test(trimmed)) {
    return 'Exten-' + trimmed.slice(1);
  }
  return 'Room ' + trimmed;
}

const batchKeyToIds: Record<string, string[]> = {
  '5th': ['batch-5'],
  '6th': ['batch-6'],
  '7th': ['batch-7'],
  '8th': ['batch-8'],
  '9th': ['batch-9'],
  '10th': ['batch-10'],
  '11th': ['batch-11', 'batch-1792923073984'],
  '12th': ['batch-12', 'batch-1788449554669'],
  '13th': ['batch-13', 'batch-1788450159710'],
};

async function run() {
  console.log('=== Starting Autumn 2026 Central Class Routine Import ===');

  // Ensure faculty members exist in db.faculty
  for (const f of Object.values(teacherMap)) {
    let existing = db.faculty.find((item: any) => item.shortName === f.shortName || item.id === f.id);
    if (!existing) {
      existing = {
        id: f.id,
        name: f.name,
        shortName: f.shortName,
        designation: f.designation,
        department: 'Department of Software Engineering',
        email: f.email || `${f.shortName.toLowerCase()}@metrouni.edu.bd`,
        officeRoom: f.officeRoom || '',
        photoUrl: null,
        specialization: null,
        assignedCourses: [],
        createdAt: new Date().toISOString(),
      };
      db.faculty.push(existing);
      console.log(`Added missing faculty: ${f.name} (${f.shortName})`);
    } else {
      existing.name = f.name;
      existing.designation = f.designation;
      if (f.email) existing.email = f.email;
      if (f.officeRoom) existing.officeRoom = f.officeRoom;
    }
  }

  // Ensure courses exist and assign teachers
  for (const [courseName, meta] of Object.entries(courseCatalog)) {
    let existing = db.courses.find(
      (c: any) =>
        c.code.toLowerCase() === meta.code.toLowerCase() ||
        (c.shortName && c.shortName.toLowerCase() === meta.shortName.toLowerCase())
    );
    if (!existing) {
      existing = {
        id: `course-${meta.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        code: meta.code,
        shortName: meta.shortName,
        title: meta.title,
        credits: meta.credits,
        type: meta.type,
        semester: 1,
        batchIds: [],
        createdAt: new Date().toISOString(),
      };
      db.courses.push(existing);
      console.log(`Added course: ${meta.code} - ${meta.title}`);
    }
  }

  const allTargetBatchIds = Object.values(batchKeyToIds).flat();
  console.log('Target batch IDs:', allTargetBatchIds);

  const newSlots: RoutineSlot[] = [];

  for (const [batchKey, batchData] of Object.entries(routineJson.batches) as [string, any][]) {
    const batchIds = batchKeyToIds[batchKey] || [`batch-${batchKey.replace(/\D/g, '')}`];
    const schedule = batchData.schedule || {};

    let batchSlotCounter = 0;

    for (const [dayName, rawSlots] of Object.entries(schedule) as [string, any[]][]) {
      const dayUpper = dayName.toUpperCase() as 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY';

      for (const slot of rawSlots) {
        batchSlotCounter++;
        const times = timeMap[slot.time] || { startTime: '09:00 AM', endTime: '10:30 AM' };
        const teacherMeta = teacherMap[slot.faculty_short_form] || {
          id: `fac-${slot.faculty_short_form.toLowerCase()}`,
          name: slot.faculty_short_form,
          shortName: slot.faculty_short_form,
          designation: 'Faculty Instructor',
        };
        const courseMeta = courseCatalog[slot.course] || {
          code: slot.course,
          title: slot.course,
          shortName: slot.course,
          credits: slot.course.toLowerCase().includes('lab') ? 1.5 : 3,
          type: slot.course.toLowerCase().includes('lab') ? 'LAB' : 'THEORY',
        };

        const roomStr = formatPortalRoom(slot.room);

        // Find course in db to link courseId
        const matchCourse = db.courses.find(
          (c: any) =>
            c.code.toLowerCase() === courseMeta.code.toLowerCase() ||
            (c.shortName && c.shortName.toLowerCase() === courseMeta.shortName.toLowerCase())
        );

        if (matchCourse) {
          matchCourse.assignedFacultyId = teacherMeta.id;
          matchCourse.assignedFacultyName = teacherMeta.name;
          if (!matchCourse.batchIds) matchCourse.batchIds = [];
          batchIds.forEach((bId) => {
            if (!matchCourse.batchIds.includes(bId)) matchCourse.batchIds.push(bId);
          });
        }

        // Create slot for each batch ID alias
        batchIds.forEach((bId, aliasIndex) => {
          const slotId = `rout-${bId}-${dayUpper.slice(0, 3).toLowerCase()}-${batchSlotCounter}${aliasIndex > 0 ? `-${aliasIndex}` : ''}`;
          newSlots.push({
            id: slotId,
            batchId: bId,
            day: dayUpper,
            startTime: times.startTime,
            endTime: times.endTime,
            courseId: matchCourse?.id || `course-${courseMeta.code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            courseCode: courseMeta.code,
            courseShortName: courseMeta.shortName,
            courseTitle: courseMeta.title,
            teacherName: teacherMeta.name,
            teacherShortName: teacherMeta.shortName,
            room: roomStr,
          });
        });
      }
    }
  }

  console.log(`Generated ${newSlots.length} routine slot instances across batches.`);

  // Replace existing routines in local db
  db.routines = (db.routines || []).filter((r: any) => !allTargetBatchIds.includes(r.batchId));
  db.routines.push(...newSlots);

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Updated local data/database.json successfully. Total routines now: ${db.routines.length}`);

  // Supabase sync
  const sb = getServerSupabase();
  if (sb) {
    console.log('Syncing with Supabase...');
    try {
      // 1. Delete old routine slots
      const { error: delErr } = await sb.from('routine_slots').delete().in('batch_id', allTargetBatchIds);
      if (delErr) {
        console.warn('Supabase delete warning:', delErr.message);
      } else {
        console.log('Deleted old routine slots in Supabase.');
      }

      // 2. Insert new routine slots in chunks of 50
      const routineRows = newSlots.map((r) => ({
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

      for (let i = 0; i < routineRows.length; i += 50) {
        const chunk = routineRows.slice(i, i + 50);
        const { error: insErr } = await sb.from('routine_slots').upsert(chunk);
        if (insErr) {
          console.warn(`Supabase upsert chunk ${i} warning:`, insErr.message);
        }
      }
      console.log(`Successfully synced ${routineRows.length} routine slots to Supabase.`);

      // 3. Upsert courses
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
      for (let i = 0; i < courseRows.length; i += 50) {
        const chunk = courseRows.slice(i, i + 50);
        await sb.from('courses').upsert(chunk);
      }
      console.log('Successfully synced courses to Supabase.');

      // 4. Upsert faculty
      const facultyRows = db.faculty.map((f: Faculty) => ({
        id: f.id,
        name: f.name,
        short_name: f.shortName || null,
        designation: f.designation,
        department: f.department || 'Department of Software Engineering',
        email: f.email || null,
        phone: f.phone || null,
        office_room: f.officeRoom || '',
        photo_url: f.photoUrl || null,
        specialization: f.specialization || null,
        assigned_courses: f.assignedCourses || [],
      }));
      await sb.from('faculty').upsert(facultyRows);
      console.log('Successfully synced faculty to Supabase.');
    } catch (sbErr: any) {
      console.error('Supabase sync exception:', sbErr?.message || sbErr);
    }
  }

  console.log('=== Autumn 2026 Central Class Routine Import Complete! ===');
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
