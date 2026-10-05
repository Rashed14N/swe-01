import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, Edit3, Eye, Archive, Clock, Search, AlertCircle, CheckCircle, Calendar, Mail, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { BatchAnnouncement, Course } from '../../types';
import { EmailAnnouncementPreview } from '../../components/announcements/EmailAnnouncementPreview';

export const CRAnnouncementsPage: React.FC = () => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [announcements, setAnnouncements] = useState<BatchAnnouncement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [editingAnn, setEditingAnn] = useState<BatchAnnouncement | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL' as 'NORMAL' | 'IMPORTANT' | 'URGENT',
    publishDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  });

  // Exam Announcement Specific State
  const [isExamRelated, setIsExamRelated] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [examType, setExamType] = useState('Midterm');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('10:00 AM');
  const [room, setRoom] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/courses?all=true')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.courses)) {
          setCourses(data.courses);
        }
      })
      .catch(() => {});
  }, []);

  const fetchAnnouncements = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const showArchive = activeTab === 'ARCHIVE';
      const res = await fetch(`/api/announcements?batchId=${user?.batchId || 'batch-9'}&archive=${showArchive}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [token, user, activeTab]);

  const handleOpenCreateModal = () => {
    setEditingAnn(null);
    setForm({
      title: '',
      description: '',
      priority: 'NORMAL',
      publishDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    });
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

  const handleCourseSelect = (cId: string) => {
    setSelectedCourseId(cId);
    const found = courses.find(c => c.id === cId);
    if (found) {
      setCourseCode(found.code);
      setCourseTitle(found.title);
      if (!form.title) {
        setForm(prev => ({ ...prev, title: `${found.code} ${examType} Announcement` }));
      }
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isExamRelated && (!courseTitle || !examDate)) {
      addToast('error', 'Please provide Course Title and Exam Date for the exam announcement');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          batchId: user?.batchId || 'batch-9',
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
        const data = await res.json();
        if (data?.emailsDispatched && data.emailsDispatched > 0) {
          addToast('success', `Exam announcement saved! Email notifications dispatched to ${data.emailsDispatched} enrolled students via Resend.`);
        } else {
          addToast('success', 'Announcement saved successfully!');
        }
        setIsModalOpen(false);
        fetchAnnouncements();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to save announcement');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('success', 'Announcement deleted.');
        fetchAnnouncements();
      } else {
        addToast('error', 'Deletion failed.');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = announcements.filter(
    a =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Megaphone className="w-4 h-4" /> Class Representative Tool
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Manage Batch Announcements</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, edit, and archive announcements for <strong className="text-slate-800">{user?.batchName}</strong>. Expired notices move automatically to the archive.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Create Announcement
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active Announcements
          </button>
          <button
            onClick={() => setActiveTab('ARCHIVE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'ARCHIVE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Expired / Archive
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white rounded-xl border border-[#CBD8E8] shadow-md overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading announcements...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No {activeTab.toLowerCase()} announcements found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F1F5FA] border-b border-[#CBD8E8] text-[#3B4C63] font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E8F2] font-medium">
                {filtered.map(ann => {
                  const isExpired = ann.expiryDate < todayStr;
                  return (
                    <tr key={ann.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 max-w-xs">
                        <span className="font-bold text-slate-900 block truncate">{ann.title}</span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{ann.description}</span>
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ann.publishDate}</td>
                      <td className="px-4 py-3 text-slate-600">{ann.expiryDate}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            isExpired ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isExpired ? 'Expired' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`bg-white w-full rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4 max-h-[92vh] overflow-y-auto ${
            modalTab === 'PREVIEW' ? 'max-w-4xl' : 'max-w-xl'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingAnn ? 'Edit Announcement' : 'Create Batch Announcement'}
              </h3>

              {/* Tab Switcher: Compose vs Visual Email Preview */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalTab('EDIT')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalTab === 'EDIT'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📝 Compose
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('PREVIEW')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    modalTab === 'PREVIEW'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>Email Preview</span>
                  {isExamRelated && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  )}
                </button>
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
                  title={form.title}
                  description={form.description}
                  batchName={user?.batchName || 'SWE 9th Batch'}
                  publisherName={`${user?.name} (Class Representative)`}
                  onSend={handleSave}
                  isSending={isSubmitting}
                />
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setModalTab('EDIT')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-slate-900 font-bold text-xs cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Editing
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3 text-xs">
              {/* EXAM ANNOUNCEMENT SECTION */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isExamRelated}
                      onChange={(e) => setIsExamRelated(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
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
                  <div className="space-y-3 pt-2 border-t border-blue-200 animate-in fade-in duration-150">
                    <div className="p-2 bg-white rounded-lg border border-blue-200 text-[11px] text-slate-600">
                      ⚡ <strong>Automated Resend Email:</strong> All students currently enrolled in this course (including batch students & retake students) will receive an official exam notification in their email with <strong>Course Title, Exam Type, and Exam Date</strong>!
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                          Select Course *
                        </label>
                        <select
                          value={selectedCourseId}
                          onChange={(e) => handleCourseSelect(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
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
                        <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                          Exam Type *
                        </label>
                        <select
                          value={examType}
                          onChange={(e) => {
                            setExamType(e.target.value);
                            if (courseCode && (!form.title || form.title.includes('Announcement'))) {
                              setForm(prev => ({ ...prev, title: `${courseCode} ${e.target.value} Announcement` }));
                            }
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
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
                        <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                          Exam Date *
                        </label>
                        <input
                          type="date"
                          required={isExamRelated}
                          value={examDate}
                          onChange={(e) => setExamDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                          Exam Time
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 10:00 AM"
                          value={examTime}
                          onChange={(e) => setExamTime(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                          Room / Venue
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Room 502 / E-2"
                          value={room}
                          onChange={(e) => setRoom(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    {!selectedCourseId && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Custom Course Code</label>
                          <input
                            type="text"
                            placeholder="e.g. SWE 305"
                            value={courseCode}
                            onChange={(e) => setCourseCode(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Custom Course Title</label>
                          <input
                            type="text"
                            placeholder="e.g. Database Systems"
                            value={courseTitle}
                            onChange={(e) => setCourseTitle(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class Schedule Adjustment"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detailed announcement notes..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority *</label>
                  <select
                    value={form.priority}
                    onChange={e => setForm({ ...form, priority: e.target.value as any })}
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
                    value={form.expiryDate}
                    onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalTab('PREVIEW')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview Email
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                  </button>
                </div>
              </div>
            </form>
          )}
          </div>
        </div>
      )}
    </div>
  );
};
