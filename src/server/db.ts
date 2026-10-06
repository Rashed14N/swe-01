import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import type {
  User, Batch, Course, RoutineSlot, Exam, BatchAnnouncement,
  DepartmentNotice, Resource, Faculty, NotificationItem, AuditLog, RoutineRequest,
  RetakeRegistration
} from '../types';

import { syncToSupabase, deleteFromSupabase, hydrateFromSupabase, startAutoSync } from './supabaseSync';

export interface DBData {
  users: User[];
  passwords: Record<string, string>; // userId -> hash
  batches: Batch[];
  courses: Course[];
  routines: RoutineSlot[];
  routineRequests: RoutineRequest[];
  exams: Exam[];
  announcements: BatchAnnouncement[];
  departmentNotices: DepartmentNotice[];
  resources: Resource[];
  faculty: Faculty[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  retakeRegistrations: RetakeRegistration[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists safely (guard against read-only serverless filesystems)
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch {
  // Ignored in serverless/read-only environments
}

export function seedInitialData(): DBData {
  const batches: Batch[] = [
    {
      id: 'batch-5',
      name: 'SWE 5th Batch',
      admissionYear: 2019,
      currentSemester: 8,
      academicSession: '2019-2020',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2019-01-15T00:00:00Z',
    },
    {
      id: 'batch-6',
      name: 'SWE 6th Batch',
      admissionYear: 2020,
      currentSemester: 7,
      academicSession: '2020-2021',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2020-01-15T00:00:00Z',
    },
    {
      id: 'batch-7',
      name: 'SWE 7th Batch',
      admissionYear: 2021,
      currentSemester: 6,
      academicSession: '2021-2022',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2021-01-15T00:00:00Z',
    },
    {
      id: 'batch-8',
      name: 'SWE 8th Batch',
      admissionYear: 2022,
      currentSemester: 5,
      academicSession: '2022-2023',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2022-01-15T00:00:00Z',
    },
    {
      id: 'batch-9',
      name: 'SWE 9th Batch',
      admissionYear: 2023,
      currentSemester: 4,
      academicSession: '2023-2024',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2023-01-15T00:00:00Z',
    },
    {
      id: 'batch-10',
      name: 'SWE 10th Batch',
      admissionYear: 2024,
      currentSemester: 3,
      academicSession: '2024-2025',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2024-01-15T00:00:00Z',
    },
    {
      id: 'batch-11',
      name: 'SWE 11th Batch',
      admissionYear: 2025,
      currentSemester: 2,
      academicSession: '2025-2026',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2025-01-15T00:00:00Z',
    },
    {
      id: 'batch-12',
      name: 'SWE 12th Batch',
      admissionYear: 2026,
      currentSemester: 1,
      academicSession: '2026-2027',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2026-01-15T00:00:00Z',
    },
    {
      id: 'batch-13',
      name: 'SWE 13th Batch',
      admissionYear: 2026,
      currentSemester: 1,
      academicSession: '2026-2027',
      semesterMode: 'SEQUENCE',
      status: 'ACTIVE',
      crIds: [],
      createdAt: '2026-07-01T00:00:00Z',
    },
  ];

  const users: User[] = [];

  const passwords: Record<string, string> = {};

  const faculty: Faculty[] = [
    {
      id: 'fac-1',
      name: 'Fuad Ahmed',
      shortName: 'FA',
      designation: 'Professor & Head',
      department: 'Department of Software Engineering',
      phone: '+8801611829316',
      email: 'fahmed@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-2',
      name: 'Nazia Sultana Chowdhury',
      shortName: 'NSC',
      designation: 'Assistant Professor',
      department: 'Department of Software Engineering',
      phone: '+8801627055017',
      email: 'nazia@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-3',
      name: 'Rina Paul',
      shortName: 'RP',
      designation: 'Assistant Professor',
      department: 'Department of Software Engineering',
      phone: '+8801319931147',
      email: 'rina@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-4',
      name: 'Al Akram Chowdhury',
      shortName: 'AAC',
      designation: 'Assistant Professor',
      department: 'Department of Software Engineering',
      phone: '+8801730980003',
      email: 'akram@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-5',
      name: 'Wadia Iqbal Chowdhury',
      shortName: 'WIC',
      designation: 'Lecturer',
      department: 'Department of Software Engineering',
      phone: '+8801758305093',
      email: 'wadia@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-6',
      name: 'Iffat Ahmed Chowdhury Nahid',
      shortName: 'IAC',
      designation: 'Lecturer',
      department: 'Department of Software Engineering',
      phone: '+8801724296767',
      email: 'nahid@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-7',
      name: 'Nazia Hassan',
      shortName: 'NHN',
      designation: 'Lecturer',
      department: 'Department of Software Engineering',
      phone: '+8801777264878',
      email: 'naziahassan@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-8',
      name: 'Syeda Sanjida Rahman',
      shortName: 'SSJ',
      designation: 'Lecturer',
      department: 'Department of Software Engineering',
      phone: '+8801783852026',
      email: 'sanjida@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-9',
      name: 'Dhiman Dash',
      shortName: 'DD',
      designation: 'Lecturer',
      department: 'Department of Software Engineering',
      phone: '+8801764619468',
      email: 'dhiman@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-10',
      name: 'Lukman Hussain Nakib',
      shortName: 'LN',
      designation: 'Lecturer',
      department: 'Department of Software Engineering',
      phone: '+8801738779684',
      email: 'nakib@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-11',
      name: 'Mridul Kanti Bhattacharjee',
      shortName: 'MKB',
      designation: 'Adjunct Faculty',
      department: 'Department of Software Engineering',
      phone: '+8801763784158',
      email: 'mridul@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-12',
      name: 'Nasrin Akter Tanya',
      shortName: 'NAT',
      designation: 'Lecturer (Study Leave)',
      department: 'Department of Software Engineering',
      phone: '+8801716942150',
      email: 'tanya@metrouni.edu.bd',
      assignedCourses: [],
    },
    {
      id: 'fac-cmw',
      name: 'Chowdhury Mahir Wahid',
      shortName: 'CMW',
      designation: 'Lecturer',
      department: 'Department of Software Engineering',
      email: 'mahir.wahid@metrouni.edu.bd',
      officeRoom: 'Exten-2',
      assignedCourses: ['PHY-111'],
    },
    {
      id: 'fac-ohr',
      name: 'Obaidur Rahman',
      shortName: 'OHR',
      designation: 'Lecturer',
      department: 'Department of Software Engineering',
      email: 'obaidur@metrouni.edu.bd',
      officeRoom: 'Room 301',
      assignedCourses: ['SWE-230'],
    },
  ];

  const allBatches = ['batch-8', 'batch-9', 'batch-10', 'batch-11', 'batch-12'];

  const courses: Course[] = [
    // Semester 1 (12th Batch)
    {
      id: 'course-sem1-ged-101',
      code: 'GED-101',
      shortName: 'CEL I',
      title: 'Communicative English Language I',
      credits: 3,
      type: 'THEORY',
      semester: 1,
      batchIds: ['batch-12'],
    },
    {
      id: 'course-sem1-mat-111',
      code: 'MAT-111',
      shortName: 'DIC',
      title: 'Differential & Integral Calculus',
      credits: 3,
      type: 'THEORY',
      semester: 1,
      batchIds: ['batch-12'],
    },
    {
      id: 'course-sem1-swe-131',
      code: 'SWE-131',
      shortName: 'ISE',
      title: 'Introduction to Software Engineering',
      credits: 3,
      type: 'THEORY',
      semester: 1,
      batchIds: ['batch-12'],
    },
    {
      id: 'course-sem1-ged-105',
      code: 'GED-105',
      shortName: 'BS',
      title: 'Bangladesh Studies',
      credits: 3,
      type: 'THEORY',
      semester: 1,
      batchIds: ['batch-12'],
    },
    {
      id: 'course-sem1-acm',
      code: 'ACM',
      shortName: 'ACM',
      title: 'ACM Workshop',
      credits: 0,
      type: 'LAB',
      semester: 1,
      batchIds: ['batch-12'],
    },

    // Semester 2 (11th & 12th Batch)
    {
      id: 'course-sem2-swe-121',
      code: 'SWE-121',
      shortName: 'SP',
      title: 'Structured Programming',
      credits: 3,
      type: 'THEORY',
      semester: 2,
      assignedFacultyId: 'fac-6',
      assignedFacultyName: 'Iffat Ahmed Chowdhury Nahid',
      batchIds: ['batch-12', 'batch-1788449554669', 'batch-11'],
    },
    {
      id: 'course-sem2-swe-122',
      code: 'SWE-122',
      shortName: 'SP LAB',
      title: 'Structured Programming Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 2,
      assignedFacultyId: 'fac-6',
      assignedFacultyName: 'Iffat Ahmed Chowdhury Nahid',
      batchIds: ['batch-12', 'batch-1788449554669', 'batch-11'],
    },
    {
      id: 'course-sem2-mat-112',
      code: 'MAT-112',
      shortName: 'LADE',
      title: 'Linear Algebra & Differential Equations',
      credits: 3,
      type: 'THEORY',
      semester: 2,
      assignedFacultyId: 'fac-3',
      assignedFacultyName: 'Rina Paul',
      batchIds: ['batch-12', 'batch-1788449554669', 'batch-11'],
    },
    {
      id: 'course-sem2-mat-113',
      code: 'MAT-113',
      shortName: 'DM',
      title: 'Discrete Mathematics',
      credits: 3,
      type: 'THEORY',
      semester: 2,
      assignedFacultyId: 'fac-8',
      assignedFacultyName: 'Syeda Sanjida Rahman',
      batchIds: ['batch-12', 'batch-1788449554669', 'batch-11'],
    },
    {
      id: 'course-sem2-phy-111',
      code: 'PHY-111',
      shortName: 'BP',
      title: 'Basic Physics',
      credits: 3,
      type: 'THEORY',
      semester: 2,
      assignedFacultyId: 'fac-cmw',
      assignedFacultyName: 'Chowdhury Mahir Wahid',
      batchIds: ['batch-12', 'batch-1788449554669', 'batch-11'],
    },

    // Semester 3 (11th Batch)
    {
      id: 'course-sem3-swe-123',
      code: 'SWE-123',
      shortName: 'DS',
      title: 'Data Structures',
      credits: 3,
      type: 'THEORY',
      semester: 3,
      assignedFacultyId: 'fac-6',
      assignedFacultyName: 'Iffat Ahmed Chowdhury Nahid',
      batchIds: ['batch-11'],
    },
    {
      id: 'course-sem3-swe-124',
      code: 'SWE-124',
      shortName: 'DS LAB',
      title: 'Data Structure Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 3,
      assignedFacultyId: 'fac-6',
      assignedFacultyName: 'Iffat Ahmed Chowdhury Nahid',
      batchIds: ['batch-11'],
    },
    {
      id: 'course-sem3-swe-235',
      code: 'SWE-235',
      shortName: 'MIS',
      title: 'Management Information Systems',
      credits: 3,
      type: 'THEORY',
      semester: 3,
      assignedFacultyId: 'fac-5',
      assignedFacultyName: 'Wadia Iqbal Chowdhury',
      batchIds: ['batch-11'],
    },
    {
      id: 'course-sem3-swe-111',
      code: 'SWE-111',
      shortName: 'BEEC',
      title: 'Basic Electrical and Electronic Circuits',
      credits: 3,
      type: 'THEORY',
      semester: 3,
      batchIds: ['batch-11'],
    },
    {
      id: 'course-sem3-swe-112',
      code: 'SWE-112',
      shortName: 'BEEC LAB',
      title: 'Basic Electrical and Electronic Circuits Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 3,
      batchIds: ['batch-11'],
    },
    {
      id: 'course-sem3-swe-182',
      code: 'SWE-182',
      shortName: 'PPD',
      title: 'Project on Python Development',
      credits: 3,
      type: 'PROJECT',
      semester: 3,
      assignedFacultyId: 'fac-4',
      assignedFacultyName: 'Al Akram Chowdhury',
      batchIds: ['batch-11'],
    },

    // Semester 4 (10th Batch)
    {
      id: 'course-sem4-swe-221',
      code: 'SWE-221',
      shortName: 'ALGO',
      title: 'Algorithm',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyId: 'fac-4',
      assignedFacultyName: 'Al Akram Chowdhury',
      batchIds: ['batch-10'],
    },
    {
      id: 'course-sem4-swe-222',
      code: 'SWE-222',
      shortName: 'ALGO LAB',
      title: 'Algorithm Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 4,
      assignedFacultyId: 'fac-4',
      assignedFacultyName: 'Al Akram Chowdhury',
      batchIds: ['batch-10'],
    },
    {
      id: 'course-sem4-swe-311',
      code: 'SWE-311',
      shortName: 'TOC',
      title: 'Theory of Computation',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      batchIds: ['batch-10'],
    },
    {
      id: 'course-sem4-swe-225',
      code: 'SWE-225',
      shortName: 'DBMS',
      title: 'Database Management System',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyId: 'fac-7',
      assignedFacultyName: 'Nazia Hassan',
      batchIds: ['batch-10'],
    },
    {
      id: 'course-sem4-swe-226',
      code: 'SWE-226',
      shortName: 'DBMS LAB',
      title: 'Database Management System Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 4,
      assignedFacultyId: 'fac-7',
      assignedFacultyName: 'Nazia Hassan',
      batchIds: ['batch-10'],
    },
    {
      id: 'course-sem4-swe-231',
      code: 'SWE-231',
      shortName: 'SRE',
      title: 'Software Requirement Engineering',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyId: 'fac-5',
      assignedFacultyName: 'Wadia Iqbal Chowdhury',
      batchIds: ['batch-10'],
    },

    // Semester 5 (8th & 9th Batch)
    {
      id: 'course-sem5-swe-211',
      code: 'SWE-211',
      shortName: 'CA',
      title: 'Computer Architecture',
      credits: 3,
      type: 'THEORY',
      semester: 5,
      assignedFacultyId: 'fac-2',
      assignedFacultyName: 'Nazia Sultana Chowdhury',
      batchIds: ['batch-9', 'batch-8'],
    },
    {
      id: 'course-sem5-swe-223',
      code: 'SWE-223',
      shortName: 'OOP',
      title: 'Object Oriented Programming',
      credits: 3,
      type: 'THEORY',
      semester: 5,
      assignedFacultyId: 'fac-1',
      assignedFacultyName: 'Fuad Ahmed',
      batchIds: ['batch-9', 'batch-8'],
    },
    {
      id: 'course-sem5-swe-224',
      code: 'SWE-224',
      shortName: 'OOP LAB',
      title: 'Object Oriented Programming Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 5,
      assignedFacultyId: 'fac-1',
      assignedFacultyName: 'Fuad Ahmed',
      batchIds: ['batch-9', 'batch-8'],
    },
    {
      id: 'course-sem5-mat-211',
      code: 'MAT-211',
      shortName: 'NA',
      title: 'Numerical Analysis',
      credits: 3,
      type: 'THEORY',
      semester: 5,
      assignedFacultyId: 'fac-3',
      assignedFacultyName: 'Rina Paul',
      batchIds: ['batch-9', 'batch-8'],
    },
    {
      id: 'course-sem5-swe-230',
      code: 'SWE-230',
      shortName: 'CP-I',
      title: 'Problem Solving with Competitive Programming Lab-1',
      credits: 1.5,
      type: 'LAB',
      semester: 5,
      assignedFacultyId: 'fac-ohr',
      assignedFacultyName: 'Obaidur Rahman',
      batchIds: ['batch-9', 'batch-8'],
    },

    // Semester 6 (7th Batch)
    {
      id: 'course-sem6-ged-301',
      code: 'GED-301',
      shortName: 'BSP',
      title: 'Basic Statistics and Probability',
      credits: 3,
      type: 'THEORY',
      semester: 6,
      batchIds: ['batch-7'],
    },
    {
      id: 'course-sem6-swe-315',
      code: 'SWE-315',
      shortName: 'AI',
      title: 'Artificial Intelligence',
      credits: 3,
      type: 'THEORY',
      semester: 6,
      batchIds: ['batch-7'],
    },
    {
      id: 'course-sem6-swe-316',
      code: 'SWE-316',
      shortName: 'AI LAB',
      title: 'Artificial Intelligence Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 6,
      batchIds: ['batch-7'],
    },
    {
      id: 'course-sem6-swe-324',
      code: 'SWE-324',
      shortName: 'UI & UX',
      title: 'Software UI & UX Design Practice Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 6,
      batchIds: ['batch-7'],
    },
    {
      id: 'course-sem6-swe-232',
      code: 'SWE-232',
      shortName: 'CP-2',
      title: 'Problem Solving with Competitive Programming Lab-2',
      credits: 1.5,
      type: 'LAB',
      semester: 6,
      batchIds: ['batch-7'],
    },

    // Semester 7 (6th Batch)
    {
      id: 'course-sem7-swe-333',
      code: 'SWE-333',
      shortName: 'SVT',
      title: 'Software Verification & Testing',
      credits: 3,
      type: 'THEORY',
      semester: 7,
      batchIds: ['batch-6'],
    },
    {
      id: 'course-sem7-swe-334',
      code: 'SWE-334',
      shortName: 'SVT LAB',
      title: 'Software Verification & Testing Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 7,
      batchIds: ['batch-6'],
    },
    {
      id: 'course-sem7-swe-313',
      code: 'SWE-313',
      shortName: 'CN',
      title: 'Computer Networking',
      credits: 3,
      type: 'THEORY',
      semester: 7,
      batchIds: ['batch-6'],
    },
    {
      id: 'course-sem7-swe-314',
      code: 'SWE-314',
      shortName: 'CN LAB',
      title: 'Computer Networking Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 7,
      batchIds: ['batch-6'],
    },
    {
      id: 'course-sem7-swe-382',
      code: 'SWE-382',
      shortName: 'WD',
      title: 'Project on Web App Development',
      credits: 3,
      type: 'PROJECT',
      semester: 7,
      batchIds: ['batch-6'],
    },

    // Semester 8 (5th Batch)
    {
      id: 'course-sem8-swe-382',
      code: 'SWE-382',
      shortName: 'WD',
      title: 'Project on Web App Development',
      credits: 3,
      type: 'PROJECT',
      semester: 8,
      batchIds: ['batch-5'],
    },
    {
      id: 'course-sem8-swe-461',
      code: 'SWE-461',
      shortName: 'IC',
      title: 'Introduction to Cryptography',
      credits: 3,
      type: 'THEORY',
      semester: 8,
      batchIds: ['batch-5'],
    },
    {
      id: 'course-sem8-swe-422',
      code: 'SWE-422',
      shortName: 'MDP',
      title: 'Mobile App Development Practice Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 8,
      batchIds: ['batch-5'],
    },
    {
      id: 'course-sem8-ged-403',
      code: 'GED-403',
      shortName: 'ED',
      title: 'Entrepreneurship Development',
      credits: 3,
      type: 'THEORY',
      semester: 8,
      batchIds: ['batch-5'],
    },
  ];

  const routines: RoutineSlot[] = [
    {
        "id": "rout-batch-12-1",
        "batchId": "batch-12",
        "day": "SUNDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-mat-113",
        "courseCode": "MAT-113",
        "courseTitle": "Discrete Mathematics",
        "courseShortName": "DM",
        "teacherName": "Syeda Sanjida Rahman",
        "teacherShortName": "SSJ",
        "room": "Room 505"
    },
    {
        "id": "rout-batch-12-2",
        "batchId": "batch-12",
        "day": "SUNDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-121",
        "courseCode": "SWE-121",
        "courseTitle": "Structured Programming",
        "courseShortName": "SP",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 505"
    },
    {
        "id": "rout-batch-12-3",
        "batchId": "batch-12",
        "day": "MONDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-phy-111",
        "courseCode": "PHY-111",
        "courseTitle": "Basic Physics",
        "courseShortName": "BP",
        "teacherName": "Chowdhury Mahir Wahid",
        "teacherShortName": "CMW",
        "room": "Exten-2"
    },
    {
        "id": "rout-batch-12-4",
        "batchId": "batch-12",
        "day": "MONDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-mat-112",
        "courseCode": "MAT-112",
        "courseTitle": "Linear Algebra & Differential Equations",
        "courseShortName": "LADE",
        "teacherName": "Rina Paul",
        "teacherShortName": "RP",
        "room": "Exten-2"
    },
    {
        "id": "rout-batch-12-5",
        "batchId": "batch-12",
        "day": "TUESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-mat-113",
        "courseCode": "MAT-113",
        "courseTitle": "Discrete Mathematics",
        "courseShortName": "DM",
        "teacherName": "Syeda Sanjida Rahman",
        "teacherShortName": "SSJ",
        "room": "Exten-3"
    },
    {
        "id": "rout-batch-12-6",
        "batchId": "batch-12",
        "day": "TUESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-phy-111",
        "courseCode": "PHY-111",
        "courseTitle": "Basic Physics",
        "courseShortName": "BP",
        "teacherName": "Chowdhury Mahir Wahid",
        "teacherShortName": "CMW",
        "room": "Exten-5"
    },
    {
        "id": "rout-batch-12-7",
        "batchId": "batch-12",
        "day": "WEDNESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-mat-112",
        "courseCode": "MAT-112",
        "courseTitle": "Linear Algebra & Differential Equations",
        "courseShortName": "LADE",
        "teacherName": "Rina Paul",
        "teacherShortName": "RP",
        "room": "Room 408"
    },
    {
        "id": "rout-batch-12-8",
        "batchId": "batch-12",
        "day": "WEDNESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-121",
        "courseCode": "SWE-121",
        "courseTitle": "Structured Programming",
        "courseShortName": "SP",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 507"
    },
    {
        "id": "rout-batch-12-9",
        "batchId": "batch-12",
        "day": "THURSDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-122",
        "courseCode": "SWE-122",
        "courseTitle": "Structured Programming Lab",
        "courseShortName": "SP Lab",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-12-10",
        "batchId": "batch-12",
        "day": "THURSDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-122",
        "courseCode": "SWE-122",
        "courseTitle": "Structured Programming Lab",
        "courseShortName": "SP Lab",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-7-1",
        "batchId": "batch-7",
        "day": "SUNDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-313",
        "courseCode": "SWE-313",
        "courseTitle": "Computer Networking",
        "courseShortName": "CN",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Exten-1"
    },
    {
        "id": "rout-batch-7-2",
        "batchId": "batch-7",
        "day": "SUNDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-322",
        "courseCode": "SWE-322",
        "courseTitle": "Web Programming Practice Lab",
        "courseShortName": "WP Lab",
        "teacherName": "Lukman Hussain Nakib",
        "teacherShortName": "LN",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-7-3",
        "batchId": "batch-7",
        "day": "SUNDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-swe-322",
        "courseCode": "SWE-322",
        "courseTitle": "Web Programming Practice Lab",
        "courseShortName": "WP Lab",
        "teacherName": "Lukman Hussain Nakib",
        "teacherShortName": "LN",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-7-4",
        "batchId": "batch-7",
        "day": "MONDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-333",
        "courseCode": "SWE-333",
        "courseTitle": "Software Verification & Testing",
        "courseShortName": "SVT",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Exten-6"
    },
    {
        "id": "rout-batch-7-5",
        "batchId": "batch-7",
        "day": "MONDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-313",
        "courseCode": "SWE-313",
        "courseTitle": "Computer Networking",
        "courseShortName": "CN",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Exten-6"
    },
    {
        "id": "rout-batch-7-6",
        "batchId": "batch-7",
        "day": "TUESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-334",
        "courseCode": "SWE-334",
        "courseTitle": "Software Verification & Testing Lab",
        "courseShortName": "SVT Lab",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-7-7",
        "batchId": "batch-7",
        "day": "TUESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-334",
        "courseCode": "SWE-334",
        "courseTitle": "Software Verification & Testing Lab",
        "courseShortName": "SVT Lab",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-7-8",
        "batchId": "batch-7",
        "day": "WEDNESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-333",
        "courseCode": "SWE-333",
        "courseTitle": "Software Verification & Testing",
        "courseShortName": "SVT",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Room 409"
    },
    {
        "id": "rout-batch-7-9",
        "batchId": "batch-7",
        "day": "WEDNESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-449",
        "courseCode": "SWE-449",
        "courseTitle": "Data Mining Tools Lab",
        "courseShortName": "DMT Lab",
        "teacherName": "Mridul Kanti Bhattacharjee",
        "teacherShortName": "MKB",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-7-10",
        "batchId": "batch-7",
        "day": "WEDNESDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-swe-449",
        "courseCode": "SWE-449",
        "courseTitle": "Data Mining Tools Lab",
        "courseShortName": "DMT Lab",
        "teacherName": "Mridul Kanti Bhattacharjee",
        "teacherShortName": "MKB",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-7-11",
        "batchId": "batch-7",
        "day": "THURSDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-314",
        "courseCode": "SWE-314",
        "courseTitle": "Computer Networking Lab",
        "courseShortName": "CN Lab",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Room 405"
    },
    {
        "id": "rout-batch-7-12",
        "batchId": "batch-7",
        "day": "THURSDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-314",
        "courseCode": "SWE-314",
        "courseTitle": "Computer Networking Lab",
        "courseShortName": "CN Lab",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Room 405"
    },
    {
    
        "id": "rout-batch-8-1",
        "batchId": "batch-8",
        "day": "SUNDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem6-swe-234",
        "courseCode": "SWE-234",
        "courseShortName": "SADP Lab",
        "courseTitle": "Software Architecture and Design Patterns Lab",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Room 301"
    },
    {
    
        "id": "rout-batch-8-2",
        "batchId": "batch-8",
        "day": "SUNDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem6-swe-234",
        "courseCode": "SWE-234",
        "courseShortName": "SADP Lab",
        "courseTitle": "Software Architecture and Design Patterns Lab",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Room 301"
    },
    {
    
        "id": "rout-batch-8-3",
        "batchId": "batch-8",
        "day": "SUNDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-sem3-swe-111",
        "courseCode": "SWE-111",
        "courseShortName": "BEEC",
        "courseTitle": "Basic Electrical and Electronic Circuits",
        "teacherName": "A.I. Rahman",
        "teacherShortName": "AIR",
        "room": "Exten-5"
    },
    {
    
        "id": "rout-batch-8-4",
        "batchId": "batch-8",
        "day": "MONDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem3-swe-111",
        "courseCode": "SWE-111",
        "courseShortName": "BEEC",
        "courseTitle": "Basic Electrical and Electronic Circuits",
        "teacherName": "A.I. Rahman",
        "teacherShortName": "AIR",
        "room": "Room 403"
    },
    {
    
        "id": "rout-batch-8-5",
        "batchId": "batch-8",
        "day": "MONDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem6-swe-282",
        "courseCode": "SWE-282",
        "courseShortName": "JGD Lab",
        "courseTitle": "Project on Java GUI Development Lab",
        "teacherName": "Fuad Ahmed",
        "teacherShortName": "FA",
        "room": "Room 306"
    },
    {
    
        "id": "rout-batch-8-6",
        "batchId": "batch-8",
        "day": "MONDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-sem6-swe-282",
        "courseCode": "SWE-282",
        "courseShortName": "JGD Lab",
        "courseTitle": "Project on Java GUI Development Lab",
        "teacherName": "Fuad Ahmed",
        "teacherShortName": "FA",
        "room": "Room 306"
    },
    {
    
        "id": "rout-batch-8-7",
        "batchId": "batch-8",
        "day": "TUESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem6-swe-233",
        "courseCode": "SWE-233",
        "courseShortName": "SADP",
        "courseTitle": "Software Architecture and Design Patterns",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Room 403"
    },
    {
    
        "id": "rout-batch-8-8",
        "batchId": "batch-8",
        "day": "TUESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem6-swe-228",
        "courseCode": "SWE-228",
        "courseShortName": "CP Lab-2",
        "courseTitle": "Problem Solving with Competitive Programming Lab-2",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 405"
    },
    {
    
        "id": "rout-batch-8-9",
        "batchId": "batch-8",
        "day": "TUESDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-sem6-swe-228",
        "courseCode": "SWE-228",
        "courseShortName": "CP Lab-2",
        "courseTitle": "Problem Solving with Competitive Programming Lab-2",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 405"
    },
    {
    
        "id": "rout-batch-8-10",
        "batchId": "batch-8",
        "day": "THURSDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem6-swe-233",
        "courseCode": "SWE-233",
        "courseShortName": "SADP",
        "courseTitle": "Software Architecture and Design Patterns",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Room 508"
    },
    {
    
        "id": "rout-batch-8-11",
        "batchId": "batch-8",
        "day": "THURSDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem3-swe-112",
        "courseCode": "SWE-112",
        "courseShortName": "BEEC Lab",
        "courseTitle": "Basic Electrical and Electronic Circuits Lab",
        "teacherName": "A.I. Rahman",
        "teacherShortName": "AIR",
        "room": "Room 109"
    },
    {
    
        "id": "rout-batch-8-12",
        "batchId": "batch-8",
        "day": "THURSDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-sem3-swe-112",
        "courseCode": "SWE-112",
        "courseShortName": "BEEC Lab",
        "courseTitle": "Basic Electrical and Electronic Circuits Lab",
        "teacherName": "A.I. Rahman",
        "teacherShortName": "AIR",
        "room": "Room 109"
    },
    {
        "id": "rout-batch-11-1",
        "batchId": "batch-11",
        "day": "MONDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-124",
        "courseCode": "SWE-124",
        "courseTitle": "Data Structure Lab",
        "courseShortName": "DS Lab",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 405"
    },
    {
        "id": "rout-batch-11-2",
        "batchId": "batch-11",
        "day": "MONDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-124",
        "courseCode": "SWE-124",
        "courseTitle": "Data Structure Lab",
        "courseShortName": "DS Lab",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 405"
    },
    {
        "id": "rout-batch-11-3",
        "batchId": "batch-11",
        "day": "TUESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-123",
        "courseCode": "SWE-123",
        "courseTitle": "Data Structures",
        "courseShortName": "DS",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Exten-5"
    },
    {
        "id": "rout-batch-11-4",
        "batchId": "batch-11",
        "day": "TUESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-235",
        "courseCode": "SWE-235",
        "courseTitle": "Management Information Systems",
        "courseShortName": "MIS",
        "teacherName": "Wadia Iqbal Chowdhury",
        "teacherShortName": "WIC",
        "room": "Exten-3"
    },
    {
        "id": "rout-batch-11-5",
        "batchId": "batch-11",
        "day": "WEDNESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-mat-211",
        "courseCode": "MAT-211",
        "courseTitle": "Numerical Analysis",
        "courseShortName": "NA",
        "teacherName": "Syeda Sanjida Rahman",
        "teacherShortName": "SSJ",
        "room": "Room 502"
    },
    {
        "id": "rout-batch-11-6",
        "batchId": "batch-11",
        "day": "WEDNESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-123",
        "courseCode": "SWE-123",
        "courseTitle": "Data Structures",
        "courseShortName": "DS",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 502"
    },
    {
        "id": "rout-batch-11-7",
        "batchId": "batch-11",
        "day": "WEDNESDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-swe-235",
        "courseCode": "SWE-235",
        "courseTitle": "Management Information Systems",
        "courseShortName": "MIS",
        "teacherName": "Wadia Iqbal Chowdhury",
        "teacherShortName": "WIC",
        "room": "Exten-3"
    },
    {
        "id": "rout-batch-11-8",
        "batchId": "batch-11",
        "day": "THURSDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem3-mat-211",
        "courseCode": "MAT-211",
        "courseTitle": "Numerical Analysis",
        "courseShortName": "NA",
        "teacherName": "Syeda Sanjida Rahman",
        "teacherShortName": "SSJ",
        "room": "Exten-3"
    },
    {
        "id": "rout-batch-11-9",
        "batchId": "batch-11",
        "day": "THURSDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem3-swe-182",
        "courseCode": "SWE-182",
        "courseTitle": "Project on Python Development",
        "courseShortName": "PPD Lab",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Room 309"
    },
    {
        "id": "rout-batch-11-10",
        "batchId": "batch-11",
        "day": "THURSDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-sem3-swe-182",
        "courseCode": "SWE-182",
        "courseTitle": "Project on Python Development",
        "courseShortName": "PPD Lab",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Room 309"
    },
    {
        "id": "rout-batch-9-1",
        "batchId": "batch-9",
        "day": "MONDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem5-mat-211",
        "courseCode": "MAT-211",
        "courseTitle": "Numerical Analysis",
        "courseShortName": "NA",
        "teacherName": "Rina Paul",
        "teacherShortName": "RP",
        "room": "Exten-6"
    },
    {
        "id": "rout-batch-9-2",
        "batchId": "batch-9",
        "day": "MONDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem5-swe-211",
        "courseCode": "SWE-211",
        "courseTitle": "Computer Architecture",
        "courseShortName": "CA",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Exten-3"
    },
    {
        "id": "rout-batch-9-3",
        "batchId": "batch-9",
        "day": "TUESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem5-mat-211",
        "courseCode": "MAT-211",
        "courseTitle": "Numerical Analysis",
        "courseShortName": "NA",
        "teacherName": "Rina Paul",
        "teacherShortName": "RP",
        "room": "Exten-2"
    },
    {
        "id": "rout-batch-9-4",
        "batchId": "batch-9",
        "day": "TUESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem5-swe-223",
        "courseCode": "SWE-223",
        "courseTitle": "Object Oriented Programming",
        "courseShortName": "OOP",
        "teacherName": "Fuad Ahmed",
        "teacherShortName": "FA",
        "room": "Exten-2"
    },
    {
        "id": "rout-batch-9-5",
        "batchId": "batch-9",
        "day": "WEDNESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem5-swe-224",
        "courseCode": "SWE-224",
        "courseTitle": "Object Oriented Programming Lab",
        "courseShortName": "OOP Lab",
        "teacherName": "Fuad Ahmed",
        "teacherShortName": "FA",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-9-6",
        "batchId": "batch-9",
        "day": "WEDNESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem5-swe-224",
        "courseCode": "SWE-224",
        "courseTitle": "Object Oriented Programming Lab",
        "courseShortName": "OOP Lab",
        "teacherName": "Fuad Ahmed",
        "teacherShortName": "FA",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-9-7",
        "batchId": "batch-9",
        "day": "THURSDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem5-swe-223",
        "courseCode": "SWE-223",
        "courseTitle": "Object Oriented Programming",
        "courseShortName": "OOP",
        "teacherName": "Fuad Ahmed",
        "teacherShortName": "FA",
        "room": "Room 506"
    },
    {
        "id": "rout-batch-9-8",
        "batchId": "batch-9",
        "day": "THURSDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem5-swe-211",
        "courseCode": "SWE-211",
        "courseTitle": "Computer Architecture",
        "courseShortName": "CA",
        "teacherName": "Nazia Sultana Chowdhury",
        "teacherShortName": "NSC",
        "room": "Room 506"
    },
    {
        "id": "rout-batch-9-9",
        "batchId": "batch-9",
        "day": "THURSDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-sem5-swe-230",
        "courseCode": "SWE-230",
        "courseTitle": "Problem Solving with Competitive Programming Lab-1",
        "courseShortName": "CP Lab-1",
        "teacherName": "Obaidur Rahman",
        "teacherShortName": "OHR",
        "room": "Room 301 (Lab-1)"
    },
    {
        "id": "rout-batch-9-10",
        "batchId": "batch-9",
        "day": "THURSDAY",
        "startTime": "01:30 PM",
        "endTime": "03:00 PM",
        "courseId": "course-sem5-swe-230",
        "courseCode": "SWE-230",
        "courseTitle": "Problem Solving with Competitive Programming Lab-1",
        "courseShortName": "CP Lab-1",
        "teacherName": "Obaidur Rahman",
        "teacherShortName": "OHR",
        "room": "Room 301 (Lab-1)"
    },
    {
        "id": "rout-batch-6-1",
        "batchId": "batch-6",
        "day": "SUNDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-461",
        "courseCode": "SWE-461",
        "courseTitle": "Introduction to Cryptography",
        "courseShortName": "IC",
        "teacherName": "Syeda Sanjida Rahman",
        "teacherShortName": "SSJ",
        "room": "Room 306"
    },
    {
        "id": "rout-batch-6-2",
        "batchId": "batch-6",
        "day": "SUNDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-422",
        "courseCode": "SWE-422",
        "courseTitle": "Mobile App Development Practice Lab",
        "courseShortName": "MDP Lab",
        "teacherName": "Md. Ziaul Karim",
        "teacherShortName": "MZUK",
        "room": "Room 405"
    },
    {
        "id": "rout-batch-6-3",
        "batchId": "batch-6",
        "day": "SUNDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-swe-422",
        "courseCode": "SWE-422",
        "courseTitle": "Mobile App Development Practice Lab",
        "courseShortName": "MDP Lab",
        "teacherName": "Md. Ziaul Karim",
        "teacherShortName": "MZUK",
        "room": "Room 405"
    },
    {
        "id": "rout-batch-6-4",
        "batchId": "batch-6",
        "day": "MONDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-318",
        "courseCode": "SWE-318",
        "courseTitle": "Machine Learning Lab",
        "courseShortName": "ML Lab",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-6-5",
        "batchId": "batch-6",
        "day": "MONDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-318",
        "courseCode": "SWE-318",
        "courseTitle": "Machine Learning Lab",
        "courseShortName": "ML Lab",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-6-6",
        "batchId": "batch-6",
        "day": "TUESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-317",
        "courseCode": "SWE-317",
        "courseTitle": "Machine Learning",
        "courseShortName": "ML",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Room 409"
    },
    {
        "id": "rout-batch-6-7",
        "batchId": "batch-6",
        "day": "TUESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-461",
        "courseCode": "SWE-461",
        "courseTitle": "Introduction to Cryptography",
        "courseShortName": "IC",
        "teacherName": "Syeda Sanjida Rahman",
        "teacherShortName": "SSJ",
        "room": "Room 409"
    },
    {
        "id": "rout-batch-6-8",
        "batchId": "batch-6",
        "day": "TUESDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-ged-403",
        "courseCode": "GED-403",
        "courseTitle": "Entrepreneurship Development",
        "courseShortName": "ED",
        "teacherName": "Wadia Iqbal Chowdhury",
        "teacherShortName": "WIC",
        "room": "Room 504"
    },
    {
        "id": "rout-batch-6-9",
        "batchId": "batch-6",
        "day": "THURSDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-317",
        "courseCode": "SWE-317",
        "courseTitle": "Machine Learning",
        "courseShortName": "ML",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Exten-2"
    },
    {
        "id": "rout-batch-6-10",
        "batchId": "batch-6",
        "day": "THURSDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-ged-403",
        "courseCode": "GED-403",
        "courseTitle": "Entrepreneurship Development",
        "courseShortName": "ED",
        "teacherName": "Wadia Iqbal Chowdhury",
        "teacherShortName": "WIC",
        "room": "Exten-2"
    },
    {
        "id": "rout-batch-5-1",
        "batchId": "batch-5",
        "day": "SUNDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-457",
        "courseCode": "SWE-457",
        "courseTitle": "Neural Network and Deep Learning",
        "courseShortName": "NN&DL",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Exten-6"
    },
    {
        "id": "rout-batch-5-2",
        "batchId": "batch-5",
        "day": "SUNDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-228",
        "courseCode": "SWE-228",
        "courseTitle": "Problem Solving with Competitive Programming Lab-2",
        "courseShortName": "CP Lab-2",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-5-3",
        "batchId": "batch-5",
        "day": "SUNDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-swe-228",
        "courseCode": "SWE-228",
        "courseTitle": "Problem Solving with Competitive Programming Lab-2",
        "courseShortName": "CP Lab-2",
        "teacherName": "Iffat Ahmed Chowdhury Nahid",
        "teacherShortName": "IAC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-5-4",
        "batchId": "batch-5",
        "day": "TUESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-457",
        "courseCode": "SWE-457",
        "courseTitle": "Neural Network and Deep Learning",
        "courseShortName": "NN&DL",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Room 502"
    },
    {
        "id": "rout-batch-5-5",
        "batchId": "batch-5",
        "day": "TUESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-mat-211",
        "courseCode": "MAT-211",
        "courseTitle": "Numerical Analysis",
        "courseShortName": "NA",
        "teacherName": "Rina Paul",
        "teacherShortName": "RP",
        "room": "Exten-1"
    },
    {
        "id": "rout-batch-5-6",
        "batchId": "batch-5",
        "day": "WEDNESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-458",
        "courseCode": "SWE-458",
        "courseTitle": "Neural Network and Deep Learning Lab",
        "courseShortName": "NN&DL Lab",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-5-7",
        "batchId": "batch-5",
        "day": "WEDNESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-458",
        "courseCode": "SWE-458",
        "courseTitle": "Neural Network and Deep Learning Lab",
        "courseShortName": "NN&DL Lab",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-5-8",
        "batchId": "batch-5",
        "day": "WEDNESDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-mat-211",
        "courseCode": "MAT-211",
        "courseTitle": "Numerical Analysis",
        "courseShortName": "NA",
        "teacherName": "Rina Paul",
        "teacherShortName": "RP",
        "room": "Exten-6"
    },
    {
        "id": "rout-batch-10-1",
        "batchId": "batch-10",
        "day": "SUNDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-225",
        "courseCode": "SWE-225",
        "courseTitle": "Database Management System",
        "courseShortName": "DBMS",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Room 504"
    },
    {
        "id": "rout-batch-10-2",
        "batchId": "batch-10",
        "day": "SUNDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-221",
        "courseCode": "SWE-221",
        "courseTitle": "Algorithm",
        "courseShortName": "ALGO",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Room 504"
    },
    {
        "id": "rout-batch-10-3",
        "batchId": "batch-10",
        "day": "MONDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-222",
        "courseCode": "SWE-222",
        "courseTitle": "Algorithm Lab",
        "courseShortName": "ALGO Lab",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-10-4",
        "batchId": "batch-10",
        "day": "MONDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-222",
        "courseCode": "SWE-222",
        "courseTitle": "Algorithm Lab",
        "courseShortName": "ALGO Lab",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-10-5",
        "batchId": "batch-10",
        "day": "MONDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-sem4-swe-231",
        "courseCode": "SWE-231",
        "courseTitle": "Software Requirement Engineering",
        "courseShortName": "SRE",
        "teacherName": "Wadia Iqbal Chowdhury",
        "teacherShortName": "WIC",
        "room": "Room 403"
    },
    {
        "id": "rout-batch-10-6",
        "batchId": "batch-10",
        "day": "TUESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-sem4-swe-225",
        "courseCode": "SWE-225",
        "courseTitle": "Database Management System",
        "courseShortName": "DBMS",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Room 403"
    },
    {
        "id": "rout-batch-10-7",
        "batchId": "batch-10",
        "day": "TUESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-sem4-swe-221",
        "courseCode": "SWE-221",
        "courseTitle": "Algorithm",
        "courseShortName": "ALGO",
        "teacherName": "Al Akram Chowdhury",
        "teacherShortName": "AAC",
        "room": "Room 501"
    },
    {
        "id": "rout-batch-10-8",
        "batchId": "batch-10",
        "day": "WEDNESDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-mat-211",
        "courseCode": "MAT-211",
        "courseTitle": "Numerical Analysis",
        "courseShortName": "NA",
        "teacherName": "Syeda Sanjida Rahman",
        "teacherShortName": "SSJ",
        "room": "Exten-4"
    },
    {
        "id": "rout-batch-10-9",
        "batchId": "batch-10",
        "day": "WEDNESDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-swe-226",
        "courseCode": "SWE-226",
        "courseTitle": "Database Management System Lab",
        "courseShortName": "DBMS Lab",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-10-10",
        "batchId": "batch-10",
        "day": "WEDNESDAY",
        "startTime": "12:00 PM",
        "endTime": "01:30 PM",
        "courseId": "course-swe-226",
        "courseCode": "SWE-226",
        "courseTitle": "Database Management System Lab",
        "courseShortName": "DBMS Lab",
        "teacherName": "Nazia Hassan",
        "teacherShortName": "NHN",
        "room": "Room 301"
    },
    {
        "id": "rout-batch-10-11",
        "batchId": "batch-10",
        "day": "THURSDAY",
        "startTime": "09:00 AM",
        "endTime": "10:30 AM",
        "courseId": "course-swe-231",
        "courseCode": "SWE-231",
        "courseTitle": "Software Requirement Engineering",
        "courseShortName": "SRE",
        "teacherName": "Wadia Iqbal Chowdhury",
        "teacherShortName": "WIC",
        "room": "Room 403"
    },
    {
        "id": "rout-batch-10-12",
        "batchId": "batch-10",
        "day": "THURSDAY",
        "startTime": "10:30 AM",
        "endTime": "12:00 PM",
        "courseId": "course-mat-211",
        "courseCode": "MAT-211",
        "courseTitle": "Numerical Analysis",
        "courseShortName": "NA",
        "teacherName": "Syeda Sanjida Rahman",
        "teacherShortName": "SSJ",
        "room": "Room 403"
    }
];

  // Dates relative to current date (2026-08-12)
  const exams: Exam[] = [
    {
      id: 'exam-1',
      batchId: 'batch-9',
      courseId: 'course-swe-225',
      courseCode: 'SWE-225',
      courseTitle: 'Database Management System',
      type: 'MIDTERM',
      title: 'Database Management System Midterm Exam',
      date: '2026-08-15', // 3 days from now
      startTime: '10:00 AM',
      room: 'Exam Hall 3',
      description: 'Covers Chapters 1-5: ER Diagram, Relational Algebra, SQL, Normalization (1NF to BCNF).',
      createdBy: 'user-cr-1',
      createdByName: 'Mahmudul Hasan (CR)',
      createdAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'exam-2',
      batchId: 'batch-9',
      courseId: 'course-swe-221',
      courseCode: 'SWE-221',
      courseTitle: 'Algorithm',
      type: 'QUIZ',
      title: 'Algorithm Quiz 2 (Dynamic Programming)',
      date: '2026-08-20', // 8 days from now
      startTime: '11:30 AM',
      room: 'Room 402',
      description: 'Topics: Knapsack, LCS, Matrix Chain Multiplication.',
      createdBy: 'user-cr-1',
      createdByName: 'Mahmudul Hasan (CR)',
      createdAt: '2026-08-05T12:00:00Z',
    },
    {
      id: 'exam-3',
      batchId: 'batch-9',
      courseId: 'course-swe-231',
      courseCode: 'SWE-231',
      courseTitle: 'Software Requirement Engineering',
      type: 'PRESENTATION',
      title: 'SRS Document Project Presentation',
      date: '2026-09-02', // 21 days from now
      startTime: '01:00 PM',
      room: 'Room 504',
      description: '10 minutes team presentation on SRS, UML Use Cases, Sequence Diagrams.',
      createdBy: 'user-cr-1',
      createdByName: 'Mahmudul Hasan (CR)',
      createdAt: '2026-08-08T09:00:00Z',
    },
    {
      id: 'exam-4',
      batchId: 'batch-8',
      courseId: 'course-swe-457',
      courseCode: 'SWE-457',
      courseTitle: 'Neural Network and Deep Learning',
      type: 'MIDTERM',
      title: 'Neural Network & Deep Learning Midterm Assessment',
      date: '2026-08-18',
      startTime: '10:00 AM',
      room: 'Exam Hall 1',
      createdBy: 'user-cr-2',
      createdByName: 'Saima Akter (CR)',
      createdAt: '2026-08-02T10:00:00Z',
    },
  ];

  const announcements: BatchAnnouncement[] = [
    {
      id: 'ann-1',
      batchId: 'batch-9',
      title: 'Database Assignment Submission Deadline Extended',
      description: 'Nazia Sultana Chowdhury has extended the Database ER-Diagram assignment submission till Sunday 18th August. Submit via portal or offline hardcopy.',
      publishDate: '2026-08-10',
      expiryDate: '2026-08-25',
      priority: 'IMPORTANT',
      createdBy: 'user-cr-1',
      createdByName: 'Mahmudul Hasan (CR)',
      createdAt: '2026-08-10T08:00:00Z',
    },
    {
      id: 'ann-2',
      batchId: 'batch-9',
      title: 'Software Engineering Makeup Class on Friday',
      description: 'Extra class for SWE 307 scheduled for Friday 10:00 AM at Room 401. Attendance will be recorded.',
      publishDate: '2026-08-11',
      expiryDate: '2026-08-16',
      priority: 'URGENT',
      createdBy: 'user-cr-1',
      createdByName: 'Mahmudul Hasan (CR)',
      createdAt: '2026-08-11T14:00:00Z',
    },
    {
      id: 'ann-3',
      batchId: 'batch-9',
      title: 'Lab Manual for Computer Networks Uploaded',
      description: 'Check the Lab Resources section for Cisco Packet Tracer lab manual 3.',
      publishDate: '2026-08-01',
      expiryDate: '2026-08-05', // Expired announcement to test archive
      priority: 'NORMAL',
      createdBy: 'user-cr-1',
      createdByName: 'Mahmudul Hasan (CR)',
      createdAt: '2026-08-01T09:00:00Z',
    },
  ];

  const departmentNotices: DepartmentNotice[] = [
    {
      id: 'notice-1',
      title: 'Fall 2026 Semester Course Registration Schedule & Instructions',
      content: 'All students of SWE Department are hereby notified that Fall 2026 semester registration will commence from August 20, 2026. Clear all outstanding tuition fees before registration.',
      category: 'REGISTRATION',
      publishDate: '2026-08-08',
      isImportant: true,
      createdBy: 'system-admin',
      createdByName: 'Department Administration',
      createdAt: '2026-08-08T10:00:00Z',
    },
    {
      id: 'notice-2',
      title: 'National Mourning Day Holiday Notice',
      content: 'The university and all academic activities will remain closed on August 15, 2026 on account of National Mourning Day.',
      category: 'HOLIDAY',
      publishDate: '2026-08-09',
      isImportant: true,
      createdBy: 'system-admin',
      createdByName: 'Department Administration',
      createdAt: '2026-08-09T11:00:00Z',
    },
    {
      id: 'notice-3',
      title: 'Guest Seminar on Cloud Native Systems & Microservices',
      content: 'Join us on August 22 at Auditorium 2 for an industry seminar conducted by Senior Software Engineers from Google & AWS.',
      category: 'SEMINAR',
      publishDate: '2026-08-05',
      isImportant: false,
      createdBy: 'system-admin',
      createdByName: 'Department Administration',
      createdAt: '2026-08-05T08:00:00Z',
    },
  ];

  const resources: Resource[] = [
    {
      id: 'res-1',
      title: 'Database Management System Final Exam Question Paper 2025',
      type: 'QUESTION',
      courseId: 'course-swe-225',
      courseCode: 'SWE-225',
      courseTitle: 'Database Management System',
      semester: 4,
      academicYear: 2025,
      examType: 'FINAL',
      facultyName: 'Nazia Sultana Chowdhury',
      targetBatch: 'SWE 9th Batch',
      description: 'Official Spring 2025 Final Examination question paper with answer hints for SQL & Normalization.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_225_Final_Exam_2025.pdf',
      fileSize: '1.2 MB',
      fileType: 'application/pdf',
      uploaderId: 'user-student-1',
      uploaderStudentId: '252-134-022',
      uploaderName: 'Rashedul Hasan',
      uploaderBatchName: 'SWE 9th Batch',
      status: 'APPROVED',
      downloadCount: 48,
      createdAt: '2026-07-20T10:00:00Z',
      verifiedAt: '2026-07-21T12:00:00Z',
    },
    {
      id: 'res-5',
      title: 'Software Requirement Engineering Midterm Question Paper 2025',
      type: 'QUESTION',
      courseId: 'course-swe-231',
      courseCode: 'SWE-231',
      courseTitle: 'Software Requirement Engineering',
      semester: 3,
      academicYear: 2025,
      examType: 'MIDTERM',
      facultyName: 'Fuad Ahmed',
      targetBatch: 'SWE 9th Batch',
      description: 'Midterm paper covering Software Development Life Cycle (SDLC), Agile Manifesto, and Use Case Diagrams.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_231_Midterm_2025.pdf',
      fileSize: '1.1 MB',
      fileType: 'application/pdf',
      uploaderId: 'user-cr-1',
      uploaderStudentId: '252-134-001',
      uploaderName: 'Mahmudul Hasan (CR)',
      uploaderBatchName: 'SWE 9th Batch',
      status: 'APPROVED',
      downloadCount: 35,
      createdAt: '2026-07-22T09:00:00Z',
      verifiedAt: '2026-07-22T11:00:00Z',
    },
    {
      id: 'res-sheet-24',
      title: 'Software Requirement Engineering Final Exam Question 8th Batch',
      type: 'QUESTION',
      courseId: 'course-swe-231',
      courseCode: 'SWE-231',
      courseTitle: 'Software Requirement Engineering',
      semester: 4,
      academicYear: 2025,
      examType: 'FINAL',
      facultyName: 'Department Academic Faculty',
      targetBatch: '1st, 2nd, 3rd, 4th, 5th, 8th, 9th Batch',
      description: 'Official Metropolitan University Department Question Archive for Software Requirement Engineering (SWE-231) covering 8th Batch and junior batches. Direct Google Drive PDF download.',
      fileUrl: 'https://drive.google.com/uc?export=download&id=1S8-aZpHfzrp0beMEtaoFBJwNShxWtlDn',
      fileName: 'SWE-231_Final_Exam_SRE-1-2-3-4-5-8-9.pdf',
      fileSize: '1.4 MB',
      fileType: 'application/pdf',
      uploaderId: 'user-admin-1',
      uploaderStudentId: '252-ADMIN',
      uploaderName: 'Department Academic Cell',
      uploaderBatchName: 'SWE Department Archive',
      status: 'APPROVED',
      downloadCount: 114,
      createdAt: '2026-07-25T10:00:00Z',
      verifiedAt: '2026-07-25T11:00:00Z',
    },
    {
      id: 'res-6',
      title: 'Computer Networking Quiz 1 Question Paper 2026',
      type: 'QUESTION',
      courseId: 'course-swe-313',
      courseCode: 'SWE-313',
      courseTitle: 'Computer Networking',
      semester: 5,
      academicYear: 2026,
      examType: 'QUIZ',
      facultyName: 'Syeda Sanjida Rahman',
      targetBatch: 'SWE 9th Batch',
      description: 'Quiz paper covering OSI Model layers, TCP/IP Suite, and IP Subnetting calculations.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_313_Quiz1_2026.pdf',
      fileSize: '820 KB',
      fileType: 'application/pdf',
      uploaderId: 'user-student-2',
      uploaderStudentId: '252-134-023',
      uploaderName: 'Sadia Afrin',
      uploaderBatchName: 'SWE 9th Batch',
      status: 'APPROVED',
      downloadCount: 62,
      createdAt: '2026-07-28T14:00:00Z',
      verifiedAt: '2026-07-29T10:00:00Z',
    },
    {
      id: 'res-2',
      title: 'Complete Software Verification & Testing Lecture Notes (Ch 1-8)',
      type: 'NOTE',
      courseId: 'course-swe-333',
      courseCode: 'SWE-333',
      courseTitle: 'Software Verification & Testing',
      semester: 6,
      academicYear: 2026,
      facultyName: 'Rina Paul',
      targetBatch: 'SWE 9th Batch',
      description: 'Comprehensive handwritten and digitized lecture notes covering Agile, Scrum, Design Patterns, and SRS.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_333_Software_Verification_Notes.pdf',
      fileSize: '3.4 MB',
      fileType: 'application/pdf',
      uploaderId: 'user-student-2',
      uploaderStudentId: '252-134-023',
      uploaderName: 'Sadia Afrin',
      uploaderBatchName: 'SWE 9th Batch',
      status: 'APPROVED',
      downloadCount: 92,
      createdAt: '2026-07-25T11:00:00Z',
      verifiedAt: '2026-07-26T09:00:00Z',
    },
    {
      id: 'res-3',
      title: 'Cisco Packet Tracer Lab Experiments & Topology Files',
      type: 'LAB',
      courseId: 'course-swe-314',
      courseCode: 'SWE-314',
      courseTitle: 'Computer Networking Lab',
      semester: 5,
      academicYear: 2026,
      labCategory: 'SOURCE_CODE',
      facultyName: 'Syeda Sanjida Rahman',
      targetBatch: 'SWE 9th Batch',
      description: 'Subnetting, VLAN configuration, RIP/OSPF routing topologies for Packet Tracer.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'Networks_Lab_Pack_SWE314.zip',
      fileSize: '8.1 MB',
      fileType: 'application/zip',
      uploaderId: 'user-student-1',
      uploaderStudentId: '252-134-022',
      uploaderName: 'Rashedul Hasan',
      uploaderBatchName: 'SWE 9th Batch',
      status: 'APPROVED',
      downloadCount: 31,
      createdAt: '2026-08-02T14:00:00Z',
      verifiedAt: '2026-08-03T10:00:00Z',
    },
    {
      id: 'res-4',
      title: 'Algorithm Midterm Exam Question 2024 (Spring)',
      type: 'QUESTION',
      courseId: 'course-swe-221',
      courseCode: 'SWE-221',
      courseTitle: 'Algorithm',
      semester: 4,
      academicYear: 2024,
      examType: 'MIDTERM',
      facultyName: 'Lukman Hussain Nakib',
      targetBatch: 'SWE 9th Batch',
      description: 'Midterm paper covering Recurrence relations, Divide & Conquer, MergeSort, QuickSort proofs.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_221_Midterm_2024.pdf',
      fileSize: '950 KB',
      fileType: 'application/pdf',
      uploaderId: 'user-student-1',
      uploaderStudentId: '252-134-022',
      uploaderName: 'Rashedul Hasan',
      uploaderBatchName: 'SWE 9th Batch',
      status: 'PENDING',
      downloadCount: 0,
      createdAt: '2026-08-11T16:00:00Z',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: 'user-student-1',
      title: 'Resource Approved 🎉',
      message: 'Your contribution "Cisco Packet Tracer Lab Experiments" has been verified and published.',
      type: 'RESOURCE_APPROVED',
      linkUrl: '/resources/labs',
      read: false,
      createdAt: '2026-08-03T10:00:00Z',
    },
    {
      id: 'notif-2',
      userId: 'user-student-1',
      title: 'New Announcement',
      message: 'Urgent: Software Engineering Makeup Class on Friday.',
      type: 'ANNOUNCEMENT',
      linkUrl: '/announcements',
      read: false,
      createdAt: '2026-08-11T14:00:00Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      actorId: 'system-admin',
      actorName: 'Department Administration',
      action: 'RESOURCE_APPROVED',
      target: 'Resource #res-3',
      details: 'Approved Cisco Packet Tracer Lab Experiments submitted by Rashedul Hasan',
      timestamp: '2026-08-03T10:00:00Z',
    },
    {
      id: 'log-2',
      actorId: 'system-admin',
      actorName: 'Department Administration',
      action: 'NOTICE_PUBLISHED',
      target: 'Department Notice #notice-1',
      details: 'Published Fall 2026 Registration notice',
      timestamp: '2026-08-08T10:00:00Z',
    },
  ];

  return {
    users,
    passwords,
    batches,
    courses,
    routines,
    exams,
    announcements,
    departmentNotices,
    resources,
    faculty,
    notifications,
    auditLogs,
    routineRequests: [],
    retakeRegistrations: [],
  };
}

class JsonDB {
  private data: DBData;

  constructor() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading DB_FILE, seeding fresh data...', err);
        this.data = seedInitialData();
        this.save();
      }
    } else {
      this.data = seedInitialData();
      this.save();
    }

    // Ensure all collections are defined
    if (!this.data.users) this.data.users = [];
    if (!this.data.passwords) this.data.passwords = {};
    if (!this.data.batches) this.data.batches = [];
    if (!this.data.courses) this.data.courses = [];
    if (!this.data.routines) this.data.routines = [];
    if (!this.data.exams) this.data.exams = [];
    if (!this.data.announcements) this.data.announcements = [];
    if (!this.data.departmentNotices) this.data.departmentNotices = [];
    if (!this.data.resources) this.data.resources = [];
    if (!this.data.faculty) this.data.faculty = [];
    if (!this.data.routineRequests) this.data.routineRequests = [];
    if (!this.data.notifications) this.data.notifications = [];
    if (!this.data.auditLogs) this.data.auditLogs = [];
    if (!this.data.retakeRegistrations) this.data.retakeRegistrations = [];

    // Normalize and populate default batches with semesterMode and status
    const initialBatches = seedInitialData().batches;
    initialBatches.forEach(seedBatch => {
      const existing = this.data.batches.find(b => b.id === seedBatch.id || b.name.toLowerCase() === seedBatch.name.toLowerCase());
      if (!existing) {
        this.data.batches.push(seedBatch);
      }
    });

    this.data.batches.forEach(b => {
      const lowerName = b.name.toLowerCase();
      if (!b.semesterMode) {
        if (lowerName.includes('5th') || lowerName.includes('6th') || lowerName.includes('7th')) {
          b.semesterMode = 'MANUAL';
        } else {
          b.semesterMode = 'SEQUENCE';
        }
      }
      if (!b.status) {
        b.status = b.currentSemester > 8 ? 'GRADUATED' : 'ACTIVE';
      }
      if (!b.crIds) b.crIds = [];
    });

    // Remove legacy demo users and any old hardcoded admin101 accounts
    this.data.users = this.data.users.filter(u => {
      const sid = (u.studentId || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      if (sid === '2023-swe-001' || sid === '2022-swe-002' || sid === '2021-swe-003' || sid === 'admin-001' || sid === 'admin101') return false;
      if (email === 'admin@swe.edu') return false;
      if (id === 'user-admin-1' || id === 'user-admin-101') return false;
      if (name.includes('tanvir hossain') || name.includes('samiul alam') || name.includes('dr. shahriar')) return false;
      return true;
    });

    // Ensure Official Central Admin user exists
    const adminUser: User = {
      id: 'usr_swe_admin_central',
      studentId: 'admin',
      name: 'Department Admin',
      email: 'admin@swe.metrouni.edu.bd',
      phone: '+8801700000000',
      role: 'ADMIN',
      batchId: 'batch-9',
      batchName: 'SWE Administration',
      currentSemester: 8,
      profileImage: '/avatars/pangolin-cream-2.svg',
      status: 'ACTIVE',
      points: 1000,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    };

    const existingAdminIdx = this.data.users.findIndex(u => u.id === adminUser.id || u.studentId === 'admin' || u.email === adminUser.email);
    if (existingAdminIdx >= 0) {
      this.data.users[existingAdminIdx] = { ...this.data.users[existingAdminIdx], ...adminUser, role: 'ADMIN', status: 'ACTIVE' };
    } else {
      this.data.users.push(adminUser);
    }
    this.data.passwords[adminUser.id] = bcrypt.hashSync('admin123', 10);

    this.save();

    // Trigger Supabase initial data hydration in the background
    hydrateFromSupabase(this.data).catch(() => {});
    // Continuous background sync
    startAutoSync(() => this.data);
  }

  public save() {
    try {
      if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
        return;
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // In read-only or serverless environments, file persistence is bypassed as Supabase is the single source of truth
    }
  }

  public getData(): DBData {
    return this.data;
  }

  public getCourses(): Course[] {
    return this.data.courses || [];
  }

  public getBatches(): Batch[] {
    return this.data.batches || [];
  }

  public getRoutines(): RoutineSlot[] {
    return this.data.routines || [];
  }

  public getExams(): Exam[] {
    return this.data.exams || [];
  }

  public getAnnouncements(): BatchAnnouncement[] {
    return this.data.announcements || [];
  }

  // Helper methods
  public getUsers(): User[] {
    return this.data.users || [];
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByStudentId(studentId: string): User | undefined {
    if (!studentId) return undefined;
    const term = studentId.trim().toLowerCase();
    const termNoDash = term.replace(/[\s-]/g, '');

    // 1. Direct match on studentId or email or userId
    let user = this.data.users.find(
      u => u.studentId?.toLowerCase() === term ||
           (u.email && u.email.toLowerCase() === term) ||
           u.id.toLowerCase() === term
    );
    if (user) return user;

    // 2. Match without dashes/spaces (e.g., 252134022 vs 252-134-022)
    user = this.data.users.find(
      u => u.studentId?.toLowerCase().replace(/[\s-]/g, '') === termNoDash
    );
    if (user) return user;

    return undefined;
  }

  public getPasswordHash(userId: string): string | undefined {
    return this.data.passwords[userId];
  }

  public setPasswordHash(userId: string, hash: string) {
    this.data.passwords[userId] = hash;
    this.save();
  }

  public async addUser(user: User, passwordHash: string) {
    this.data.users.push(user);
    this.data.passwords[user.id] = passwordHash;
    this.save();
    try {
      await syncToSupabase('users', {
        id: user.id,
        student_id: user.studentId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        batch_id: user.batchId,
        batch_name: user.batchName,
        current_semester: user.currentSemester,
        profile_image: user.profileImage,
        status: user.status,
        points: user.points || 0,
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[Supabase Direct User Insert Error]:', e);
    }
  }

  public async updateUser(user: User) {
    const idx = this.data.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      this.data.users[idx] = user;
      this.save();
      try {
        await syncToSupabase('users', {
          id: user.id,
          student_id: user.studentId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          batch_id: user.batchId,
          batch_name: user.batchName,
          current_semester: user.currentSemester,
          profile_image: user.profileImage,
          status: user.status,
          points: user.points || 0,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error('[Supabase Direct User Update Error]:', e);
      }
    }
  }

  public addAuditLog(actorId: string, actorName: string, action: string, target: string, details?: string) {
    const log: AuditLog = {
      id: `log-${Date.now()}`,
      actorId,
      actorName,
      action,
      target,
      details,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(log);
    this.save();
  }

  public getRetakes(): RetakeRegistration[] {
    if (!this.data.retakeRegistrations) {
      this.data.retakeRegistrations = [];
    }
    return this.data.retakeRegistrations;
  }

  public saveRetake(registration: RetakeRegistration) {
    if (!this.data.retakeRegistrations) {
      this.data.retakeRegistrations = [];
    }
    const idx = this.data.retakeRegistrations.findIndex(r => r.id === registration.id);
    if (idx >= 0) {
      this.data.retakeRegistrations[idx] = registration;
    } else {
      this.data.retakeRegistrations.push(registration);
    }
    this.save();
  }

  public deleteRetake(id: string): boolean {
    if (!this.data.retakeRegistrations) return false;
    const initialLen = this.data.retakeRegistrations.length;
    this.data.retakeRegistrations = this.data.retakeRegistrations.filter(r => r.id !== id);
    if (this.data.retakeRegistrations.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }
}

export const db = new JsonDB();
