import React, { useState, useEffect } from 'react';
import { FileCheck, CheckCircle2, XCircle, Download, RefreshCw } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { adminApiClient } from '../../services/adminApiClient';
import type { Resource } from '../../types';

export const AdminResourceVerificationPage: React.FC = () => {
  const { addToast } = useNotifications();

  const [pendingQueue, setPendingQueue] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reject Modal State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const data = await adminApiClient.getPendingResources();
      setPendingQueue(Array.isArray(data) ? data : (data as any)?.resources || (data as any)?.data || []);
    } catch (e: any) {
      console.error(e);
      setPendingQueue([]);
      addToast('error', e.message || 'Failed to load pending resources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleVerify = async (resourceId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await adminApiClient.verifyResource(
        resourceId,
        status,
        status === 'REJECTED' ? rejectReason : undefined
      );
      addToast('success', `Resource ${status.toLowerCase()} and synchronized with Supabase!`);
      setRejectId(null);
      setRejectReason('');
      fetchQueue();
    } catch (e: any) {
      addToast('error', e.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <FileCheck className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Resource Verification Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review student uploads (question bank, notes, lab reports) before publishing to the department repository.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchQueue()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh queue"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
            {pendingQueue.length} Pending Submissions
          </span>
        </div>
      </div>

      {/* Queue List */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading pending uploads...</div>
        ) : pendingQueue.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            🎉 All resource submissions have been verified and processed!
          </div>
        ) : (
          <div className="space-y-3">
            {pendingQueue.map(item => (
              <div
                key={item.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold font-mono rounded">
                      {item.courseCode}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">
                      {item.type}
                    </span>
                  </div>

                  <p className="text-slate-600">
                    <strong>Course:</strong> {item.courseTitle} • <strong>Semester:</strong> {item.semester}th Sem
                  </p>

                  <p className="text-slate-500">
                    <strong>Uploader:</strong> {item.uploaderName} ({item.uploaderStudentId || 'Student'})
                  </p>

                  <div className="pt-1 flex items-center gap-2">
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" /> Preview Attached File ({item.fileSize || 'PDF'})
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleVerify(item.id, 'APPROVED')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Publish
                  </button>
                  <button
                    onClick={() => setRejectId(item.id)}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REJECT MODAL */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Resource Submission</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Rejection *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Unclear document scan or missing solution page."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setRejectId(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleVerify(rejectId, 'REJECTED')}
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
