import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import {
  Users, BookOpen, Layers, ShieldCheck, Bell, Activity,
  Plus, Search, Filter, CheckCircle2, XCircle, AlertCircle,
  Eye, Edit, Trash2, Key, Download, RefreshCw, Sparkles,
  Calendar, Clock, Megaphone, ArrowUpRight, Check, X,
  FileSpreadsheet, Shield, UserCheck, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { BatchDashboardViewer } from '../../components/admin/BatchDashboardViewer';
import {
  User, Batch, Course, DepartmentNotice, Resource,
  AuditLog, RoutineSlot, UserRole, ExamType, Faculty
} from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const { addToast } = useNotifications();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'batch-viewer' | 'students' | 'faculty' | 'courses' | 'notices' | 'verification' | 'logs'
  >('overview');

  // Selected Batch for Inspector
  const [selectedBatchForViewer, setSelectedBatchForViewer] = useState<string>('batch-9');

  // Main Data States
  const [students, setStudents] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [notices, setNotices] = useState<DepartmentNotice[]>([]);
  const [pendingResources, setPendingResources] = useState<Resource[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Student Management States ---
  const [studentSearch, setStudentSearch] = useState('');
  const [studentBatchFilter, setStudentBatchFilter] = useState('');
  const [studentRoleFilter, setStudentRoleFilter] = useState('');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);

  const [studentForm, setStudentForm] = useState({
    studentId: '',
    name: '',
    email: '',
    phone: '',
    batchId: 'batch-9',
    currentSemester: 5,
    role: 'STUDENT' as UserRole,
    password: 'password123',
  });

  const [csvText, setCsvText] = useState('');
  const [csvBatchId, setCsvBatchId] = useState('batch-9');

  // --- Faculty Management States ---
  const [facultySearch, setFacultySearch] = useState('');
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState(false);
  const [isEditFacultyOpen, setIsEditFacultyOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);

  const [facultyForm, setFacultyForm] = useState({
    name: '',
    shortName: '',
    designation: 'Assistant Professor',
    department: 'Software Engineering',
    email: '',
    phone: '',
    officeRoom: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    specialization: '',
  });

  // --- Course Management States ---
  const [courseSearch, setCourseSearch] = useState('');
  const [courseSemesterFilter, setCourseSemesterFilter] = useState<string>('');
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    shortName: '',
    credits: 3.0,
    type: 'THEORY' as 'THEORY' | 'LAB' | 'PROJECT',
    semester: 5,
    assignedFacultyName: '',
    batchIds: ['batch-9'],
  });

  // --- Notice Management States ---
  const [noticeCategoryFilter, setNoticeCategoryFilter] = useState('');
  const [isAddNoticeOpen, setIsAddNoticeOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    category: 'GENERAL' as any,
    isImportant: false,
  });

  // --- Resource Verification States ---
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedResourceToReject, setSelectedResourceToReject] = useState<Resource | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // --- Audit Log Filters ---
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');

  // --- Deletion Dialog State ---
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'student' | 'course' | 'notice' | 'faculty';
    id: string;
    name: string;
  } | null>(null);

  // Fetch all core system data
  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [stRes, btRes, crRes, ntRes, vrRes, lgRes, fcRes] = await Promise.all([
        fetch('/api/admin/students', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/batches', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/notices', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/pending-verification', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/faculty', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (stRes.ok) {
        const d = await stRes.json();
        setStudents(d.students || []);
      }
      if (btRes.ok) {
        const d = await btRes.json();
        const bList = d.batches || [];
        setBatches(bList);
        if (bList.length > 0 && !selectedBatchForViewer) {
          setSelectedBatchForViewer(bList[0].id);
        }
      }
      if (crRes.ok) {
        const d = await crRes.json();
        setCourses(d.courses || []);
      }
      if (ntRes.ok) {
        const d = await ntRes.json();
        setNotices(d.notices || []);
      }
      if (vrRes.ok) {
        const d = await vrRes.json();
        setPendingResources(d.resources || []);
      }
      if (lgRes.ok) {
        const d = await lgRes.json();
        setAuditLogs(d.auditLogs || d.logs || []);
      }
      if (fcRes.ok) {
        const d = await fcRes.json();
        setFaculty(d.faculty || []);
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to fetch admin workspace data');
    } finally {
      setIsLoading(false);
=======
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  Calendar,
  Clock,
  Bell,
  FileCheck,
  Activity,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { adminApiClient, AdminStats } from '../../services/adminApiClient';
import type { AuditLog } from '../../types';

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotifications();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const [statsData, logsData] = await Promise.all([
        adminApiClient.getStats(),
        adminApiClient.getAuditLogs(8),
      ]);
      setStats(statsData);
      setRecentLogs(Array.isArray(logsData) ? logsData : (logsData as any)?.data || (logsData as any)?.logs || []);
      if (showToast) {
        addToast('success', 'Admin dashboard refreshed from Supabase');
      }
    } catch (err: any) {
      console.error('Failed to load admin dashboard stats:', err);
      setRecentLogs([]);
      addToast('error', err.message || 'Failed to fetch dashboard data from server');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    }
  };

  useEffect(() => {
<<<<<<< HEAD
    fetchData();
  }, [token]);

  // Jump to specific batch dashboard viewer
  const handleOpenBatchDashboard = (batchId: string) => {
    setSelectedBatchForViewer(batchId);
    setActiveTab('batch-viewer');
  };

  // --- Student Actions ---
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(studentForm),
      });

      if (res.ok) {
        addToast('success', 'Student registered successfully');
        setIsAddStudentOpen(false);
        setStudentForm({
          studentId: '',
          name: '',
          email: '',
          phone: '',
          batchId: 'batch-9',
          currentSemester: 5,
          role: 'STUDENT',
          password: 'password123',
        });
        fetchData();
      } else {
        const d = await res.json();
        addToast('error', d.error || 'Failed to create student');
      }
    } catch (e) {
      addToast('error', 'Server error creating student');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(studentForm),
      });

      if (res.ok) {
        addToast('success', 'Student profile updated');
        setIsEditStudentOpen(false);
        setSelectedStudent(null);
        fetchData();
      } else {
        const d = await res.json();
        addToast('error', d.error || 'Failed to update student');
      }
    } catch (e) {
      addToast('error', 'Server error updating student');
    }
  };

  const handleToggleCRRole = async (st: User) => {
    const nextRole = st.role === 'CR' ? 'STUDENT' : 'CR';
    try {
      const res = await fetch(`/api/admin/users/${st.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });

      if (res.ok) {
        addToast('success', `${st.name} is now ${nextRole}`);
        fetchData();
      }
    } catch (e) {
      addToast('error', 'Failed to change role');
    }
  };

  const handleResetPassword = async (st: User) => {
    try {
      const res = await fetch(`/api/admin/users/${st.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: 'password123' }),
      });

      if (res.ok) {
        addToast('success', `Password reset to "password123" for ${st.name}`);
      } else {
        addToast('error', 'Failed to reset password');
      }
    } catch (e) {
      addToast('error', 'Server error resetting password');
    }
  };

  const handleBulkCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/users/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ csvData: csvText, defaultBatchId: csvBatchId }),
      });

      if (res.ok) {
        const d = await res.json();
        addToast('success', `Successfully imported ${d.importedCount} students!`);
        setIsImportCsvOpen(false);
        setCsvText('');
        fetchData();
      } else {
        const d = await res.json();
        addToast('error', d.error || 'Import failed');
      }
    } catch (e) {
      addToast('error', 'CSV Import failed');
    }
  };

  // --- Course Actions ---
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(courseForm),
      });

      if (res.ok) {
        addToast('success', 'Course added to catalog');
        setIsAddCourseOpen(false);
        setCourseForm({
          code: '',
          title: '',
          shortName: '',
          credits: 3.0,
          type: 'THEORY',
          semester: 5,
          assignedFacultyName: '',
          batchIds: ['batch-9'],
        });
        fetchData();
      } else {
        const d = await res.json();
        addToast('error', d.error || 'Failed to create course');
      }
    } catch (e) {
      addToast('error', 'Server error creating course');
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      const res = await fetch(`/api/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(courseForm),
      });

      if (res.ok) {
        addToast('success', 'Course updated successfully');
        setIsEditCourseOpen(false);
        setSelectedCourse(null);
        fetchData();
      } else {
        const d = await res.json();
        addToast('error', d.error || 'Failed to update course');
      }
    } catch (e) {
      addToast('error', 'Server error updating course');
    }
  };

  // --- Notice Actions ---
  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(noticeForm),
      });

      if (res.ok) {
        addToast('success', 'Department Circular Published');
        setIsAddNoticeOpen(false);
        setNoticeForm({ title: '', content: '', category: 'GENERAL', isImportant: false });
        fetchData();
      } else {
        const d = await res.json();
        addToast('error', d.error || 'Failed to publish notice');
      }
    } catch (e) {
      addToast('error', 'Server error creating notice');
    }
  };

  // --- Resource Actions ---
  const handleApproveResource = async (resId: string) => {
    try {
      const res = await fetch(`/api/admin/resources/${resId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'APPROVE' }),
      });

      if (res.ok) {
        addToast('success', 'Resource approved and published!');
        fetchData();
      } else {
        addToast('error', 'Failed to approve resource');
      }
    } catch (e) {
      addToast('error', 'Server error approving resource');
    }
  };

  const handleRejectResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceToReject) return;

    try {
      const res = await fetch(`/api/admin/resources/${selectedResourceToReject.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'REJECT', rejectionReason }),
      });

      if (res.ok) {
        addToast('success', 'Resource rejected with feedback');
        setIsRejectModalOpen(false);
        setSelectedResourceToReject(null);
        setRejectionReason('');
        fetchData();
      } else {
        addToast('error', 'Failed to reject resource');
      }
    } catch (e) {
      addToast('error', 'Server error rejecting resource');
    }
  };

  // --- Faculty Actions ---
  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/faculty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(facultyForm),
      });

      if (res.ok) {
        addToast('success', 'Faculty member added successfully!');
        setIsAddFacultyOpen(false);
        setFacultyForm({
          name: '',
          shortName: '',
          designation: 'Assistant Professor',
          department: 'Software Engineering',
          email: '',
          phone: '',
          officeRoom: '',
          photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
          specialization: '',
        });
        fetchData();
      } else {
        const d = await res.json();
        addToast('error', d.error || 'Failed to add faculty member');
      }
    } catch (e) {
      addToast('error', 'Server error adding faculty member');
    }
  };

  const handleUpdateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty) return;

    try {
      const res = await fetch(`/api/admin/faculty/${selectedFaculty.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(facultyForm),
      });

      if (res.ok) {
        addToast('success', 'Faculty details updated successfully!');
        setIsEditFacultyOpen(false);
        setSelectedFaculty(null);
        fetchData();
      } else {
        const d = await res.json();
        addToast('error', d.error || 'Failed to update faculty member');
      }
    } catch (e) {
      addToast('error', 'Server error updating faculty member');
    }
  };

  // --- Deletion Confirm Execution ---
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;

    try {
      let url = '';
      if (deleteTarget.type === 'student') url = `/api/admin/users/${deleteTarget.id}`;
      if (deleteTarget.type === 'faculty') url = `/api/admin/faculty/${deleteTarget.id}`;
      if (deleteTarget.type === 'course') url = `/api/courses/${deleteTarget.id}`;
      if (deleteTarget.type === 'notice') url = `/api/notices/${deleteTarget.id}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        addToast('success', `${deleteTarget.name} deleted successfully`);
        setDeleteTarget(null);
        fetchData();
      } else {
        const d = await res.json();
        addToast('error', d.error || 'Deletion failed');
      }
    } catch (e) {
      addToast('error', 'Server error during deletion');
    }
  };

  // Filtered Lists
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email && s.email.toLowerCase().includes(studentSearch.toLowerCase()));
    const matchesBatch = studentBatchFilter ? s.batchId === studentBatchFilter : true;
    const matchesRole = studentRoleFilter ? s.role === studentRoleFilter : true;
    return matchesSearch && matchesBatch && matchesRole;
  });

  const filteredFaculty = faculty.filter(f => {
    const q = facultySearch.toLowerCase().trim();
    if (!q) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      (f.shortName && f.shortName.toLowerCase().includes(q)) ||
      (f.designation && f.designation.toLowerCase().includes(q)) ||
      (f.specialization && f.specialization.toLowerCase().includes(q)) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  });

  const filteredCourses = courses.filter(c => {
    const matchesSearch =
      c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.title.toLowerCase().includes(courseSearch.toLowerCase());
    const matchesSemester = courseSemesterFilter ? String(c.semester) === courseSemesterFilter : true;
    return matchesSearch && matchesSemester;
  });

  const filteredNotices = notices.filter(n => {
    if (!noticeCategoryFilter) return true;
    return n.category === noticeCategoryFilter;
  });

  const filteredLogs = auditLogs.filter(l => {
    const matchesSearch =
      l.actorName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      (l.target && l.target.toLowerCase().includes(logSearch.toLowerCase()));
    const matchesAction = logActionFilter ? l.action === logActionFilter : true;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Shield className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                SWE Department Administration Control Desk
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized academic governance, batch dashboards, student directory, courses, and circulars
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh All
          </button>
          <button
            onClick={() => {
              setSelectedBatchForViewer(batches[0]?.id || 'batch-9');
              setActiveTab('batch-viewer');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            View Batch Dashboards
          </button>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 overflow-x-auto no-scrollbar pb-1 text-xs font-bold">
        {[
          { id: 'overview', label: 'System Overview', icon: Activity },
          { id: 'batch-viewer', label: 'Batch Dashboards (Live)', icon: Layers, highlight: true },
          { id: 'students', label: `Students (${students.length})`, icon: Users },
          { id: 'faculty', label: `Faculty (${faculty.length})`, icon: ShieldCheck },
          { id: 'courses', label: `Courses (${courses.length})`, icon: BookOpen },
          { id: 'notices', label: `Notices (${notices.length})`, icon: Bell },
          { id: 'verification', label: `Verification (${pendingResources.length})`, icon: ShieldAlert, badge: pendingResources.length },
          { id: 'logs', label: `Audit Logs (${auditLogs.length})`, icon: Clock },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-t-xl transition-all whitespace-nowrap text-xs flex items-center gap-2 ${
                isActive
                  ? 'bg-white text-blue-600 border-t-2 border-t-blue-600 border-x border-slate-200 shadow-2xs font-black'
                  : tab.highlight
                  ? 'text-blue-600 bg-blue-50/50 hover:bg-blue-50 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-bold'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : tab.highlight ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-mono">
                  {tab.badge}
                </span>
              ) : null}
            </button>
=======
    fetchDashboardData();
  }, []);

  const cards = [
    {
      title: 'Users & Students',
      count: stats?.totalUsers ?? '—',
      subtitle: `${stats?.totalStudents ?? 0} students, ${stats?.totalCRs ?? 0} CRs`,
      icon: Users,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      href: '/admin/students',
    },
    {
      title: 'Academic Batches',
      count: stats?.totalBatches ?? '—',
      subtitle: `${stats?.activeBatches ?? 0} active cohorts`,
      icon: GraduationCap,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      href: '/admin/batches',
    },
    {
      title: 'Courses Catalog',
      count: stats?.totalCourses ?? '—',
      subtitle: 'Syllabus subjects',
      icon: BookOpen,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      href: '/admin/courses',
    },
    {
      title: 'Faculty Members',
      count: stats?.totalFaculty ?? '—',
      subtitle: 'Department professors',
      icon: UserCheck,
      color: 'text-violet-600 bg-violet-50 border-violet-100',
      href: '/admin/faculty',
    },
    {
      title: 'Routine Slots',
      count: stats?.totalRoutineSlots ?? '—',
      subtitle: 'Weekly schedule entries',
      icon: Calendar,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      href: '/admin/routine',
    },
    {
      title: 'Department Notices',
      count: stats?.totalNotices ?? '—',
      subtitle: 'Published alerts',
      icon: Bell,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      href: '/admin/notices',
    },
    {
      title: 'Resources Moderation',
      count: stats?.totalResources ?? '—',
      subtitle: `${stats?.pendingResources ?? 0} pending reviews`,
      icon: FileCheck,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
      href: '/admin/verification',
    },
    {
      title: 'Audit Logs',
      count: stats?.recentAuditLogs?.length ?? '—',
      subtitle: 'Logged admin mutations',
      icon: Activity,
      color: 'text-slate-600 bg-slate-100 border-slate-200',
      href: '/admin/activity',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / System Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#0B2348] text-white p-6 rounded-2xl shadow-sm border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Supabase PostgreSQL Live
              </span>
              <span className="text-xs text-slate-400 font-mono">Role: {user?.role || 'ADMIN'}</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Central Admin Control Portal
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Welcome back, {user?.name || 'Administrator'}. Manage students, courses, routines, faculty, batches, and system moderation with direct Supabase PostgreSQL persistence and audit tracking.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
            <Link
              to="/admin/students"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563EB] hover:bg-blue-600 text-white shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Manage Records
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.href}
              className="group bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className={`p-2.5 rounded-xl border ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {isLoading ? '...' : card.count}
                </span>
                <h3 className="text-xs font-bold text-slate-700 mt-0.5">{card.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{card.subtitle}</p>
              </div>
            </Link>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
          );
        })}
      </div>

