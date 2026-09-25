import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, BookOpen, Clock, Megaphone, CalendarDays, ClipboardList,
  ChevronRight, User, MapPin, RefreshCw, Sparkles,
  Award, Bell, ArrowUpRight, CheckCircle2, TrendingUp,
  FileText, Shield, ExternalLink, RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DashboardSummary, Course, RoutineSlot } from '../types';
import {
  fetchRoutinesFromSupabase,
  fetchExamsFromSupabase,
  fetchAnnouncementsFromSupabase,
  fetchNoticesFromSupabase,
  fetchCoursesFromSupabase,
} from '../services/supabaseDataService';
import { deduplicateAndMergeRoutineSlots, sortRoutineSlots } from '../utils/routineUtils';
import { DashboardSummaryCard } from '../components/dashboard/DashboardSummaryCard';
import { PortalHeroCard } from '../components/dashboard/PortalHeroCard';
import { RoutineClassCard } from '../components/routine/RoutineClassCard';
import { UpcomingExamsCard } from '../components/dashboard/UpcomingExamsCard';
import { EnrolledCourseCard } from '../components/dashboard/EnrolledCourseCard';

// In-memory module-level cache for instant dashboard transitions (0ms delay)
let cachedDashboardSummary: DashboardSummary | null = null;

export const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
export const ACADEMIC_WEEKDAYS: { key: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY'; label: string; short: string }[] = [
  { key: 'SUNDAY', label: 'Sunday', short: 'Sun' },
  { key: 'MONDAY', label: 'Monday', short: 'Mon' },
  { key: 'TUESDAY', label: 'Tuesday', short: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wednesday', short: 'Wed' },
  { key: 'THURSDAY', label: 'Thursday', short: 'Thu' },
];

export const getCurrentDayName = (): string => {
  const dayIndex = new Date().getDay();
  return DAYS_OF_WEEK[dayIndex] || 'SUNDAY';
};

const getDefaultSummary = (batchId: string = 'batch-9'): DashboardSummary => {
  const currentDay = getCurrentDayName();
  const demoSlots: RoutineSlot[] = [
    {
      id: 'r_1',
      day: 'SUNDAY',
      startTime: '09:00 AM',
      endTime: '10:30 AM',
      courseId: 'course-sem4-swe-221',
      courseCode: 'SWE-221',
      courseTitle: 'Algorithm',
      room: 'Room 402',
      teacherName: 'Lukman Hussain Nakib',
      teacherShortName: 'LHN',
      batchId,
    },
    {
      id: 'r_2',
      day: 'SUNDAY',
      startTime: '10:45 AM',
      endTime: '12:15 PM',
      courseId: 'course-sem4-swe-225',
      courseCode: 'SWE-225',
      courseTitle: 'Database Management System',
      room: 'Room 504',
      teacherName: 'Nazia Sultana Chowdhury',
      teacherShortName: 'NSC',
      batchId,
    },
    {
      id: 'r_3',
      day: 'SUNDAY',
      startTime: '01:30 PM',
      endTime: '03:00 PM',
      courseId: 'course-sem4-swe-231',
      courseCode: 'SWE-231',
      courseTitle: 'Software Requirement Engineering',
      room: 'XL 1',
      teacherName: 'Tasnim Ahmed',
      teacherShortName: 'TA',
      batchId,
    },
  ];

  const todaysRoutine = demoSlots.filter(s => s.day === currentDay);

  return {
    todaysClassesCount: todaysRoutine.length,
    currentCoursesCount: 6,
    upcomingExamsCount: 0,
    newAnnouncementsCount: 3,
    todaysRoutine,
    upcomingExams: [],
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
      credits: 3,
      type: 'THEORY',
      semester: 4,
      assignedFacultyName: 'Tasnim Ahmed',
      batchIds: [batchId],
    },
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
  };
};

