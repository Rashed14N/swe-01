import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Edit3, Clock, Search, Bell, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Exam } from '../../types';
import { ALL_ROOMS } from '../../constants/rooms';

export const CRExamsPage: React.FC = () => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [exams, setExams] = useState<(Exam & { daysLeft: number })[]>([]);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    courseTitle: 'Database Systems',
    courseCode: 'SWE 305',
    type: 'MIDTERM' as any,
    title: '',
    date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    startTime: '10:00 AM',
    room: 'Room 502',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExams = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/exams?batchId=${user?.batchId || 'batch-9'}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [token, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        addToast('success', 'Exam scheduled & notification sent to batch!');
        setIsModalOpen(false);
        fetchExams();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to schedule exam');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Cancel this exam? Batch students will be notified.')) return;
    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('success', 'Exam cancelled & batch notified.');
        fetchExams();
      } else {
        addToast('error', 'Cancellation failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  const upcomingExams = exams.filter(e => e.daysLeft >= 0);
  const pastExams = exams.filter(e => e.daysLeft < 0);

  const currentList = activeTab === 'UPCOMING' ? upcomingExams : pastExams;

  const filtered = currentList.filter(
    e =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" /> Class Representative Tool
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Manage Upcoming Assessments</h1>
          <p className="text-xs text-slate-500 mt-1">
            Set exam dates, quizzes, viva, and assignment deadlines for <strong className="text-slate-800">{user?.batchName}</strong>. Automatic notification is sent on change.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Schedule Assessment
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'UPCOMING'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Upcoming Exams ({upcomingExams.length})
          </button>
          <button
            onClick={() => setActiveTab('PAST')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'PAST'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Past Exam History ({pastExams.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search exams..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Exam List Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading exam schedule...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-[#E2E8F0]">
          No {activeTab.toLowerCase()} exams found.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(exam => (
            <div
              key={exam.id}
              className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold font-mono rounded">
                    {exam.courseCode}
                  </span>
                  <span
                    className={`px-2.5 py-1 text-xs font-bold rounded-md ${
                      exam.daysLeft === 0
                        ? 'bg-rose-100 text-rose-700'
                        : exam.daysLeft > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {exam.daysLeft === 0
                      ? 'Today!'
                      : exam.daysLeft > 0
                      ? `${exam.daysLeft} days left`
                      : 'Completed'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{exam.title}</h3>
                <p className="text-xs text-slate-600 mt-0.5">{exam.courseTitle}</p>

                <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Date & Time</span>
                    <span className="font-semibold text-slate-800">{exam.date} • {exam.startTime || 'TBA'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase font-bold">Room / Venue</span>
                    <span className="font-semibold text-slate-800">{exam.room || 'Room TBA'}</span>
                  </div>
                </div>

                {exam.description && (
                  <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                    {exam.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleDelete(exam.id)}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Cancel Exam
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Schedule Upcoming Assessment</h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={form.courseCode}
                    onChange={e => setForm({ ...form, courseCode: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    value={form.courseTitle}
                    onChange={e => setForm({ ...form, courseTitle: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assessment Type *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as any })}
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
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={form.startTime}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    placeholder="10:00 AM"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room</label>
                  <input
                    type="text"
                    list="cr-exam-rooms-list"
                    value={form.room}
                    onChange={e => setForm({ ...form, room: e.target.value })}
                    placeholder="e.g. Room 502, XL 1, Exten-2"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                  <datalist id="cr-exam-rooms-list">
                    {ALL_ROOMS.map(r => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Syllabus / Special Notes</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
};
