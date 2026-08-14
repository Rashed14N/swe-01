import React, { useState, useEffect } from 'react';
import { Clock, Plus, MapPin, Calendar, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';
import { Exam, ExamType } from '../types';

export const ExamsPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();

  const [exams, setExams] = useState<(Exam & { daysLeft: number })[]>([]);
  const [includePast, setIncludePast] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    fetch(`/api/exams?batchId=${user?.batchId || 'batch-9'}&includePast=${includePast}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setExams(data.exams || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchExams();
  }, [token, user, includePast]);

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
        const err = await res.json();
        addToast('error', err.error || 'Operation failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
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

  const filteredExams = exams.filter((ex) => {
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !typeFilter || ex.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upcoming Exams & Assessment Schedule"
        description="Chronological examination schedule for your batch semester. Check dates, room venues, and deadlines."
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
      >
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pl-2 border-l border-slate-200">
          <input
            type="checkbox"
            checked={includePast}
            onChange={(e) => setIncludePast(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          Include Past Exams
        </label>
      </FilterBar>

      {/* Structured Exam View (Mobile Cards + Desktop Table) */}
      <div className="bg-white rounded-xl border border-[#CBD8E8] shadow-md overflow-hidden">
        {/* Mobile Card View (block md:hidden) */}
        <div className="block md:hidden divide-y divide-[#E0E8F2] p-3 space-y-3">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs">Loading exam schedule...</div>
          ) : filteredExams.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No scheduled assessments found.</div>
          ) : (
            filteredExams.map((exam) => {
              const dateObj = new Date(exam.date);
              const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
              const dayNum = dateObj.getDate();

              return (
                <div key={exam.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 text-white rounded-md">
                      <span className="text-[10px] font-extrabold text-amber-300 uppercase">{monthStr}</span>
                      <span className="text-xs font-black">{dayNum}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 text-[10px] font-extrabold rounded ${
                        exam.daysLeft < 0
                          ? 'bg-slate-100 text-slate-500'
                          : exam.daysLeft <= 3
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {exam.daysLeft < 0 ? 'Past' : exam.daysLeft === 0 ? 'Today!' : `${exam.daysLeft}d left`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-extrabold rounded border border-blue-200">
                      {exam.courseCode}
                    </span>
                    <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded border border-rose-200 uppercase">
                      {exam.type}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{exam.title}</h4>
                    <p className="text-[11px] text-slate-500">{exam.courseTitle}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
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
                        className="p-1 text-slate-500 hover:text-blue-600 p-1"
                        title="Edit exam"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(exam.id)}
                        className="p-1 text-slate-500 hover:text-rose-600 p-1"
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
              <tr className="bg-[#F1F5FA] border-b border-[#CBD8E8] text-[11px] font-extrabold text-[#3B4C63] uppercase tracking-wider">
                <th className="px-5 py-3.5 w-32">DATE</th>
                <th className="px-5 py-3.5">COURSE</th>
                <th className="px-5 py-3.5 w-28">TYPE</th>
                <th className="px-5 py-3.5">TITLE</th>
                <th className="px-5 py-3.5 w-32">ROOM & TIME</th>
                <th className="px-5 py-3.5 w-32">DAYS LEFT</th>
                {canManage && <th className="px-5 py-3.5 text-right w-24">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E8F2] text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-5 py-10 text-center text-slate-400">
                    Loading exam schedule...
                  </td>
                </tr>
              ) : filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="px-5 py-12 text-center text-slate-400">
                    No scheduled assessments found.
                  </td>
                </tr>
              ) : (
                filteredExams.map((exam) => {
                  const dateObj = new Date(exam.date);
                  const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                  const dayNum = dateObj.getDate();

                  return (
                    <tr key={exam.id} className="hover:bg-[#F8FBFF] transition-colors h-16">
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
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-extrabold rounded border border-blue-200">
                            {exam.courseCode}
                          </span>
                          <span className="truncate">{exam.courseTitle}</span>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded border border-rose-200 uppercase">
                          {exam.type}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-5 py-3 font-bold text-slate-900">
                        {exam.title}
                        {exam.description && (
                          <span className="block text-[11px] text-slate-500 font-normal truncate max-w-xs">
                            {exam.description}
                          </span>
                        )}
                      </td>

                      {/* Room & Time */}
                      <td className="px-5 py-3 text-slate-700">
                        <div className="flex flex-col text-[11px] font-medium">
                          <span className="flex items-center gap-1 font-bold text-slate-900">
                            <MapPin className="w-3 h-3 text-slate-400" /> {exam.room || 'TBD'}
                          </span>
                          <span className="text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> {exam.startTime || '10:00 AM'}
                          </span>
                        </div>
                      </td>

                      {/* Days Left */}
                      <td className="px-5 py-3">
                        <span
                          className={`px-2.5 py-1 text-[11px] font-extrabold rounded-md inline-block ${
                            exam.daysLeft < 0
                              ? 'bg-slate-100 text-slate-500'
                              : exam.daysLeft <= 3
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : exam.daysLeft <= 7
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {exam.daysLeft < 0
                            ? 'Past'
                            : exam.daysLeft === 0
                            ? 'Today!'
                            : `${exam.daysLeft} days left`}
                        </span>
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

          <div className="grid grid-cols-3 gap-3">
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
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Exam Hall 3"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs"
              />
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
