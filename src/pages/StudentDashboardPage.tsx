import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, BookOpen, Clock, Megaphone, CalendarDays, ClipboardList,
  ChevronRight, User, MapPin, RefreshCw, Sparkles,
  Award, Bell, ArrowUpRight, CheckCircle2, TrendingUp,
  FileText, Shield, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
<<<<<<< HEAD
import { DashboardSummary } from '../types';
=======
import { DashboardSummary, Course } from '../types';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
import {
  fetchRoutinesFromSupabase,
  fetchExamsFromSupabase,
  fetchAnnouncementsFromSupabase,
<<<<<<< HEAD
  fetchNoticesFromSupabase
=======
  fetchNoticesFromSupabase,
  fetchCoursesFromSupabase,
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
} from '../services/supabaseDataService';
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard';
import { PortalHeroCard } from '../components/dashboard/PortalHeroCard';
import { RoutineClassCard } from '../components/routine/RoutineClassCard';
import { UpcomingExamsCard } from '../components/dashboard/UpcomingExamsCard';
import { EnrolledCourseCard } from '../components/dashboard/EnrolledCourseCard';

// In-memory module-level cache for instant dashboard transitions (0ms delay)
let cachedDashboardSummary: DashboardSummary | null = null;

const getDefaultSummary = (batchId: string = 'batch-9'): DashboardSummary => ({
  todaysClassesCount: 3,
  currentCoursesCount: 6,
  upcomingExamsCount: 2,
  newAnnouncementsCount: 3,
  todaysRoutine: [
    {
      id: 'r_1',
      day: 'SUNDAY',
      startTime: '09:00 AM',
      endTime: '10:30 AM',
<<<<<<< HEAD
      courseId: 'c_1',
      courseCode: 'SWE 305',
      courseTitle: 'Software Architecture & Design Patterns',
      room: 'Room 402',
      teacherName: 'Dr. Mahbubur Rahman',
      teacherShortName: 'MR',
=======
      courseId: 'course-sem4-swe-221',
      courseCode: 'SWE-221',
      courseTitle: 'Algorithm',
      room: 'Room 402',
      teacherName: 'Lukman Hussain Nakib',
      teacherShortName: 'LHN',
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      batchId,
    },
    {
      id: 'r_2',
      day: 'SUNDAY',
      startTime: '10:45 AM',
      endTime: '12:15 PM',
<<<<<<< HEAD
      courseId: 'c_2',
      courseCode: 'SWE 307',
      courseTitle: 'Database Management Systems',
      room: 'Room 504',
      teacherName: 'Engr. Nazmul Islam',
      teacherShortName: 'NI',
=======
      courseId: 'course-sem4-swe-225',
      courseCode: 'SWE-225',
      courseTitle: 'Database Management System',
      room: 'Room 504',
      teacherName: 'Nazia Sultana Chowdhury',
      teacherShortName: 'NSC',
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      batchId,
    },
    {
      id: 'r_3',
      day: 'SUNDAY',
      startTime: '01:30 PM',
      endTime: '03:00 PM',
<<<<<<< HEAD
      courseId: 'c_3',
      courseCode: 'SWE 309',
      courseTitle: 'Web Engineering & Technologies',
=======
      courseId: 'course-sem4-swe-231',
      courseCode: 'SWE-231',
      courseTitle: 'Software Requirement Engineering',
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      room: 'XL 1',
      teacherName: 'Tasnim Ahmed',
      teacherShortName: 'TA',
      batchId,
    },
  ],
  upcomingExams: [
    {
      id: 'ex_1',
<<<<<<< HEAD
      courseId: 'c_1',
      courseCode: 'SWE 305',
      courseTitle: 'Software Architecture & Design Patterns',
=======
      courseId: 'course-sem4-swe-221',
      courseCode: 'SWE-221',
      courseTitle: 'Algorithm',
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      title: 'Midterm Examination',
      date: '2026-08-28',
      startTime: '09:00 AM',
      room: 'Room 401',
      type: 'MIDTERM',
      batchId,
<<<<<<< HEAD
      description: 'Chapters 1-5: Architectural Styles & Patterns',
      createdBy: 'usr_cr_1',
      createdByName: 'Dr. Mahbubur Rahman',
=======
      description: 'Chapters 1-5: Asymptotic Analysis, Divide & Conquer, Dynamic Programming',
      createdBy: 'usr_cr_1',
      createdByName: 'Lukman Hussain Nakib',
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      createdAt: new Date().toISOString(),
      daysLeft: 4,
    },
    {
      id: 'ex_2',
<<<<<<< HEAD
      courseId: 'c_2',
      courseCode: 'SWE 307',
      courseTitle: 'Database Management Systems',
=======
      courseId: 'course-sem4-swe-225',
      courseCode: 'SWE-225',
      courseTitle: 'Database Management System',
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      title: 'Class Quiz 2',
      date: '2026-09-04',
      startTime: '10:00 AM',
      room: 'Exten-2',
      type: 'QUIZ',
      batchId,
<<<<<<< HEAD
      description: 'SQL Queries, Joins, Triggers & Normalization',
      createdBy: 'usr_cr_1',
      createdByName: 'Engr. Nazmul Islam',
      createdAt: new Date().toISOString(),
      daysLeft: 11,
    },
    {
      id: 'ex_3',
      courseId: 'c_3',
      courseCode: 'SWE 309',
      courseTitle: 'Web Engineering & Technologies',
      title: 'Milestone 2 Submission',
      date: '2026-09-10',
      startTime: '11:59 PM',
      room: 'Online Portal',
      type: 'ASSIGNMENT' as any,
      batchId,
      description: 'REST API & Authentication Milestone',
      createdBy: 'usr_cr_1',
      createdByName: 'Tasnim Ahmed',
      createdAt: new Date().toISOString(),
      daysLeft: 17,
    },
  ],
  currentCourses: [
    {
      id: 'c_1',
      code: 'SWE 305',
      title: 'Software Architecture & Design Patterns',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Dr. Mahbubur Rahman',
      batchIds: [batchId],
    },
    {
      id: 'c_2',
      code: 'SWE 307',
      title: 'Database Management Systems',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Engr. Nazmul Islam',
      batchIds: [batchId],
    },
    {
      id: 'c_3',
      code: 'SWE 309',
      title: 'Web Engineering & Technologies',
=======
      description: 'SQL Queries, Relational Algebra, Joins, Triggers & Normalization',
      createdBy: 'usr_cr_1',
      createdByName: 'Nazia Sultana Chowdhury',
      createdAt: new Date().toISOString(),
      daysLeft: 11,
    },
  ],
  currentCourses: [
    {
      id: 'course-sem4-swe-221',
      code: 'SWE-221',
      shortName: 'ALGO',
      title: 'Algorithm',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Lukman Hussain Nakib',
      batchIds: [batchId],
    },
    {
      id: 'course-sem4-swe-222',
      code: 'SWE-222',
      shortName: 'ALGO LAB',
      title: 'Algorithm Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 4,
      assignedFacultyName: 'Lukman Hussain Nakib',
      batchIds: [batchId],
    },
    {
      id: 'course-sem4-swe-311',
      code: 'SWE-311',
      shortName: 'TOC',
      title: 'Theory of Computation',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Rina Paul',
      batchIds: [batchId],
    },
    {
      id: 'course-sem4-swe-225',
      code: 'SWE-225',
      shortName: 'DBMS',
      title: 'Database Management System',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Nazia Sultana Chowdhury',
      batchIds: [batchId],
    },
    {
      id: 'course-sem4-swe-226',
      code: 'SWE-226',
      shortName: 'DBMS LAB',
      title: 'Database Management System Lab',
      credits: 1.5,
      type: 'LAB',
      semester: 4,
      assignedFacultyName: 'Nazia Sultana Chowdhury',
      batchIds: [batchId],
    },
    {
      id: 'course-sem4-swe-231',
      code: 'SWE-231',
      shortName: 'SRE',
      title: 'Software Requirement Engineering',
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Tasnim Ahmed',
      batchIds: [batchId],
    },
<<<<<<< HEAD
    {
      id: 'c_4',
      code: 'SWE 401',
      title: 'Artificial Intelligence',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Prof. Dr. Farhana Haque',
      batchIds: [batchId],
    },
    {
      id: 'c_5',
      code: 'SWE 403',
      title: 'Discrete Mathematics',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Dr. Asif Mahmud',
      batchIds: [batchId],
    },
    {
      id: 'c_6',
      code: 'SWE 405',
      title: 'Software Testing & Quality Assurance',
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Engr. Tanvir Hasan',
      batchIds: [batchId],
    },
=======
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
  ],
  recentAnnouncements: [
    {
      id: 'ann_1',
      batchId,
      title: 'Department Seminar on AI & ML',
      description: 'Keynote lecture on Modern Generative AI applications in Software Engineering.',
      publishDate: 'May 22, 2025',
      expiryDate: '2026-09-01',
      priority: 'IMPORTANT',
      createdBy: 'usr_fac_1',
      createdByName: 'Dr. Mahbubur Rahman',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ann_2',
      batchId,
      title: 'Lab Maintenance Notice',
      description: 'Software Lab 3 will undergo routine operating system updates this Thursday.',
      publishDate: 'May 20, 2025',
      expiryDate: '2026-09-01',
      priority: 'NORMAL',
      createdBy: 'usr_admin_1',
      createdByName: 'Lab Admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'ann_3',
      batchId,
      title: 'Class Test Schedule Update',
      description: 'Database Management Systems quiz timing adjusted to 10:00 AM in Lab 3.',
      publishDate: 'May 18, 2025',
      expiryDate: '2026-09-01',
      priority: 'IMPORTANT',
      createdBy: 'usr_fac_2',
      createdByName: 'Engr. Nazmul Islam',
      createdAt: new Date().toISOString(),
    },
  ],
  recentNotices: [
    {
      id: 'not_1',
      title: 'Department Seminar on AI & ML',
      content: 'Special academic session organized by Department of Software Engineering.',
      category: 'SEMINAR',
      publishDate: 'May 22, 2025',
      isImportant: true,
      createdBy: 'fac_1',
      createdByName: 'Dr. Mahbubur Rahman',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'not_2',
      title: 'Lab Maintenance Notice',
      content: 'Server maintenance scheduled for lab workstations.',
      category: 'GENERAL',
      publishDate: 'May 20, 2025',
      isImportant: false,
      createdBy: 'admin_1',
      createdByName: 'Lab Admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'not_3',
      title: 'Class Test Schedule Update',
      content: 'Updated syllabus and room arrangement for upcoming test.',
      category: 'EXAM',
      publishDate: 'May 18, 2025',
      isImportant: true,
      createdBy: 'fac_2',
      createdByName: 'Engr. Nazmul Islam',
      createdAt: new Date().toISOString(),
    },
  ],
});

