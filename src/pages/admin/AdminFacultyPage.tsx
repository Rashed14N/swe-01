import React, { useState, useEffect } from 'react';
import { Award, Plus, Mail, Phone, Search, Edit2, Trash2, User, RefreshCw } from 'lucide-react';
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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
    });
    setIsModalOpen(true);
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
        addToast('success', `Faculty member "${form.name}" updated in Supabase!`);
      } else {
        await adminApiClient.createFaculty(form);
        addToast('success', `Faculty member "${form.name}" added in Supabase!`);
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
      addToast('success', `Faculty member ${name} removed from Supabase.`);
      fetchFaculty();
    } catch (e: any) {
      console.error('Error deleting faculty:', e);
      addToast('error', e.message || 'Failed to delete faculty');
    }
  };

  const filtered = faculty.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.shortName && f.shortName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    f.designation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Department Faculty Roster</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage Software Engineering department professors, designations, short names, and direct contact details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchFaculty()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh faculty"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Faculty Member
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-7 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search faculty by name, short code, or designation..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
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
          {filtered.map(fac => (
            <div key={fac.id} className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex gap-3.5 items-start">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shrink-0 shadow-sm border-2 border-white ring-2 ring-blue-100">
                  {fac.shortName ? (
                    <span className="font-extrabold text-sm tracking-wider font-mono">{fac.shortName}</span>
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
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
                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit Info
                </button>
                <button
                  onClick={() => handleDeleteFaculty(fac.id, fac.name)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1"
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
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingFaculty ? `Edit Faculty: ${editingFaculty.name}` : 'Add Faculty Member'}
            </h3>

            <form onSubmit={handleSaveFaculty} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fuad Ahmed"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Short Name / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. FA"
                    value={form.shortName}
                    onChange={e => setForm({ ...form, shortName: e.target.value.toUpperCase() })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Position / Designation *</label>
                  <select
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="Professor & Head">Professor & Head (Department Head)</option>
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
                    onChange={e => setForm({ ...form, email: e.target.value })}
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
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50"
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
