import React, { useState, useEffect } from 'react';
import {
  Users, Plus, Upload, Search, Filter, Key, Edit, Shield,
  CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { User, Batch, UserRole } from '../../types';

export const AdminStudentsPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [students, setStudents] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  // Forms
  const [addForm, setAddForm] = useState({
    studentId: '',
    name: '',
    email: '',
    phone: '',
    batchId: 'batch-9',
    currentSemester: 5,
    role: 'STUDENT' as 'STUDENT' | 'CR',
    password: 'password123',
  });

  const [editForm, setEditForm] = useState({
    studentId: '',
    name: '',
    email: '',
    phone: '',
    batchId: '',
    currentSemester: 1,
    role: 'STUDENT' as UserRole,
    status: 'ACTIVE' as 'ACTIVE' | 'DISABLED',
  });

  const [resetPassText, setResetPassText] = useState('password123');

  // CSV Bulk Import state
  const [csvText, setCsvText] = useState('');
  const [csvDefaultBatchId, setCsvDefaultBatchId] = useState('batch-9');
  const [importResults, setImportResults] = useState<{ importedCount: number; errors: string[] } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [stRes, btRes] = await Promise.all([
        fetch('/api/admin/students', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/batches', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (stRes.ok) {
        const data = await stRes.json();
        setStudents(data.students || []);
      }

      if (btRes.ok) {
        const data = await btRes.json();
        setBatches(data.batches || []);
        if (data.batches.length > 0) {
          setAddForm(prev => ({ ...prev, batchId: data.batches[0].id }));
          setCsvDefaultBatchId(data.batches[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Handlers
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addForm),
      });

      if (res.ok) {
        addToast('success', 'Student account created successfully!');
        setIsAddModalOpen(false);
        setAddForm({
          studentId: '',
          name: '',
          email: '',
          phone: '',
          batchId: batches[0]?.id || 'batch-9',
          currentSemester: 5,
          role: 'STUDENT',
          password: 'password123',
        });
        fetchData();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to create student');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        addToast('success', 'Student details updated!');
        setIsEditModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Update failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      const res = await fetch(`/api/admin/users/${selectedStudent.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: resetPassText }),
      });

      if (res.ok) {
        addToast('success', `Password reset for ${selectedStudent.name}`);
        setIsPasswordModalOpen(false);
      } else {
        addToast('error', 'Password reset failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setImportResults(null);
    try {
      const res = await fetch('/api/admin/users/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csvText, defaultBatchId: csvDefaultBatchId }),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', `Successfully imported ${data.importedCount} students!`);
        setImportResults({ importedCount: data.importedCount, errors: data.errors || [] });
        fetchData();
      } else {
        addToast('error', data.error || 'Import failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCR = async (student: User) => {
    const newRole = student.role === 'CR' ? 'STUDENT' : 'CR';
    try {
      const res = await fetch(`/api/admin/users/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        addToast('success', `${student.name} is now ${newRole === 'CR' ? 'Class Representative (CR)' : 'a regular Student'}`);
        fetchData();
      }
    } catch (e) {
      addToast('error', 'Failed to toggle CR status');
    }
  };

  // Filter logic
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesBatch = !batchFilter || s.batchId === batchFilter;
    const matchesRole = !roleFilter || s.role === roleFilter;

    return matchesSearch && matchesBatch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Student Directory & Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage student records, batch assignments, assign CR roles, reset passwords, or perform bulk CSV student import.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCsvText("student_id,name,email\n2021001,Abir Hasan,abir@diu.edu.bd\n2021002,Nabila Islam,nabila@diu.edu.bd");
              setIsImportModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> CSV Bulk Import
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Single Student
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student ID, name, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={batchFilter}
            onChange={e => setBatchFilter(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-slate-900"
          >
            <option value="">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs text-slate-900"
          >
            <option value="">All Roles</option>
            <option value="STUDENT">Regular Student</option>
            <option value="CR">Class Representative (CR)</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {/* Roster Container (Mobile Cards + Desktop Table) */}
      <div className="bg-white rounded-xl border border-[#CBD8E8] shadow-md overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading student directory...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No students match search criteria.</div>
        ) : (
          <>
            {/* Mobile Cards (block md:hidden) */}
            <div className="block md:hidden divide-y divide-[#E0E8F2] p-3 space-y-3">
              {filteredStudents.map((st) => (
                <div key={st.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded">
                      {st.studentId}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.role === 'ADMIN'
                            ? 'bg-rose-100 text-rose-700'
                            : st.role === 'CR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {st.role}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {st.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{st.name}</h4>
                    <span className="text-[11px] text-slate-500 block">{st.email}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    <span>
                      {st.batchName || 'Unassigned'} • Sem {st.currentSemester || '—'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedStudent(st);
                        setEditForm({
                          studentId: st.studentId,
                          name: st.name,
                          email: st.email || '',
                          phone: st.phone || '',
                          batchId: st.batchId || '',
                          currentSemester: st.currentSemester,
                          role: st.role,
                          status: st.status || 'ACTIVE',
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="text-blue-600 font-bold hover:underline"
                    >
                      Manage
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
              <thead className="bg-[#F1F5FA] border-b border-[#CBD8E8] text-[#3B4C63] font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Batch & Semester</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E8F2] font-medium">
                {filteredStudents.map(st => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{st.studentId}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{st.name}</span>
                      <span className="text-[11px] text-slate-400">{st.email || 'No email registered'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {st.batchName || 'SWE Batch'} ({st.currentSemester}th Sem)
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          st.role === 'ADMIN'
                            ? 'bg-rose-100 text-rose-800'
                            : st.role === 'CR'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {st.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          st.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {st.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleToggleCR(st)}
                        className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded text-[11px] transition-colors"
                        title="Toggle CR Status"
                      >
                        {st.role === 'CR' ? 'Remove CR' : 'Assign CR'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStudent(st);
                          setEditForm({
                            studentId: st.studentId,
                            name: st.name,
                            email: st.email || '',
                            phone: st.phone || '',
                            batchId: st.batchId || '',
                            currentSemester: st.currentSemester,
                            role: st.role,
                            status: st.status || 'ACTIVE',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Student"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedStudent(st);
                          setIsPasswordModalOpen(true);
                        }}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      {/* ADD STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add New Student Account</h3>

            <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2021001"
                    value={addForm.studentId}
                    onChange={e => setAddForm({ ...addForm, studentId: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tanvir Ahmed"
                    value={addForm.name}
                    onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="student@diu.edu.bd"
                    value={addForm.email}
                    onChange={e => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+8801700000000"
                    value={addForm.phone}
                    onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch *</label>
                  <select
                    value={addForm.batchId}
                    onChange={e => setAddForm({ ...addForm, batchId: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={addForm.currentSemester}
                    onChange={e => setAddForm({ ...addForm, currentSemester: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={addForm.role}
                    onChange={e => setAddForm({ ...addForm, role: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="CR">Class Representative</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="text"
                  required
                  value={addForm.password}
                  onChange={e => setAddForm({ ...addForm, password: e.target.value })}
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
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Student Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV BULK IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Bulk Student Import via CSV
            </h3>
            <p className="text-xs text-slate-500">
              Paste CSV content below. Header line must include <code className="bg-slate-100 px-1 py-0.5 rounded">student_id,name,email</code> columns.
            </p>

            <form onSubmit={handleBulkImport} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Batch for Imported Students</label>
                <select
                  value={csvDefaultBatchId}
                  onChange={e => setCsvDefaultBatchId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">CSV Content *</label>
                <textarea
                  required
                  rows={6}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  className="w-full bg-[#F8FAFC] font-mono text-[11px] border border-[#E2E8F0] rounded-lg p-3 text-slate-900"
                />
              </div>

              {importResults && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <p className="font-bold text-emerald-700">
                    Imported {importResults.importedCount} student accounts!
                  </p>
                  {importResults.errors.map((err, idx) => (
                    <p key={idx} className="text-rose-600 text-[11px]">
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Importing...' : 'Run CSV Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Student ({selectedStudent.studentId})</h3>

            <form onSubmit={handleEditStudent} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={editForm.studentId}
                    onChange={e => setEditForm({ ...editForm, studentId: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch</label>
                  <select
                    value={editForm.batchId}
                    onChange={e => setEditForm({ ...editForm, batchId: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  >
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester</label>
                  <input
                    type="number"
                    value={editForm.currentSemester}
                    onChange={e => setEditForm({ ...editForm, currentSemester: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="CR">Class Representative</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {isPasswordModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reset Password for {selectedStudent.name}</h3>

            <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Temporary Password *</label>
                <input
                  type="text"
                  required
                  value={resetPassText}
                  onChange={e => setResetPassText(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
