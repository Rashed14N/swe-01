import React, { useState, useEffect } from 'react';
import { Clock, Plus, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { RoutineRequest } from '../../types';

export const CRRoutineRequestsPage: React.FC = () => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [requests, setRequests] = useState<RoutineRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    courseTitle: 'Software Engineering',
    currentSchedule: 'Sunday 12:00 PM - 01:30 PM (Room 401)',
    requestedSchedule: 'Tuesday 02:00 PM - 03:30 PM (Room 504)',
    requestedRoom: 'Room 504 Lab',
    reason: 'Lab maintenance conflict on Sunday.',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/routines/requests', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/routines/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        addToast('success', 'Routine change request submitted to Central Admin!');
        setIsModalOpen(false);
        fetchRequests();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Submission failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
            <RefreshCw className="w-4 h-4" /> Class Representative Desk
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Routine Change Requests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit formal routine modification requests for <strong className="text-slate-800">{user?.batchName}</strong> to Central Admin for department approval.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Request Routine Change
        </button>
      </div>

      {/* Requests History */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Submitted Routine Requests History
        </h3>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
            No routine change requests submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div
                key={req.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{req.courseTitle}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        req.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  <p className="text-slate-600">
                    <strong className="text-slate-700">Current:</strong> {req.currentSchedule} →{' '}
                    <strong className="text-slate-700">Requested:</strong> {req.requestedSchedule}
                  </p>

                  <p className="text-slate-500 italic">Reason: "{req.reason}"</p>

                  {req.rejectionReason && (
                    <p className="text-rose-600 font-medium">
                      Admin Note: {req.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 text-slate-400 text-[10px]">
                  Submitted: {new Date(req.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Request Routine Schedule Change</h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={form.courseTitle}
                  onChange={e => setForm({ ...form, courseTitle: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Current Schedule *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunday 12:00 PM - 01:30 PM (Room 401)"
                  value={form.currentSchedule}
                  onChange={e => setForm({ ...form, currentSchedule: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Requested Schedule *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tuesday 02:00 PM - 03:30 PM (Room 504)"
                  value={form.requestedSchedule}
                  onChange={e => setForm({ ...form, requestedSchedule: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Change *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this routine change is required..."
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
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
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
