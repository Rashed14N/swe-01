import React, { useState, useEffect } from 'react';
import { Award, Plus, Mail, Phone, Search, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Faculty } from '../../types';

export const AdminFacultyPage: React.FC = () => {
  const { token, user } = useAuth();
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
    designation: 'Assistant Professor',
    email: '',
    phone: '',
    officeRoom: 'Room 602, Academic Building',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    specialization: 'Software Architecture & Cloud Computing',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFaculty = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/faculty');
      if (res.ok) {
        const data = await res.json();
        setFaculty(data.faculty || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFaculty();
  }, [token]);

  const openAddModal = () => {
    setEditingFaculty(null);
    setForm({
      name: '',
      shortName: '',
      designation: 'Assistant Professor',
      email: '',
      phone: '',
      officeRoom: 'Room 602, Academic Building',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      specialization: 'Software Architecture & Cloud Computing',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (fac: Faculty) => {
    setEditingFaculty(fac);
    setForm({
      name: fac.name,
      shortName: fac.shortName || '',
      designation: fac.designation,
      email: fac.email,
      phone: fac.phone || '',
      officeRoom: fac.officeRoom || '',
      photoUrl: fac.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      specialization: fac.specialization || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingFaculty ? `/api/faculty/${editingFaculty.id}` : '/api/faculty';
      const method = editingFaculty ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || 'admin-token'}`,
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || 'admin',
          'x-user-name': encodeURIComponent(user?.name || 'Administrator'),
          'x-user-email': user?.email || 'admin@swe.edu.bd',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        addToast('success', data.message || (editingFaculty ? 'Faculty updated successfully!' : 'Faculty member added successfully!'));
        setIsModalOpen(false);
        fetchFaculty();
      } else {
        addToast('error', data.error || data.message || 'Failed to save faculty details');
      }
    } catch (e: any) {
      console.error('Error saving faculty:', e);
      addToast('error', e?.message || 'Network or server error while saving faculty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaculty = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name}?`)) return;
    try {
      const res = await fetch(`/api/faculty/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token || 'admin-token'}`,
          'x-user-role': user?.role || 'ADMIN',
          'x-user-id': user?.id || 'admin',
        },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        addToast('success', data.message || 'Faculty member removed successfully');
        fetchFaculty();
      } else {
        addToast('error', data.error || 'Failed to delete faculty');
      }
    } catch (e: any) {
      console.error('Error deleting faculty:', e);
      addToast('error', 'Network or server error while deleting');
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
            Manage Software Engineering department professors, designations, short names, and contact details.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Faculty Member
        </button>
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
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(fac => (
            <div key={fac.id} className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex gap-3">
                <img
                  src={fac.photoUrl}
                  alt={fac.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                />
                <div className="space-y-1 text-xs min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 text-sm block truncate">{fac.name}</span>
                    {fac.shortName && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold text-[10px] rounded shrink-0">
                        {fac.shortName}
                      </span>
                    )}
                  </div>
                  <span className="text-blue-600 font-bold text-[11px] block">{fac.designation}</span>
                  <p className="text-slate-600 text-[11px] flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {fac.email}
                  </p>
                  <p className="text-slate-700 text-[11px] font-medium flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {fac.phone || 'Phone not provided'}
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
                    placeholder="e.g. Dr. Tanvir Rahman"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Short Name / Code</label>
                  <input
                    type="text"
                    placeholder="e.g. TR"
                    value={form.shortName}
                    onChange={e => setForm({ ...form, shortName: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={form.designation}
                    onChange={e => setForm({ ...form, designation: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Room</label>
                  <input
                    type="text"
                    value={form.officeRoom}
                    onChange={e => setForm({ ...form, officeRoom: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Photo URL</label>
                <input
                  type="text"
                  value={form.photoUrl}
                  onChange={e => setForm({ ...form, photoUrl: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-mono"
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