export const StudentDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const currentDayName = getCurrentDayName();
  const [selectedDay, setSelectedDay] = useState<string>(currentDayName);
  const [allRoutines, setAllRoutines] = useState<RoutineSlot[]>([]);

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

      const todayStr = new Date().toISOString().split('T')[0];
      const [routines, examsRes, announcements, notices, coursesRes] = await Promise.all([
        fetchRoutinesFromSupabase(batchId),
        fetch(`/api/exams?batchId=${batchId}&includePast=false`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then(r => r.ok ? r.json() : null).catch(() => null),
        fetchAnnouncementsFromSupabase(batchId),
        fetchNoticesFromSupabase(),
        fetch(`/api/courses?batchId=${batchId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).then(r => r.ok ? r.json() : { courses: [] }).catch(() => ({ courses: [] })),
      ]);

      let rawExams = examsRes?.exams;
      if (!rawExams || !Array.isArray(rawExams)) {
        rawExams = await fetchExamsFromSupabase(batchId);
      }

      // Filter strictly: Only exams on or after today are upcoming!
      // Once the date passes, they are automatically excluded from upcoming (archived)
      const upcomingExams = (rawExams || [])
        .filter((e: any) => Boolean(e?.date && e.date >= todayStr))
        .map((e: any) => {
          const examDate = new Date(e.date);
          const now = new Date(todayStr);
          const diffDays = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return {
            ...e,
            daysLeft: Math.max(0, diffDays),
            isArchived: false,
          };
        })
        .sort((a: any, b: any) => a.date.localeCompare(b.date));

      let enrolledCourses: Course[] = coursesRes.courses || [];
      if (!enrolledCourses || enrolledCourses.length === 0) {
        enrolledCourses = await fetchCoursesFromSupabase(user?.currentSemester, batchId);
      }

      if (!enrolledCourses || enrolledCourses.length === 0) {
        enrolledCourses = fallback.currentCourses;
      }

      let rawRoutines: RoutineSlot[] = routines && routines.length > 0 ? routines : [];
      if (rawRoutines.length === 0) {
        try {
          const res = await fetch(`/api/routines?batchId=${batchId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            if (data.routines && Array.isArray(data.routines)) {
              rawRoutines = data.routines;
            }
          }
        } catch {
          // ignore
        }
      }

      const cleanedAllRoutines = deduplicateAndMergeRoutineSlots(rawRoutines);
      setAllRoutines(cleanedAllRoutines);

      // Filter strictly by the current weekday for Today's Routine!
      const activeDay = getCurrentDayName();
      const currentDaySlots = sortRoutineSlots(
        cleanedAllRoutines.filter(r => r.day?.toUpperCase() === activeDay)
      );
      const todaysRoutine = cleanedAllRoutines.length > 0 ? currentDaySlots : fallback.todaysRoutine;

      const recentAnnouncements = announcements && announcements.length > 0 ? announcements.slice(0, 3) : fallback.recentAnnouncements;
      const recentNotices = notices && notices.length > 0 ? notices.slice(0, 3) : fallback.recentNotices;
      const finalCurrentCourses = enrolledCourses && enrolledCourses.length > 0 ? enrolledCourses : fallback.currentCourses;

      const freshSummary: DashboardSummary = {
        ...fallback,
        todaysClassesCount: todaysRoutine.length,
        currentCoursesCount: finalCurrentCourses.length,
        upcomingExamsCount: upcomingExams.length,
        newAnnouncementsCount: recentAnnouncements.length,
        todaysRoutine,
        upcomingExams,
        currentCourses: finalCurrentCourses,
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
  }, [user?.batchId, user?.currentSemester, token]);

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
          {(() => {
            const isViewingToday = selectedDay === currentDayName;
            const currentPool = allRoutines.length > 0 ? allRoutines : (isViewingToday ? summary.todaysRoutine : []);
            const displayedSlots = sortRoutineSlots(
              deduplicateAndMergeRoutineSlots(currentPool.filter(r => r.day?.toUpperCase() === selectedDay))
            );

            return (
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

                  <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 flex-wrap">
                    <Calendar className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.4} />
                    <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0A2147] dark:text-white tracking-tight leading-snug">
                      {isViewingToday ? "Today's Class Schedule" : `${selectedDay.charAt(0) + selectedDay.slice(1).toLowerCase()} Schedule`}
                    </h2>
                    <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-blue-100/80 dark:bg-blue-900/40 text-[#1D4ED8] dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                      {displayedSlots.length} {displayedSlots.length === 1 ? 'Class' : 'Classes'}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate('/routine')}
                    className="relative z-10 text-xs font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-colors shrink-0"
                  >
                    Full Routine <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Weekday Switcher Toolbar */}
                <div className="px-3 sm:px-4 py-2 border-b border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-[#0B1120] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedDay(currentDayName)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 shrink-0 ${
                      isViewingToday
                        ? 'bg-[#2563EB] text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isViewingToday ? 'bg-emerald-300 animate-pulse' : 'bg-slate-400'}`} />
                    Today ({currentDayName.slice(0, 3)})
                  </button>
                  {ACADEMIC_WEEKDAYS.map(w => {
                    const isSelected = selectedDay === w.key;
                    const isThisToday = currentDayName === w.key;
                    if (isThisToday) return null;
                    return (
                      <button
                        key={w.key}
                        type="button"
                        onClick={() => setSelectedDay(w.key)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#2563EB] text-white shadow-sm font-semibold'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80'
                        }`}
                      >
                        {w.short}
                      </button>
                    );
                  })}
                </div>

                {displayedSlots.length === 0 ? (
                  <div className="py-9 px-4 text-center">
                    <p className="text-xs font-semibold text-[#475569] dark:text-slate-300">
                      {isViewingToday
                        ? `No classes scheduled for today (${currentDayName.charAt(0) + currentDayName.slice(1).toLowerCase()})!`
                        : `No classes scheduled for ${selectedDay.charAt(0) + selectedDay.slice(1).toLowerCase()}!`}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      {currentDayName === 'FRIDAY' || currentDayName === 'SATURDAY'
                        ? 'Weekend holiday / self-study day. Select another day above or view Full Routine.'
                        : 'Enjoy your self-study time or prepare for upcoming lectures.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 sm:p-3 flex flex-col gap-2 sm:gap-2.5 bg-[#F8FAFC]/50 dark:bg-[#0B1120]/50">
                    {displayedSlots.map(slot => (
                      <RoutineClassCard
                        key={slot.id}
                        slot={slot}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

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

          {/* Retake & Improvement Section Card */}
          <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden transition-all">
            <div
              className="relative overflow-hidden px-4 py-3 sm:px-4.5 sm:py-3 border-b border-[#D8E2EE] dark:border-amber-900/30 flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #FFFDF8 0%, #FFF8ED 50%, #FEF3C7 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
                <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={2.4} />
                <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0A2147] dark:text-white tracking-tight leading-snug">
                  Retake & Improvement
                </h2>
              </div>
              <button
                onClick={() => navigate('/retake-courses')}
                className="relative z-10 text-xs font-semibold text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 hover:underline transition-colors shrink-0"
              >
                Retake Portal <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#475569] dark:text-slate-400 leading-relaxed">
                  {summary.retakeCoursesCount && summary.retakeCoursesCount > 0
                    ? `You currently have ${summary.retakeCoursesCount} active retake/improvement course${summary.retakeCoursesCount > 1 ? 's' : ''} enrolled.`
                    : 'Register courses with junior batches to auto-sync routines, exam schedules & notices.'}
                </p>
              </div>
              <button
                onClick={() => navigate('/retake-courses')}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-all shadow-xs"
              >
                {summary.retakeCoursesCount && summary.retakeCoursesCount > 0 ? 'View Retake Desk' : '+ Add Course'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
