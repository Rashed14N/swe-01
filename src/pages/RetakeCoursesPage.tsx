import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw, TrendingUp, Plus, Calendar, Clock, BookOpen,
  AlertTriangle, CheckCircle2, Trash2, Search,
  MapPin, User, RefreshCw,
  Bell, Mail, ShieldAlert, Sparkles, X, ChevronRight, Layers,
  ExternalLink, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { PageHeader } from '../components/common/PageHeader';
import { safeParseJson } from '../lib/apiClient';
import type {
  Course,
  Batch,
  RetakeRegistration,
  RetakeRoutineSlot,
  RetakeExamItem,
  RetakeAnnouncementItem,
  RetakeSummaryOverview,
  RetakeType,
  RetakeStatus,
} from '../types';

export const RetakeCoursesPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    addToast(type, msg);
  };

  // State
  const [data, setData] = useState<RetakeSummaryOverview | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Active Tab: 'courses' | 'exams' | 'routine' | 'announcements'
  const [activeTab, setActiveTab] = useState<'courses' | 'exams' | 'routine' | 'announcements'>('courses');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<RetakeRegistration | null>(null);

  // Routine day filter
  const [routineDayFilter, setRoutineDayFilter] = useState<string>('ALL');

  // Simplified Form State for Adding (No targetBatchId, no previousGrade, no targetGrade, no notes)
  const [formData, setFormData] = useState({
    courseId: '',
    type: 'RETAKE' as RetakeType,
  });
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Retakes & Updates
  const fetchData = async (isBackground = false) => {
    if (!token) return;
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/retakes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await safeParseJson(res);
      if (json.success && json.data) {
        setData(json.data);
        if (json.availableCourses) setAvailableCourses(json.availableCourses);
        if (json.availableBatches) setAvailableBatches(json.availableBatches);
      } else {
        console.warn('Could not load retakes data:', json.error);
      }
    } catch (err: any) {
      console.warn('Retake fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handle Add Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError(null);

    if (!formData.courseId) {
      setFormError('Please select a course from the department catalog.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/retakes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: formData.courseId,
          type: formData.type,
        }),
      });

      const json = await safeParseJson(res);
      if (res.ok && json.success) {
        notify(json.message || 'Course registered! Real-time email updates enabled via Resend.', 'success');
        setIsAddModalOpen(false);
        setFormData({
          courseId: '',
          type: 'RETAKE',
        });
        setCourseSearchQuery('');
        fetchData(true);
      } else {
        setFormError(json.error || 'Failed to add retake course.');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete / Drop
  const handleDeleteConfirm = async () => {
    if (!token || !deletingItem) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/retakes/${deletingItem.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await safeParseJson(res);
      if (res.ok && json.success) {
        notify(json.message || 'Course removed from your retake list', 'success');
        setDeletingItem(null);
        fetchData(true);
      } else {
        notify(json.error || 'Failed to remove course', 'error');
      }
    } catch (err: any) {
      notify(err.message || 'Failed to remove course', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Courses for Dropdown Search
  const filteredCatalogCourses = useMemo(() => {
    if (!courseSearchQuery.trim()) return availableCourses;
    const q = courseSearchQuery.toLowerCase();
    return availableCourses.filter(
      c => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }, [availableCourses, courseSearchQuery]);

  // Selected Course details for modal preview
  const selectedCourseDetails = useMemo(() => {
    if (!formData.courseId) return null;
    return availableCourses.find(c => c.id === formData.courseId) || null;
  }, [formData.courseId, availableCourses]);

  // Filtered Routine Slots by Day
  const filteredRoutineSlots = useMemo(() => {
    if (!data?.routineSlots) return [];
    if (routineDayFilter === 'ALL') return data.routineSlots;
    return data.routineSlots.filter(s => s.day?.toUpperCase() === routineDayFilter);
  }, [data?.routineSlots, routineDayFilter]);

  // Check if today is a class day
  const todayClassesCount = useMemo(() => {
    if (!data?.routineSlots) return 0;
    return data.routineSlots.filter(s => s.isToday).length;
  }, [data?.routineSlots]);

  const stats = data?.stats || {
    totalRegistered: 0,
    retakeCount: 0,
    improvementCount: 0,
    totalCredits: 0,
    upcomingExamsCount: 0,
    classesPerWeek: 0,
    conflictsCount: 0,
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Retake & Improvement Management"
          description="Register retake or improvement courses. Routine, exam updates from CRs, and notices are auto-synced with live email alerts via Resend."
          breadcrumb={`${user?.batchName || 'My Batch'} • Academic Retake Desk`}
        />

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-xs disabled:opacity-60"
            title="Refresh updates"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Updates'}</span>
          </button>

          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold tracking-tight shadow-sm transition-all"
          >
            <Plus strokeWidth={2.5} className="w-4 h-4" />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {/* Auto Email & CR Sync Notification Banner */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-[#0F172A] border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-[#0B2348] dark:text-white">
                Automatic CR Updates & Resend Email Alerts Active
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                <Check className="w-3 h-3" /> Auto-Synced
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              When a junior batch CR schedules or edits an upcoming exam, class test, or course announcement for your enrolled courses, you will immediately see the updated status here and receive an instant email notification.
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Registered Courses */}
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Enrolled Courses
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <RotateCcw strokeWidth={2.5} className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2348] dark:text-white tracking-tight">
              {stats.totalRegistered}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{stats.retakeCount} Retake</span>
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{stats.improvementCount} Improvement</span>
            </div>
          </div>
        </div>

        {/* Card 2: Synced Weekly Classes */}
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Weekly Routine
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Calendar strokeWidth={2.5} className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2348] dark:text-white tracking-tight">
              {stats.classesPerWeek} <span className="text-xs font-semibold text-slate-400">classes/wk</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {todayClassesCount > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  {todayClassesCount} class{todayClassesCount > 1 ? 'es' : ''} scheduled today
                </span>
              ) : (
                <span>No retake classes today</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Upcoming Exams */}
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Upcoming Exams
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock strokeWidth={2.5} className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2348] dark:text-white tracking-tight">
              {stats.upcomingExamsCount}
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {stats.upcomingExamsCount > 0
                ? 'CR scheduled & updated in real-time'
                : 'No upcoming tests or exams'}
            </div>
          </div>
        </div>

        {/* Card 4: Schedule Conflict Monitor */}
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Routine Clashes
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.conflictsCount > 0
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
            }`}>
              {stats.conflictsCount > 0 ? (
                <AlertTriangle strokeWidth={2.5} className="w-4 h-4 text-rose-500" />
              ) : (
                <CheckCircle2 strokeWidth={2.5} className="w-4 h-4 text-teal-500" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              stats.conflictsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400'
            }`}>
              {stats.conflictsCount === 0 ? 'Zero' : stats.conflictsCount}
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {stats.conflictsCount > 0
                ? `${stats.conflictsCount} slot${stats.conflictsCount > 1 ? 's' : ''} clash with regular routine`
                : 'No routine schedule clashes'}
            </div>
          </div>
        </div>
      </div>

      {/* Routine Conflict Warning Banner (if any) */}
      {stats.conflictsCount > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-rose-900 dark:text-rose-200">
              Class Schedule Conflict Detected ({stats.conflictsCount})
            </h4>
            <p className="text-rose-700 dark:text-rose-300/90 leading-relaxed">
              One or more retake routine periods overlap with your regular batch class timetable.
              Check the <strong>Class Routine</strong> tab below to view highlighted clash slots.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('courses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 ${
            activeTab === 'courses'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>My Enrolled Courses</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'courses' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            {data?.registrations?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 ${
            activeTab === 'exams'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Upcoming Exams</span>
          {data?.upcomingExams && data.upcomingExams.length > 0 && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'exams' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            {data?.upcomingExams?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('routine')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 ${
            activeTab === 'routine'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Class Routine</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'routine' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            {data?.routineSlots?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('announcements')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all shrink-0 ${
            activeTab === 'announcements'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Course Notices</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
            activeTab === 'announcements' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}>
            {data?.announcements?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab Content Loading State */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-semibold text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span>Loading retake & improvement records...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: REGISTERED COURSES */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              {(!data?.registrations || data.registrations.length === 0) ? (
                <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center max-w-xl mx-auto shadow-xs">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
                    <RotateCcw className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    No Retake or Improvement Courses Added
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                    Simply pick any course you are retaking or improving. The system will automatically detect the batch currently taking this course, sync their class timetable and CR exam schedules, and alert you via email using Resend!
                  </p>
                  <button
                    onClick={() => {
                      setFormError(null);
                      setIsAddModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <Plus strokeWidth={2.5} className="w-4 h-4" />
                    <span>Add Course</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {data.registrations.map(course => {
                    const isRetake = course.type === 'RETAKE';
                    return (
                      <div
                        key={course.id}
                        className="bg-white dark:bg-[#0F172A] p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Course Code & Type Badges */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg font-mono border border-slate-200 dark:border-slate-700">
                              {course.courseCode}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                                isRetake
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              }`}>
                                {course.type}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded">
                                {course.courseCredits} Credits
                              </span>
                            </div>
                          </div>

                          {/* Course Title */}
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {course.courseTitle}
                          </h3>

                          {/* Synced Batch & Notifications Details */}
                          <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Attending With:</span>
                              <span className="font-bold text-blue-700 dark:text-blue-400 truncate max-w-[170px]">
                                {course.retakeBatchName || 'Junior Batch (Auto-Detected)'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Email Alerts:</span>
                              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                <Mail className="w-3 h-3" /> Resend Active
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status & Actions Footer */}
                        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                            Active Sync
                          </span>

                          <button
                            onClick={() => setDeletingItem(course)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Drop course"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Drop</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPCOMING EXAMS (CR updates shown prominently) */}
          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Live Exam & Class Test Updates
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Whenever a CR adds or updates an exam for your courses, it appears here in real-time with an email sent to your inbox.
                  </p>
                </div>
              </div>

              {(!data?.upcomingExams || data.upcomingExams.length === 0) ? (
                <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  No upcoming midterms, finals, or class tests currently scheduled for your retake courses.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.upcomingExams.map(exam => {
                    const isUpcoming = exam.daysLeft >= 0;
                    return (
                      <div
                        key={exam.id}
                        className="bg-white dark:bg-[#0F172A] p-5 rounded-2xl border border-amber-200/90 dark:border-amber-900/50 shadow-xs hover:border-amber-400 transition-all flex flex-col justify-between relative overflow-hidden"
                      >
                        {/* Updated by CR badge indicator */}
                        <div className="absolute top-0 right-0">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 text-white font-extrabold text-[10px] rounded-bl-xl shadow-xs">
                            <Sparkles className="w-3 h-3" /> Updated by CR
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2 pr-24">
                            <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold text-[11px] rounded-md font-mono">
                              {exam.retakeCourseCode || exam.courseCode}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded uppercase">
                              {exam.type?.replace('_', ' ')}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-2">
                            {exam.title || exam.retakeCourseTitle}
                          </h4>

                          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mt-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span className="font-bold text-slate-900 dark:text-white">{exam.date}</span>
                              {exam.startTime && <span>• {exam.startTime}</span>}
                            </div>
                            {exam.room && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>Room: <strong className="text-slate-800 dark:text-slate-200">{exam.room}</strong></span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                Scheduled by {exam.createdByName || 'CR'} ({exam.batchName || 'Junior Batch'})
                              </span>
                            </div>
                          </div>

                          {exam.description && (
                            <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                              {exam.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isUpcoming
                              ? exam.daysLeft === 0
                                ? 'bg-rose-500 text-white animate-pulse'
                                : exam.daysLeft <= 3
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                          }`}>
                            {isUpcoming
                              ? exam.daysLeft === 0
                                ? 'Exam Today!'
                                : exam.daysLeft === 1
                                ? 'Tomorrow'
                                : `In ${exam.daysLeft} days`
                              : 'Completed'}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Mail className="w-3 h-3" /> Email Alert Dispatched
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLASS ROUTINE & TIMETABLE */}
          {activeTab === 'routine' && (
            <div className="space-y-4">
              {/* Routine Day Filter Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                {['ALL', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'].map(day => (
                  <button
                    key={day}
                    onClick={() => setRoutineDayFilter(day)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all shrink-0 ${
                      routineDayFilter === day
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {day === 'ALL' ? 'All Routine Days' : day.charAt(0) + day.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {filteredRoutineSlots.length === 0 ? (
                <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  No routine classes found for the selected day filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRoutineSlots.map((slot, idx) => (
                    <div
                      key={`${slot.id}-${idx}`}
                      className={`bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border transition-all ${
                        slot.hasConflictWithRegularRoutine
                          ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/20 shadow-xs'
                          : slot.isToday
                          ? 'border-blue-400 dark:border-blue-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-bold text-[11px] rounded-md font-mono">
                          {slot.retakeCourseCode || slot.courseCode}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {slot.isToday && (
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Today
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded">
                            {slot.day}
                          </span>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-2">
                        {slot.retakeCourseTitle || slot.courseTitle}
                      </h4>

                      <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Room: {slot.room || 'TBA'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Teacher: {slot.teacherName || 'Assigned Faculty'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            Batch: {slot.batchName || 'Junior Batch'}
                          </span>
                        </div>
                      </div>

                      {/* Conflict Badge */}
                      {slot.hasConflictWithRegularRoutine && (
                        <div className="mt-3 pt-2.5 border-t border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Clashes with your regular batch timetable!</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BATCH & COURSE NOTICES */}
          {activeTab === 'announcements' && (
            <div className="space-y-4">
              {(!data?.announcements || data.announcements.length === 0) ? (
                <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  No announcements currently linked to your retake courses.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.announcements.map(ann => (
                    <div
                      key={ann.id}
                      className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-bold font-mono">
                            {ann.retakeCourseCode || 'Notice'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {ann.batchName || 'Batch Update'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {ann.publishDate}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {ann.title}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {ann.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: ADD COURSE (SIMPLIFIED: NO BATCH, NO GRADES, NO NOTES) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Register Course
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Auto-sync junior batch timetable, exams & Resend email updates
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Type Radio Cards: Retake vs Improvement */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Enrollment Category
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'RETAKE' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.type === 'RETAKE'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 ring-2 ring-amber-400/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Retake</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      For failed courses (Grade F). Retake classes, exams & quizzes.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'IMPROVEMENT' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.type === 'IMPROVEMENT'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-400/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs mb-0.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Improvement</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      For upgrading low grades to raise CGPA.
                    </p>
                  </button>
                </div>
              </div>

              {/* Course Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Course
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by course code or title..."
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                </div>
                <select
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Choose Course from Department Catalog --</option>
                  {filteredCatalogCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.title} ({course.credits} Cr, Sem {course.semester})
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto Sync & Resend Info Callout */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-blue-200">
                  <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Automatic Batch Match & Email Notifications</span>
                </div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                  No batch selection required. We automatically detect which batch is currently taking this course. If their Class Representative (CR) schedules or edits an exam, you will get an email via Resend and immediate live updates here.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.courseId}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60"
                >
                  {isSubmitting ? 'Registering...' : 'Register Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DELETE */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Drop {deletingItem.courseCode}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Are you sure you want to drop <strong>{deletingItem.courseTitle}</strong>? You will no longer receive routine or exam schedule updates for this course.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60"
              >
                {isSubmitting ? 'Dropping...' : 'Drop Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetakeCoursesPage;
