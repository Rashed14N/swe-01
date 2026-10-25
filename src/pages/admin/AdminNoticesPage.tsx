import React, { useState, useEffect, useRef } from 'react';
import { Bell, Plus, Trash2, RefreshCw, Image, Paperclip, Download, X, FileUp, Images, Eye, ExternalLink } from 'lucide-react';
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
    attachedPhotos: [] as string[],
    newAttachedPhotoUrl: '',
    attachmentUrl: '',
    attachmentFileName: '',
    attachmentSize: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const attachedPhotosInputRef = useRef<HTMLInputElement>(null);
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

    if (file.size > 2 * 1024 * 1024) {
      addToast('error', `Featured photo exceeds 2 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB). Max 2 MB allowed.`);
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

  const handleAttachedPhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let addedCount = 0;

    fileList.forEach(file => {
      if (!file.type.startsWith('image/')) {
        addToast('error', `Skipped "${file.name}": Please select image files (JPG, PNG, WebP).`);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        addToast('error', `Photo "${file.name}" exceeds 2 MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setForm(prev => ({
          ...prev,
          attachedPhotos: [...prev.attachedPhotos, base64],
        }));
      };
      reader.readAsDataURL(file);
      addedCount++;
    });

    if (addedCount > 0) {
      addToast('success', `${addedCount} attached photo(s) selected!`);
    }
    e.target.value = '';
  };

  const handleAddAttachedPhotoUrl = () => {
    const url = form.newAttachedPhotoUrl.trim();
    if (!url) return;
    setForm(prev => ({
      ...prev,
      attachedPhotos: [...prev.attachedPhotos, url],
      newAttachedPhotoUrl: '',
    }));
    addToast('success', 'Attached photo URL added!');
  };

  const removeAttachedPhoto = (indexToRemove: number) => {
    setForm(prev => ({
      ...prev,
      attachedPhotos: prev.attachedPhotos.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      addToast('error', `Attached file exceeds 2 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB). Max 2 MB allowed.`);
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
      await adminApiClient.createNotice({
        title: form.title,
        category: form.category,
        content: form.content,
        featuredImageUrl: form.featuredImageUrl || undefined,
        attachedPhotos: form.attachedPhotos.length > 0 ? form.attachedPhotos : undefined,
        attachmentUrl: form.attachmentUrl || undefined,
        attachmentFileName: form.attachmentFileName || undefined,
        attachmentSize: form.attachmentSize || undefined,
      });
      addToast('success', 'Official Department Notice published successfully!');
      setIsAddModalOpen(false);
      setForm({
        title: '',
        category: 'ACADEMIC',
        content: '',
        featuredImageUrl: '',
        attachedPhotos: [],
        newAttachedPhotoUrl: '',
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

                {/* Badges & Media: Feature Photo, Attached Photos, File Attachment */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    {n.featuredImageUrl && (
                      <div
                        onClick={() => setPreviewImage({ url: n.featuredImageUrl!, title: `${n.title} (Feature Photo)` })}
                        className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 cursor-pointer border border-slate-200 rounded-lg p-1.5 transition-colors"
                        title="Click to view full photo"
                      >
                        <img
                          src={n.featuredImageUrl}
                          alt="Featured thumbnail"
                          className="w-10 h-10 rounded object-cover border border-slate-200"
                        />
                        <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                          <Image className="w-3.5 h-3.5 text-blue-600" /> Feature Photo
                        </span>
                      </div>
                    )}

                    {n.attachedPhotos && n.attachedPhotos.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-blue-50/70 border border-blue-200 rounded-lg p-1.5">
                        <span className="text-[11px] font-semibold text-blue-800 flex items-center gap-1 pr-1">
                          <Images className="w-3.5 h-3.5 text-blue-600" /> {n.attachedPhotos.length} Attached Photo{n.attachedPhotos.length > 1 ? 's' : ''}:
                        </span>
                        <div className="flex items-center gap-1">
                          {n.attachedPhotos.slice(0, 4).map((p, idx) => (
                            <img
                              key={idx}
                              src={p}
                              alt={`Attached ${idx + 1}`}
                              onClick={() => setPreviewImage({ url: p, title: `${n.title} (Attached Photo ${idx + 1})` })}
                              className="w-8 h-8 rounded object-cover border border-blue-200 cursor-pointer hover:scale-110 hover:shadow-xs transition-transform"
                              title="Click to view"
                            />
                          ))}
                          {n.attachedPhotos.length > 4 && (
                            <span className="text-[10px] font-bold text-blue-600 px-1">
                              +{n.attachedPhotos.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {n.attachmentUrl && (
                      <a
                        href={n.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        <span>{n.attachmentFileName || 'Download Attachment'}</span>
                        {n.attachmentSize && (
                          <span className="text-[10px] bg-slate-200 text-slate-800 px-1 py-0.2 rounded font-mono">
                            {n.attachmentSize}
                          </span>
                        )}
                      </a>
                    )}
                  </div>
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

              {/* 1. Feature Photo (Max 2 MB) */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-blue-600" />
                    <span>Feature Photo / Notice Cover (Optional)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
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

                {form.featuredImageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 max-h-40 bg-slate-100 flex items-center justify-center">
                    <img
                      src={form.featuredImageUrl}
                      alt="Feature preview"
                      className="max-h-40 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, featuredImageUrl: '' }))}
                      className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
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
                      className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-blue-400 bg-white rounded-lg text-slate-700 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <FileUp className="w-3.5 h-3.5 text-blue-600" />
                      <span>Choose Feature Photo from Device</span>
                    </button>
                    <input
                      type="url"
                      placeholder="Or enter feature photo URL: https://..."
                      value={form.featuredImageUrl}
                      onChange={e => setForm(prev => ({ ...prev, featuredImageUrl: e.target.value }))}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400 text-xs"
                    />
                  </div>
                )}
              </div>

              {/* 2. Attached Photos (Multiple Attach Photos) */}
              <div className="border border-blue-100 rounded-xl p-3 bg-blue-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5 text-blue-600" />
                    <span>Attach Photos ({form.attachedPhotos.length})</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded border border-blue-200">
                    Multiple photos allowed
                  </span>
                </div>

                <input
                  ref={attachedPhotosInputRef}
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={handleAttachedPhotosSelect}
                />

                {/* Previews of attached photos */}
                {form.attachedPhotos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                    {form.attachedPhotos.map((photo, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-300 bg-white group">
                        <img
                          src={photo}
                          alt={`Attached photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttachedPhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-700 text-white rounded-full transition-colors"
                          title="Remove this photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-1 left-1 px-1 rounded bg-black/60 text-white text-[9px] font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => attachedPhotosInputRef.current?.click()}
                    className="w-full py-2 px-3 border border-dashed border-blue-300 hover:border-blue-500 bg-white rounded-lg text-blue-700 font-semibold flex items-center justify-center gap-2 hover:bg-blue-50/50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600" />
                    <span>Attach Photos from Device (Select one or multiple)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="Or enter image URL: https://..."
                      value={form.newAttachedPhotoUrl}
                      onChange={e => setForm(prev => ({ ...prev, newAttachedPhotoUrl: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAttachedPhotoUrl();
                        }
                      }}
                      className="flex-1 bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddAttachedPhotoUrl}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shrink-0"
                    >
                      Add Photo
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. File / Document Attachment (Optional) */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    <span>Attached Document / Circular PDF (Optional)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    Max 2 MB
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
                      <span>Choose Document from Device (PDF, DOC, ZIP)</span>
                    </button>
                    <input
                      type="url"
                      placeholder="Or enter direct document link: https://..."
                      value={form.attachmentUrl}
                      onChange={e => setForm(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                      className="w-full bg-white border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-slate-900 placeholder:text-slate-400 text-xs"
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

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {previewImage.title}
              </h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-black/90 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Department Notice Photo</span>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Open in full resolution</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
