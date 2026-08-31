import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, RefreshCw } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { adminApiClient } from '../../services/adminApiClient';
import type { DepartmentNotice } from '../../types';

export const AdminNoticesPage: React.FC = () => {
  const { addToast } = useNotifications();

  const [notices, setNotices] = useState<DepartmentNotice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    category: 'ACADEMIC' as any,
    content: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiClient.getNotices();
      setNotices(data);
    } catch (e: any) {
      console.error(e);
      addToast('error', e.message || 'Failed to load department notices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      addToast('error', 'Notice title and content are required');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApiClient.createNotice(form);
      addToast('success', 'Official Department Notice published to Supabase!');
      setIsAddModalOpen(false);
      setForm({ title: '', category: 'ACADEMIC', content: '' });
      fetchNotices();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to publish notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id: string) => {
    if (!window.confirm('Delete this official department notice?')) return;
    try {
      await adminApiClient.deleteNotice(id);
      addToast('success', 'Department Notice deleted from Supabase.');
      fetchNotices();
    } catch (e: any) {
      addToast('error', e.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Official Department Circulars & Notices</h1>
          <p className="text-xs text-slate-500 mt-1">
            Publish department-wide notices visible to all students and faculty across all batches with direct Supabase persistence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchNotices()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh notices"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Publish Department Notice
          </button>
        </div>
      </div>

      {/* Notices List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading notices...</div>
        ) : notices.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-[#E2E8F0]">
            No department notices active.
          </div>
        ) : (
          notices.map(n => (
            <div
              key={n.id}
              className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                    {n.category}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{n.publishDate}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.content}</p>
              </div>

              <button
                onClick={() => handleDeleteNotice(n.id)}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                title="Delete Notice"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Publish Official Department Notice</h3>

            <form onSubmit={handleCreateNotice} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value as any })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="EXAM">Exam Circular</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="SCHOLARSHIP">Scholarship</option>
                  <option value="EVENT">Event</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination Guidelines"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Content / Circular Text *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Official notice body text..."
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
