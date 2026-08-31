import React, { useState, useEffect } from 'react';
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
    }
  };

  useEffect(() => {
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
          );
        })}
      </div>

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
    </div>
  );
};
