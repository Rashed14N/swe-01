import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Plus, Archive, Trash2, Mail, MessageSquare, Calendar, Clock, Sparkles, Eye, ArrowLeft, Image, FileUp, X, ChevronDown, ChevronUp, BellOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { BatchAnnouncement, AnnouncementPriority, Batch, Course } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { EmailAnnouncementPreview } from '../components/announcements/EmailAnnouncementPreview';
import { WhatsAppAnnouncementPreview } from '../components/announcements/WhatsAppAnnouncementPreview';
import { getEffectiveSemester } from '../utils/semester';
import { AnnouncementsSkeleton, AnnouncementsTableSkeleton } from '../components/skeletons/AnnouncementsSkeleton';
import { fetchAnnouncementsFromSupabase } from '../services/supabaseDataService';

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

  const filteredAnnouncements = announcements;

  // FAQ Accordion Expand/Collapse State
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'EDIT' | 'WHATSAPP_PREVIEW' | 'EMAIL_PREVIEW'>('EDIT');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [targetBatchId, setTargetBatchId] = useState(
    user?.role === 'ADMIN' ? 'ALL' : (user?.batchId || 'batch-9')
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [eventDate, setEventDate] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Helper to extract or parse event date for the calendar badge tile on the left
  const getAnnouncementEventDate = (ann: BatchAnnouncement) => {
    const rawDate = ann.eventDate || (ann as any).examDate;
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        return {
          month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
          day: d.getDate(),
        };
      }
    }

    // Also detect date in title or description if present
    const text = `${ann.title} ${ann.description}`;
    const isoMatch = text.match(/\b(202\d)-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])\b/);
    if (isoMatch) {
      const d = new Date(isoMatch[0]);
      if (!isNaN(d.getTime())) {
        return {
          month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
          day: d.getDate(),
        };
      }
    }

    const monthNames = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
    const textMatch = text.match(new RegExp(`\\b(${monthNames})\\s+([0-2]?[0-9]|3[01])(?:st|nd|rd|th)?\\b`, 'i'));
    if (textMatch) {
      const monthStr = textMatch[1].slice(0, 3).toUpperCase();
      const dayNum = parseInt(textMatch[2], 10);
      return { month: monthStr, day: dayNum };
    }

    return null;
  };

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
        const list = data.announcements || [];
        setAnnouncements(list);
        setCounts({
          activeCount: data.activeCount || 0,
          archivedCount: data.archivedCount || 0,
        });
        if (list.length > 0) {
          setExpandedIds((prev) => (prev.size === 0 ? new Set([list[0].id]) : prev));
        }
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
    setFeaturedImageUrl('');
    setTargetBatchId(user?.role === 'ADMIN' ? 'ALL' : (user?.batchId || 'batch-9'));
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setExpiryDate(nextWeek.toISOString().split('T')[0]);
    setPriority('NORMAL');
    setFeaturedImageUrl('');
    setEventDate('');
    setIsExamRelated(false);
    setSelectedCourseId('');
    setCourseCode('');
    setCourseTitle('');
    setExamType('Midterm');
    setExamDate(new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]);
    setExamTime('10:00 AM');
    setRoom('');
    setModalTab('EDIT');
    setIsModalOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addToast('error', `Featured photo exceeds 2 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB). Max 2 MB allowed.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFeaturedImageUrl(base64);
      addToast('success', 'Feature photo attached successfully!');
    };
    reader.readAsDataURL(file);
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
          featuredImageUrl: featuredImageUrl || undefined,
          eventDate: eventDate || (isExamRelated ? examDate : undefined),
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
        addToast('success', 'Announcement published successfully to portal feed!');
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
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Announcements"
        breadcrumb={`${user?.batchName || 'SWE 9th Batch'} • Semester ${getEffectiveSemester(user)}`}
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

      {/* STUDENT VIEW: Department Notice Card Style with Event Date on Left and Expandable Details */}
      {!canManage ? (
        <div className="space-y-4">
          {isLoading ? (
            <AnnouncementsSkeleton count={4} />
          ) : filteredAnnouncements.length === 0 ? (
            <div className="bg-white dark:bg-[#0F172A] p-10 sm:p-14 text-center rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-xs font-black tracking-wide shadow-sm">
                <BellOff className="w-3.5 h-3.5" />
                <span>NO UPDATES AVAILABLE</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-black dark:text-white tracking-tight">
                  {showArchive ? 'No Archived Announcements' : 'No Announcements Available Right Now'}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-black dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  {showArchive
                    ? 'No past or archived announcements found for this batch.'
                    : 'There are currently no active announcements or updates. New notices published by Class Representatives or Department Faculty will appear here.'}
                </p>
              </div>
            </div>
          ) : (
            filteredAnnouncements.map((ann) => {
              const isOpen = expandedIds.has(ann.id);
              const eventDate = getAnnouncementEventDate(ann);

              return (
                <div
                  key={ann.id}
                  onClick={() => toggleExpand(ann.id)}
                  className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] hover:border-[#A3C0EE] transition-all space-y-3.5 cursor-pointer group select-none"
                >
                  {/* Top Meta Row (Matching Department Notice Card) */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(ann.priority)}
                      <span className="px-2.5 py-0.5 bg-[#EFF5FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 text-[10px] font-bold rounded-md border border-[#DBEAFE] dark:border-blue-900 uppercase">
                        Batch Announcement
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                      <span>{ann.publishDate}</span>
                      <div
                        className={`p-1 rounded-md transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-slate-400'
                        }`}
                        title={isOpen ? 'Click to collapse' : 'Click to show photo & details'}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Title Area with Left Event Date Tile if event date exists */}
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    {eventDate && (
                      <div className="shrink-0 flex flex-col items-center justify-center w-12 h-14 sm:w-14 sm:h-16 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 shadow-2xs text-center font-sans">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider leading-tight">{eventDate.month}</span>
                        <span className="text-base sm:text-xl font-black leading-none mt-0.5">{eventDate.day}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {ann.title}
                      </h3>
                      {!isOpen && (
                        <p className="text-xs text-[#334155] dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                          {ann.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* When clicked: Show Featured Photo and Full Details */}
                  {isOpen && (
                    <div className="space-y-4 pt-2 border-t border-[#E5EBF3] dark:border-slate-800 animate-in fade-in duration-150">
                      {ann.featuredImageUrl && (
                        <div className="w-full sm:max-w-[70%] sm:mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-2xs">
                          <img
                            src={ann.featuredImageUrl}
                            alt={ann.title}
                            className="w-full h-48 sm:h-60 md:h-72 object-cover block mx-auto"
                            loading="lazy"
                          />
                        </div>
                      )}

                      <div className="px-0 sm:px-4 md:px-6">
                        <p className="text-xs sm:text-[13.5px] text-[#334155] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {ann.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ADMIN/CR VIEW: Data Table & Mobile Cards */
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
          {/* Mobile Card List (block md:hidden) */}
          <div className="block md:hidden divide-y divide-[#E5EBF3] dark:divide-slate-800 p-3 space-y-3">
            {isLoading ? (
              <AnnouncementsSkeleton count={3} />
            ) : filteredAnnouncements.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-11 h-11 mx-auto rounded-full bg-black text-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                  <BellOff className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-black dark:text-white">
                    {showArchive ? 'No Archived Announcements' : 'No Announcements Available Right Now'}
                  </p>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-400 mt-1">
                    {showArchive ? 'No archived notices in this batch.' : 'Click "New Announcement" above to publish your first announcement.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  className="pt-3 first:pt-0 space-y-2 group hover:bg-slate-50/60 dark:hover:bg-slate-800/40 p-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    {getPriorityBadge(ann.priority)}
                    <span className="text-[11px] text-slate-400">Pub: {ann.publishDate}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{ann.title}</h4>
                    <p className="text-xs text-[#475569] dark:text-slate-400 line-clamp-2 mt-0.5">{ann.description}</p>
                  </div>

                  <div className="flex items-center justify-end text-[11px] text-[#475569] dark:text-slate-400 pt-1 border-t border-[#E5EBF3] dark:border-slate-800">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingId(ann.id);
                      }}
                      className="text-rose-600 font-bold p-1 cursor-pointer"
                    >
                      Delete
                    </button>
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
                  <th className="px-5 py-3.5 text-right w-20">ACTIONS</th>
                </tr>
              </thead>
            {isLoading ? (
              <AnnouncementsTableSkeleton rows={4} />
            ) : (
              <tbody className="divide-y divide-[#E5EBF3] dark:divide-slate-800 text-xs">
                {filteredAnnouncements.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center">
                      <div className="space-y-2 max-w-md mx-auto">
                        <div className="w-11 h-11 mx-auto rounded-full bg-black text-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                          <BellOff className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-extrabold text-black dark:text-white">
                          {showArchive ? 'No Archived Announcements' : 'No Announcements Available Right Now'}
                        </p>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-400">
                          {showArchive ? 'No archived notices found.' : 'Click "+ New Announcement" above to publish a notice for your batch.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAnnouncements.map((ann) => (
                    <tr
                      key={ann.id}
                      className="bg-white dark:bg-[#0F172A] hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 transition-colors h-14 group"
                    >
                      <td className="px-5 py-3 font-bold text-[#0F172A] dark:text-white">
                        <div className="flex items-center gap-2.5">
                          {ann.featuredImageUrl && (
                            <img
                              src={ann.featuredImageUrl}
                              alt="thumb"
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 group-hover:opacity-90 transition-opacity"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{ann.title}</div>
                            <div className="text-[11px] font-normal text-[#64748B] dark:text-slate-400 line-clamp-1">
                              {ann.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">{getPriorityBadge(ann.priority)}</td>
                      <td className="px-5 py-3 text-[#475569] dark:text-slate-400 font-medium">{ann.publishDate}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(ann.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            )}
            </table>
          </div>
        </div>
      )}

      {/* Modal to Create Announcement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publish Announcement"
        maxWidth="2xl"
      >
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
          <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isExamRelated}
                  onChange={(e) => setIsExamRelated(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
                />
                <span className="font-bold text-xs text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Is this an Exam / Quiz Announcement?
                </span>
              </label>
              {isExamRelated && (
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Auto-WhatsApp Active
                </span>
              )}
            </div>

            {isExamRelated && (
              <div className="space-y-3 pt-2 border-t border-emerald-200/80 dark:border-emerald-900/60 animate-in fade-in duration-150">
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-950 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    100% Automated WhatsApp Dispatch:
                  </div>
                  <p>
                    All enrolled students in this course (including retake and improvement students) will automatically receive an official exam notice directly on their WhatsApp. Admin or CR does not need to send anything manually!
                  </p>
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

          {/* Feature Photo Section */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Feature Photo / Banner (Optional)</span>
              </label>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                Max 2 MB
              </span>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {featuredImageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-44 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <img
                  src={featuredImageUrl}
                  alt="Feature preview"
                  className="max-h-44 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFeaturedImageUrl('')}
                  className="absolute top-2 right-2 p-1 bg-black/70 hover:bg-black text-white rounded-full transition-colors cursor-pointer"
                  title="Remove Feature Photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full py-2.5 px-3 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-white dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                >
                  <FileUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Choose Feature Photo from Device</span>
                </button>
                <input
                  type="url"
                  placeholder="Or enter feature photo URL: https://..."
                  value={featuredImageUrl}
                  onChange={e => setFeaturedImageUrl(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Event Date (Optional)
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Shows calendar date tile on card</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">
                Expiration Date (Auto-Archiving) *
              </label>
              <input
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Auto-moves notice to archive after this date</p>
            </div>
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
                type="submit"
                className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs cursor-pointer"
              >
                Publish Announcement
              </button>
            </div>
          </div>
        </form>
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
