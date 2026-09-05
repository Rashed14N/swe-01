import React, { useState, useEffect, useMemo } from 'react';
import { FileCheck, CheckCircle2, XCircle, Download, RefreshCw, Trash2, Search, Filter, Database, FileText } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { adminApiClient } from '../../services/adminApiClient';
import type { Resource } from '../../types';

export const AdminResourceVerificationPage: React.FC = () => {
  const { addToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING');
  const [pendingQueue, setPendingQueue] = useState<Resource[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Reject Modal State
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const [pendingData, allData] = await Promise.all([
        adminApiClient.getPendingResources(),
        adminApiClient.getResources(),
      ]);
      setPendingQueue(Array.isArray(pendingData) ? pendingData : (pendingData as any)?.resources || (pendingData as any)?.data || []);
      setAllResources(Array.isArray(allData) ? allData : (allData as any)?.resources || (allData as any)?.data || []);
    } catch (e: any) {
      console.error(e);
      addToast('error', e.message || 'Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleDelete = async (resourceId: string, title: string) => {
    if (!window.confirm(`Permanently delete "${title}" from Supabase database? This action cannot be undone.`)) {
      return;
    }
    try {
      await adminApiClient.deleteResource(resourceId);
      addToast('success', 'Resource permanently deleted from Supabase database!');
      fetchQueue();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to delete resource');
    }
  };

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

  const filteredAllResources = useMemo(() => {
    return allResources.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.courseCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.uploaderName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = !typeFilter || r.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [allResources, searchQuery, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <FileCheck className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Resource Management & Verification</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review student uploads, approve question papers, or permanently delete items from Supabase database.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchQueue()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200">
            {pendingQueue.length} Pending
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'PENDING'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>Pending Submissions ({pendingQueue.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'ALL'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>All Vault Resources ({allResources.length})</span>
        </button>
      </div>

      {/* Tab 1: PENDING QUEUE */}
      {activeTab === 'PENDING' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading pending uploads...</div>
          ) : pendingQueue.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              🎉 All resource submissions have been verified and processed!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
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
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve & Publish
                    </button>
                    <button
                      onClick={() => setRejectId(item.id)}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete permanently from Supabase database"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: ALL VAULT RESOURCES */}
      {activeTab === 'ALL' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search resources by title, course code, uploader..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="">All Types</option>
              <option value="QUESTION">Questions</option>
              <option value="NOTE">Lecture Notes</option>
              <option value="SYLLABUS">Syllabus</option>
              <option value="LAB_MANUAL">Lab Manuals</option>
            </select>
          </div>

          {filteredAllResources.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No resources found matching your search.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAllResources.map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 px-2 rounded-lg transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{item.title}</span>
                      <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 font-mono font-bold text-[10px] rounded border border-blue-200">
                        {item.courseCode}
                      </span>
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 font-bold text-[10px] rounded">
                        {item.type}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.status || 'APPROVED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Course: {item.courseTitle} • Uploader: {item.uploaderName} • Year: {item.academicYear || 'N/A'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download/Preview"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Permanently delete from Supabase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete from Supabase</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                  onChange={(e) => setRejectReason(e.target.value)}
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
