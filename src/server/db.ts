import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User, Batch, Course, RoutineSlot, Exam, BatchAnnouncement,
  DepartmentNotice, Resource, Faculty, NotificationItem, AuditLog, RoutineRequest
} from '../types';

import { syncToSupabase, deleteFromSupabase, hydrateFromSupabase } from './supabaseSync';

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
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function seedInitialData(): DBData {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);

  const batches: Batch[] = [
    {
      id: 'batch-9',
      name: 'SWE 9th Batch',
      admissionYear: 2023,
      currentSemester: 5,
      academicSession: '2023-2024',
      crIds: [],
      createdAt: '2023-01-15T00:00:00Z',
    },
    {
      id: 'batch-8',
      name: 'SWE 8th Batch',
      admissionYear: 2022,
      currentSemester: 7,
      academicSession: '2022-2023',
      crIds: [],
      createdAt: '2022-01-15T00:00:00Z',
    },
    {
      id: 'batch-10',
      name: 'SWE 10th Batch',
      admissionYear: 2024,
      currentSemester: 3,
      academicSession: '2024-2025',
      crIds: [],
      createdAt: '2024-01-15T00:00:00Z',
    },
  ];

  const users: User[] = [
    {
      id: 'user-admin-1',
      studentId: 'admin101',
      name: 'admin101',
      email: 'admin@swe.edu',
      phone: '+8801700000000',
      role: 'ADMIN',
      currentSemester: 0,
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      status: 'ACTIVE',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T00:00:00Z',
    },
  ];

  const passwords: Record<string, string> = {
    'user-admin-1': adminPasswordHash,
  };

  const faculty: Faculty[] = [
    {
      id: 'fac-1',
      name: 'Dr. Tanvir Rahman',
      designation: 'Associate Professor',
      department: 'Software Engineering',
      email: 'tanvir.rahman@swe.edu',
      phone: '+8801712001122',
      officeRoom: '501-A Academic Building',
      photoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300',
      specialization: 'Database Engineering & Distributed Systems',
      assignedCourses: ['SWE 305 Database Systems', 'SWE 401 Distributed Databases'],
    },
    {
      id: 'fac-2',
      name: 'Mr. Imran Hossain',
      designation: 'Assistant Professor',
      department: 'Software Engineering',
      email: 'imran.hossain@swe.edu',
      phone: '+8801712003344',
      officeRoom: '405 Academic Building',
      photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300',
      specialization: 'Software Architecture & Agile Methodologies',
      assignedCourses: ['SWE 307 Software Engineering', 'SWE 313 Web Engineering'],
    },
    {
      id: 'fac-3',
      name: 'Ms. Nusrat Jahan',
      designation: 'Senior Lecturer',
      department: 'Software Engineering',
      email: 'nusrat.jahan@swe.edu',
      phone: '+8801712005566',
      officeRoom: '408 Academic Building',
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
      specialization: 'Computer Networks & Cybersecurity',
      assignedCourses: ['SWE 311 Computer Networks', 'SWE 405 Information Security'],
    },
    {
      id: 'fac-4',
      name: 'Prof. Dr. Ahsan Habib',
      designation: 'Professor & Dean',
      department: 'Software Engineering',
      email: 'ahsan.habib@swe.edu',
      phone: '+8801712007788',
      officeRoom: '601 Dean Office',
      photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300',
      specialization: 'Algorithm Complexity & Graph Theory',
      assignedCourses: ['SWE 309 Algorithms', 'SWE 101 Discrete Mathematics'],
    },
  ];

  const courses: Course[] = [
    {
      id: 'course-305',
      code: 'SWE 305',
      title: 'Database Systems',
      credits: 3,
      type: 'THEORY',
      semester: 5,
      assignedFacultyId: 'fac-1',
      assignedFacultyName: 'Dr. Tanvir Rahman',
      batchIds: ['batch-9'],
    },
    {
      id: 'course-307',
      code: 'SWE 307',
      title: 'Software Engineering',
      credits: 3,
      type: 'THEORY',
      semester: 5,
      assignedFacultyId: 'fac-2',
      assignedFacultyName: 'Mr. Imran Hossain',
      batchIds: ['batch-9'],
    },
    {
      id: 'course-309',
      code: 'SWE 309',
      title: 'Algorithms',
      credits: 3,
      type: 'THEORY',
      semester: 5,
      assignedFacultyId: 'fac-4',
      assignedFacultyName: 'Prof. Dr. Ahsan Habib',
      batchIds: ['batch-9'],
    },
    {
      id: 'course-311',
      code: 'SWE 311',
      title: 'Computer Networks',
      credits: 3,
      type: 'THEORY',
      semester: 5,
      assignedFacultyId: 'fac-3',
      assignedFacultyName: 'Ms. Nusrat Jahan',
      batchIds: ['batch-9'],
    },
    {
      id: 'course-313',
      code: 'SWE 313',
      title: 'Web Engineering',
      credits: 3,
      type: 'THEORY',
      semester: 5,
      assignedFacultyId: 'fac-2',
      assignedFacultyName: 'Mr. Imran Hossain',
      batchIds: ['batch-9'],
    },
    {
      id: 'course-401',
      code: 'SWE 401',
      title: 'Distributed Databases',
      credits: 3,
      type: 'THEORY',
      semester: 7,
      assignedFacultyId: 'fac-1',
      assignedFacultyName: 'Dr. Tanvir Rahman',
      batchIds: ['batch-8'],
    },
  ];

  const routines: RoutineSlot[] = [
    // Sunday - Batch 9
    {
      id: 'rout-1',
      batchId: 'batch-9',
      day: 'SUNDAY',
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      courseId: 'course-305',
      courseCode: 'SWE 305',
      courseTitle: 'Database Systems',
      teacherName: 'Dr. Tanvir Rahman',
      room: '502 Lab',
    },
    {
      id: 'rout-2',
      batchId: 'batch-9',
      day: 'SUNDAY',
      startTime: '12:00 PM',
      endTime: '01:30 PM',
      courseId: 'course-307',
      courseCode: 'SWE 307',
      courseTitle: 'Software Engineering',
      teacherName: 'Mr. Imran Hossain',
      room: '401 Class Room',
    },
    {
      id: 'rout-3',
      batchId: 'batch-9',
      day: 'SUNDAY',
      startTime: '02:00 PM',
      endTime: '03:30 PM',
      courseId: 'course-311',
      courseCode: 'SWE 311',
      courseTitle: 'Computer Networks',
      teacherName: 'Ms. Nusrat Jahan',
      room: '503 Network Lab',
    },
    // Monday - Batch 9
    {
      id: 'rout-4',
      batchId: 'batch-9',
      day: 'MONDAY',
      startTime: '09:00 AM',
      endTime: '10:30 AM',
      courseId: 'course-309',
      courseCode: 'SWE 309',
      courseTitle: 'Algorithms',
      teacherName: 'Prof. Dr. Ahsan Habib',
      room: '402 Class Room',
    },
    {
      id: 'rout-5',
      batchId: 'batch-9',
      day: 'MONDAY',
      startTime: '11:00 AM',
      endTime: '12:30 PM',
      courseId: 'course-313',
      courseCode: 'SWE 313',
      courseTitle: 'Web Engineering',
      teacherName: 'Mr. Imran Hossain',
      room: '504 Software Lab',
    },
    // Tuesday - Batch 9
    {
      id: 'rout-6',
      batchId: 'batch-9',
      day: 'TUESDAY',
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      courseId: 'course-305',
      courseCode: 'SWE 305',
      courseTitle: 'Database Systems',
      teacherName: 'Dr. Tanvir Rahman',
      room: '502 Lab',
    },
    {
      id: 'rout-7',
      batchId: 'batch-9',
      day: 'TUESDAY',
      startTime: '01:30 PM',
      endTime: '03:00 PM',
      courseId: 'course-307',
      courseCode: 'SWE 307',
      courseTitle: 'Software Engineering',
      teacherName: 'Mr. Imran Hossain',
      room: '401 Class Room',
    },
    // Wednesday - Batch 9
    {
      id: 'rout-8',
      batchId: 'batch-9',
      day: 'WEDNESDAY',
      startTime: '10:00 AM',
      endTime: '12:00 PM',
      courseId: 'course-311',
      courseCode: 'SWE 311',
      courseTitle: 'Computer Networks',
      teacherName: 'Ms. Nusrat Jahan',
      room: '503 Network Lab',
    },
    // Thursday - Batch 9
    {
      id: 'rout-9',
      batchId: 'batch-9',
      day: 'THURSDAY',
      startTime: '11:00 AM',
      endTime: '12:30 PM',
      courseId: 'course-309',
      courseCode: 'SWE 309',
      courseTitle: 'Algorithms',
      teacherName: 'Prof. Dr. Ahsan Habib',
      room: '402 Class Room',
    },
    // Batch 8 Routine
    {
      id: 'rout-801',
      batchId: 'batch-8',
      day: 'SUNDAY',
      startTime: '09:00 AM',
      endTime: '10:30 AM',
      courseId: 'course-401',
      courseCode: 'SWE 401',
      courseTitle: 'Distributed Databases',
      teacherName: 'Dr. Tanvir Rahman',
      room: '602 Lab',
    },
  ];

  // Dates relative to current date (2026-08-12)
  const exams: Exam[] = [
    {
      id: 'exam-1',
      batchId: 'batch-9',
      courseId: 'course-305',
      courseCode: 'SWE 305',
      courseTitle: 'Database Systems',
      type: 'MIDTERM',
      title: 'Database Systems Midterm Exam',
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
      courseId: 'course-309',
      courseCode: 'SWE 309',
      courseTitle: 'Algorithms',
      type: 'QUIZ',
      title: 'Algorithms Quiz 2 (Dynamic Programming)',
      date: '2026-08-20', // 8 days from now
      startTime: '11:30 AM',
      room: '402 Class Room',
      description: 'Topics: Knapsack, LCS, Matrix Chain Multiplication.',
      createdBy: 'user-cr-1',
      createdByName: 'Mahmudul Hasan (CR)',
      createdAt: '2026-08-05T12:00:00Z',
    },
    {
      id: 'exam-3',
      batchId: 'batch-9',
      courseId: 'course-307',
      courseCode: 'SWE 307',
      courseTitle: 'Software Engineering',
      type: 'PRESENTATION',
      title: 'SRS Document Project Presentation',
      date: '2026-09-02', // 21 days from now
      startTime: '01:00 PM',
      room: '504 Lab',
      description: '10 minutes team presentation on SRS, UML Use Cases, Sequence Diagrams.',
      createdBy: 'user-cr-1',
      createdByName: 'Mahmudul Hasan (CR)',
      createdAt: '2026-08-08T09:00:00Z',
    },
    {
      id: 'exam-4',
      batchId: 'batch-8',
      courseId: 'course-401',
      courseCode: 'SWE 401',
      courseTitle: 'Distributed Databases',
      type: 'MIDTERM',
      title: 'Distributed DB Midterm Assessment',
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
      description: 'Dr. Tanvir Rahman has extended the Database ER-Diagram assignment submission till Sunday 18th August. Submit via portal or offline hardcopy.',
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
      createdBy: 'user-admin-1',
      createdByName: 'Dr. Shahriar Hossain (Admin)',
      createdAt: '2026-08-08T10:00:00Z',
    },
    {
      id: 'notice-2',
      title: 'National Mourning Day Holiday Notice',
      content: 'The university and all academic activities will remain closed on August 15, 2026 on account of National Mourning Day.',
      category: 'HOLIDAY',
      publishDate: '2026-08-09',
      isImportant: true,
      createdBy: 'user-admin-1',
      createdByName: 'Dr. Shahriar Hossain (Admin)',
      createdAt: '2026-08-09T11:00:00Z',
    },
    {
      id: 'notice-3',
      title: 'Guest Seminar on Cloud Native Systems & Microservices',
      content: 'Join us on August 22 at Auditorium 2 for an industry seminar conducted by Senior Software Engineers from Google & AWS.',
      category: 'SEMINAR',
      publishDate: '2026-08-05',
      isImportant: false,
      createdBy: 'user-admin-1',
      createdByName: 'Dr. Shahriar Hossain (Admin)',
      createdAt: '2026-08-05T08:00:00Z',
    },
  ];

  const resources: Resource[] = [
    {
      id: 'res-1',
      title: 'Database Systems Final Exam Question Paper 2025',
      type: 'QUESTION',
      courseId: 'course-305',
      courseCode: 'SWE 305',
      courseTitle: 'Database Systems',
      semester: 5,
      academicYear: 2025,
      examType: 'FINAL',
      facultyName: 'Dr. Tanvir Rahman',
      targetBatch: 'SWE 9th Batch',
      description: 'Official Spring 2025 Final Examination question paper with answer hints for SQL & Normalization.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_305_Final_Exam_2025.pdf',
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
      title: 'Software Engineering Midterm Question Paper 2025',
      type: 'QUESTION',
      courseId: 'course-307',
      courseCode: 'SWE 307',
      courseTitle: 'Software Engineering',
      semester: 5,
      academicYear: 2025,
      examType: 'MIDTERM',
      facultyName: 'Mr. Imran Hossain',
      targetBatch: 'SWE 9th Batch',
      description: 'Midterm paper covering Software Development Life Cycle (SDLC), Agile Manifesto, and Use Case Diagrams.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_307_Midterm_2025.pdf',
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
      id: 'res-6',
      title: 'Computer Networks Quiz 1 Question Paper 2026',
      type: 'QUESTION',
      courseId: 'course-311',
      courseCode: 'SWE 311',
      courseTitle: 'Computer Networks',
      semester: 5,
      academicYear: 2026,
      examType: 'QUIZ',
      facultyName: 'Ms. Nusrat Jahan',
      targetBatch: 'SWE 9th Batch',
      description: 'Quiz paper covering OSI Model layers, TCP/IP Suite, and IP Subnetting calculations.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_311_Quiz1_2026.pdf',
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
      title: 'Complete Software Architecture Lecture Notes (Ch 1-8)',
      type: 'NOTE',
      courseId: 'course-307',
      courseCode: 'SWE 307',
      courseTitle: 'Software Engineering',
      semester: 5,
      academicYear: 2026,
      facultyName: 'Mr. Imran Hossain',
      targetBatch: 'SWE 9th Batch',
      description: 'Comprehensive handwritten and digitized lecture notes covering Agile, Scrum, Design Patterns, and SRS.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_307_Software_Engineering_Notes.pdf',
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
      courseId: 'course-311',
      courseCode: 'SWE 311',
      courseTitle: 'Computer Networks',
      semester: 5,
      academicYear: 2026,
      labCategory: 'SOURCE_CODE',
      facultyName: 'Ms. Nusrat Jahan',
      targetBatch: 'SWE 9th Batch',
      description: 'Subnetting, VLAN configuration, RIP/OSPF routing topologies for Packet Tracer.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'Networks_Lab_Pack_SWE311.zip',
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
      title: 'Algorithms Midterm Exam Question 2024 (Spring)',
      type: 'QUESTION',
      courseId: 'course-309',
      courseCode: 'SWE 309',
      courseTitle: 'Algorithms',
      semester: 5,
      academicYear: 2024,
      examType: 'MIDTERM',
      facultyName: 'Prof. Dr. Ahsan Habib',
      targetBatch: 'SWE 9th Batch',
      description: 'Midterm paper covering Recurrence relations, Divide & Conquer, MergeSort, QuickSort proofs.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'SWE_309_Midterm_2024.pdf',
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
      actorId: 'user-admin-1',
      actorName: 'Dr. Shahriar Hossain (Admin)',
      action: 'RESOURCE_APPROVED',
      target: 'Resource #res-3',
      details: 'Approved Cisco Packet Tracer Lab Experiments submitted by Rashedul Hasan',
      timestamp: '2026-08-03T10:00:00Z',
    },
    {
      id: 'log-2',
      actorId: 'user-admin-1',
      actorName: 'Dr. Shahriar Hossain (Admin)',
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

    // Remove legacy demo users (tanvir, student1, cr1, etc.) and keep/ensure admin101
    this.data.users = this.data.users.filter(u => {
      const sid = (u.studentId || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const name = (u.name || '').toLowerCase();
      if (sid === '2023-swe-001' || sid === '2022-swe-002' || sid === '2021-swe-003' || sid === 'admin-001') return false;
      if (name.includes('tanvir hossain') || name.includes('samiul alam') || name.includes('dr. shahriar')) return false;
      return true;
    });

    const adminSalt = bcrypt.genSaltSync(10);
    const adminPassHash = bcrypt.hashSync('admin123', adminSalt);

    let adminUser = this.data.users.find(u => u.role === 'ADMIN' || u.studentId?.toLowerCase() === 'admin101');
    if (!adminUser) {
      adminUser = {
        id: 'user-admin-101',
        studentId: 'admin101',
        name: 'admin101',
        email: 'admin@swe.edu',
        phone: '+8801700000000',
        role: 'ADMIN',
        currentSemester: 0,
        profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        status: 'ACTIVE',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      };
      this.data.users.push(adminUser);
    } else {
      adminUser.studentId = 'admin101';
      adminUser.name = 'admin101';
      adminUser.role = 'ADMIN';
      adminUser.status = 'ACTIVE';
    }
    this.data.passwords[adminUser.id] = adminPassHash;
    this.save();

    // Trigger Supabase initial data hydration in the background
    hydrateFromSupabase(this.data).catch(() => {});
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save DB_FILE:', err);
    }
  }

  public getData(): DBData {
    return this.data;
  }

  // Helper methods
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

  public addUser(user: User, passwordHash: string) {
    this.data.users.push(user);
    this.data.passwords[user.id] = passwordHash;
    this.save();
    syncToSupabase('users', {
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
    }).catch(() => {});
  }

  public updateUser(user: User) {
    const idx = this.data.users.findIndex(u => u.id === user.id);
    if (idx !== -1) {
      this.data.users[idx] = user;
      this.save();
      syncToSupabase('users', {
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
      }).catch(() => {});
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
}

export const db = new JsonDB();
