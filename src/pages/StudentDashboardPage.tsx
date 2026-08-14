import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, BookOpen, Clock, Megaphone, Award, GraduationCap,
  RefreshCw, ChevronRight, User, MapPin, AlertTriangle, Info, Bell,
  FileText, FolderKanban, HelpCircle, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/common/StatCard';
import { DashboardSummary } from '../types';

export const StudentDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const defaultSummary: DashboardSummary = {
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
        courseId: 'c_1',
        courseCode: 'SWE 305',
        courseTitle: 'Software Architecture & Design Patterns',
        room: 'Room 402, Academic Building 1',
        teacherName: 'Dr. Mahbubur Rahman',
        teacherShortName: 'MR',
        batchId: user?.batchId || 'batch_58',
      },
      {
        id: 'r_2',
        day: 'SUNDAY',
        startTime: '10:45 AM',
        endTime: '12:15 PM',
        courseId: 'c_2',
        courseCode: 'SWE 307',
        courseTitle: 'Database Management Systems',
        room: 'Lab 3 (Software Lab)',
        teacherName: 'Engr. Nazmul Islam',
        teacherShortName: 'NI',
        batchId: user?.batchId || 'batch_58',
      },
      {
        id: 'r_3',
        day: 'SUNDAY',
        startTime: '01:30 PM',
        endTime: '03:00 PM',
        courseId: 'c_3',
        courseCode: 'SWE 309',
        courseTitle: 'Web Engineering & Technologies',
        room: 'Room 305, Academic Building 2',
        teacherName: 'Tasnim Ahmed',
        teacherShortName: 'TA',
        batchId: user?.batchId || 'batch_58',
      },
    ],
    upcomingExams: [
      {
        id: 'ex_1',
        courseId: 'c_1',
        courseCode: 'SWE 305',
        courseTitle: 'Software Architecture & Design Patterns',
        title: 'Midterm Examination',
        date: '2026-08-25',
        startTime: '10:00 AM - 12:00 PM',
        room: 'Exam Hall 101',
        type: 'MIDTERM',
        batchId: user?.batchId || 'batch_58',
        description: 'Chapters 1-5: Architectural Styles, Patterns & UML diagrams',
        createdBy: 'usr_cr_1',
        createdByName: 'Naimur Rahman (CR)',
        createdAt: new Date().toISOString(),
        daysLeft: 11,
      },
      {
        id: 'ex_2',
        courseId: 'c_2',
        courseCode: 'SWE 307',
        courseTitle: 'Database Management Systems',
        title: 'Lab Practical Exam',
        date: '2026-08-28',
        startTime: '02:00 PM - 03:30 PM',
        room: 'Lab 3',
        type: 'LAB_EXAM',
        batchId: user?.batchId || 'batch_58',
        description: 'SQL Queries, Triggers, Views & Normalization',
        createdBy: 'usr_cr_1',
        createdByName: 'Naimur Rahman (CR)',
        createdAt: new Date().toISOString(),
        daysLeft: 14,
      },
    ],
    currentCourses: [
      {
        id: 'c_1',
        code: 'SWE 305',
        title: 'Software Architecture & Design Patterns',
        credits: 3,
        type: 'THEORY',
        semester: 5,
        assignedFacultyName: 'Dr. Mahbubur Rahman',
        batchIds: ['batch_58'],
      },
      {
        id: 'c_2',
        code: 'SWE 307',
        title: 'Database Management Systems',
        credits: 4,
        type: 'LAB',
        semester: 5,
        assignedFacultyName: 'Engr. Nazmul Islam',
        batchIds: ['batch_58'],
      },
      {
        id: 'c_3',
        code: 'SWE 309',
        title: 'Web Engineering & Technologies',
        credits: 3,
        type: 'THEORY',
        semester: 5,
        assignedFacultyName: 'Tasnim Ahmed',
        batchIds: ['batch_58'],
      },
    ],
    recentAnnouncements: [
      {
        id: 'ann_1',
        batchId: user?.batchId || 'batch_58',
        title: 'Midterm Exam Schedule & Room Allocation Published',
        description: 'Please check the upcoming exam dates in the Exam tab. Bring your student ID card.',
        publishDate: new Date().toISOString().split('T')[0],
        expiryDate: '2026-09-01',
        priority: 'IMPORTANT',
        createdBy: 'usr_cr_1',
        createdByName: 'Naimur Rahman (CR)',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'ann_2',
        batchId: user?.batchId || 'batch_58',
        title: 'Software Architecture Assignment 1 Deadline Extended',
        description: 'Assignment 1 submission deadline has been extended to this Sunday 11:59 PM.',
        publishDate: new Date().toISOString().split('T')[0],
        expiryDate: '2026-09-01',
        priority: 'NORMAL',
        createdBy: 'usr_cr_1',
        createdByName: 'Dr. Mahbubur Rahman',
        createdAt: new Date().toISOString(),
      },
    ],
    recentNotices: [
      {
        id: 'not_1',
        title: 'Academic Calendar Fall 2026 Updated',
        content: 'The revised academic calendar for semester 5 is now officially published.',
        category: 'GENERAL',
        publishDate: '2026-08-10',
        isImportant: true,
        createdBy: 'admin_1',
        createdByName: 'Dept Academic Office',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      if (token) {
        const res = await fetch('/api/dashboard/summary', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
          setIsLoading(false);
          return;
        }
      }
      // Fallback
      setSummary(defaultSummary);
    } catch (err) {
      console.error('Failed to fetch dashboard summary, using local data:', err);
      setSummary(defaultSummary);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [token]);

  if (isLoading || !summary) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs font-semibold">Loading SWE Academic Portal Workspace...</span>
      </div>
    );
  }

  const getExamBadge = (type: string) => {
    switch (type) {
      case 'MIDTERM': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'FINAL': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'QUIZ': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LAB_EXAM': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
        };
      case 'IMPORTANT':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Bell className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
        };
    }
  };

  const quickLinks = [
    { title: 'Weekly Routine', path: '/routine', icon: Clock, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { title: 'Question Bank', path: '/question-bank', icon: HelpCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    { title: 'Class Notes', path: '/notes', icon: FileText, color: 'bg-purple-50 text-purple-600 border-purple-100' },
    { title: 'Lab Resources', path: '/lab-resources', icon: FolderKanban, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { title: 'Faculty List', path: '/faculty', icon: Users, color: 'bg-rose-50 text-rose-600 border-rose-100' },
    { title: 'Batch Notices', path: '/announcements', icon: Megaphone, color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  ];

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      {/* 1. Refined Academic Header */}
      <div
        style={{
          background: 'linear-gradient(110deg, #EAF2FF 0%, #F2F5FF 55%, #E9F0FF 100%)',
        }}
        className="relative overflow-hidden text-[#0A2147] p-5 sm:p-6 md:p-7 rounded-2xl border border-[#C7D8F7] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 text-[#1D5FD1] text-[11px] font-extrabold mb-2.5 border border-[#C7D8F7] shadow-2xs">
            <GraduationCap className="w-3.5 h-3.5 text-[#1769E8]" /> {user?.batchName || 'SWE Dept'} • Semester {user?.currentSemester || 5}
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0A2147]">
            Welcome back, {user?.name.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-[#52657C] mt-1 max-w-xl leading-relaxed font-semibold hidden sm:block">
            Software Engineering Academic Portal • Daily Overview & Course Schedule
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-md p-3.5 rounded-xl border border-[#C7D8F7] shrink-0 flex items-center justify-between md:flex-col md:items-start relative z-10 text-xs gap-2 shadow-2xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#52657C] block">
              Academic Role
            </span>
            <span className="text-xs font-black text-[#0A2147] block">
              {user?.role === 'CR' ? 'Class Representative' : user?.role === 'ADMIN' ? 'Central Admin' : 'Regular Student'}
            </span>
          </div>
          <span className="text-[11px] text-[#1D5FD1] font-mono font-bold bg-[#EFF5FF] px-2.5 py-0.5 rounded border border-[#C7D8F7]">
            ID: {user?.studentId}
          </span>
        </div>
      </div>

      {/* 2. Small Compact Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Today's Classes"
          value={summary.todaysClassesCount}
          actionText="Routine →"
          onClick={() => navigate('/routine')}
          icon={Clock}
          accentColor="blue"
        />
        <StatCard
          title="Current Courses"
          value={summary.currentCoursesCount}
          actionText="Courses →"
          onClick={() => navigate('/courses')}
          icon={BookOpen}
          accentColor="emerald"
        />
        <StatCard
          title="Upcoming Exams"
          value={summary.upcomingExamsCount}
          actionText="Exams →"
          onClick={() => navigate('/exams')}
          icon={Calendar}
          accentColor="rose"
        />
        <StatCard
          title="Batch Notices"
          value={summary.newAnnouncementsCount}
          actionText="Notices →"
          onClick={() => navigate('/announcements')}
          icon={Megaphone}
          accentColor="purple"
        />
      </div>

      {/* 3. SECTION 1: TODAY'S ROUTINE */}
      <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden mb-6">
        <div className="p-4 bg-[#F5F8FF] border-b border-[#DCE6F2] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-[#2563EB] rounded-lg border border-blue-100 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#0A2147]">Today's Class Schedule</h2>
                <span className="px-2.5 py-0.5 bg-blue-50 text-[#2563EB] border border-blue-200 text-[10px] font-mono font-bold rounded-full">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-[11px] text-[#52657C] font-medium">Scheduled lectures and lab sessions for your batch</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/routine')}
            className="px-3.5 py-1.5 bg-white hover:bg-[#F7FAFF] text-[#2563EB] border border-[#D8E2EE] text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs"
          >
            Full Weekly Schedule <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {summary.todaysRoutine.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#52657C] bg-white">
            🎉 No classes scheduled for today! Enjoy your self-study time.
          </div>
        ) : (
          <>
            {/* Desktop Structured Data Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F2F6FB] border-b border-[#DCE6F2] text-[11px] font-extrabold text-[#0A2147] uppercase tracking-wider">
                    <th className="py-2.5 px-4">Time Slot</th>
                    <th className="py-2.5 px-4">Course Code</th>
                    <th className="py-2.5 px-4">Course Title</th>
                    <th className="py-2.5 px-4">Faculty Instructor</th>
                    <th className="py-2.5 px-4 text-right">Classroom / Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EBF3] text-xs">
                  {summary.todaysRoutine.map(slot => (
                    <tr key={slot.id} className="bg-white hover:bg-[#F6FAFF] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#0A2147] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F6F9FD] rounded-md text-[#10213B] border border-[#D8E2EE]">
                          <Clock className="w-3 h-3 text-[#2563EB]" /> {slot.startTime} – {slot.endTime}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-blue-50 text-[#2563EB] font-mono text-[11px] font-bold rounded border border-blue-200">
                          {slot.courseCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0A2147]">
                        {slot.courseTitle}
                      </td>
                      <td className="py-3 px-4 text-[#52657C] font-semibold whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {slot.teacherName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#FFF6DE] text-[#A66300] border border-[#F3E1B8] text-xs font-bold rounded-md">
                          <MapPin className="w-3 h-3 text-[#A66300]" /> {slot.room}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Compact List */}
            <div className="block md:hidden divide-y divide-[#E5EBF3] p-3 space-y-3">
              {summary.todaysRoutine.map(slot => (
                <div key={slot.id} className="pt-3 first:pt-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-[#2563EB] font-mono text-[10px] font-bold rounded border border-blue-200">
                      {slot.courseCode}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#0A2147] bg-[#F6F9FD] px-2 py-0.5 rounded border border-[#D8E2EE]">
                      {slot.startTime} – {slot.endTime}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#0A2147]">{slot.courseTitle}</h3>
                  <div className="flex items-center justify-between text-[11px] text-[#52657C] pt-1 border-t border-[#E5EBF3]">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" /> {slot.teacherName}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-[#A66300] bg-[#FFF6DE] px-2 py-0.5 rounded border border-[#F3E1B8] text-[10px]">
                      <MapPin className="w-3 h-3 text-[#A66300]" /> {slot.room}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 4. SECTION 2: UPCOMING EXAMS & DEADLINES */}
      <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden mb-6">
        <div className="p-4 bg-[#F5F8FF] border-b border-[#DCE6F2] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-[#C63838] rounded-lg border border-rose-200 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0A2147]">Upcoming Assessments & Exams</h2>
              <p className="text-[11px] text-[#52657C] font-medium">Nearest exam dates, lab tests, and quiz schedules</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/exams')}
            className="px-3.5 py-1.5 bg-white hover:bg-[#F7FAFF] text-[#C63838] border border-[#D8E2EE] text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs"
          >
            All Deadlines <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {summary.upcomingExams.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#52657C] bg-white">
            🎉 No upcoming exams or tests right now!
          </div>
        ) : (
          <div className="divide-y divide-[#E5EBF3]">
            {summary.upcomingExams.slice(0, 4).map(exam => {
              const dateObj = new Date(exam.date);
              const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const dayNum = dateObj.getDate();

              return (
                <div key={exam.id} className="p-3.5 sm:p-4 bg-white hover:bg-[#F6FAFF] transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Date Block */}
                    <div className="w-11 h-11 bg-[#F6F9FD] text-[#E63946] border border-[#D8E2EE] rounded-lg flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-black text-[#E63946] tracking-wider uppercase leading-none">
                        {monthStr}
                      </span>
                      <span className="text-base font-black text-[#0A2147] leading-none mt-0.5">
                        {dayNum}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-50 text-[#2563EB] font-mono text-[10px] font-bold rounded border border-blue-200">
                          {exam.courseCode}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${getExamBadge(exam.type)}`}>
                          {exam.type}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#0A2147] mt-1 truncate">
                        {exam.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[11px] text-[#52657C] mt-0.5 font-medium">
                        <span className="truncate">{exam.courseTitle}</span>
                        {exam.room && (
                          <span className="flex items-center gap-1 font-bold text-[#10213B] shrink-0">
                            <MapPin className="w-3 h-3 text-slate-400" /> {exam.room}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Days left badge */}
                  <div className="shrink-0 text-right">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border inline-block ${
                      exam.daysLeft <= 3
                        ? 'bg-[#FDECEC] text-[#C63838] border-[#F5C2C2]'
                        : 'bg-[#E9F8F1] text-[#087A55] border-[#C2EBD6]'
                    }`}>
                      {exam.daysLeft === 0 ? 'Today!' : exam.daysLeft === 1 ? 'Tomorrow' : `${exam.daysLeft}d left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. SECTION 3: RECENT ANNOUNCEMENTS & NOTICES */}
      <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden mb-6">
        <div className="p-4 bg-[#F5F8FF] border-b border-[#DCE6F2] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-[#7C3AED] rounded-lg border border-purple-200 shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0A2147]">Batch Notices & Announcements</h2>
              <p className="text-[11px] text-[#52657C] font-medium">Official updates published by Class Representatives & Department</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/announcements')}
            className="px-3.5 py-1.5 bg-white hover:bg-[#F7FAFF] text-[#7C3AED] border border-[#D8E2EE] text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs"
          >
            All Notices <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {summary.recentAnnouncements.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#52657C] bg-white">
            No active announcements for your batch right now.
          </div>
        ) : (
          <div className="divide-y divide-[#E5EBF3]">
            {summary.recentAnnouncements.slice(0, 3).map(ann => {
              const pStyle = getPriorityBadge(ann.priority);

              return (
                <div key={ann.id} className="p-3.5 sm:p-4 bg-white hover:bg-[#F6FAFF] transition-colors space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {pStyle.icon}
                      <h3 className="text-xs sm:text-sm font-bold text-[#0A2147]">{ann.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${pStyle.badge}`}>
                      {ann.priority}
                    </span>
                  </div>

                  <p className="text-xs text-[#52657C] leading-relaxed line-clamp-2">
                    {ann.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-[#E5EBF3]">
                    <span>By <strong className="text-[#0A2147]">{ann.createdByName}</strong></span>
                    <span>Published: {ann.publishDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. SECTION 4: ENROLLED COURSES & QUICK ACCESS TOOLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left 2 cols: Enrolled Courses */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-[#F5F8FF] border-b border-[#DCE6F2] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-[#087A55] rounded-lg border border-emerald-200 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0A2147]">Enrolled Courses</h2>
                  <p className="text-[11px] text-[#52657C] font-medium">Active courses for Semester {user?.currentSemester || 5}</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 bg-emerald-50 text-[#087A55] border border-emerald-200 text-xs font-bold rounded-full">
                {summary.currentCourses.length} Enrolled
              </span>
            </div>

            <div className="divide-y divide-[#E5EBF3]">
              {summary.currentCourses.map(course => (
                <div
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="p-3.5 bg-white hover:bg-[#F6FAFF] cursor-pointer transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-[#2563EB] font-mono text-[10px] font-bold rounded border border-blue-200">
                        {course.code}
                      </span>
                      <h3 className="text-xs font-bold text-[#0A2147] group-hover:text-[#2563EB] transition-colors">
                        {course.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#52657C] mt-1 font-semibold">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {course.assignedFacultyName || 'Dept Faculty'}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-[#A66300]">
                        <Award className="w-3.5 h-3.5 text-[#A66300]" /> {course.credits} Credits
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] transition-all shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[#F5F8FF] border-t border-[#DCE6F2] text-right">
            <button
              onClick={() => navigate('/courses')}
              className="text-xs font-bold text-[#2563EB] hover:text-[#1158C8] inline-flex items-center gap-1 hover:underline"
            >
              All Course Outlines & Materials <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 1 col: Academic Quick Tools */}
        <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 bg-[#F5F8FF] border-b border-[#DCE6F2]">
              <h2 className="text-sm font-bold text-[#0A2147]">Academic Quick Access</h2>
              <p className="text-[11px] text-[#52657C] font-medium">Direct portals & learning resources</p>
            </div>

            <div className="p-3 grid grid-cols-2 gap-2">
              {quickLinks.map((link, idx) => {
                const Icon = link.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => navigate(link.path)}
                    className="p-3 bg-white hover:bg-[#F7FAFF] rounded-lg border border-[#E5EBF3] cursor-pointer transition-all hover:border-[#2563EB] group flex flex-col items-center text-center justify-center shadow-2xs"
                  >
                    <div className={`p-2 rounded-lg border mb-1.5 ${link.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#0A2147] group-hover:text-[#2563EB] transition-colors">
                      {link.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-[#F5F8FF] border-t border-[#DCE6F2] text-center text-[11px] text-[#52657C] font-semibold">
            SWE Academic Workspace • Department Portal
          </div>
        </div>
      </div>
    </div>
  );
};

