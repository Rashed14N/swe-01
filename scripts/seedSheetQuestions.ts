import fs from 'fs';
import path from 'path';
import { getServerSupabase } from '../src/server/supabaseSync';
import type { Resource } from '../src/types';

interface SheetQuestionData {
  id: string;
  code: string;
  courseCode: string;
  courseTitle: string;
  semester: number;
  batches: string;
  title: string;
  driveId: string;
}

const SHEET_ITEMS: SheetQuestionData[] = [
  {
    id: 'res-sheet-1',
    code: 'AI-1-2-3-5',
    courseCode: 'SWE-315',
    courseTitle: 'Artificial Intelligence',
    semester: 6,
    batches: '1st, 2nd, 3rd, 5th Batch',
    title: 'Artificial Intelligence Final Exam Question (1st, 2nd, 3rd & 5th Batch)',
    driveId: '1uwN8jrTighrFG-v3bUrtwes70W3ERah1',
  },
  {
    id: 'res-sheet-2',
    code: 'ALGO-1-2-3-4-5-6-7-8-9',
    courseCode: 'SWE-221',
    courseTitle: 'Algorithm',
    semester: 4,
    batches: '1st to 9th Batch',
    title: 'Algorithm Final Exam Question (1st to 9th Batch)',
    driveId: '1EXy9fYNhLjkqcy17eg3sBL6HK4DQtCwq',
  },
  {
    id: 'res-sheet-3',
    code: 'BEEC-1-2-3-4-5-6-7',
    courseCode: 'SWE-111',
    courseTitle: 'Basic Electrical and Electronic Circuits',
    semester: 3,
    batches: '1st to 7th Batch',
    title: 'Basic Electrical and Electronic Circuits Final Exam Question (1st to 7th Batch)',
    driveId: '1KexlSR0M0E-whSv-KrMiA2nb0tRiCmnl',
  },
  {
    id: 'res-sheet-4',
    code: 'BP-1-2-5-7',
    courseCode: 'SWE-121',
    courseTitle: 'Basic Programming',
    semester: 2,
    batches: '1st, 2nd, 5th, 7th Batch',
    title: 'Basic Programming Final Exam Question (1st, 2nd, 5th & 7th Batch)',
    driveId: '1Y_-fZS2q568yhcvP9W3XvL480om92J9U',
  },
  {
    id: 'res-sheet-5',
    code: 'BS-9-10-11',
    courseCode: 'GED-105',
    courseTitle: 'Bangladesh Studies',
    semester: 1,
    batches: '9th, 10th, 11th Batch',
    title: 'Bangladesh Studies Final Exam Question (9th, 10th & 11th Batch)',
    driveId: '17nZog3x4B-uZSYvb2gwmDdUHB3jRbiEk',
  },
  {
    id: 'res-sheet-6',
    code: 'BSP-1-2-3-5',
    courseCode: 'PHY-111',
    courseTitle: 'Basic Science Physics',
    semester: 2,
    batches: '1st, 2nd, 3rd, 5th Batch',
    title: 'Basic Science Physics Final Exam Question (1st, 2nd, 3rd & 5th Batch)',
    driveId: '1r39LWSFh3yEclcYQHkCSGX_0VNHEsRIX',
  },
  {
    id: 'res-sheet-7',
    code: 'CA-1-2-3-4-5',
    courseCode: 'SWE-211',
    courseTitle: 'Computer Architecture',
    semester: 5,
    batches: '1st to 5th Batch',
    title: 'Computer Architecture Final Exam Question (1st to 5th Batch)',
    driveId: '1LV8_bSwLCcOxELC4hNP_A7z3QxLLCk4H',
  },
  {
    id: 'res-sheet-8',
    code: 'CN-1-2-3',
    courseCode: 'SWE-313',
    courseTitle: 'Computer Networking',
    semester: 7,
    batches: '1st, 2nd, 3rd Batch',
    title: 'Computer Networking Final Exam Question (1st, 2nd & 3rd Batch)',
    driveId: '1EQpdG41vtXzw_tqZ_I4ToWjQoyHOJTAU',
  },
  {
    id: 'res-sheet-9',
    code: 'DBMS-1-2-3-4-5-6-7-8-9',
    courseCode: 'SWE-225',
    courseTitle: 'Database Management System',
    semester: 4,
    batches: '1st to 9th Batch',
    title: 'Database Management System Final Exam Question (1st to 9th Batch)',
    driveId: '1wEoiJ2EKucqJU4OnIQ0Lfh2XJLQYUxgn',
  },
  {
    id: 'res-sheet-10',
    code: 'DIC-1-2-5-6-7-8-9-10-11',
    courseCode: 'MAT-111',
    courseTitle: 'Differential & Integral Calculus',
    semester: 1,
    batches: '1st to 11th Batch',
    title: 'Differential & Integral Calculus Final Exam Question (1st to 11th Batch)',
    driveId: '1OmmI8Y3dROArNTc-y8kkbJPkTpPxh8bE',
  },
  {
    id: 'res-sheet-11',
    code: 'DLD-1-2-3-4-5',
    courseCode: 'SWE-131',
    courseTitle: 'Digital Logic Design',
    semester: 1,
    batches: '1st to 5th Batch',
    title: 'Digital Logic Design Final Exam Question (1st to 5th Batch)',
    driveId: '1xx9zP-KMvrxAZPUDpiNVYUfSFNBlt4A9',
  },
  {
    id: 'res-sheet-12',
    code: 'DLD-3-4',
    courseCode: 'SWE-131',
    courseTitle: 'Digital Logic Design',
    semester: 1,
    batches: '3rd & 4th Batch',
    title: 'Digital Logic Design Final Exam Question 3rd & 4th Batch',
    driveId: '1cNeF5fPOunSF5Z0_b6e4PXXgVsXSl0nW',
  },
  {
    id: 'res-sheet-13',
    code: 'DM-1-4-5-7-9-11',
    courseCode: 'MAT-113',
    courseTitle: 'Discrete Mathematics',
    semester: 2,
    batches: '1st, 4th, 5th, 7th, 9th, 11th Batch',
    title: 'Discrete Mathematics Final Exam Question (1st, 4th, 5th, 7th, 9th & 11th Batch)',
    driveId: '1d-3g3BBM4z906vrLG7WV9AfjpjU7BH1v',
  },
  {
    id: 'res-sheet-14',
    code: 'DS-1-2-3-4-5-7-8-9',
    courseCode: 'SWE-123',
    courseTitle: 'Data Structures',
    semester: 3,
    batches: '1st to 9th Batch',
    title: 'Data Structures Final Exam Question (1st to 9th Batch)',
    driveId: '1RKSA7J1Lfh2txTIOjaeHHEfcUnIhD_7a',
  },
  {
    id: 'res-sheet-15',
    code: 'IS-2-3-4-5-7-9',
    courseCode: 'SWE-131',
    courseTitle: 'Introduction to Software Engineering',
    semester: 1,
    batches: '2nd to 9th Batch',
    title: 'Introduction to Software Engineering Final Exam Question (2nd to 9th Batch)',
    driveId: '1U_ipui70k8A8KkF1LsLWERZKlw4M8cHf',
  },
  {
    id: 'res-sheet-16',
    code: 'LADE-3-4-5-7-9-11',
    courseCode: 'MAT-112',
    courseTitle: 'Linear Algebra & Differential Equations',
    semester: 2,
    batches: '3rd to 11th Batch',
    title: 'Linear Algebra & Differential Equations Final Exam Question (3rd to 11th Batch)',
    driveId: '1OWU_q3Eh3hR-7Fy9nwILNQLpY08o3vye',
  },
  {
    id: 'res-sheet-17',
    code: 'MIS-1-2-3-4-5',
    courseCode: 'SWE-235',
    courseTitle: 'Management Information Systems',
    semester: 3,
    batches: '1st to 5th Batch',
    title: 'Management Information Systems Final Exam Question (1st to 5th Batch)',
    driveId: '1Lsq18VRjasFUbvJd3kQgAaz7ARkVo9wf',
  },
  {
    id: 'res-sheet-18',
    code: 'ML-1-2-3-4',
    courseCode: 'SWE-421',
    courseTitle: 'Machine Learning',
    semester: 8,
    batches: '1st to 4th Batch',
    title: 'Machine Learning Final Exam Question (1st to 4th Batch)',
    driveId: '1LCdpQZzXp-c26PEBPRQNXhTNsp2LaBr4',
  },
  {
    id: 'res-sheet-19',
    code: 'NA-1-2-3-6',
    courseCode: 'MAT-211',
    courseTitle: 'Numerical Analysis',
    semester: 5,
    batches: '1st, 2nd, 3rd, 6th Batch',
    title: 'Numerical Analysis Final Exam Question (1st, 2nd, 3rd & 6th Batch)',
    driveId: '14p-jNgC3mSl8iCOokWPD_EuzHfMcBqs_',
  },
  {
    id: 'res-sheet-20',
    code: 'OOP-1-2-3-4-5-6-7',
    courseCode: 'SWE-223',
    courseTitle: 'Object Oriented Programming',
    semester: 5,
    batches: '1st to 7th Batch',
    title: 'Object Oriented Programming Final Exam Question (1st to 7th Batch)',
    driveId: '1Lee27f7JSg-5GwTUGM9BS-n20Ayp9_0Y',
  },
  {
    id: 'res-sheet-21',
    code: 'OS-1-2-3-4',
    courseCode: 'SWE-311',
    courseTitle: 'Operating Systems',
    semester: 4,
    batches: '1st to 4th Batch',
    title: 'Operating Systems Final Exam Question (1st to 4th Batch)',
    driveId: '1WdOWNWUXaMov2ErzP_Ae4q01yLzoiivS',
  },
  {
    id: 'res-sheet-22',
    code: 'SADP-1-2-3-4-5-6',
    courseCode: 'SWE-323',
    courseTitle: 'Software Architecture and Design Patterns',
    semester: 6,
    batches: '1st to 6th Batch',
    title: 'Software Architecture and Design Patterns Final Exam Question (1st to 6th Batch)',
    driveId: '14q3Bocpucr2p5khmlRPl5ik_1H24BzNQ',
  },
  {
    id: 'res-sheet-23',
    code: 'SP-1-2-5-7-9-11',
    courseCode: 'SWE-121',
    courseTitle: 'Structured Programming',
    semester: 2,
    batches: '1st to 11th Batch',
    title: 'Structured Programming Final Exam Question (1st to 11th Batch)',
    driveId: '153ttrkN29Ii50DfL0ak3zglTUUEC8Hzf',
  },
  {
    id: 'res-sheet-24',
    code: 'SRE-1-2-3-4-5-8-9',
    courseCode: 'SWE-231',
    courseTitle: 'Software Requirement Engineering',
    semester: 4,
    batches: '1st, 2nd, 3rd, 4th, 5th, 8th, 9th Batch',
    // Exact requested demo title pattern:
    title: 'Software Requirement Engineering Final Exam Question 8th Batch',
    driveId: '1S8-aZpHfzrp0beMEtaoFBJwNShxWtlDn',
  },
  {
    id: 'res-sheet-25',
    code: 'SVT-1-2-4-5-6',
    courseCode: 'SWE-333',
    courseTitle: 'Software Verification & Testing',
    semester: 7,
    batches: '1st to 6th Batch',
    title: 'Software Verification & Testing Final Exam Question (1st to 6th Batch)',
    driveId: '1Z1sJKW6vWJKYmhfzjFK7WckHGc9NLF5Q',
  },
  {
    id: 'res-sheet-26',
    code: 'TOC-1-2-3-4-5-8-9',
    courseCode: 'SWE-311',
    courseTitle: 'Theory of Computation',
    semester: 4,
    batches: '1st to 9th Batch',
    title: 'Theory of Computation Final Exam Question (1st to 9th Batch)',
    driveId: '1WtMdKbadgkDgzhWfukVUO7bYDOXIvK2_',
  },
];

