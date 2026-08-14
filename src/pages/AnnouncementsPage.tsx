import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Archive, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { BatchAnnouncement, AnnouncementPriority } from '../types';

export const AnnouncementsPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();

  const [announcements, setAnnouncements] = useState<BatchAnnouncement[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [counts, setCounts] = useState({ activeCount: 0, archivedCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('NORMAL');

  const fetchAnnouncements = () => {
    if (!token) return;
    setIsLoading(true);
    fetch(`/api/announcements?batchId=${user?.batchId || 'batch-9'}&archive=${showArchive}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setAnnouncements(data.announcements || []);
        setCounts({
          activeCount: data.activeCount || 0,
          archivedCount: data.archivedCount || 0,
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [token, user, showArchive]);

  const canManage = user?.role === 'CR' || user?.role === 'ADMIN';

  const handleOpenCreate = () => {
    setTitle('');
    setDescription('');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setExpiryDate(nextWeek.toISOString().split('T')[0]);
    setPriority('NORMAL');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !expiryDate) {
      addToast('error', 'Please fill in all required fields');
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
          batchId: user?.batchId || 'batch-9',
          title,
          description,
          expiryDate,
          priority,
        }),
      });

      if (res.ok) {
        addToast('success', 'Batch Announcement Published!');
        setIsModalOpen(false);
        fetchAnnouncements();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to publish');
      }
    } catch (e) {
      addToast('error', 'Server error');
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
        <div className="flex bg-[#F8FAFC] p-1 rounded-lg border border-[#E2E8F0]">
          <button
            onClick={() => setShowArchive(false)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              !showArchive ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
            }`}
          >
            Active ({counts.activeCount})
          </button>
          <button
            onClick={() => setShowArchive(true)}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
              showArchive ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
            }`}
          >
            <Archive className="w-3.5 h-3.5" /> Archive ({counts.archivedCount})
          </button>
        </div>
      </PageHeader>

      {/* STUDENT VIEW: Clean Vertical Feed */}
      {!canManage ? (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-4 md:p-6 divide-y divide-[#EDF2F7]">
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
                    <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">
                    Published: {ann.publishDate}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {ann.description}
                </p>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                  <span>By: <strong className="text-slate-700">{ann.createdByName}</strong></span>
                  <span>Expires: {ann.expiryDate}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ADMIN/CR VIEW: Data Table & Mobile Cards */
        <div className="bg-white rounded-xl border border-[#CBD8E8] shadow-md overflow-hidden">
          {/* Mobile Card List (block md:hidden) */}
          <div className="block md:hidden divide-y divide-[#E0E8F2] p-3 space-y-3">
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
                    <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{ann.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
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
                <tr className="bg-[#F1F5FA] border-b border-[#CBD8E8] text-[11px] font-extrabold text-[#3B4C63] uppercase tracking-wider">
                  <th className="px-5 py-3.5">TITLE</th>
                  <th className="px-5 py-3.5 w-28">PRIORITY</th>
                  <th className="px-5 py-3.5 w-32">PUBLISHED</th>
                  <th className="px-5 py-3.5 w-32">EXPIRES</th>
                  <th className="px-5 py-3.5">CREATED BY</th>
                  <th className="px-5 py-3.5 text-right w-20">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E8F2] text-xs">
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
                    <tr key={ann.id} className="hover:bg-[#F8FBFF] transition-colors h-14">
                      <td className="px-5 py-3 font-bold text-slate-900">
                        <div>{ann.title}</div>
                        <div className="text-[11px] font-normal text-slate-500 line-clamp-1">
                          {ann.description}
                        </div>
                      </td>
                      <td className="px-5 py-3">{getPriorityBadge(ann.priority)}</td>
                      <td className="px-5 py-3 text-slate-600 font-medium">{ann.publishDate}</td>
                      <td className="px-5 py-3 text-slate-600 font-medium">{ann.expiryDate}</td>
                      <td className="px-5 py-3 font-semibold text-slate-800">{ann.createdByName}</td>
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
        title="Publish Batch Announcement"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {(['NORMAL', 'IMPORTANT', 'URGENT'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                    priority === p
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-[#E2E8F0] text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Announcement Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Software Engineering Assignment Deadline"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description / Content</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter announcement details..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Expiration Date (Auto-Archiving)
            </label>
            <input
              type="date"
              required
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
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
              Publish Announcement
            </button>
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
