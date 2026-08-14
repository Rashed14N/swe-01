import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit, Users, BookOpen, Calendar, ChevronRight, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Batch, User, Course, RoutineSlot, Exam } from '../../types';

export const AdminBatchesPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<{
    batch: Batch;
    students: User[];
    crs: User[];
    courses: Course[];
    routines: RoutineSlot[];
    exams: Exam[];
  } | null>(null);

  const [addForm, setAddForm] = useState({
    name: 'SWE 10th Batch',
    admissionYear: 2024,
    currentSemester: 1,
    academicSession: '2024-2025',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBatches = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/batches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [token]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addForm),
      });

      if (res.ok) {
        addToast('success', 'New Batch created!');
        setIsAddModalOpen(false);
        fetchBatches();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to create batch');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (batchId: string) => {
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedBatchDetail(data);
      }
    } catch (e) {
      addToast('error', 'Failed to load batch details');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Academic Batches Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create and maintain batch isolation policies, assigned CRs, routines, and course offerings per batch.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Batch
        </button>
      </div>

      {/* Batch Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading batches...</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {batches.map(b => (
            <div
              key={b.id}
              className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-2xs hover:border-blue-400 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-base">{b.name}</span>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                  Session {b.academicSession}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1 pt-1">
                <p>
                  <strong className="text-slate-800">Current Semester:</strong> {b.currentSemester}th Semester
                </p>
                <p>
                  <strong className="text-slate-800">Admission Year:</strong> {b.admissionYear}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">ID: {b.id}</span>
                <button
                  onClick={() => handleOpenDetail(b.id)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" /> View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE BATCH MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Academic Batch</h3>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SWE 10th Batch"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admission Year *</label>
                  <input
                    type="number"
                    required
                    value={addForm.admissionYear}
                    onChange={e => setAddForm({ ...addForm, admissionYear: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Semester *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={addForm.currentSemester}
                    onChange={e => setAddForm({ ...addForm, currentSemester: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Session *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2024-2025"
                  value={addForm.academicSession}
                  onChange={e => setAddForm({ ...addForm, academicSession: e.target.value })}
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
                  {isSubmitting ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH DETAIL DRAWER / MODAL */}
      {selectedBatchDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                  Batch Detail Overview
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedBatchDetail.batch.name}</h3>
              </div>
              <button
                onClick={() => setSelectedBatchDetail(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="block font-bold text-slate-900 text-lg">{selectedBatchDetail.students.length}</span>
                <span className="text-slate-500 text-[10px]">Students</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="block font-bold text-amber-900 text-lg">{selectedBatchDetail.crs.length}</span>
                <span className="text-amber-700 text-[10px]">Assigned CRs</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="block font-bold text-blue-900 text-lg">{selectedBatchDetail.courses.length}</span>
                <span className="text-blue-700 text-[10px]">Courses</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="block font-bold text-emerald-900 text-lg">{selectedBatchDetail.exams.length}</span>
                <span className="text-emerald-700 text-[10px]">Scheduled Exams</span>
              </div>
            </div>

            {/* CR Roster */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Class Representatives (CRs)
              </h4>
              {selectedBatchDetail.crs.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded">No CR assigned yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedBatchDetail.crs.map(cr => (
                    <div key={cr.id} className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900">{cr.name} ({cr.studentId})</span>
                      <span className="text-amber-700 text-[10px]">{cr.email || 'No email'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Students roster preview */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Student Roster Sample ({selectedBatchDetail.students.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedBatchDetail.students.slice(0, 10).map(st => (
                  <div key={st.id} className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{st.name}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{st.studentId}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