async function seedSheetQuestions() {
  console.log(`Starting to seed ${SHEET_ITEMS.length} question bank items...`);

  const createdResources: Resource[] = SHEET_ITEMS.map((item, idx) => {
    // Direct instant download URL converted from Google Drive
    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${item.driveId}`;

    return {
      id: item.id,
      title: item.title,
      type: 'QUESTION',
      courseId: `course-${item.courseCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      courseCode: item.courseCode,
      courseTitle: item.courseTitle,
      semester: item.semester,
      academicYear: 2025,
      examType: 'FINAL',
      facultyName: 'Department Academic Faculty',
      targetBatch: item.batches,
      description: `Official Metropolitan University Department Question Archive for ${item.courseTitle} (${item.courseCode}) covering ${item.batches}. Direct Google Drive PDF download.`,
      fileUrl: directDownloadUrl,
      fileName: `${item.courseCode}_Final_Exam_${item.code}.pdf`,
      fileSize: '1.4 MB',
      fileType: 'application/pdf',
      uploaderId: 'user-admin-1',
      uploaderStudentId: '252-ADMIN',
      uploaderName: 'Department Academic Cell',
      uploaderBatchName: 'SWE Department Archive',
      status: 'APPROVED',
      downloadCount: 45 + idx * 3,
      createdAt: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
      verifiedAt: new Date().toISOString(),
    };
  });

  // 1. Update data/database.json
  const dbPath = path.join(process.cwd(), 'data', 'database.json');
  if (fs.existsSync(dbPath)) {
    try {
      const dbContent = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      if (!dbContent.resources) dbContent.resources = [];

      // Merge by ID
      createdResources.forEach((newRes) => {
        const existingIdx = dbContent.resources.findIndex((r: any) => r.id === newRes.id);
        if (existingIdx >= 0) {
          dbContent.resources[existingIdx] = newRes;
        } else {
          dbContent.resources.unshift(newRes);
        }
      });

      fs.writeFileSync(dbPath, JSON.stringify(dbContent, null, 2), 'utf-8');
      console.log(`[Local DB] Successfully updated ${dbPath} with ${createdResources.length} items!`);
    } catch (err: any) {
      console.error('[Local DB Update Error]:', err.message);
    }
  }

  // 2. Upsert to Supabase resources table
  const sb = getServerSupabase();
  if (sb) {
    try {
      console.log('[Supabase] Upserting to resources table...');
      const supabaseRows = createdResources.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        course_id: r.courseId,
        course_code: r.courseCode,
        course_title: r.courseTitle,
        semester: r.semester,
        academic_year: r.academicYear,
        exam_type: r.examType,
        faculty_name: r.facultyName,
        target_batch: r.targetBatch,
        description: r.description,
        file_url: r.fileUrl,
        file_name: r.fileName,
        file_size: r.fileSize,
        file_type: r.fileType,
        uploader_id: r.uploaderId,
        uploader_student_id: r.uploaderStudentId,
        uploader_name: r.uploaderName,
        uploader_batch_name: r.uploaderBatchName,
        status: r.status,
        download_count: r.downloadCount,
        created_at: r.createdAt,
        verified_at: r.verifiedAt,
      }));

      const { data, error } = await sb.from('resources').upsert(supabaseRows);
      if (error) {
        console.error('[Supabase Error]:', error.message);
      } else {
        console.log(`[Supabase Success] Successfully upserted ${supabaseRows.length} questions to Supabase!`);
      }
    } catch (err: any) {
      console.error('[Supabase Exception]:', err.message);
    }
  } else {
    console.warn('[Supabase Warning]: Client not available, local DB updated only.');
  }

  console.log('Seeding completed successfully!');
}

seedSheetQuestions();
