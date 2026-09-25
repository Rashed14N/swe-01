import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Plus, MapPin, Calendar, Trash2, Edit2, CalendarCheck, Archive, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';
import { Exam, ExamType } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { ALL_ROOMS } from '../constants/rooms';

export const ExamsPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab: 'upcoming' | 'archived' = tabParam === 'archived' ? 'archived' : 'upcoming';

  const [exams, setExams] = useState<(Exam & { daysLeft: number; isArchived?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleTabChange = (tab: 'upcoming' | 'archived') => {
    if (tab === 'archived') {
      setSearchParams({ tab: 'archived' });
    } else {
      setSearchParams({});
    }
  };

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // Confirm delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [courseCode, setCourseCode] = useState('SWE 305');
  const [courseTitle, setCourseTitle] = useState('Database Systems');
  const [type, setType] = useState<ExamType>('MIDTERM');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [room, setRoom] = useState('Exam Hall 3');
  const [description, setDescription] = useState('');

  const fetchExams = () => {
    if (!token) return;
    setIsLoading(true);
    fetch(`/api/exams?batchId=${user?.batchId || 'batch-9'}&includePast=true`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => safeParseJson(res))
      .then((data) => setExams(data.exams || []))
      .catch((err) => {
        console.warn('Could not fetch exams:', err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchExams();
  }, [token, user]);

  const canManage = user?.role === 'CR' || user?.role === 'ADMIN';

  const handleOpenCreate = () => {
    setEditingExam(null);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exam: Exam) => {
    setEditingExam(exam);
    setCourseCode(exam.courseCode);
    setCourseTitle(exam.courseTitle);
    setType(exam.type);
    setTitle(exam.title);
    setDate(exam.date);
    setStartTime(exam.startTime || '10:00 AM');
    setRoom(exam.room || 'Exam Hall 3');
    setDescription(exam.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      addToast('error', 'Please fill in title and date');
      return;
    }

    const payload = {
      batchId: user?.batchId || 'batch-9',
      courseCode,
      courseTitle,
      type,
      title,
      date,
      startTime,
      room,
      description,
    };

    try {
      const url = editingExam ? `/api/exams/${editingExam.id}` : '/api/exams';
      const method = editingExam ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast('success', editingExam ? 'Exam updated!' : 'Exam scheduled successfully!');
        setIsModalOpen(false);
        fetchExams();
      } else {
        const err = await safeParseJson(res).catch(() => ({ error: `Failed with status ${res.status}` }));
        addToast('error', err.error || 'Operation failed');
      }
    } catch (e: any) {
      addToast('error', e?.message || 'Server error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/exams/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('success', 'Exam deleted');
        setDeletingId(null);
        fetchExams();
      }
    } catch (e) {
      addToast('error', 'Failed to delete');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingExams = exams.filter((ex) => Boolean(ex.date && ex.date >= todayStr));
  const archivedExams = exams.filter((ex) => Boolean(ex.date && ex.date < todayStr));

  const currentTabExams = activeTab === 'upcoming' ? upcomingExams : archivedExams;

  const filteredExams = currentTabExams.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || ex.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={activeTab === 'upcoming' ? "Upcoming Exams & Assessment Schedule" : "Archived Exams & Assessment History"}
        description={
          activeTab === 'upcoming'
            ? "Chronological examination schedule for your batch semester. Check dates, room venues, and deadlines."
            : "Historical record of past examinations, quizzes, and class tests. Automatically archived after exam dates pass."
        }
        breadcrumb={`${user?.batchName} • Semester ${user?.currentSemester}`}
        primaryAction={
          canManage
            ? {
                label: 'Schedule Exam',
                icon: Plus,
                onClick: handleOpenCreate,
              }
            : undefined
        }
      />

      {/* Tabs: Upcoming vs Archived */}
      <div className="flex items-center gap-2 border-b border-[#D8E2EE] dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => handleTabChange('upcoming')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'upcoming'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming Exams</span>
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'upcoming'
                ? 'bg-white/20 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {upcomingExams.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('archived')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'archived'
              ? 'bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Archived Exams</span>
          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'archived'
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {archivedExams.length}
          </span>
        </button>
      </div>

      {activeTab === 'archived' && (
        <div className="p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Archive className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <strong>Archived Assessments:</strong> These exams have already concluded. They are automatically moved here once their date passes for historical syllabus reference.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleTabChange('upcoming')}
            className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline shrink-0"
          >
            ← Back to Upcoming
          </button>
        </div>
      )}

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search exams by title or course code..."
        filters={[
          {
            id: 'type',
            label: 'All Assessment Types',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { label: 'Midterm Exam', value: 'MIDTERM' },
              { label: 'Final Exam', value: 'FINAL' },
              { label: 'Class Quiz', value: 'QUIZ' },
              { label: 'Class Test', value: 'CLASS_TEST' },
              { label: 'Lab Practical', value: 'LAB_EXAM' },
              { label: 'Presentation', value: 'PRESENTATION' },
              { label: 'Assignment', value: 'ASSIGNMENT' },
            ],
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setTypeFilter('');
        }}
        isFiltered={Boolean(searchQuery || typeFilter)}
      />

      {/* Structured Exam View (Mobile Cards + Desktop Table) */}
      <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
        {/* Mobile Card View (block md:hidden) */}
        <div className="block md:hidden divide-y divide-[#E5EBF3] dark:divide-slate-800 p-3 space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading exam schedule...</div>
          ) : filteredExams.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
              {searchQuery || typeFilter ? (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400">No exams match your search filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('');
                    }}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Clear Filters
                  </button>
                </>
              ) : activeTab === 'upcoming' ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-2xs">
                    <CalendarCheck className="w-6 h-6" strokeWidth={2.2} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Upcoming Exams</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                    There are currently no upcoming exams scheduled. Concluded exams are automatically archived.
                  </p>
                  {archivedExams.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleTabChange('archived')}
                      className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" /> View Archived Exams ({archivedExams.length})
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 flex items-center justify-center mb-3 shadow-2xs">
                    <Archive className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Archived Exams</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mt-1 leading-relaxed">
                    Exams will automatically be saved to this archive as their dates pass.
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredExams.map((exam) => {
              const dateObj = new Date(exam.date);
              const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const dayNum = dateObj.getDate();
              const isPast = exam.daysLeft < 0 || exam.date < todayStr;

              return (
                <div key={exam.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white rounded-md">
                      <span className="text-[10px] font-extrabold text-amber-300 uppercase">{monthStr}</span>
                      <span className="text-xs font-black">{dayNum}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                        isPast
                          ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          : exam.daysLeft <= 3
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isPast ? (
                        <span className="inline-flex items-center gap-1">
                          <Archive className="w-2.5 h-2.5" /> Archived
                        </span>
                      ) : exam.daysLeft === 0 ? (
                        'Today!'
                      ) : (
                        `${exam.daysLeft}d left`
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-[#EFF5FF] text-[#2563EB] font-mono text-[10px] font-extrabold rounded border border-[#DBEAFE]">
                      {exam.courseCode}
                    </span>
                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded border border-rose-200 uppercase">
                      {exam.type}
                    </span>
                    {(exam as any).isRetakeCourse && (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 font-extrabold text-[10px] rounded border border-amber-200 uppercase">
                        {(exam as any).retakeType || 'Retake'} • {(exam as any).retakeBatchName || 'CR Updated'}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">{exam.title}</h4>
                    <p className="text-[11px] text-[#475569] dark:text-slate-400">{exam.courseTitle}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#475569] dark:text-slate-400 pt-1 border-t border-[#E5EBF3] dark:border-slate-800">
                    <span className="flex items-center gap-1 font-bold">
                      <MapPin className="w-3 h-3 text-slate-400" /> {exam.room || 'TBD'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" /> {exam.startTime || '10:00 AM'}
                    </span>
                  </div>

                  {canManage && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleOpenEdit(exam)}
                        className="p-1 text-slate-500 hover:text-blue-600"
                        title="Edit exam"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(exam.id)}
                        className="p-1 text-slate-500 hover:text-rose-600"
                        title="Delete exam"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F2F6FB] dark:bg-[#121D30] border-b border-[#DCE6F2] dark:border-slate-800 text-[11px] font-extrabold text-[#0A2147] dark:text-white uppercase tracking-wider">
                <th className="px-5 py-3.5 w-32">DATE</th>
                <th className="px-5 py-3.5">COURSE</th>
                <th className="px-5 py-3.5 w-28">TYPE</th>
                <th className="px-5 py-3.5">TITLE</th>
                <th className="px-5 py-3.5 w-32">ROOM & TIME</th>
                <th className="px-5 py-3.5 w-36">STATUS</th>
                {canManage && <th className="px-5 py-3.5 text-right w-24">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EBF3] dark:divide-slate-800 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-5 py-10 text-center text-slate-400">
                    Loading exam schedule...
                  </td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      {searchQuery || typeFilter ? (
                        <>
                          <p className="text-xs text-slate-500 dark:text-slate-400">No scheduled assessments match your active filter.</p>
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setTypeFilter('');
                            }}
                            className="mt-2 text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Clear Filters
                          </button>
                        </>
                      ) : activeTab === 'upcoming' ? (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 shadow-2xs">
                            <CalendarCheck className="w-6 h-6" strokeWidth={2.2} />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Upcoming Exams</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            There are currently no upcoming exams scheduled for your batch. Any exams whose date has passed have been automatically archived.
                          </p>
                          <div className="flex items-center gap-2.5 mt-4">
                            {archivedExams.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleTabChange('archived')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                              >
                                <Archive className="w-3.5 h-3.5" /> View Archived Exams ({archivedExams.length})
                              </button>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-2xs"
                              >
                                <Plus className="w-3.5 h-3.5" /> Schedule Exam
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 flex items-center justify-center mb-3 shadow-2xs">
                            <Archive className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Archived Exams</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            Past exams will automatically appear here once their dates pass.
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => {
                  const dateObj = new Date(exam.date);
                  const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                  const dayNum = dateObj.getDate();
                  const isPast = exam.daysLeft < 0 || exam.date < todayStr;

                  return (
                    <tr key={exam.id} className="bg-white dark:bg-[#0F172A] hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 transition-colors h-16">
                      {/* Prominent Date */}
                      <td className="px-5 py-3">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-900 text-white rounded-lg">
                          <span className="text-[10px] font-extrabold text-amber-300 uppercase">
                            {monthStr}
                          </span>
                          <span className="text-sm font-black leading-none">{dayNum}</span>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-5 py-3 font-semibold text-[#0F172A] dark:text-white">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-[#EFF5FF] text-[#2563EB] font-mono text-[10px] font-extrabold rounded border border-[#DBEAFE]">
                            {exam.courseCode}
                          </span>
                          <span className="truncate">{exam.courseTitle}</span>
                          {(exam as any).isRetakeCourse && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 font-extrabold text-[9px] rounded border border-amber-200 uppercase">
                              {(exam as any).retakeType || 'Retake'} • {(exam as any).retakeBatchName || 'CR Updated'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded border border-rose-200 uppercase">
                          {exam.type}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-5 py-3 font-bold text-[#0F172A] dark:text-white">
                        {exam.title}
                        {exam.description && (
                          <span className="block text-[11px] text-[#64748B] dark:text-slate-400 font-normal truncate max-w-xs">
                            {exam.description}
                          </span>
                        )}
                      </td>

                      {/* Room & Time */}
                      <td className="px-5 py-3 text-[#475569] dark:text-slate-300">
                        <div className="flex flex-col text-[11px] font-medium">
                          <span className="flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                            <MapPin className="w-3 h-3 text-slate-400" /> {exam.room || 'TBD'}
                          </span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {exam.startTime || '10:00 AM'}
                          </span>
                        </div>
                      </td>

                      {/* Status / Days Left */}
                      <td className="px-5 py-3">
                        {isPast ? (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-md inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Archive className="w-3 h-3 text-slate-400" />
                            {exam.daysLeft < 0 ? `${Math.abs(exam.daysLeft)}d ago` : 'Archived'}
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md inline-block ${
                              exam.daysLeft <= 3
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : exam.daysLeft <= 7
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {exam.daysLeft === 0 ? 'Today!' : `${exam.daysLeft} days left`}
                          </span>
                        )}
                      </td>

                      {/* CR Actions */}
                      {canManage && (
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(exam)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                              title="Edit exam"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingId(exam.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete exam"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal to Schedule or Edit Exam */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExam ? 'Edit Scheduled Exam' : 'Schedule New Exam'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Course Code</label>
              <input
                type="text"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Assessment Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExamType)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-semibold"
              >
                <option value="MIDTERM">Midterm Exam</option>
                <option value="FINAL">Final Exam</option>
                <option value="QUIZ">Class Quiz</option>
                <option value="CLASS_TEST">Class Test</option>
                <option value="LAB_EXAM">Lab Practical</option>
                <option value="PRESENTATION">Presentation</option>
                <option value="ASSIGNMENT">Assignment Deadline</option>
                <option value="VIVA">Viva Voce</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Course Title</label>
            <input
              type="text"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="e.g. Database Systems"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Exam / Assessment Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Database Systems Midterm Exam"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Start Time</label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Room / Venue</label>
              <input
                type="text"
                list="exam-rooms-list"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Room 401, XL 1, EEE Lab"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs"
              />
              <datalist id="exam-rooms-list">
                {ALL_ROOMS.map(r => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Topics / Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Covers Chapters 1-5..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs"
            >
              {editingExam ? 'Save Changes' : 'Schedule Exam'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Scheduled Exam"
        message="Are you sure you want to remove this exam entry from the batch schedule?"
      />
    </div>
  );
};
