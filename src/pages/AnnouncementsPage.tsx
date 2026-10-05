import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Plus, Archive, Trash2, Mail, Calendar, Clock, Sparkles, Eye, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { BatchAnnouncement, AnnouncementPriority, Batch, Course } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { EmailAnnouncementPreview } from '../components/announcements/EmailAnnouncementPreview';

export const AnnouncementsPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();

  const [announcements, setAnnouncements] = useState<BatchAnnouncement[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>(
    user?.role === 'ADMIN' ? 'ALL' : (user?.batchId || 'batch-9')
  );
  const [showArchive, setShowArchive] = useState(false);
  const [counts, setCounts] = useState({ activeCount: 0, archivedCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [targetBatchId, setTargetBatchId] = useState(
    user?.role === 'ADMIN' ? 'ALL' : (user?.batchId || 'batch-9')
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');

  // Exam Announcement Specific State
  const [isExamRelated, setIsExamRelated] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [examType, setExamType] = useState('Midterm');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('10:00 AM');
  const [room, setRoom] = useState('');

  useEffect(() => {
    fetch('/api/batches')
      .then(res => safeParseJson(res))
      .then(data => {
        if (data && Array.isArray(data.batches)) {
          setBatches(data.batches);
        }
      })
      .catch(() => {});

    fetch('/api/courses?all=true')
      .then(res => safeParseJson(res))
      .then(data => {
        if (data && Array.isArray(data.courses)) {
          setCourses(data.courses);
        }
      })
      .catch(() => {});
  }, []);

  const fetchAnnouncements = () => {
    if (!token) return;
    setIsLoading(true);
    const batchParam = selectedBatchFilter && selectedBatchFilter !== 'ALL'
      ? `batchId=${encodeURIComponent(selectedBatchFilter)}&`
      : '';
    fetch(`/api/announcements?${batchParam}archive=${showArchive}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => safeParseJson(res))
      .then((data) => {
        setAnnouncements(data.announcements || []);
        setCounts({
          activeCount: data.activeCount || 0,
          archivedCount: data.archivedCount || 0,
        });
      })
      .catch((err) => {
        console.warn('Could not fetch announcements:', err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [token, user, showArchive, selectedBatchFilter]);

  const canManage = user?.role === 'CR' || user?.role === 'ADMIN';

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    setTargetBatchId(user?.role === 'ADMIN' ? 'ALL' : (user?.batchId || 'batch-9'));
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setExpiryDate(nextWeek.toISOString().split('T')[0]);
    setPriority('NORMAL');
    setIsExamRelated(false);
    setSelectedCourseId('');
    setCourseCode('');
    setCourseTitle('');
    setExamType('Midterm');
    setExamDate(new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
    setExamTime('10:00 AM');
    setRoom('');
    setIsModalOpen(true);
  };

  const handleCourseSelect = (cId: string) => {
    setSelectedCourseId(cId);
    const found = courses.find(c => c.id === cId);
    if (found) {
      setCourseCode(found.code);
      setCourseTitle(found.title);
      if (!title) {
        setTitle(`${found.code} ${examType} Announcement`);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title || !description || !expiryDate) {
      addToast('error', 'Please fill in all required fields');
      return;
    }

    if (isExamRelated && (!courseTitle || !examDate)) {
      addToast('error', 'Please provide Course Title and Exam Date for the exam announcement');
      return;
    }

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchId: targetBatchId,
          title,
          description,
          expiryDate,
          priority,
          sendNotification: false,
          isExamRelated,
          courseCode: isExamRelated ? courseCode : undefined,
          courseTitle: isExamRelated ? courseTitle : undefined,
          courseId: isExamRelated ? selectedCourseId : undefined,
          examType: isExamRelated ? examType : undefined,
          examDate: isExamRelated ? examDate : undefined,
          examTime: isExamRelated ? examTime : undefined,
          room: isExamRelated ? room : undefined,
        }),
      });

      if (res.ok) {
        const data = await safeParseJson(res);
        if (data?.emailsDispatched && data.emailsDispatched > 0) {
          addToast('success', `Exam announcement published! Email notifications dispatched to ${data.emailsDispatched} enrolled students via Resend.`);
        } else {
          addToast('success', data?.message || 'Announcement Published!');
        }
        setIsModalOpen(false);
        fetchAnnouncements();
      } else {
        const err = await safeParseJson(res).catch(() => ({ error: `Failed with status ${res.status}` }));
        addToast('error', err.error || 'Failed to publish');
      }
    } catch (e: any) {
      addToast('error', e?.message || 'Server error');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const res = await fetch(`/api/announcements/${deletingId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('success', 'Announcement removed');
        setDeletingId(null);
        fetchAnnouncements();
      }
    } catch (e) {
      addToast('error', 'Delete failed');
    }
  };

  const getPriorityBadge = (p: AnnouncementPriority) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded border border-rose-200">URGENT</span>;
      case 'IMPORTANT':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-extrabold text-[10px] rounded border border-amber-200">IMPORTANT</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold text-[10px] rounded border border-slate-200">NORMAL</span>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Announcements"
        description="Official notices published by Class Representatives and Department Head."
        breadcrumb={`${user?.batchName} • Semester ${user?.currentSemester}`}
        primaryAction={
          canManage
            ? {
                label: 'New Announcement',
                icon: Plus,
                onClick: handleOpenCreate,
              }
            : undefined
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'ADMIN' && (
            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-[#DCE5F0] dark:border-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg text-slate-800 dark:text-white"
            >
              <option value="ALL">All Batches (Department Wide)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex bg-[#F1F5FA] dark:bg-slate-800 p-1 rounded-lg border border-[#DCE5F0] dark:border-slate-700">
            <button
              onClick={() => setShowArchive(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                !showArchive ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-[0_1px_2px_rgba(15,35,70,0.06)]' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Active ({counts.activeCount})
            </button>
            <button
              onClick={() => setShowArchive(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                showArchive ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-[0_1px_2px_rgba(15,35,70,0.06)]' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Archive className="w-3.5 h-3.5" /> Archive ({counts.archivedCount})
            </button>
          </div>
        </div>
      </PageHeader>

      {/* STUDENT VIEW: Clean Vertical Feed */}
      {!canManage ? (
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] p-4 md:p-6 divide-y divide-[#E5EBF3] dark:divide-slate-800">
          {isLoading ? (
            <div className="py-10 text-center text-xs text-slate-400">Loading notices...</div>
          ) : announcements.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              {showArchive ? 'No archived notices found.' : 'No active announcements right now.'}
            </div>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="py-4 md:py-5 first:pt-0 last:pb-0 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(ann.priority)}
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">{ann.title}</h3>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    Published: {ann.publishDate}
                  </span>
                </div>

                <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {ann.description}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-[#E5EBF3] dark:border-slate-800">
                  <span className="flex items-center gap-1.5">
                    By: 
                    <Link to="/batch-cr" className="text-blue-600 dark:text-blue-400 hover:underline font-bold inline-flex items-center gap-1">
                      <span>{ann.createdByName}</span>
                      <span className="text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-1.5 py-0.2 rounded font-extrabold">CR</span>
                    </Link>
                  </span>
                  <span>Expires: {ann.expiryDate}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ADMIN/CR VIEW: Data Table & Mobile Cards */
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
          {/* Mobile Card List (block md:hidden) */}
          <div className="block md:hidden divide-y divide-[#E5EBF3] dark:divide-slate-800 p-3 space-y-3">
            {isLoading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading announcements...</div>
            ) : announcements.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {showArchive ? 'No archived announcements.' : 'No active announcements.'}
              </div>
            ) : (
              announcements.map((ann) => (
                <div key={ann.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {getPriorityBadge(ann.priority)}
                    <span className="text-[11px] text-slate-400">Pub: {ann.publishDate}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">{ann.title}</h4>
                    <p className="text-xs text-[#475569] dark:text-slate-400 line-clamp-2 mt-0.5">{ann.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#475569] dark:text-slate-400 pt-1 border-t border-[#E5EBF3] dark:border-slate-800">
                    <span>By: {ann.createdByName}</span>
                    <div className="flex items-center gap-3">
                      <span>Exp: {ann.expiryDate}</span>
                      <button
                        onClick={() => setDeletingId(ann.id)}
                        className="text-rose-600 font-bold p-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F2F6FB] dark:bg-[#121D30] border-b border-[#DCE6F2] dark:border-slate-800 text-[11px] font-extrabold text-[#0A2147] dark:text-white uppercase tracking-wider">
                  <th className="px-5 py-3.5">TITLE</th>
                  <th className="px-5 py-3.5 w-28">PRIORITY</th>
                  <th className="px-5 py-3.5 w-32">PUBLISHED</th>
                  <th className="px-5 py-3.5 w-32">EXPIRES</th>
                  <th className="px-5 py-3.5">CREATED BY</th>
                  <th className="px-5 py-3.5 text-right w-20">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBF3] dark:divide-slate-800 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      Loading announcements table...
                    </td>
                  </tr>
                ) : announcements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      {showArchive ? 'No archived announcements.' : 'No active announcements.'}
                    </td>
                  </tr>
                ) : (
                  announcements.map((ann) => (
                    <tr key={ann.id} className="bg-white dark:bg-[#0F172A] hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 transition-colors h-14">
                      <td className="px-5 py-3 font-bold text-[#0F172A] dark:text-white">
                        <div>{ann.title}</div>
                        <div className="text-[11px] font-normal text-[#64748B] dark:text-slate-400 line-clamp-1">
                          {ann.description}
                        </div>
                      </td>
                      <td className="px-5 py-3">{getPriorityBadge(ann.priority)}</td>
                      <td className="px-5 py-3 text-[#475569] dark:text-slate-400 font-medium">{ann.publishDate}</td>
                      <td className="px-5 py-3 text-[#475569] dark:text-slate-400 font-medium">{ann.expiryDate}</td>
                      <td className="px-5 py-3 font-semibold text-[#0F172A] dark:text-slate-200">{ann.createdByName}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDeletingId(ann.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal to Create Announcement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publish Announcement"
        maxWidth={modalTab === 'PREVIEW' ? '4xl' : '2xl'}
      >
        {/* Tab Switcher: Compose vs Visual Email Preview */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setModalTab('EDIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modalTab === 'EDIT'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              📝 Compose Announcement
            </button>
            <button
              type="button"
              onClick={() => setModalTab('PREVIEW')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                modalTab === 'PREVIEW'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Visual Email Preview</span>
              {isExamRelated && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            {isExamRelated ? '⚡ Exam Alert Email will be dispatched' : 'Standard Announcement'}
          </div>
        </div>

        {modalTab === 'PREVIEW' ? (
          <div className="space-y-4">
            <EmailAnnouncementPreview
              courseTitle={courseTitle || 'Course Title'}
              courseCode={courseCode}
              examType={examType}
              examDate={examDate}
              examTime={examTime}
              room={room}
              title={title}
              description={description}
              batchName={batches.find(b => b.id === targetBatchId)?.name || 'SWE 9th Batch'}
              publisherName={`${user?.name} (${user?.role === 'CR' ? 'Class Representative' : 'Admin'})`}
              onSend={handleSubmit}
              isSending={isLoading}
            />
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModalTab('EDIT')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Editing
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {user?.role === 'ADMIN' && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Target Batch
              </label>
              <select
                value={targetBatchId}
                onChange={(e) => setTargetBatchId(e.target.value)}
                className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="ALL">All Batches (Department-Wide)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {(['NORMAL', 'IMPORTANT', 'URGENT'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    priority === p
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'border-[#E2E8F0] dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* EXAM ANNOUNCEMENT SECTION */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isExamRelated}
                  onChange={(e) => setIsExamRelated(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                />
                <span className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  Is this an Exam / Quiz Announcement?
                </span>
              </label>
              {isExamRelated && (
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Resend Active
                </span>
              )}
            </div>

            {isExamRelated && (
              <div className="space-y-3 pt-2 border-t border-blue-200/80 dark:border-blue-900/60 animate-in fade-in duration-150">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-blue-200 dark:border-blue-950 text-[11px] text-slate-600 dark:text-slate-300">
                  ⚡ <strong>Automated Resend Email:</strong> All students currently enrolled in this course (including batch students & retake students) will receive an official exam notification in their email with <strong>Course Title, Exam Type, and Exam Date</strong>!
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Select Course *
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => handleCourseSelect(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="">-- Choose a course --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} • {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Exam Type *
                    </label>
                    <select
                      value={examType}
                      onChange={(e) => {
                        setExamType(e.target.value);
                        if (courseCode && (!title || title.includes('Announcement'))) {
                          setTitle(`${courseCode} ${e.target.value} Announcement`);
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Quiz">Quiz</option>
                      <option value="Class Test">Class Test</option>
                      <option value="Midterm">Midterm Exam</option>
                      <option value="Final Exam">Final Exam</option>
                      <option value="Lab Exam">Lab Exam</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Exam Date *
                    </label>
                    <input
                      type="date"
                      required={isExamRelated}
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Exam Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10:00 AM"
                      value={examTime}
                      onChange={(e) => setExamTime(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Room / Venue
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Room 502 / E-2"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {!selectedCourseId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">Custom Course Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SWE 305"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">Custom Course Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Database Systems"
                        value={courseTitle}
                        onChange={(e) => setCourseTitle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">Announcement Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Software Engineering Assignment Deadline"
              className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">Description / Content</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter announcement details..."
              className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
              Expiration Date (Auto-Archiving)
            </label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 rounded-xl text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2">
            <span className="font-bold text-blue-700 dark:text-blue-400">ℹ️</span>
            <span>
              This announcement will be published directly in the <strong>Announcement Section</strong> without dispatching notification pings or incrementing student notification badges.
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-4 border-t border-[#E2E8F0] dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalTab('PREVIEW')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold rounded-lg border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview Email
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
              >
                Publish Announcement
              </button>
            </div>
          </div>
        </form>
      )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Announcement"
        message="Are you sure you want to permanently delete this batch announcement?"
      />
    </div>
  );
};
