import React, { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Trash2, RefreshCw, Image, Paperclip, Download, X, FileUp } from 'lucide-react';
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
    featuredImageUrl: '',
    attachmentUrl: '',
    attachmentFileName: '',
    attachmentSize: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 1024 * 1024) {
      addToast('error', `Featured photo exceeds 1 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB). Max 1 MB allowed.`);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm(prev => ({ ...prev, featuredImageUrl: base64 }));
      addToast('success', 'Feature photo attached successfully!');
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      addToast('error', `Attached file exceeds 1 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB). Max 1 MB allowed.`);
      e.target.value = '';
      return;
    }

    const sizeKB = (file.size / 1024).toFixed(0);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = file.size >= 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm(prev => ({
        ...prev,
        attachmentUrl: base64,
        attachmentFileName: file.name,
        attachmentSize: sizeStr,
      }));
      addToast('success', `File "${file.name}" (${sizeStr}) attached successfully!`);
    };
    reader.readAsDataURL(file);
  };

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
      setForm({
        title: '',
        category: 'ACADEMIC',
        content: '',
        featuredImageUrl: '',
        attachmentUrl: '',
        attachmentFileName: '',
        attachmentSize: '',
      });
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
            Publish department-wide notices with feature photo, file attachments (max 1 MB), visible to all students and faculty across all batches.
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
              className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-start justify-between gap-4"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                    {n.category}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">{n.publishDate}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{n.content}</p>

                {/* Badges for Featured Photo & Attachment */}
                <div className="flex items-center gap-3 flex-wrap pt-1">
                  {n.featuredImageUrl && (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 max-w-xs">
                      <img
                        src={n.featuredImageUrl}
                        alt="Featured thumbnail"
                        className="w-10 h-10 rounded object-cover border border-slate-200"
                      />
                      <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                        <Image className="w-3.5 h-3.5 text-blue-500" /> Feature Photo
                      </span>
                    </div>
                  )}

                  {n.attachmentUrl && (
                    <a
                      href={n.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>{n.attachmentFileName || 'Download Attachment'}</span>
                      {n.attachmentSize && (
                        <span className="text-[10px] bg-blue-200/60 text-blue-800 px-1 py-0.2 rounded font-mono">
                          {n.attachmentSize}
                        </span>
                      )}
                    </a>
                  )}
                </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" /> Publish Official Department Notice
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNotice} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value as any })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="EXAM">Exam Circular</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="SCHOLARSHIP">Scholarship</option>
                  <option value="EVENT">Event</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination Guidelines & Schedule"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
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
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 1. Feature Photo (Max 1 MB) */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-blue-600" />
                    <span>Feature Photo (Optional)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Max 1 MB
                  </span>
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />

                {form.featuredImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-36 bg-slate-100 flex items-center justify-center">
                    <img
                      src={form.featuredImageUrl}
                      alt="Feature preview"
                      className="max-h-36 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, featuredImageUrl: '' }))}
                      className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full"
                      title="Remove Photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-blue-400 bg-white rounded-lg text-slate-700 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <FileUp className="w-3.5 h-3.5 text-blue-600" />
                      <span>Choose Feature Photo from Device (Max 1 MB)</span>
                    </button>
                    <input
                      type="url"
                      placeholder="Or enter image URL: https://..."
                      value={form.featuredImageUrl}
                      onChange={e => setForm(prev => ({ ...prev, featuredImageUrl: e.target.value }))}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>

              {/* 2. File Attachment (Max 1 MB) */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>Attached Document / Circular File (Optional)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Max 1 MB
                  </span>
                </div>

                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt"
                  className="hidden"
                  onChange={handleAttachmentSelect}
                />

                {form.attachmentUrl ? (
                  <div className="flex items-center justify-between p-2 bg-blue-50/80 border border-blue-200 rounded-lg text-slate-800 font-medium">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{form.attachmentFileName || 'Attached File'}</span>
                      {form.attachmentSize && (
                        <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {form.attachmentSize}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        attachmentUrl: '',
                        attachmentFileName: '',
                        attachmentSize: '',
                      }))}
                      className="p-1 hover:bg-blue-100 rounded text-slate-500 hover:text-slate-700 shrink-0"
                      title="Remove Attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-blue-400 bg-white rounded-lg text-slate-700 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <FileUp className="w-3.5 h-3.5 text-blue-600" />
                      <span>Choose File from Device (PDF, DOC, ZIP - Max 1 MB)</span>
                    </button>
                    <input
                      type="url"
                      placeholder="Or enter direct document link: https://..."
                      value={form.attachmentUrl}
                      onChange={e => setForm(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
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
