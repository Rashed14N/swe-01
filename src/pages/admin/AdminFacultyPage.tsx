import React, { useState, useEffect, useRef } from 'react';
import { Award, Plus, Mail, Phone, Search, Edit2, Trash2, User, RefreshCw, Camera, Upload, X, Loader2 } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { adminApiClient } from '../../services/adminApiClient';
import { sortFacultyByHierarchy, type Faculty } from '../../types';

export const AdminFacultyPage: React.FC = () => {
  const { addToast } = useNotifications();

  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [form, setForm] = useState({
    name: '',
    shortName: '',
    designation: 'Lecturer',
    email: '',
    phone: '',
    photoUrl: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeFacultyForUpload, setActiveFacultyForUpload] = useState<Faculty | null>(null);

  const fetchFaculty = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiClient.getFaculty();
      setFaculty(sortFacultyByHierarchy(data));
    } catch (e: any) {
      console.error(e);
      addToast('error', e.message || 'Failed to load faculty roster');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  const openAddModal = () => {
    setEditingFaculty(null);
    setForm({
      name: '',
      shortName: '',
      designation: 'Lecturer',
      email: '',
      phone: '',
      photoUrl: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (fac: Faculty) => {
    setEditingFaculty(fac);
    setForm({
      name: fac.name,
      shortName: fac.shortName || '',
      designation: fac.designation,
      email: fac.email || '',
      phone: fac.phone || '',
      photoUrl: fac.photoUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleModalPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('error', 'Image size must be under 2 MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm((prev) => ({ ...prev, photoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleCardPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeFacultyForUpload) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select a valid image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      addToast('error', 'Image size must be under 2 MB');
      return;
    }

    const targetFac = activeFacultyForUpload;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadingId(targetFac.id);
      try {
        await adminApiClient.updateFaculty(targetFac.id, { photoUrl: base64 });
        addToast('success', `Photo uploaded for ${targetFac.name}`);
        fetchFaculty();
      } catch (err: any) {
        console.error(err);
        addToast('error', err?.message || 'Failed to upload photo');
      } finally {
        setUploadingId(null);
        setActiveFacultyForUpload(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.name.trim()) {
      addToast('error', 'Faculty full name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingFaculty) {
        await adminApiClient.updateFaculty(editingFaculty.id, form);
        addToast('success', `Faculty member "${form.name}" updated!`);
      } else {
        await adminApiClient.createFaculty(form);
        addToast('success', `Faculty member "${form.name}" added!`);
      }
      setIsModalOpen(false);
      fetchFaculty();
    } catch (e: any) {
      console.error('Error saving faculty:', e);
      addToast('error', e?.message || 'Failed to save faculty details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaculty = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      await adminApiClient.deleteFaculty(id);
      addToast('success', `Faculty member ${name} removed.`);
      fetchFaculty();
    } catch (e: any) {
      console.error('Error deleting faculty:', e);
      addToast('error', e.message || 'Failed to delete faculty');
    }
  };

  const filtered = faculty.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.shortName && f.shortName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      f.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Hidden file input for card quick photo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCardPhotoUpload}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Award className="w-5 h-5" />
            </span>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Academic Staff</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Department Faculty Roster</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic designations, short initials, official contact details, and faculty profile images.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFaculty()}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Refresh Roster"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Faculty Member
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search faculty by name, short code, or designation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900"
        />
      </div>

      {/* Faculty Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading faculty list...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          No faculty members found matching your search.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fac) => (
            <div
              key={fac.id}
              className="bg-white p-4.5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between gap-3 hover:border-blue-200 transition-all"
            >
              <div className="flex gap-3.5 items-start">
                {/* Photo / Avatar with Admin Upload Button */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border-2 border-white ring-1 ring-slate-200 flex items-center justify-center text-slate-700 shadow-2xs overflow-hidden">
                    {fac.photoUrl ? (
                      <img src={fac.photoUrl} alt={fac.name} className="w-full h-full object-cover" />
                    ) : fac.shortName ? (
                      <span className="font-extrabold text-sm tracking-wider font-mono text-blue-700">
                        {fac.shortName}
                      </span>
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFacultyForUpload(fac);
                      fileInputRef.current?.click();
                    }}
                    title="Upload / Change Photo (Admin)"
                    className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs border border-white cursor-pointer transition-transform active:scale-90"
                  >
                    {uploadingId === fac.id ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Camera className="w-2.5 h-2.5" />
                    )}
                  </button>
                </div>

                <div className="space-y-1 text-xs min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 text-sm block truncate">{fac.name}</span>
                    {fac.shortName && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-extrabold text-[10px] rounded-md shrink-0 border border-blue-200">
                        {fac.shortName}
                      </span>
                    )}
                  </div>
                  <span className="text-blue-600 font-semibold text-[11px] block">{fac.designation}</span>
                  <p className="text-slate-600 text-[11px] flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {fac.email ? (
                      <a href={`mailto:${fac.email}`} className="text-blue-600 hover:underline truncate">
                        {fac.email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No email</span>
                    )}
                  </p>
                  <p className="text-slate-700 text-[11px] font-medium flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {fac.phone ? (
                      <a href={`tel:${fac.phone}`} className="hover:text-emerald-600 truncate">
                        {fac.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No phone</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => openEditModal(fac)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Edit Info
                </button>
                <button
                  onClick={() => handleDeleteFaculty(fac.id, fac.name)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingFaculty ? `Edit Faculty: ${editingFaculty.name}` : 'Add Faculty Member'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFaculty} className="space-y-3.5 text-xs">
              {/* Photo Upload Area (Admin Only) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {form.photoUrl ? (
                    <img src={form.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 text-xs">Faculty Photo</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                      Admin Only
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={modalFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleModalPhotoSelect}
                    />
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Select Image
                    </button>
                    {form.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, photoUrl: '' }))}
                        className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">JPG or PNG, max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fuad Ahmed"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Short Code</label>
                  <input
                    type="text"
                    placeholder="e.g. FA"
                    value={form.shortName}
                    onChange={(e) => setForm({ ...form, shortName: e.target.value.toUpperCase() })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Position / Designation *</label>
                  <select
                    value={form.designation}
                    onChange={(e) => setForm({ ...form, designation: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="Professor & Head">Professor & Head</option>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Senior Lecturer">Senior Lecturer</option>
                    <option value="Adjunct Faculty">Adjunct Faculty</option>
                    <option value="Lecturer">Lecturer</option>
                    <option value="Lecturer (Study Leave)">Lecturer (Study Leave)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="e.g. fahmed@metrouni.edu.bd"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +8801611829316"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingFaculty ? 'Update Faculty' : 'Add Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
