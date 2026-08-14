export type UserRole = 'ADMIN' | 'CR' | 'STUDENT';

export interface User {
  id: string;
  studentId: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  batchId?: string;
  batchName?: string;
  currentSemester: number;
  profileImage?: string;
  status: 'ACTIVE' | 'DISABLED';
  points?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contributor {
  id: string;
  studentId: string;
  name: string;
  batchName: string;
  profileImage?: string;
  points: number;
  approvedCount: number;
  totalUploads: number;
  badge: 'LEGEND' | 'GOLD' | 'SILVER' | 'BRONZE';
  rank: number;
}

export interface Batch {
  id: string;
  name: string; // e.g., "SWE 9th Batch"
  admissionYear: number;
  currentSemester: number;
  academicSession: string; // e.g., "2023-2024"
  crIds: string[]; // List of user IDs who are CRs
  createdAt: string;
}

export interface Course {
  id: string;
  code: string; // e.g., "SWE 305"
  shortName?: string; // e.g. "DBMS", "SPL", "OOP", "SE"
  title: string; // e.g., "Database Systems"
  credits: number;
  type: 'THEORY' | 'LAB' | 'PROJECT';
  semester: number;
  assignedFacultyId?: string;
  assignedFacultyName?: string;
  batchIds: string[]; // Batches taking this course
}

export interface RoutineSlot {
  id: string;
  batchId: string;
  day: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY';
  startTime: string; // e.g., "10:00 AM"
  endTime: string;   // e.g., "11:30 AM"
  courseId: string;
  courseCode: string;
  courseShortName?: string;
  courseTitle: string;
  teacherName: string;
  teacherShortName?: string;
  room: string; // e.g., "502 Lab" or "401"
}

export type ExamType = 
  | 'QUIZ'
  | 'CLASS_TEST'
  | 'MIDTERM'
  | 'FINAL'
  | 'LAB_EXAM'
  | 'VIVA'
  | 'PRESENTATION'
  | 'ASSIGNMENT'
  | 'OTHER';

export interface Exam {
  id: string;
  batchId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  type: ExamType;
  title: string;
  date: string; // ISO format "YYYY-MM-DD"
  startTime?: string;
  room?: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export type AnnouncementPriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export interface BatchAnnouncement {
  id: string;
  batchId: string;
  title: string;
  description: string;
  publishDate: string; // YYYY-MM-DD
  expiryDate: string;  // YYYY-MM-DD
  priority: AnnouncementPriority;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface DepartmentNotice {
  id: string;
  title: string;
  content: string;
  category: 'GENERAL' | 'REGISTRATION' | 'EXAM' | 'SEMINAR' | 'HOLIDAY' | 'URGENT';
  publishDate: string;
  isImportant: boolean;
  attachmentUrl?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export type ResourceType = 'QUESTION' | 'NOTE' | 'LAB';
export type ResourceStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Resource {
  id: string;
  title: string;
  type: ResourceType;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  semester: number;
  academicYear: number;
  examType?: ExamType; // if question
  facultyName?: string; // Faculty member who created/prepared the question paper
  targetBatch?: string;  // Target Batch e.g. "SWE 9th Batch"
  labCategory?: 'LAB_MANUAL' | 'LAB_REPORT' | 'SOURCE_CODE' | 'LAB_QUESTIONS' | 'VIVA_QUESTIONS' | 'DATASET' | 'OTHER';
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  uploaderId: string;
  uploaderStudentId: string;
  uploaderName: string;
  uploaderBatchName: string;
  status: ResourceStatus;
  rejectionReason?: string;
  downloadCount: number;
  createdAt: string;
  verifiedAt?: string;
}

export interface Faculty {
  id: string;
  name: string;
  shortName?: string; // e.g., "TR", "IH", "NJ", "AH"
  designation: string; // e.g. "Professor", "Associate Professor", "Lecturer"
  department: string;
  email: string;
  phone?: string;
  officeRoom: string;
  photoUrl: string;
  specialization?: string;
  assignedCourses: string[]; // Course codes or titles
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ANNOUNCEMENT' | 'NOTICE' | 'EXAM' | 'RESOURCE_APPROVED' | 'RESOURCE_REJECTED';
  linkUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface RoutineRequest {
  id: string;
  batchId: string;
  batchName: string;
  crId: string;
  crName: string;
  courseTitle: string;
  currentSchedule: string;
  requestedSchedule: string;
  requestedRoom?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  details?: string;
  timestamp: string;
}

export interface DashboardSummary {
  todaysClassesCount: number;
  currentCoursesCount: number;
  upcomingExamsCount: number;
  newAnnouncementsCount: number;
  todaysRoutine: RoutineSlot[];
  upcomingExams: (Exam & { daysLeft: number })[];
  currentCourses: Course[];
  recentAnnouncements: BatchAnnouncement[];
  recentNotices: DepartmentNotice[];
}
