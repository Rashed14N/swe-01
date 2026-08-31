import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, Megaphone, BookOpen, Users, UserCheck,
  Plus, Trash2, Edit2, ShieldAlert, Sparkles, CheckCircle2,
  AlertCircle, ChevronRight, MapPin, User, ArrowUpRight,
  Filter, Search, Layers, RefreshCw, CalendarDays
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Batch, User as UserType, Course, RoutineSlot, Exam, BatchAnnouncement } from '../../types';

interface BatchDashboardViewerProps {
  batches: Batch[];
  initialBatchId?: string;
  onRefreshAll?: () => void;
}

export const BatchDashboardViewer: React.FC<BatchDashboardViewerProps> = ({
  batches,
  initialBatchId,
  onRefreshAll,
}) => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    initialBatchId || (batches[0]?.id || 'batch-9')
  );
  const [selectedDay, setSelectedDay] = useState<string>('TODAY');
  const [activeSubTab, setActiveSubTab] = useState<'routine' | 'exams' | 'announcements' | 'courses' | 'students'>('routine');

  const [batchData, setBatchData] = useState<{
    batch: Batch;
    students: UserType[];
    crs: UserType[];
    courses: Course[];
    routines: RoutineSlot[];
    exams: Exam[];
    announcements: BatchAnnouncement[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  // Quick Action Modals
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Forms
  const [routineForm, setRoutineForm] = useState({
    day: 'SUNDAY',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    courseCode: 'SWE 305',
    courseTitle: 'Software Architecture & Design Patterns',
    teacherName: 'Dr. Mahbubur Rahman',
    room: 'Room 402',
  });

  const [examForm, setExamForm] = useState({
    courseCode: 'SWE 305',
    courseTitle: 'Software Architecture & Design Patterns',
    type: 'MIDTERM',
    title: 'Midterm Examination',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    room: 'Room 401',
    description: '',
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    description: '',
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'NORMAL' as 'NORMAL' | 'URGENT',
  });

  // Deletion targets
  const [deletingItem, setDeletingItem] = useState<{ type: 'routine' | 'exam' | 'announcement'; id: string } | null>(null);

  const fetchSelectedBatchData = async (batchId: string) => {
    if (!token || !batchId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBatchData(data);
      } else {
        addToast('error', 'Failed to load batch data');
      }
    } catch (e) {
      console.error(e);
      addToast('error', 'Network error fetching batch details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchSelectedBatchData(selectedBatchId);
    }
  }, [selectedBatchId, token]);

  const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'] as const;
  const currentDayName = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date().getDay()];

  const getFilteredRoutines = () => {
    if (!batchData?.routines) return [];
    if (selectedDay === 'TODAY') {
      return batchData.routines.filter(r => r.day === currentDayName);
    }
    if (selectedDay === 'ALL') {
      return batchData.routines;
    }
    return batchData.routines.filter(r => r.day === selectedDay);
  };

  // 1. Routine Slot creation
  const handleCreateRoutineSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchId: selectedBatchId,
          day: routineForm.day,
          startTime: routineForm.startTime,
          endTime: routineForm.endTime,
          courseCode: routineForm.courseCode,
          courseTitle: routineForm.courseTitle,
          teacherName: routineForm.teacherName,
          room: routineForm.room,
        }),
      });

      if (res.ok) {
        addToast('success', 'Class Routine Slot Added!');
        setIsRoutineModalOpen(false);
        fetchSelectedBatchData(selectedBatchId);
        if (onRefreshAll) onRefreshAll();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to add routine slot');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  // 2. Exam Creation
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchId: selectedBatchId,
          courseCode: examForm.courseCode,
          courseTitle: examForm.courseTitle,
          type: examForm.type,
          title: examForm.title,
          date: examForm.date,
          startTime: examForm.startTime,
          room: examForm.room,
          description: examForm.description,
        }),
      });

      if (res.ok) {
        addToast('success', 'Exam Scheduled for Batch!');
        setIsExamModalOpen(false);
        fetchSelectedBatchData(selectedBatchId);
        if (onRefreshAll) onRefreshAll();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to schedule exam');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  // 3. Announcement Creation
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchId: selectedBatchId,
          title: announcementForm.title,
          description: announcementForm.description,
          publishDate: announcementForm.publishDate,
          expiryDate: announcementForm.expiryDate,
          priority: announcementForm.priority,
        }),
      });

      if (res.ok) {
        addToast('success', 'Batch Announcement Published!');
        setIsAnnouncementModalOpen(false);
        setAnnouncementForm(prev => ({ ...prev, title: '', description: '' }));
        fetchSelectedBatchData(selectedBatchId);
        if (onRefreshAll) onRefreshAll();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to publish announcement');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  // 4. Deletion Handlers
  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      let url = '';
      if (deletingItem.type === 'routine') url = `/api/routines/${deletingItem.id}`;
      if (deletingItem.type === 'exam') url = `/api/exams/${deletingItem.id}`;
      if (deletingItem.type === 'announcement') url = `/api/announcements/${deletingItem.id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        addToast('success', 'Item removed successfully');
        setDeletingItem(null);
        fetchSelectedBatchData(selectedBatchId);
        if (onRefreshAll) onRefreshAll();
      } else {
        addToast('error', 'Failed to remove item');
      }
    } catch (e) {
      addToast('error', 'Delete error');
    }
  };

  // Toggle CR role
  const handleToggleCR = async (user: UserType) => {
    const newRole = user.role === 'CR' ? 'STUDENT' : 'CR';
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        addToast('success', `${user.name} is now a ${newRole}`);
        fetchSelectedBatchData(selectedBatchId);
        if (onRefreshAll) onRefreshAll();
      }
    } catch (e) {
      addToast('error', 'Role update failed');
    }
  };

  const selectedBatch = batches.find(b => b.id === selectedBatchId) || batchData?.batch;

  return (
    <div className="space-y-6">
      {/* Top Batch Selection Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Layers className="w-5 h-5" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Batch Live Dashboard Inspector
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Select any student batch to inspect their real-time routine schedule, exams, circulars, and enrolled courses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchSelectedBatchData(selectedBatchId)}
              disabled={isLoading}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
              title="Refresh batch data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative">
              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs rounded-xl px-3.5 py-2.5 pr-8 focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Sem {b.currentSemester} • {b.academicSession || 'Session'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Batch Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-4 mt-4 border-t border-slate-100">
          {batches.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBatchId(b.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedBatchId === b.id
                  ? 'bg-blue-600 text-white shadow-xs scale-[1.02]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{b.name}</span>
              <span className={`px-1.5 py-0.2 text-[10px] rounded font-mono ${
                selectedBatchId === b.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                Sem {b.currentSemester}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Batch Summary Banner */}
      {selectedBatch && (
        <div className="bg-linear-to-r from-[#0F284E] to-[#1E3A8A] text-white p-6 rounded-2xl shadow-xs border border-blue-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[11px] font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                Active Batch Portal Preview: {selectedBatch.name}
              </div>
              <h1 className="text-xl font-black tracking-tight">{selectedBatch.name} Dashboard</h1>
              <p className="text-xs text-blue-100/80 mt-1">
                Academic Session: <span className="font-bold text-white">{selectedBatch.academicSession || '2023-2024'}</span> • Current Level:{' '}
                <span className="font-bold text-white">Semester {selectedBatch.currentSemester}</span> • Mode:{' '}
                <span className="font-bold text-white">{selectedBatch.semesterMode || 'SEQUENCE'}</span>
              </p>
            </div>

            {/* Quick Action Buttons for this batch */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsRoutineModalOpen(true)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Class Slot
              </button>
              <button
                onClick={() => setIsExamModalOpen(true)}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Exam / Test
              </button>
              <button
                onClick={() => setIsAnnouncementModalOpen(true)}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Megaphone className="w-3.5 h-3.5" /> Notice
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/10 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Enrolled Students</span>
              <span className="text-lg font-black text-white block mt-0.5">{batchData?.students?.length || 0}</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Class Representatives</span>
              <span className="text-lg font-black text-amber-300 block mt-0.5">{batchData?.crs?.length || 0} CRs</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Today's Classes</span>
              <span className="text-lg font-black text-white block mt-0.5">
                {batchData?.routines?.filter(r => r.day === currentDayName).length || 0}
              </span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Upcoming Exams</span>
              <span className="text-lg font-black text-emerald-300 block mt-0.5">{batchData?.exams?.length || 0}</span>
            </div>
            <div className="bg-white/10 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Active Notices</span>
              <span className="text-lg font-black text-rose-300 block mt-0.5">{batchData?.announcements?.length || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
        {[
          { id: 'routine', label: `Routine Schedule (${batchData?.routines?.length || 0})`, icon: Calendar },
          { id: 'exams', label: `Exams & Tests (${batchData?.exams?.length || 0})`, icon: Clock },
          { id: 'announcements', label: `Batch Notices (${batchData?.announcements?.length || 0})`, icon: Megaphone },
          { id: 'courses', label: `Semester Courses (${batchData?.courses?.length || 0})`, icon: BookOpen },
          { id: 'students', label: `Student Roster (${batchData?.students?.length || 0})`, icon: Users },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap text-xs flex items-center gap-2 ${
                activeSubTab === tab.id
                  ? 'bg-white text-blue-600 border-t-2 border-t-blue-600 border-x border-slate-200 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub Tab: ROUTINE */}
      {activeSubTab === 'routine' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            {/* Day Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {['TODAY', 'ALL', ...daysOfWeek].map(d => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedDay === d
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d === 'TODAY' ? `Today (${currentDayName.slice(0, 3)})` : d}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsRoutineModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Class Slot
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {getFilteredRoutines().length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No routine class slots found for {selectedDay}. Click "+ Add Class Slot" to add classes for this batch.
              </div>
            ) : (
              getFilteredRoutines().map(slot => (
                <div
                  key={slot.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all relative group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded">
                      {slot.courseCode}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                        {slot.day}
                      </span>
                      <button
                        onClick={() => setDeletingItem({ type: 'routine', id: slot.id })}
                        className="text-slate-300 hover:text-rose-600 p-1 transition-colors"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{slot.courseTitle}</h4>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{slot.startTime} - {slot.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{slot.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{slot.room}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub Tab: EXAMS */}
      {activeSubTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Scheduled Exams & Tests</h3>
              <p className="text-[11px] text-slate-500">Live upcoming exams visible on student calendars</p>
            </div>
            <button
              onClick={() => setIsExamModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Schedule Exam
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {(!batchData?.exams || batchData.exams.length === 0) ? (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No exams scheduled for this batch yet.
              </div>
            ) : (
              batchData.exams.map(exam => (
                <div
                  key={exam.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                      {exam.type}
                    </span>
                    <button
                      onClick={() => setDeletingItem({ type: 'exam', id: exam.id })}
                      className="text-slate-300 hover:text-rose-600 p-1"
                      title="Delete exam"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900">{exam.title}</h4>
                  <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{exam.courseCode}: {exam.courseTitle}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-800">{exam.date} {exam.startTime && `(${exam.startTime})`}</span>
                    </div>
                    {exam.room && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{exam.room}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub Tab: ANNOUNCEMENTS */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Batch-Specific Notices</h3>
              <p className="text-[11px] text-slate-500">Targeted circulars pushed directly to this batch</p>
            </div>
            <button
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Publish Batch Notice
            </button>
          </div>

          <div className="space-y-3">
            {(!batchData?.announcements || batchData.announcements.length === 0) ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No active announcements published for this batch.
              </div>
            ) : (
              batchData.announcements.map(ann => (
                <div
                  key={ann.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        ann.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ann.priority}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{ann.title}</h4>
                      <span className="text-[10px] text-slate-400">Expires: {ann.expiryDate}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{ann.description}</p>
                  </div>

                  <button
                    onClick={() => setDeletingItem({ type: 'announcement', id: ann.id })}
                    className="text-slate-300 hover:text-rose-600 p-1"
                    title="Delete notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub Tab: COURSES */}
      {activeSubTab === 'courses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
            <span>Enrolled Semester Courses for {selectedBatch?.name}</span>
            <span className="text-slate-500">Total: {batchData?.courses?.length || 0} Courses</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(!batchData?.courses || batchData.courses.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No courses assigned to this batch.
              </div>
            ) : (
              batchData.courses.map(c => (
                <div key={c.id} className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded">
                        {c.code}
                      </span>
                      <span className="font-bold text-slate-900">{c.title}</span>
                      <span className="px-2 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded">
                        {c.type}
                      </span>
                    </div>
                    <span className="text-slate-500 block mt-1">
                      Faculty: {c.assignedFacultyName || 'Department Faculty'} • {c.credits} Credits • Semester {c.semester}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Sub Tab: STUDENTS */}
      {activeSubTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
            <span>Student Roster ({selectedBatch?.name})</span>
            <span className="text-slate-500">{batchData?.students?.length || 0} Enrolled</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(!batchData?.students || batchData.students.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No students enrolled in this batch yet.
              </div>
            ) : (
              batchData.students.map(st => (
                <div key={st.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                      {st.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{st.name}</span>
                        <span className="text-slate-400 font-mono">({st.studentId})</span>
                        <span className={`px-2 py-0.2 text-[10px] font-bold rounded ${
                          st.role === 'CR' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {st.role}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px] block">{st.email || 'No email'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleCR(st)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                      st.role === 'CR'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {st.role === 'CR' ? 'Demote from CR' : 'Promote to CR'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Routine Slot Modal */}
      <Modal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        title={`Add Routine Slot for ${selectedBatch?.name}`}
      >
        <form onSubmit={handleCreateRoutineSlot} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Day of Week</label>
              <select
                value={routineForm.day}
                onChange={e => setRoutineForm(prev => ({ ...prev, day: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                {daysOfWeek.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Room</label>
              <input
                type="text"
                required
                value={routineForm.room}
                onChange={e => setRoutineForm(prev => ({ ...prev, room: e.target.value }))}
                placeholder="e.g. Room 402 / Lab 501"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Start Time</label>
              <input
                type="text"
                required
                value={routineForm.startTime}
                onChange={e => setRoutineForm(prev => ({ ...prev, startTime: e.target.value }))}
                placeholder="10:00 AM"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">End Time</label>
              <input
                type="text"
                required
                value={routineForm.endTime}
                onChange={e => setRoutineForm(prev => ({ ...prev, endTime: e.target.value }))}
                placeholder="11:30 AM"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Course Code & Title</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={routineForm.courseCode}
                onChange={e => setRoutineForm(prev => ({ ...prev, courseCode: e.target.value }))}
                placeholder="SWE 305"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
              <input
                type="text"
                required
                value={routineForm.courseTitle}
                onChange={e => setRoutineForm(prev => ({ ...prev, courseTitle: e.target.value }))}
                placeholder="Course Title"
                className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Teacher / Instructor Name</label>
            <input
              type="text"
              required
              value={routineForm.teacherName}
              onChange={e => setRoutineForm(prev => ({ ...prev, teacherName: e.target.value }))}
              placeholder="e.g. Dr. Mahbubur Rahman"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRoutineModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
            >
              Save Class Slot
            </button>
          </div>
        </form>
      </Modal>

      {/* Exam Modal */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title={`Schedule Exam for ${selectedBatch?.name}`}
      >
        <form onSubmit={handleCreateExam} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Exam Type</label>
              <select
                value={examForm.type}
                onChange={e => setExamForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                <option value="MIDTERM">Midterm</option>
                <option value="FINAL">Semester Final</option>
                <option value="QUIZ">Class Quiz</option>
                <option value="CLASS_TEST">Class Test</option>
                <option value="LAB_EXAM">Lab Exam</option>
                <option value="ASSIGNMENT">Assignment</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Exam Title</label>
              <input
                type="text"
                required
                value={examForm.title}
                onChange={e => setExamForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Midterm Exam"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Date</label>
              <input
                type="date"
                required
                value={examForm.date}
                onChange={e => setExamForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Start Time</label>
              <input
                type="text"
                value={examForm.startTime}
                onChange={e => setExamForm(prev => ({ ...prev, startTime: e.target.value }))}
                placeholder="10:00 AM"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Course Code</label>
              <input
                type="text"
                required
                value={examForm.courseCode}
                onChange={e => setExamForm(prev => ({ ...prev, courseCode: e.target.value }))}
                placeholder="SWE 305"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Course Title</label>
              <input
                type="text"
                required
                value={examForm.courseTitle}
                onChange={e => setExamForm(prev => ({ ...prev, courseTitle: e.target.value }))}
                placeholder="Software Architecture"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExamModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
            >
              Save Exam Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* Announcement Modal */}
      <Modal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        title={`Publish Notice for ${selectedBatch?.name}`}
      >
        <form onSubmit={handleCreateAnnouncement} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Notice Title</label>
            <input
              type="text"
              required
              value={announcementForm.title}
              onChange={e => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Makeup Class Schedule for SWE 305"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Description</label>
            <textarea
              required
              rows={3}
              value={announcementForm.description}
              onChange={e => setAnnouncementForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter announcement details..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Priority</label>
              <select
                value={announcementForm.priority}
                onChange={e => setAnnouncementForm(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                <option value="NORMAL">Normal</option>
                <option value="URGENT">Urgent / High</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Expiry Date</label>
              <input
                type="date"
                required
                value={announcementForm.expiryDate}
                onChange={e => setAnnouncementForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAnnouncementModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
            >
              Publish Notice
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Removal"
        message="Are you sure you want to delete this item? It will be removed from the batch portal."
      />
    </div>
  );
};