export const StudentDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Instant render with memory cache or default summary (0ms delay)
  const [summary, setSummary] = useState<DashboardSummary>(() => {
    return cachedDashboardSummary || getDefaultSummary(user?.batchId || 'batch-9');
  });
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  const fetchSummary = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsBackgroundRefreshing(true);
    }
    try {
      const batchId = user?.batchId || 'batch-9';
      const fallback = getDefaultSummary(batchId);

<<<<<<< HEAD
      const [routines, exams, announcements, notices] = await Promise.all([
=======
      const [routines, exams, announcements, notices, coursesRes] = await Promise.all([
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
        fetchRoutinesFromSupabase(batchId),
        fetchExamsFromSupabase(batchId),
        fetchAnnouncementsFromSupabase(batchId),
        fetchNoticesFromSupabase(),
<<<<<<< HEAD
      ]);

=======
        fetch(`/api/courses?batchId=${batchId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then(r => r.ok ? r.json() : { courses: [] }).catch(() => ({ courses: [] })),
      ]);

      let enrolledCourses: Course[] = coursesRes.courses || [];
      if (!enrolledCourses || enrolledCourses.length === 0) {
        enrolledCourses = await fetchCoursesFromSupabase(user?.currentSemester, batchId);
      }

      if (!enrolledCourses || enrolledCourses.length === 0) {
        enrolledCourses = fallback.currentCourses;
      }

>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      const todaysRoutine = routines && routines.length > 0 ? routines : fallback.todaysRoutine;
      const upcomingExams = exams && exams.length > 0
        ? exams.map(e => ({
            ...e,
            daysLeft: Math.max(0, Math.ceil((new Date(e.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
          }))
        : fallback.upcomingExams;
      const recentAnnouncements = announcements && announcements.length > 0 ? announcements.slice(0, 3) : fallback.recentAnnouncements;
      const recentNotices = notices && notices.length > 0 ? notices.slice(0, 3) : fallback.recentNotices;
<<<<<<< HEAD
=======
      const finalCurrentCourses = enrolledCourses && enrolledCourses.length > 0 ? enrolledCourses : fallback.currentCourses;
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

      const freshSummary: DashboardSummary = {
        ...fallback,
        todaysClassesCount: todaysRoutine.length,
<<<<<<< HEAD
=======
        currentCoursesCount: finalCurrentCourses.length,
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
        upcomingExamsCount: upcomingExams.length,
        newAnnouncementsCount: recentAnnouncements.length,
        todaysRoutine,
        upcomingExams,
<<<<<<< HEAD
=======
        currentCourses: finalCurrentCourses,
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
        recentAnnouncements,
        recentNotices,
      };

      cachedDashboardSummary = freshSummary;
      setSummary(freshSummary);
    } catch {
      // Retain current summary on error
    } finally {
      setIsBackgroundRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
<<<<<<< HEAD
  }, [user?.batchId, token]);
=======
  }, [user?.batchId, user?.currentSemester, token]);
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-10">
      {/* Software Engineering Portal Hero Banner */}
      <PortalHeroCard
        user={user}
        onNavigateToResources={() => navigate('/resources/notes')}
        onNavigateToRoutine={() => navigate('/routine')}
      />

      {/* 4 Summary Cards Grid (2 cards per row on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 min-[360px]:gap-3 sm:gap-4 md:gap-5 mb-6 items-stretch">
        <DashboardSummaryCard
          id="summary-card-todays-classes"
          title="Today's Classes"
          count={summary.todaysClassesCount}
          icon={CalendarDays}
          actionLabel="View Routine"
          onClick={() => navigate('/routine')}
          accent={{
            iconBg: '#EAF2FF',
            iconColor: '#2563EB',
            actionBg: '#F1F6FF',
            actionBorder: '#D6E5FA',
            actionTextColor: '#2563EB',
          }}
        />

        <DashboardSummaryCard
          id="summary-card-current-courses"
          title="Current Courses"
          count={summary.currentCoursesCount}
          icon={BookOpen}
          actionLabel="View Courses"
          onClick={() => navigate('/courses')}
          accent={{
            iconBg: '#EAF8F2',
            iconColor: '#10B981',
            actionBg: '#F0FAF5',
            actionBorder: '#D2F0E3',
            actionTextColor: '#059669',
          }}
        />

        <DashboardSummaryCard
          id="summary-card-upcoming-exams"
          title="Upcoming Exams"
          count={summary.upcomingExamsCount}
          icon={ClipboardList}
          actionLabel="View Exams"
          onClick={() => navigate('/exams')}
          accent={{
            iconBg: '#FFF3E4',
            iconColor: '#F59E0B',
            actionBg: '#FFF8F0',
            actionBorder: '#FED7AA',
            actionTextColor: '#D97706',
          }}
        />

        <DashboardSummaryCard
          id="summary-card-new-announcements"
          title="New Announcements"
          count={summary.newAnnouncementsCount}
          icon={Megaphone}
          actionLabel="View All"
          onClick={() => navigate('/announcements')}
          accent={{
            iconBg: '#F3EAFF',
            iconColor: '#8B5CF6',
            actionBg: '#F7F2FE',
            actionBorder: '#E4D5FB',
            actionTextColor: '#7C3AED',
          }}
        />
      </div>

      {/* Main 2-Column Split Layout (60% / 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (60%): Today's Schedule + Enrolled Courses */}
        <div className="lg:col-span-3 space-y-6">
          {/* Today's Schedule Card */}
          <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden transition-all">
            <div
              className="relative overflow-hidden px-4 py-3 sm:px-4.5 sm:py-3 border-b border-[#D8E2EE] dark:border-blue-900/30 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              {/* Soft Radial Ambient Glow */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 85% 30%, rgba(126, 140, 255, 0.16), transparent 50%)',
                  }}
                />
                <div
                  className="absolute top-0 right-10 w-36 h-full pointer-events-none opacity-40"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(101, 120, 255, 0.2) 1px, transparent 1px)',
                    backgroundSize: '10px 10px',
                  }}
                />
              </div>

              <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
                <Calendar className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.4} />
                <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0A2147] dark:text-white tracking-tight leading-snug">
                  Today's Class Schedule
                </h2>
              </div>
              <button
                onClick={() => navigate('/routine')}
                className="relative z-10 text-xs font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-colors shrink-0"
              >
                Full Routine <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {summary.todaysRoutine.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#475569] dark:text-slate-400">
                No classes scheduled for today! Enjoy your self-study time.
              </div>
            ) : (
              <div className="p-2.5 sm:p-3 flex flex-col gap-2 sm:gap-2.5 bg-[#F8FAFC]/50 dark:bg-[#0B1120]/50">
                {summary.todaysRoutine.map(slot => (
                  <RoutineClassCard
                    key={slot.id}
                    slot={slot}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Enrolled Courses Grid Card */}
          <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden transition-all">
            <div
              className="relative overflow-hidden px-4 py-3 sm:px-4.5 sm:py-3 border-b border-[#D8E2EE] dark:border-blue-900/30 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              {/* Soft Radial Ambient Glow */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 85% 30%, rgba(126, 140, 255, 0.16), transparent 50%)',
                  }}
                />
                <div
                  className="absolute top-0 right-10 w-36 h-full pointer-events-none opacity-40"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(101, 120, 255, 0.2) 1px, transparent 1px)',
                    backgroundSize: '10px 10px',
                  }}
                />
              </div>

              <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
                <BookOpen className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.4} />
                <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0A2147] dark:text-white tracking-tight leading-snug">
                  Enrolled Courses
                </h2>
              </div>
              <button
                onClick={() => navigate('/courses')}
                className="relative z-10 text-xs font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-colors shrink-0"
              >
                Course Catalog <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {summary.currentCourses.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#475569] dark:text-slate-400">
                No enrolled courses found for your batch.
              </div>
            ) : (
              <div className="p-2.5 sm:p-3 flex flex-col gap-2 sm:gap-2.5 bg-[#F8FAFC]/50 dark:bg-[#0B1120]/50">
                {summary.currentCourses.map(course => (
                  <EnrolledCourseCard
                    key={course.id}
                    course={course}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (40%): Upcoming Exams + Batch Announcements */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Exams Card */}
          <UpcomingExamsCard
            exams={summary.upcomingExams}
            courses={summary.currentCourses}
          />

          {/* Batch Notices & Announcements Card */}
          <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden transition-all">
            {/* Section Header */}
            <div
              className="relative overflow-hidden px-4 py-3 sm:px-4.5 sm:py-3 border-b border-[#D8E2EE] dark:border-blue-900/30 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              {/* Soft Radial Ambient Glow */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 85% 30%, rgba(126, 140, 255, 0.16), transparent 50%)',
                  }}
                />
                <div
                  className="absolute top-0 right-10 w-36 h-full pointer-events-none opacity-40"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(101, 120, 255, 0.2) 1px, transparent 1px)',
                    backgroundSize: '10px 10px',
                  }}
                />
              </div>

              <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
                <Megaphone className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.4} />
                <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0A2147] dark:text-white tracking-tight leading-snug">
                  Notices & Announcements
                </h2>
              </div>
              <button
                onClick={() => navigate('/announcements')}
                className="relative z-10 text-xs font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-colors shrink-0"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Internal Rows */}
            {summary.recentAnnouncements.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#475569] dark:text-slate-400">
                No recent batch announcements.
              </div>
            ) : (
              <div className="divide-y divide-[#E5EBF3] dark:divide-slate-800">
                {summary.recentAnnouncements.map(ann => {
                  let priorityStyle = 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
                  if (ann.priority === 'URGENT') {
                    priorityStyle = 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50';
                  } else if (ann.priority === 'IMPORTANT') {
                    priorityStyle = 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50';
                  }

                  return (
                    <div
                      key={ann.id}
                      onClick={() => navigate('/announcements')}
                      className="p-4 sm:p-[16px_20px] bg-white dark:bg-[#0F172A] hover:bg-[#F7FAFF] dark:hover:bg-slate-800/40 transition-colors flex flex-col justify-between gap-2 cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm sm:text-[15px] font-semibold text-[#0F172A] dark:text-white leading-snug group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
                          {ann.title}
                        </h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wider shrink-0 ${priorityStyle}`}>
                          {ann.priority}
                        </span>
                      </div>

                      <p className="text-xs sm:text-[13px] text-[#475569] dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {ann.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-500 font-normal mt-0.5">
                        <span>{ann.createdByName || 'Batch Representative'}</span>
                        <span>•</span>
                        <span>{ann.publishDate}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
