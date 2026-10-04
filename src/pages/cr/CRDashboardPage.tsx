import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Megaphone, Calendar, Clock, BookOpen, Plus, Sparkles,
  ArrowRight, Shield, CheckCircle2, AlertCircle, RefreshCw, FileText,
  RotateCcw, Users, Mail
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { BatchAnnouncement, Exam, RoutineSlot, RoutineRequest } from '../../types';
import { RoutineClassCard } from '../../components/routine/RoutineClassCard';

// In-memory cache for instant CR dashboard transitions
let crDashboardCache: {
  announcements: BatchAnnouncement[];
  exams: (Exam & { daysLeft: number })[];
  routines: RoutineSlot[];
  routineRequests: RoutineRequest[];
  coursesCount: number;
} | null = null;

export const CRDashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState<BatchAnnouncement[]>(() => crDashboardCache?.announcements || []);
  const [exams, setExams] = useState<(Exam & { daysLeft: number })[]>(() => crDashboardCache?.exams || []);
  const [routines, setRoutines] = useState<RoutineSlot[]>(() => crDashboardCache?.routines || []);
  const [routineRequests, setRoutineRequests] = useState<RoutineRequest[]>(() => crDashboardCache?.routineRequests || []);
  const [coursesCount, setCoursesCount] = useState<number>(() => crDashboardCache?.coursesCount || 5);
  const [retakeStudentsCount, setRetakeStudentsCount] = useState<number>(0);
  const [retakeStudentsList, setRetakeStudentsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!crDashboardCache);

  // Quick Action Modal states
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isRoutineReqModalOpen, setIsRoutineReqModalOpen] = useState(false);

  // Form states
  const [annForm, setAnnForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL' as 'NORMAL' | 'IMPORTANT' | 'URGENT',
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  });

  const [examForm, setExamForm] = useState({
    courseTitle: 'Database Systems',
    courseCode: 'SWE 305',
    type: 'MIDTERM' as any,
    title: '',
    date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    startTime: '10:00 AM',
    room: 'Room 502',
    description: '',
  });

  const [routineReqForm, setRoutineReqForm] = useState({
    courseTitle: 'Software Engineering',
    currentSchedule: 'Sunday 12:00 PM - 01:30 PM (Room 401)',
    requestedSchedule: 'Tuesday 02:00 PM - 03:30 PM (Room 504)',
    requestedRoom: 'Room 504',
    reason: 'Schedule conflict on Sunday.',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    if (!token) return;
    if (!crDashboardCache) {
      setIsLoading(true);
    }

    try {
      const batchId = user?.batchId || 'batch-9';

      const [annRes, examRes, routRes, reqRes, courseRes] = await Promise.all([
        fetch(`/api/announcements?batchId=${batchId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/exams?batchId=${batchId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/routines?batchId=${batchId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/routines/requests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/courses?batchId=${batchId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [annData, examData, routData, reqData, courseData] = await Promise.all([
        annRes.ok ? annRes.json() : Promise.resolve({ announcements: [] }),
        examRes.ok ? examRes.json() : Promise.resolve({ exams: [] }),
        routRes.ok ? routRes.json() : Promise.resolve({ routines: [] }),
        reqRes.ok ? reqRes.json() : Promise.resolve({ requests: [] }),
        courseRes.ok ? courseRes.json() : Promise.resolve({ courses: [] }),
      ]);

      const fetchedAnnouncements = annData.announcements || [];
      const fetchedExams = examData.exams || [];
      const fetchedRoutines = routData.routines || [];
      const fetchedRequests = reqData.requests || [];
      const fetchedCoursesCount = courseData.courses?.length || 5;

      setAnnouncements(fetchedAnnouncements);
      setExams(fetchedExams);
      setRoutines(fetchedRoutines);
      setRoutineRequests(fetchedRequests);
      setCoursesCount(fetchedCoursesCount);

      // Fetch retake students taking classes with this CR's batch
      fetch('/api/retakes/cr/students', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.success) {
            setRetakeStudentsCount(data.stats?.totalInMyBatch || 0);
            setRetakeStudentsList(data.inMyBatch || []);
          }
        })
        .catch(() => {});

      crDashboardCache = {
        announcements: fetchedAnnouncements,
        exams: fetchedExams,
        routines: fetchedRoutines,
        routineRequests: fetchedRequests,
        coursesCount: fetchedCoursesCount,
      };
    } catch (err) {
      console.error('Failed to load CR dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, user]);

  // Today's Routine Filter
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const todayDayName = days[new Date().getDay()] || 'SUNDAY';
  const todaysClasses = routines.filter(r => r.day?.toUpperCase() === todayDayName);

  // Submit Handlers
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(annForm),
      });

      if (res.ok) {
        addToast('success', 'Batch Announcement published successfully!');
        setIsAnnModalOpen(false);
        setAnnForm({
          title: '',
          description: '',
          priority: 'NORMAL',
          publishDate: new Date().toISOString().split('T')[0],
          expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        });
        fetchDashboardData();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to create announcement');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(examForm),
      });

      if (res.ok) {
        addToast('success', 'Upcoming Exam scheduled & batch notified!');
        setIsExamModalOpen(false);
        setExamForm({
          courseTitle: 'Database Systems',
          courseCode: 'SWE 305',
          type: 'MIDTERM',
          title: '',
          date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          startTime: '10:00 AM',
          room: 'Room 502',
          description: '',
        });
        fetchDashboardData();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to add exam');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoutineRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/routines/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(routineReqForm),
      });

      if (res.ok) {
        addToast('success', 'Routine Change Request submitted to Central Admin!');
        setIsRoutineReqModalOpen(false);
        fetchDashboardData();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Submission failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #041E4A 0%, #062A63 60%, #1D4ED8 100%)',
        }}
        className="text-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6"
      >
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] sm:text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Class Representative Portal
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
            Hello, {user?.name || 'Mahmudul Hasan'} 👋
          </h1>
          <p className="text-xs md:text-sm text-slate-200 mt-1 max-w-xl">
            {user?.batchName || 'SWE 9th Batch'} • Class Representative • {user?.currentSemester || 5}th Semester
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative z-10 grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAnnModalOpen(true)}
            className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Announcement
          </button>
          <button
            onClick={() => setIsExamModalOpen(true)}
            className="px-3.5 py-2 bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4 text-blue-600" /> Add Exam Date
          </button>
          <button
            onClick={() => setIsRoutineReqModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-900 text-amber-300 border border-amber-400/30 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Request Routine Change
          </button>
          <button
            onClick={() => navigate('/cr/retakes')}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Retake Students ({retakeStudentsCount})
          </button>
        </div>
      </div>

      {/* Compact Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Announcements</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{announcements.length}</p>
          <span className="text-[10px] text-slate-400 block mt-1">Own Batch Only</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Upcoming Exams</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{exams.length}</p>
          <span className="text-[10px] text-slate-400 block mt-1">Scheduled Assessments</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today's Classes</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{todaysClasses.length}</p>
          <span className="text-[10px] text-slate-400 block mt-1">{todayDayName} Routine</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Current Courses</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{coursesCount}</p>
          <span className="text-[10px] text-slate-400 block mt-1">Enrolled Courses</span>
        </div>

        <div
          onClick={() => navigate('/cr/retakes')}
          className="bg-white p-4 rounded-xl border border-amber-200/80 hover:border-amber-400 shadow-2xs cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 group-hover:text-amber-700 transition-colors">Retake Students</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{retakeStudentsCount}</p>
          <span className="text-[10px] text-amber-700/80 font-medium block mt-1">Taking Batch Classes →</span>
        </div>
      </div>

      {/* Main Content Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Exams Panel */}
          <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
            <div
              className="relative overflow-hidden px-5 py-4 border-b border-[#D8E2EE] flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 85% 30%, rgba(126, 140, 255, 0.16), transparent 50%)',
                  }}
                />
              </div>

              <div className="relative z-10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/90 text-blue-600 flex items-center justify-center border border-[rgba(120,145,255,0.25)] shadow-2xs">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#0A2147] tracking-tight">
                  Upcoming Exams & Deadlines
                </h3>
              </div>
              <button
                onClick={() => navigate('/cr/exams')}
                className="relative z-10 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Manage Exams <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading exam schedule...</div>
            ) : exams.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                No upcoming exams scheduled. Click "+ Add Exam Date" above to add one.
              </div>
            ) : (
              <div className="space-y-3">
                {exams.slice(0, 3).map(exam => (
                  <div
                    key={exam.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200/80 flex items-center justify-between transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">
                          {exam.type}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{exam.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {exam.courseCode} • {exam.courseTitle} • Room: {exam.room || 'TBA'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-md block">
                        {exam.daysLeft === 0 ? 'Today' : `${exam.daysLeft} days left`}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-1">{exam.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Recent Batch Announcements */}
          <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
            <div
              className="relative overflow-hidden px-5 py-4 border-b border-[#D8E2EE] flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 85% 30%, rgba(126, 140, 255, 0.16), transparent 50%)',
                  }}
                />
              </div>

              <div className="relative z-10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/90 text-blue-600 flex items-center justify-center border border-[rgba(120,145,255,0.25)] shadow-2xs">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#0A2147] tracking-tight">
                  Active Batch Announcements
                </h3>
              </div>
              <button
                onClick={() => navigate('/cr/announcements')}
                className="relative z-10 text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Manage All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5">
            {isLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading announcements...</div>
            ) : announcements.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                No active announcements for your batch right now.
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 3).map(ann => (
                  <div key={ann.id} className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          ann.priority === 'URGENT'
                            ? 'bg-rose-100 text-rose-700'
                            : ann.priority === 'IMPORTANT'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {ann.priority}
                      </span>
                      <span className="text-[10px] text-slate-400">Published: {ann.publishDate}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">{ann.title}</h4>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{ann.description}</p>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          {/* Today's Routine Card */}
          <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
            <div
              className="relative overflow-hidden px-5 py-4 border-b border-[#D8E2EE] flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 85% 30%, rgba(126, 140, 255, 0.16), transparent 50%)',
                  }}
                />
              </div>

              <div className="relative z-10 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/90 text-blue-600 flex items-center justify-center border border-[rgba(120,145,255,0.25)] shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-[#0A2147] tracking-tight">
                  Today's Classes ({todayDayName})
                </h3>
              </div>
            </div>

            <div className="p-4 sm:p-5">
            {todaysClasses.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                No classes scheduled for today! 🎉
              </div>
            ) : (
              <div className="space-y-3">
                {todaysClasses.map(slot => (
                  <RoutineClassCard key={slot.id} slot={slot} />
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Routine Change Requests Status Panel */}
          <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
            <div
              className="relative overflow-hidden px-5 py-4 border-b border-[#D8E2EE] flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'radial-gradient(circle at 85% 30%, rgba(126, 140, 255, 0.16), transparent 50%)',
                  }}
                />
              </div>

              <h3 className="relative z-10 text-xs sm:text-sm font-bold text-[#0A2147] tracking-tight flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/90 text-amber-600 flex items-center justify-center border border-[rgba(120,145,255,0.25)] shadow-2xs">
                  <RefreshCw className="w-4 h-4" />
                </div>
                Routine Requests
              </h3>
              <button
                onClick={() => setIsRoutineReqModalOpen(true)}
                className="relative z-10 text-[11px] font-bold text-blue-600 hover:underline"
              >
                + New
              </button>
            </div>

            <div className="p-5">

            {routineRequests.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                No routine change requests submitted yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {routineRequests.slice(0, 3).map(req => (
                  <div key={req.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{req.courseTitle}</span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">Req: {req.requestedSchedule}</p>
                    {req.rejectionReason && (
                      <p className="text-[10px] text-rose-600 mt-1">Reason: {req.rejectionReason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          {/* Retake & Improvement Students Panel */}
          <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
            <div
              className="relative overflow-hidden px-5 py-4 border-b border-[#D8E2EE] flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #FFFDF8 0%, #FFF8ED 50%, #FEF3C7 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
              }}
            >
              <h3 className="relative z-10 text-xs sm:text-sm font-bold text-[#0A2147] tracking-tight flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white/90 text-amber-600 flex items-center justify-center border border-amber-300 shadow-2xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                Retake Students ({retakeStudentsList.length})
              </h3>
              <button
                onClick={() => navigate('/cr/retakes')}
                className="relative z-10 text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
              >
                View Directory →
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {retakeStudentsList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                  No retake or improvement students currently enrolled in your batch courses.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {retakeStudentsList.slice(0, 3).map((student: any) => (
                    <div key={student.id} className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/60 text-xs flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 truncate">{student.studentName}</span>
                          <span className="px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-800 font-mono text-[10px] font-bold">
                            {student.studentRoll}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">
                          {student.courseCode} • {student.courseTitle}
                        </p>
                      </div>

                      <a
                        href={`mailto:${student.studentEmail}`}
                        className="p-2 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors shrink-0"
                        title={`Email ${student.studentName}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}

                  {retakeStudentsList.length > 3 && (
                    <button
                      onClick={() => navigate('/cr/retakes')}
                      className="w-full py-2 text-center text-xs font-semibold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
                    >
                      + {retakeStudentsList.length - 3} more retake students enrolled
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {isAnnModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Publish Batch Announcement</h3>
            <p className="text-xs text-slate-500">
              This announcement will be published to <strong className="text-slate-800">{user?.batchName}</strong> and trigger student notifications.
            </p>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Announcement title"
                  value={annForm.title}
                  onChange={e => setAnnForm({ ...annForm, title: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Full announcement details..."
                  value={annForm.description}
                  onChange={e => setAnnForm({ ...annForm, description: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority *</label>
                  <select
                    value={annForm.priority}
                    onChange={e => setAnnForm({ ...annForm, priority: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={annForm.expiryDate}
                    onChange={e => setAnnForm({ ...annForm, expiryDate: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAnnModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Schedule Upcoming Exam / Assessment</h3>

            <form onSubmit={handleCreateExam} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={examForm.courseCode}
                    onChange={e => setExamForm({ ...examForm, courseCode: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    value={examForm.courseTitle}
                    onChange={e => setExamForm({ ...examForm, courseTitle: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assessment Type *</label>
                  <select
                    value={examForm.type}
                    onChange={e => setExamForm({ ...examForm, type: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="QUIZ">Quiz</option>
                    <option value="CLASS_TEST">Class Test</option>
                    <option value="MIDTERM">Midterm</option>
                    <option value="FINAL">Final Exam</option>
                    <option value="LAB_EXAM">Lab Exam</option>
                    <option value="VIVA">Viva</option>
                    <option value="PRESENTATION">Presentation</option>
                    <option value="ASSIGNMENT">Assignment Deadline</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midterm Examination"
                    value={examForm.title}
                    onChange={e => setExamForm({ ...examForm, title: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={examForm.date}
                    onChange={e => setExamForm({ ...examForm, date: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={examForm.startTime}
                    onChange={e => setExamForm({ ...examForm, startTime: e.target.value })}
                    placeholder="10:00 AM"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room</label>
                  <input
                    type="text"
                    value={examForm.room}
                    onChange={e => setExamForm({ ...examForm, room: e.target.value })}
                    placeholder="Room 502"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Syllabus Notes</label>
                <textarea
                  rows={2}
                  value={examForm.description}
                  onChange={e => setExamForm({ ...examForm, description: e.target.value })}
                  placeholder="Optional exam instructions..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Scheduling...' : 'Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROUTINE REQUEST MODAL */}
      {isRoutineReqModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Request Routine Change</h3>
            <p className="text-xs text-slate-500">
              Submit a schedule adjustment request to Central Department Admin for approval.
            </p>

            <form onSubmit={handleRoutineRequestSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Affected Class/Course *</label>
                <input
                  type="text"
                  required
                  value={routineReqForm.courseTitle}
                  onChange={e => setRoutineReqForm({ ...routineReqForm, courseTitle: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Current Schedule *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunday 10:00 AM - 11:30 AM"
                  value={routineReqForm.currentSchedule}
                  onChange={e => setRoutineReqForm({ ...routineReqForm, currentSchedule: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Requested Schedule *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tuesday 02:00 PM - 03:30 PM"
                  value={routineReqForm.requestedSchedule}
                  onChange={e => setRoutineReqForm({ ...routineReqForm, requestedSchedule: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Request *</label>
                <textarea
                  required
                  rows={2}
                  value={routineReqForm.reason}
                  onChange={e => setRoutineReqForm({ ...routineReqForm, reason: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoutineReqModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
