import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, BookOpen, Clock, Bell, FileCheck, CheckCircle2,
  XCircle, Plus, Upload, Trash2, Edit2, ShieldAlert, Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { User, Batch, Course, DepartmentNotice, Resource, Faculty } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'courses' | 'notices' | 'verification' | 'logs'>('overview');

  // Admin Data State
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBatches: 0,
    totalCourses: 0,
    totalNotices: 0,
    pendingVerifications: 0,
  });

  const [students, setStudents] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notices, setNotices] = useState<DepartmentNotice[]>([]);
  const [pendingQueue, setPendingQueue] = useState<Resource[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals state
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<'ACADEMIC' | 'EXAM' | 'HOLIDAY' | 'SCHOLARSHIP' | 'EVENT'>('ACADEMIC');
  const [noticeContent, setNoticeContent] = useState('');

  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);

  const fetchAdminData = () => {
    if (!token) return;

    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);

    fetch('/api/admin/students', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setStudents(data.students || []))
      .catch(console.error);

    fetch('/api/admin/batches', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setBatches(data.batches || []))
      .catch(console.error);

    fetch('/api/admin/courses', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setCourses(data.courses || []))
      .catch(console.error);

    fetch('/api/notices')
      .then(res => res.json())
      .then(data => setNotices(data.notices || []))
      .catch(console.error);

    fetch('/api/admin/pending-verification', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setPendingQueue(data.resources || []))
      .catch(console.error);

    fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setAuditLogs(data.logs || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // Handle Notice Creation
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: noticeTitle,
          category: noticeCategory,
          content: noticeContent,
        }),
      });

      if (res.ok) {
        addToast('success', 'Department Notice Published!');
        setIsNoticeModalOpen(false);
        setNoticeTitle('');
        setNoticeContent('');
        fetchAdminData();
      } else {
        addToast('error', 'Failed to publish notice');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  const handleDeleteNotice = async () => {
    if (!deletingNoticeId) return;
    try {
      const res = await fetch(`/api/notices/${deletingNoticeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast('success', 'Department Notice Deleted');
        setDeletingNoticeId(null);
        fetchAdminData();
      }
    } catch (e) {
      addToast('error', 'Delete failed');
    }
  };

  const handleVerifyResource = async (resourceId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/resources/${resourceId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        addToast('success', `Resource ${status.toLowerCase()} successfully!`);
        fetchAdminData();
      }
    } catch (e) {
      addToast('error', 'Action failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Banner */}
      <div
        style={{
          background: 'linear-gradient(110deg, #0A192F 0%, #0F284E 60%, #173B73 100%)',
        }}
        className="text-white p-6 rounded-2xl shadow-xs border border-[#173B73] flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 text-[11px] font-extrabold mb-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Central Department Administration
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">SWE Portal Central Control Panel</h1>
          <p className="text-xs text-blue-100/80 mt-1 max-w-2xl font-medium leading-relaxed">
            System administration, student rosters, batch isolation policies, department notices, and audit logging.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#DDE5F0] overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
        {[
          { id: 'overview', label: 'System Overview' },
          { id: 'students', label: `Students (${students.length})` },
          { id: 'courses', label: `Courses (${courses.length})` },
          { id: 'notices', label: `Notices (${notices.length})` },
          { id: 'verification', label: `Queue (${pendingQueue.length})` },
          { id: 'logs', label: 'Audit Logs' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-t-xl transition-all whitespace-nowrap text-xs ${
              activeTab === tab.id
                ? 'bg-white text-[#1769E8] border-t-2 border-t-[#2563EB] border-x border-[#DDE5F0] shadow-2xs font-extrabold'
                : 'text-[#52657C] hover:text-[#0A2147] hover:bg-[#F1F5FA] font-bold'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Students</span>
              <span className="text-xl font-black text-slate-900 block mt-1">{stats.totalStudents}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Batches</span>
              <span className="text-xl font-black text-slate-900 block mt-1">{stats.totalBatches}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Courses</span>
              <span className="text-xl font-black text-slate-900 block mt-1">{stats.totalCourses}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Notices</span>
              <span className="text-xl font-black text-slate-900 block mt-1">{stats.totalNotices}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pending Verifications</span>
              <span className="text-xl font-black text-amber-600 block mt-1">{stats.pendingVerifications}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Batches Directory</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {batches.map(b => (
                <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{b.name}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                      {b.academicSession || `Sem ${b.currentSemester}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Current Semester: {b.currentSemester} • Batch ID: {b.id}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
            <span>Student User Roster</span>
            <span className="text-slate-400">Total: {students.length}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {students.map(st => (
              <div key={st.id} className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{st.name}</span>
                    <span className="text-slate-400 font-mono">({st.studentId})</span>
                    <span className={`px-2 py-0.2 text-[10px] font-bold rounded ${
                      st.role === 'ADMIN' ? 'bg-rose-100 text-rose-800' : st.role === 'CR' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {st.role}
                    </span>
                  </div>
                  <span className="text-slate-500 block mt-0.5">{st.email} • {st.batchName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
            <span>Department Offered Courses</span>
          </div>

          <div className="divide-y divide-slate-100">
            {courses.map(c => (
              <div key={c.id} className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{c.title}</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded">
                      {c.code}
                    </span>
                  </div>
                  <span className="text-slate-500 block mt-0.5">Faculty: {c.assignedFacultyName} • {c.credits} Credits</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Manage Department Circulars</h3>
              <p className="text-xs text-slate-500">Publish official notices to all department students</p>
            </div>
            <button
              onClick={() => setIsNoticeModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Publish New Circular
            </button>
          </div>

          <div className="space-y-3">
            {notices.map(n => (
              <div key={n.id} className="bg-white p-5 rounded-xl border border-slate-200 flex justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                      {n.category}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600">{n.content}</p>
                </div>
                <button
                  onClick={() => setDeletingNoticeId(n.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 self-start"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'verification' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Pending Resource Verification Queue</h3>
          {pendingQueue.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center italic">No pending items in queue.</p>
          ) : (
            <div className="space-y-3">
              {pendingQueue.map(item => (
                <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{item.title} ({item.courseCode})</span>
                    <span className="text-slate-500">By: {item.uploaderName} • Type: {item.type}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerifyResource(item.id, 'APPROVED')}
                      className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleVerifyResource(item.id, 'REJECTED')}
                      className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-4">System Activity Audit Log</h3>
          <div className="space-y-2 font-mono text-[11px] text-slate-700">
            {auditLogs.map((log, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span className="font-bold text-slate-900 font-sans">{log.actorName || log.userName || 'Admin'}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.action === 'SEMESTER_PROGRESSION_ADVANCED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {log.action}
                  </span>
                </div>
                <span className="text-slate-600 font-sans text-xs">{log.details || log.target}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for Creating Notice */}
      <Modal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        title="Publish Official Department Notice"
      >
        <form onSubmit={handleCreateNotice} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Category</label>
            <select
              value={noticeCategory}
              onChange={e => setNoticeCategory(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
            >
              <option value="ACADEMIC">Academic</option>
              <option value="EXAM">Exam Circular</option>
              <option value="HOLIDAY">Holiday</option>
              <option value="SCHOLARSHIP">Scholarship</option>
              <option value="EVENT">Department Event</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={noticeTitle}
              onChange={e => setNoticeTitle(e.target.value)}
              placeholder="e.g. Midterm Examination Guidelines"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Content</label>
            <textarea
              required
              rows={4}
              value={noticeContent}
              onChange={e => setNoticeContent(e.target.value)}
              placeholder="Enter official circular details..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNoticeModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
            >
              Publish Circular
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deletingNoticeId)}
        onClose={() => setDeletingNoticeId(null)}
        onConfirm={handleDeleteNotice}
        title="Delete Department Notice"
        message="Are you sure you want to remove this official circular?"
      />
    </div>
  );
};
