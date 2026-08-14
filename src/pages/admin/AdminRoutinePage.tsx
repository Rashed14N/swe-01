import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, RefreshCw, CheckCircle2, XCircle, AlertCircle, Edit2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { RoutineSlot, RoutineRequest, Batch } from '../../types';
import { VisualRoutineGrid } from '../../components/routine/VisualRoutineGrid';

export const AdminRoutinePage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('batch-9');
  const [routines, setRoutines] = useState<RoutineSlot[]>([]);
  const [requests, setRequests] = useState<RoutineRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'ROUTINE' | 'REQUESTS'>('ROUTINE');
  const [isLoading, setIsLoading] = useState(true);

  // Slot modal
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RoutineSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [slotForm, setSlotForm] = useState({
    batchId: selectedBatchId,
    day: 'SUNDAY' as 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    courseCode: 'SWE 305',
    courseTitle: 'Database Systems',
    teacherName: 'Dr. Tanvir Rahman',
    room: '502 Lab',
  });

  // Reject modal
  const [rejectReqId, setRejectReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [btRes, routRes, reqRes] = await Promise.all([
        fetch('/api/admin/batches', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/routines?batchId=${selectedBatchId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/routines/requests', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (btRes.ok) {
        const data = await btRes.json();
        setBatches(data.batches || []);
      }

      if (routRes.ok) {
        const data = await routRes.json();
        setRoutines(data.routines || []);
      }

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, selectedBatchId]);

  const handleOpenAddModal = (day?: string) => {
    setEditingSlot(null);
    setSlotForm({
      batchId: selectedBatchId,
      day: (day as any) || 'SUNDAY',
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      courseCode: 'SWE 305',
      courseTitle: 'Database Systems',
      teacherName: 'Dr. Tanvir Rahman',
      room: '502 Lab',
    });
    setIsSlotModalOpen(true);
  };

  const handleOpenEditModal = (slot: RoutineSlot) => {
    setEditingSlot(slot);
    setSlotForm({
      batchId: slot.batchId,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseCode: slot.courseCode,
      courseTitle: slot.courseTitle,
      teacherName: slot.teacherName,
      room: slot.room,
    });
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingSlot ? `/api/routines/${editingSlot.id}` : '/api/routines';
      const method = editingSlot ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...slotForm, batchId: selectedBatchId }),
      });

      if (res.ok) {
        addToast('success', editingSlot ? 'Class slot updated!' : 'New class slot added!');
        setIsSlotModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to save routine slot');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Are you sure you want to delete this routine slot?')) return;

    try {
      const res = await fetch(`/api/routines/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        addToast('success', 'Routine slot deleted.');
        fetchData();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to delete slot');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  const handleReviewRequest = async (reqId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/routines/requests/${reqId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        }),
      });

      if (res.ok) {
        addToast('success', `Routine request ${status.toLowerCase()} successfully!`);
        setRejectReqId(null);
        setRejectionReason('');
        fetchData();
      } else {
        addToast('error', 'Review action failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Department Routine & CR Requests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage official class routines per batch, edit class slots, and review schedule modification requests submitted by CRs.
          </p>
        </div>

        {activeTab === 'ROUTINE' && (
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Class Slot
          </button>
        )}
      </div>

      {/* Navigation Tabs & Batch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ROUTINE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'ROUTINE' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Official Routine Grid
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'REQUESTS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> CR Routine Requests ({pendingRequests.length} Pending)
          </button>
        </div>

        {activeTab === 'ROUTINE' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Batch:</span>
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Routine Grid View */}
      {activeTab === 'ROUTINE' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading routine...</div>
          ) : (
            <VisualRoutineGrid
              routines={routines}
              canEdit={true}
              onAddSlot={handleOpenAddModal}
              onEditSlot={handleOpenEditModal}
              onDeleteSlot={handleDeleteSlot}
            />
          )}
        </div>
      )}

      {/* CR Routine Requests View */}
      {activeTab === 'REQUESTS' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            CR Submitted Routine Modification Requests
          </h3>

          {requests.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
              No routine requests submitted.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{req.courseTitle}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                        {req.batchName}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="text-slate-600">
                      <strong>Submitted by CR:</strong> {req.crName} • <strong>Current:</strong> {req.currentSchedule} → <strong>Requested:</strong> {req.requestedSchedule}
                    </p>

                    <p className="text-slate-500 italic">Reason: "{req.reason}"</p>
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReviewRequest(req.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectReqId(req.id)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SLOT EDIT MODAL */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingSlot ? 'Edit Routine Class Slot' : 'Add Routine Class Slot'}
            </h3>

            <form onSubmit={handleSaveSlot} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Day of Week *</label>
                <select
                  value={slotForm.day}
                  onChange={e => setSlotForm({ ...slotForm, day: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
                >
                  <option value="SUNDAY">Sunday</option>
                  <option value="MONDAY">Monday</option>
                  <option value="TUESDAY">Tuesday</option>
                  <option value="WEDNESDAY">Wednesday</option>
                  <option value="THURSDAY">Thursday</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00 AM"
                    value={slotForm.startTime}
                    onChange={e => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="11:30 AM"
                    value={slotForm.endTime}
                    onChange={e => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="SWE 305"
                    value={slotForm.courseCode}
                    onChange={e => setSlotForm({ ...slotForm, courseCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="502 Lab"
                    value={slotForm.room}
                    onChange={e => setSlotForm({ ...slotForm, room: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Database Systems"
                  value={slotForm.courseTitle}
                  onChange={e => setSlotForm({ ...slotForm, courseTitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Teacher / Instructor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Tanvir Rahman"
                  value={slotForm.teacherName}
                  onChange={e => setSlotForm({ ...slotForm, teacherName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : editingSlot ? 'Update Class Slot' : 'Add Class Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {rejectReqId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Routine Change Request</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rejection Feedback / Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Schedule conflict in Room 504 on Tuesday afternoon."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setRejectReqId(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReviewRequest(rejectReqId, 'REJECTED')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