<<<<<<< HEAD
      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
            <div onClick={() => setActiveTab('students')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-300 transition-all">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Students</span>
              <span className="text-2xl font-black text-slate-900 block mt-1">{students.length}</span>
              <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Active Profiles</span>
            </div>
            <div onClick={() => setActiveTab('batch-viewer')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-300 transition-all">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Batches</span>
              <span className="text-2xl font-black text-blue-600 block mt-1">{batches.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Academic Levels</span>
            </div>
            <div onClick={() => setActiveTab('faculty')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-300 transition-all">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Faculty Members</span>
              <span className="text-2xl font-black text-teal-600 block mt-1">{faculty.length}</span>
              <span className="text-[11px] text-teal-600 font-semibold mt-1 block">Active Teachers</span>
            </div>
            <div onClick={() => setActiveTab('courses')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-300 transition-all">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Course Catalog</span>
              <span className="text-2xl font-black text-indigo-600 block mt-1">{courses.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Theory & Labs</span>
            </div>
            <div onClick={() => setActiveTab('notices')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-300 transition-all">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Dept Circulars</span>
              <span className="text-2xl font-black text-amber-600 block mt-1">{notices.length}</span>
              <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Published</span>
            </div>
            <div onClick={() => setActiveTab('verification')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-300 transition-all">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Pending Queue</span>
              <span className={`text-2xl font-black block mt-1 ${pendingResources.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {pendingResources.length}
              </span>
              <span className="text-[11px] text-rose-500 font-semibold mt-1 block">Needs Review</span>
            </div>
            <div onClick={() => setActiveTab('students')} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-300 transition-all">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Class Reps (CRs)</span>
              <span className="text-2xl font-black text-teal-600 block mt-1">
                {students.filter(s => s.role === 'CR').length}
              </span>
              <span className="text-[11px] text-teal-600 font-semibold mt-1 block">Appointed</span>
            </div>
          </div>

          {/* Batches Grid with 1-Click "View Live Dashboard" */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Department Academic Batches & Live Dashboard Access
                </h3>
                <p className="text-xs text-slate-500">
                  Select any batch below to view or manage their live class schedule, upcoming exams, notices, and students.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedBatchForViewer(batches[0]?.id || 'batch-9');
                  setActiveTab('batch-viewer');
                }}
                className="px-3.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0"
              >
                <span>Full Batch Dashboard Explorer</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {batches.map(b => {
                const batchStudents = students.filter(s => s.batchId === b.id);
                const batchCrs = batchStudents.filter(s => s.role === 'CR');
                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold text-xs rounded-lg">
                          Semester {b.currentSemester}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{b.academicSession || '2023-2024'}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-2">{b.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mode: <span className="font-semibold text-slate-700">{b.semesterMode || 'SEQUENCE'}</span>
                      </p>

                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{batchStudents.length} Students</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span>{batchCrs.length} CRs</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenBatchDashboard(b.id)}
                      className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Inspect {b.name} Dashboard</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions & Recent System Activity */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Quick Actions Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Administrative Quick Actions
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-all group"
                >
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-lg inline-block group-hover:scale-105 transition-transform mb-2">
                    <Users className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 block">Register Student</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Create individual student profile</p>
                </button>

                <button
                  onClick={() => setIsImportCsvOpen(true)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-all group"
                >
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg inline-block group-hover:scale-105 transition-transform mb-2">
                    <FileSpreadsheet className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 block">Bulk Import (CSV)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Import batch student roster</p>
                </button>

                <button
                  onClick={() => setIsAddCourseOpen(true)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-all group"
                >
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg inline-block group-hover:scale-105 transition-transform mb-2">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 block">Create New Course</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Add theory or lab syllabus</p>
                </button>

                <button
                  onClick={() => setIsAddNoticeOpen(true)}
                  className="p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-left transition-all group"
                >
                  <span className="p-2 bg-rose-50 text-rose-600 rounded-lg inline-block group-hover:scale-105 transition-transform mb-2">
                    <Bell className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-slate-900 block">Publish Circular</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Broadcast department notice</p>
                </button>
              </div>
            </div>

            {/* Recent Audit Activity */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Recent Governance Activity
                </h3>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-blue-600 hover:underline text-xs font-bold"
                >
                  View All Logs ({auditLogs.length})
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {auditLogs.slice(0, 5).map(log => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 font-mono text-[10px] font-bold rounded">
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-900">{log.target}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        by {log.actorName} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BATCH LIVE DASHBOARD VIEWER (Dedicated Real-time Multi-batch Inspector) */}
      {/* ========================================================================= */}
      {activeTab === 'batch-viewer' && (
        <BatchDashboardViewer
          batches={batches}
          initialBatchId={selectedBatchForViewer}
          onRefreshAll={fetchData}
        />
      )}

      {/* ========================================================================= */}
      {/* 3. STUDENTS MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students by name, ID, email..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={studentBatchFilter}
                onChange={e => setStudentBatchFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={studentRoleFilter}
                onChange={e => setStudentRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="CR">Class Rep (CR)</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsImportCsvOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> CSV Import
              </button>
              <button
                onClick={() => setIsAddStudentOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Student
              </button>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="py-3 px-4">Student Profile</th>
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Batch & Semester</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                        No students matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(st => (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center">
                              {st.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block">{st.name}</span>
                              <span className="text-[11px] text-slate-400 block">{st.email || 'No email registered'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{st.studentId}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">{st.batchName || 'General'}</span>
                          <span className="text-[10px] text-slate-400">Semester {st.currentSemester}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            st.role === 'ADMIN'
                              ? 'bg-rose-100 text-rose-800'
                              : st.role === 'CR'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {st.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleToggleCRRole(st)}
                              title={st.role === 'CR' ? 'Demote to Student' : 'Promote to CR'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                st.role === 'CR'
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'
                              }`}
                            >
                              <ShieldAlert className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResetPassword(st)}
                              title="Reset Password to password123"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedStudent(st);
                                setStudentForm({
                                  studentId: st.studentId,
                                  name: st.name,
                                  email: st.email || '',
                                  phone: st.phone || '',
                                  batchId: st.batchId || 'batch-9',
                                  currentSemester: st.currentSemester,
                                  role: st.role,
                                  password: '',
                                });
                                setIsEditStudentOpen(true);
                              }}
                              title="Edit Student"
                              className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTarget({
                                  type: 'student',
                                  id: st.id,
                                  name: `${st.name} (${st.studentId})`,
                                })
                              }
                              title="Delete Student"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FACULTY MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'faculty' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search faculty name, initials (DTF), designation, specialization..."
                value={facultySearch}
                onChange={e => setFacultySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <button
              onClick={() => {
                setFacultyForm({
                  name: '',
                  shortName: '',
                  designation: 'Assistant Professor',
                  department: 'Software Engineering',
                  email: '',
                  phone: '',
                  officeRoom: '',
                  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
                  specialization: '',
                });
                setIsAddFacultyOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Faculty Member
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFaculty.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No faculty members found.
              </div>
            ) : (
              filteredFaculty.map(member => {
                const assignedCourses = courses.filter(
                  c => c.assignedFacultyName?.toLowerCase() === member.name.toLowerCase() ||
                       (member.shortName && c.assignedFacultyName?.toLowerCase() === member.shortName.toLowerCase())
                );

                return (
                  <div
                    key={member.id}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <img
                          src={member.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0D8ABC&color=fff`}
                          alt={member.name}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-2xs shrink-0"
                          onError={(e: any) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=0D8ABC&color=fff`;
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{member.name}</h4>
                            {member.shortName && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 font-mono font-bold text-[10px] rounded shrink-0">
                                {member.shortName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{member.designation}</p>
                          <p className="text-[10px] text-slate-400">{member.department || 'Software Engineering'}</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-[11px] text-slate-600">
                        {member.email && (
                          <p className="truncate">
                            <span className="text-slate-400 font-medium">Email: </span>
                            <span className="font-mono text-[10px]">{member.email}</span>
                          </p>
                        )}
                        {member.phone && (
                          <p>
                            <span className="text-slate-400 font-medium">Phone: </span>
                            <span>{member.phone}</span>
                          </p>
                        )}
                        {member.officeRoom && (
                          <p>
                            <span className="text-slate-400 font-medium">Office: </span>
                            <span className="font-semibold text-slate-800">{member.officeRoom}</span>
                          </p>
                        )}
                        {member.specialization && (
                          <p className="text-[10px] text-slate-500 line-clamp-1">
                            <span className="text-slate-400 font-medium">Research: </span>
                            {member.specialization}
                          </p>
                        )}
                      </div>

                      {assignedCourses.length > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Assigned Courses ({assignedCourses.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {assignedCourses.map(c => (
                              <span key={c.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono rounded">
                                {c.code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Active Faculty
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedFaculty(member);
                            setFacultyForm({
                              name: member.name,
                              shortName: member.shortName || '',
                              designation: member.designation || 'Assistant Professor',
                              department: member.department || 'Software Engineering',
                              email: member.email || '',
                              phone: member.phone || '',
                              officeRoom: member.officeRoom || '',
                              photoUrl: member.photoUrl || '',
                              specialization: member.specialization || '',
                            });
                            setIsEditFacultyOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                          title="Edit Faculty Member"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              type: 'faculty',
                              id: member.id,
                              name: member.name,
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Faculty Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. COURSES MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search course code, title..."
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <select
                value={courseSemesterFilter}
                onChange={e => setCourseSemesterFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={String(s)}>Semester {s}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsAddCourseOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Course
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCourses.length === 0 ? (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No courses found.
              </div>
            ) : (
              filteredCourses.map(course => (
                <div
                  key={course.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-bold text-[10px] rounded">
                        {course.code}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded">
                        Semester {course.semester}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{course.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {course.credits} Credits • {course.type} • Faculty: {course.assignedFacultyName || 'Dept Faculty'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {course.batchIds?.length || 0} Batches Assigned
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setCourseForm({
                            code: course.code,
                            title: course.title,
                            shortName: course.shortName || '',
                            credits: course.credits,
                            type: course.type as any,
                            semester: course.semester,
                            assignedFacultyName: course.assignedFacultyName || '',
                            batchIds: course.batchIds || ['batch-9'],
                          });
                          setIsEditCourseOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-900"
                        title="Edit course"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: 'course',
                            id: course.id,
                            name: `${course.code} (${course.title})`,
                          })
                        }
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Delete course"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. NOTICES MANAGEMENT TAB */}
      {/* ========================================================================= */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                value={noticeCategoryFilter}
                onChange={e => setNoticeCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
              >
                <option value="">All Categories</option>
                <option value="GENERAL">General</option>
                <option value="EXAM">Exam</option>
                <option value="REGISTRATION">Registration</option>
                <option value="SEMINAR">Seminar</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <button
              onClick={() => setIsAddNoticeOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Publish Circular
            </button>
          </div>

          <div className="space-y-3">
            {filteredNotices.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                No department circulars published.
              </div>
            ) : (
              filteredNotices.map(notice => (
                <div
                  key={notice.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                        {notice.category}
                      </span>
                      {notice.isImportant && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded">
                          IMPORTANT
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">{notice.publishDate}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{notice.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{notice.content}</p>
                  </div>

                  <button
                    onClick={() =>
                      setDeleteTarget({
                        type: 'notice',
                        id: notice.id,
                        name: notice.title,
                      })
                    }
                    className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                    title="Delete notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. VERIFICATION QUEUE TAB */}
      {/* ========================================================================= */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Resource Moderation Queue</h3>
              <p className="text-[11px] text-slate-500">Review student contributions before publishing to portal</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-xl">
              {pendingResources.length} Pending
            </span>
          </div>

          <div className="space-y-3">
            {pendingResources.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                All resources are reviewed! Verification queue is empty.
              </div>
            ) : (
              pendingResources.map(res => (
                <div
                  key={res.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold text-[10px] rounded">
                        {res.type}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold rounded">
                        {res.courseCode}
                      </span>
                      <span className="text-[10px] text-slate-400">by {res.uploaderName} ({res.uploaderStudentId})</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900">{res.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{res.description || res.fileName}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveResource(res.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => {
                        setSelectedResourceToReject(res);
                        setIsRejectModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-lg flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. AUDIT LOGS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs by actor, action, target..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>
            </div>

            <button
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
                const dl = document.createElement('a');
                dl.setAttribute('href', dataStr);
                dl.setAttribute('download', `audit_logs_${Date.now()}.json`);
                dl.click();
              }}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100 font-medium text-xs">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">No logs found.</div>
              ) : (
                filteredLogs.map(log => (
                  <div key={log.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded">
                          {log.action}
                        </span>
                        <span className="font-bold text-slate-900">{log.target}</span>
                      </div>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        Actor: {log.actorName} ({log.actorId}) {log.details ? `• ${log.details}` : ''}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isAddStudentOpen || isEditStudentOpen}
        onClose={() => {
          setIsAddStudentOpen(false);
          setIsEditStudentOpen(false);
          setSelectedStudent(null);
        }}
        title={isAddStudentOpen ? 'Register Student Profile' : 'Edit Student Profile'}
      >
        <form onSubmit={isAddStudentOpen ? handleCreateStudent : handleUpdateStudent} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Student ID</label>
              <input
                type="text"
                required
                value={studentForm.studentId}
                onChange={e => setStudentForm(prev => ({ ...prev, studentId: e.target.value }))}
                placeholder="2022831001"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Full Name</label>
              <input
                type="text"
                required
                value={studentForm.name}
                onChange={e => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Tanvir Ahmed"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Email Address</label>
              <input
                type="email"
                required
                value={studentForm.email}
                onChange={e => setStudentForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="tanvir@student.sust.edu"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Phone Number</label>
              <input
                type="text"
                value={studentForm.phone}
                onChange={e => setStudentForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+880 1711-000000"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Batch</label>
              <select
                value={studentForm.batchId}
                onChange={e => setStudentForm(prev => ({ ...prev, batchId: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Semester</label>
              <select
                value={studentForm.currentSemester}
                onChange={e => setStudentForm(prev => ({ ...prev, currentSemester: Number(e.target.value) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Portal Role</label>
              <select
                value={studentForm.role}
                onChange={e => setStudentForm(prev => ({ ...prev, role: e.target.value as any }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                <option value="STUDENT">Student</option>
                <option value="CR">Class Rep (CR)</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          {isAddStudentOpen && (
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Initial Password</label>
              <input
                type="text"
                required
                value={studentForm.password}
                onChange={e => setStudentForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="password123"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddStudentOpen(false);
                setIsEditStudentOpen(false);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
            >
              {isAddStudentOpen ? 'Register Student' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <Modal
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        title="Bulk Import Students via CSV"
      >
        <form onSubmit={handleBulkCsvImport} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Target Batch</label>
            <select
              value={csvBatchId}
              onChange={e => setCsvBatchId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">
              CSV Data (studentId, name, email)
            </label>
            <textarea
              required
              rows={6}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder="2022831001, Tanvir Ahmed, tanvir@student.sust.edu&#10;2022831002, Sarah Karim, sarah@student.sust.edu"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 font-mono text-[11px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsImportCsvOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
            >
              Execute Bulk Import
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isAddFacultyOpen || isEditFacultyOpen}
        onClose={() => {
          setIsAddFacultyOpen(false);
          setIsEditFacultyOpen(false);
          setSelectedFaculty(null);
        }}
        title={isAddFacultyOpen ? 'Add Faculty Member to Department' : 'Edit Faculty Details'}
      >
        <form onSubmit={isAddFacultyOpen ? handleCreateFaculty : handleUpdateFaculty} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Full Name</label>
              <input
                type="text"
                required
                value={facultyForm.name}
                onChange={e => setFacultyForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Dr. Md. Forhad Rabbi"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Short Code / Initials</label>
              <input
                type="text"
                value={facultyForm.shortName}
                onChange={e => setFacultyForm(prev => ({ ...prev, shortName: e.target.value.toUpperCase() }))}
                placeholder="e.g. MFR"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Designation</label>
              <select
                value={facultyForm.designation}
                onChange={e => setFacultyForm(prev => ({ ...prev, designation: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Lecturer">Lecturer</option>
                <option value="Adjunct Faculty">Adjunct Faculty</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Department</label>
              <input
                type="text"
                value={facultyForm.department}
                onChange={e => setFacultyForm(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Software Engineering"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Official Email</label>
              <input
                type="email"
                required
                value={facultyForm.email}
                onChange={e => setFacultyForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="faculty@sust.edu"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Phone Number</label>
              <input
                type="text"
                value={facultyForm.phone}
                onChange={e => setFacultyForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+880 1711-XXXXXX"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Office Room</label>
              <input
                type="text"
                value={facultyForm.officeRoom}
                onChange={e => setFacultyForm(prev => ({ ...prev, officeRoom: e.target.value }))}
                placeholder="Room 304, Academic Bldg II"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Photo URL</label>
              <input
                type="url"
                value={facultyForm.photoUrl}
                onChange={e => setFacultyForm(prev => ({ ...prev, photoUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Research Specialization / Area</label>
            <input
              type="text"
              value={facultyForm.specialization}
              onChange={e => setFacultyForm(prev => ({ ...prev, specialization: e.target.value }))}
              placeholder="e.g. Distributed Systems, Machine Learning, HCI"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddFacultyOpen(false);
                setIsEditFacultyOpen(false);
                setSelectedFaculty(null);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
            >
              {isAddFacultyOpen ? 'Add Faculty Member' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Course Modal */}
      <Modal
        isOpen={isAddCourseOpen || isEditCourseOpen}
        onClose={() => {
          setIsAddCourseOpen(false);
          setIsEditCourseOpen(false);
          setSelectedCourse(null);
        }}
        title={isAddCourseOpen ? 'Add New Course to Catalog' : 'Edit Course Syllabus'}
      >
        <form onSubmit={isAddCourseOpen ? handleCreateCourse : handleUpdateCourse} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Course Code</label>
              <input
                type="text"
                required
                value={courseForm.code}
                onChange={e => setCourseForm(prev => ({ ...prev, code: e.target.value }))}
                placeholder="SWE 305"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Credits</label>
              <input
                type="number"
                step="0.5"
                required
                value={courseForm.credits}
                onChange={e => setCourseForm(prev => ({ ...prev, credits: Number(e.target.value) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Course Title</label>
            <input
              type="text"
              required
              value={courseForm.title}
              onChange={e => setCourseForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Software Architecture & Design Patterns"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Semester</label>
              <select
                value={courseForm.semester}
                onChange={e => setCourseForm(prev => ({ ...prev, semester: Number(e.target.value) }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Type</label>
              <select
                value={courseForm.type}
                onChange={e => setCourseForm(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                <option value="THEORY">Theory Course</option>
                <option value="LAB">Lab / Sessional</option>
                <option value="PROJECT">Project / Thesis</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Assigned Faculty Instructor</label>
            <div className="space-y-1.5">
              {faculty.length > 0 && (
                <select
                  value={courseForm.assignedFacultyName}
                  onChange={e => setCourseForm(prev => ({ ...prev, assignedFacultyName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold"
                >
                  <option value="">-- Choose from Faculty Directory --</option>
                  {faculty.map(f => (
                    <option key={f.id} value={f.name}>
                      {f.name} {f.shortName ? `(${f.shortName})` : ''} - {f.designation}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={courseForm.assignedFacultyName}
                onChange={e => setCourseForm(prev => ({ ...prev, assignedFacultyName: e.target.value }))}
                placeholder="Or type custom name: e.g. Dr. Mahbubur Rahman"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsAddCourseOpen(false);
                setIsEditCourseOpen(false);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
            >
              {isAddCourseOpen ? 'Save Course' : 'Update Course'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Publish Notice Modal */}
      <Modal
        isOpen={isAddNoticeOpen}
        onClose={() => setIsAddNoticeOpen(false)}
        title="Publish Department Circular"
      >
        <form onSubmit={handleCreateNotice} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Notice Title</label>
            <input
              type="text"
              required
              value={noticeForm.title}
              onChange={e => setNoticeForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Final Semester Registration & Fee Submission Deadline"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Category</label>
              <select
                value={noticeForm.category}
                onChange={e => setNoticeForm(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
              >
                <option value="GENERAL">General Notice</option>
                <option value="EXAM">Examination</option>
                <option value="REGISTRATION">Semester Registration</option>
                <option value="SEMINAR">Seminar & Workshop</option>
                <option value="HOLIDAY">Holiday Notice</option>
                <option value="URGENT">Urgent Circular</option>
              </select>
            </div>
            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noticeForm.isImportant}
                  onChange={e => setNoticeForm(prev => ({ ...prev, isImportant: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <span className="font-bold text-slate-700">Mark as Important (High Priority)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Notice Content</label>
            <textarea
              required
              rows={4}
              value={noticeForm.content}
              onChange={e => setNoticeForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Enter full notice text..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddNoticeOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
            >
              Publish Notice
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject Resource Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setSelectedResourceToReject(null);
        }}
        title="Reject Resource Contribution"
      >
        <form onSubmit={handleRejectResource} className="space-y-3 text-xs">
          <p className="text-slate-600">
            Provide a feedback reason to the student for why "{selectedResourceToReject?.title}" was not approved.
          </p>

          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Rejection Reason</label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="e.g. Scanned image is blurry / Incomplete question paper"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deletion Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleExecuteDelete}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"?`}
      />
=======
      {/* Split Section: Quick Action Nav & Live Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Hub Navigation */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Entity Management Hub
            </h2>
          </div>

          <div className="space-y-1.5 text-xs">
            <Link
              to="/admin/students"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all font-medium text-slate-700 hover:text-blue-600"
            >
              <span className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-blue-500" /> Users & Students Directory
              </span>
              <span className="text-[11px] text-slate-400 font-mono">CRUD</span>
            </Link>
            <Link
              to="/admin/cr-management"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all font-medium text-slate-700 hover:text-blue-600"
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-500" /> CR Representatives
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Assign</span>
            </Link>
            <Link
              to="/admin/batches"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all font-medium text-slate-700 hover:text-blue-600"
            >
              <span className="flex items-center gap-2.5">
                <GraduationCap className="w-4 h-4 text-indigo-500" /> Academic Batches
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Manage</span>
            </Link>
            <Link
              to="/admin/courses"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all font-medium text-slate-700 hover:text-blue-600"
            >
              <span className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-emerald-500" /> Department Courses
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Manage</span>
            </Link>
            <Link
              to="/admin/faculty"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all font-medium text-slate-700 hover:text-blue-600"
            >
              <span className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-violet-500" /> Faculty Directory
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Manage</span>
            </Link>
            <Link
              to="/admin/routine"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all font-medium text-slate-700 hover:text-blue-600"
            >
              <span className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-amber-500" /> Class Routine Slots
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Schedule</span>
            </Link>
            <Link
              to="/admin/notices"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all font-medium text-slate-700 hover:text-blue-600"
            >
              <span className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-rose-500" /> Department Notices
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Publish</span>
            </Link>
            <Link
              to="/admin/verification"
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all font-medium text-slate-700 hover:text-blue-600"
            >
              <span className="flex items-center gap-2.5">
                <FileCheck className="w-4 h-4 text-cyan-500" /> Resource Moderation
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Review</span>
            </Link>
          </div>
        </div>

        {/* Live Audit Activity Log Feed */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-700" />
                Live Admin Audit Trail
              </h2>
              <p className="text-[11px] text-slate-500">
                Every mutation is automatically audited and timestamped in Supabase.
              </p>
            </div>
            <Link
              to="/admin/activity"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Full History →
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading audit logs...</div>
          ) : recentLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">No recent audit logs recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentLogs.map((log) => (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-900 truncate">
                        {log.target}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{log.details || 'System mutation execution'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] font-medium text-slate-600">
                      by {log.actorName || 'Admin'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    </div>
  );
};
