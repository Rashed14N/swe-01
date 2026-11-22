import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Users,
  Clock,
  Smartphone,
  Monitor,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
  RefreshCw,
  Lightbulb,
  Layers,
  ChevronRight,
  Activity,
  CheckCircle2,
  Eye,
  Compass,
  Wifi,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { AnalyticsSkeleton } from '../../components/skeletons/AnalyticsSkeleton';
import { UserActivityDossierModal } from '../../components/admin/UserActivityDossierModal';
import {
  UserUsageDossier,
  formatDuration,
  formatRelativeTime,
  formatExactDateTime,
  getActivityStatusMeta,
} from '../../utils/usageFormat';
import { formatStudentId } from '../../utils/studentId';

type AnalyticsTab = 'STUDENTS' | 'FEATURES' | 'BATCHES' | 'RECOMMENDATIONS' | 'LIVE_FEED';
type StatusFilter = 'ALL' | 'ONLINE' | 'TODAY' | 'THIS_WEEK' | 'INACTIVE' | 'NEVER';
type SortKey = 'LAST_ACTIVE' | 'TOTAL_TIME' | 'TODAY_TIME' | 'SESSIONS' | 'EVENTS' | 'NAME_ASC';

export const AdminFeatureAnalyticsPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('STUDENTS');

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [batchFilter, setBatchFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('LAST_ACTIVE');

  // Selected user dossier modal
  const [selectedUser, setSelectedUser] = useState<UserUsageDossier | null>(null);
  const [isLoadingUserDetail, setIsLoadingUserDetail] = useState(false);

  const fetchAnalytics = useCallback(
    async (isManual = false, silent = false) => {
      if (!token) return;
      if (isManual) setIsRefreshing(true);
      else if (!silent) setIsLoading(true);
      try {
        const url = isManual ? '/api/analytics/overview?refresh=1' : '/api/analytics/overview';
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
          if (isManual) {
            addToast('success', 'Live usage & activity data refreshed!');
          }
        } else if (!silent) {
          addToast('error', 'Failed to load user activity analytics');
        }
      } catch {
        if (!silent) addToast('error', 'Network error loading analytics');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token, addToast]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Auto-refresh live metrics every 60s while viewing the analytics page
  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAnalytics(false, true);
      }
    }, 60000);
    return () => window.clearInterval(interval);
  }, [token, fetchAnalytics]);

  const openUserDossier = async (user: UserUsageDossier) => {
    setSelectedUser(user);
    if (!token) return;
    setIsLoadingUserDetail(true);
    try {
      const res = await fetch(`/api/analytics/user/${encodeURIComponent(user.userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setSelectedUser(json.data);
        }
      }
    } catch {
      // Keep the already loaded dossier from overview
    } finally {
      setIsLoadingUserDetail(false);
    }
  };

  const summary = data?.summary || {
    totalEvents: 0,
    totalSessions: 0,
    totalTrackedDurationSec: 0,
    activeUsersCount: 0,
    onlineNowCount: 0,
    activeTodayCount: 0,
    activeThisWeekCount: 0,
    neverUsedCount: 0,
    totalRegisteredUsers: 0,
    totalRegisteredStudents: 0,
    avgSessionDurationSec: 0,
    mobileUsagePercent: 0,
    desktopUsagePercent: 0,
    mostUsedFeature: 'No Activity Yet',
    leastUsedFeature: 'Academic FAQ & Help',
  };

  const featureBreakdown: any[] = data?.featureBreakdown || [];
  const userBreakdown: UserUsageDossier[] = data?.userBreakdown || [];
  const batchComparison: any[] = data?.batchComparison || [];
  const dailyTrends: any[] = data?.dailyTrends || [];
  const recommendations: any[] = data?.recommendations || [];
  const recentStream: any[] = data?.recentStream || [];

  const statusCounts = useMemo(() => {
    const counts = { ALL: userBreakdown.length, ONLINE: 0, TODAY: 0, THIS_WEEK: 0, INACTIVE: 0, NEVER: 0 };
    for (const u of userBreakdown) {
      if (u.activityStatus === 'ONLINE') counts.ONLINE++;
      if (u.activityStatus === 'ONLINE' || u.activityStatus === 'TODAY') counts.TODAY++;
      if (u.activityStatus === 'ONLINE' || u.activityStatus === 'TODAY' || u.activityStatus === 'THIS_WEEK') {
        counts.THIS_WEEK++;
      }
      if (u.activityStatus === 'INACTIVE') counts.INACTIVE++;
      if (u.activityStatus === 'NEVER') counts.NEVER++;
    }
    return counts;
  }, [userBreakdown]);

  // Filter features
  const filteredFeatures = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return featureBreakdown.filter(f => {
      const matchesSearch =
        !q ||
        f.featureName.toLowerCase().includes(q) ||
        f.featureKey.toLowerCase().includes(q);
      const matchesCat = selectedCategory === 'ALL' || f.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [featureBreakdown, searchQuery, selectedCategory]);

  // Filter & sort users
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = userBreakdown.filter(u => {
      if (statusFilter === 'ONLINE' && !u.isOnline) return false;
      if (statusFilter === 'TODAY' && u.activityStatus !== 'ONLINE' && u.activityStatus !== 'TODAY') return false;
      if (
        statusFilter === 'THIS_WEEK' &&
        u.activityStatus !== 'ONLINE' &&
        u.activityStatus !== 'TODAY' &&
        u.activityStatus !== 'THIS_WEEK'
      ) {
        return false;
      }
      if (statusFilter === 'INACTIVE' && u.activityStatus !== 'INACTIVE') return false;
      if (statusFilter === 'NEVER' && u.activityStatus !== 'NEVER') return false;

      if (roleFilter !== 'ALL' && u.userRole !== roleFilter) return false;
      if (batchFilter !== 'ALL' && (u.batchName || 'Unassigned Batch') !== batchFilter) return false;

      if (!q) return true;
      return (
        (u.userName || '').toLowerCase().includes(q) ||
        (u.studentId || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.batchName || '').toLowerCase().includes(q) ||
        (u.lastFeatureName || '').toLowerCase().includes(q) ||
        (u.favoriteFeature || '').toLowerCase().includes(q)
      );
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'TOTAL_TIME':
          return b.totalDurationSec - a.totalDurationSec || b.totalEvents - a.totalEvents;
        case 'TODAY_TIME':
          return b.todayDurationSec - a.todayDurationSec || b.totalDurationSec - a.totalDurationSec;
        case 'SESSIONS':
          return b.totalSessions - a.totalSessions || b.totalDurationSec - a.totalDurationSec;
        case 'EVENTS':
          return b.totalEvents - a.totalEvents || b.totalDurationSec - a.totalDurationSec;
        case 'NAME_ASC':
          return (a.userName || '').localeCompare(b.userName || '');
        case 'LAST_ACTIVE':
        default:
          if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
          if (a.lastActive && b.lastActive) return b.lastActive.localeCompare(a.lastActive);
          if (a.lastActive) return -1;
          if (b.lastActive) return 1;
          return b.totalDurationSec - a.totalDurationSec;
      }
    });
    return sorted;
  }, [userBreakdown, searchQuery, statusFilter, roleFilter, batchFilter, sortBy]);

  const maxDailyTotal = useMemo(
    () => Math.max(1, ...dailyTrends.map(d => (d.views || 0) + (d.actions || 0))),
    [dailyTrends]
  );

  if (isLoading && !data) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" /> Real-Time User Activity &amp; Portal Analytics
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">
            User Usage Tracker &amp; Activity Monitor
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            কোন ইউজার কতক্ষণ পোর্টাল ব্যবহার করেছে, সর্বশেষ কখন ও কোন পেজে ঢুকেছে, কে এখন অনলাইনে আছে এবং প্রতি ইউজারের সম্পূর্ণ ডিভাইস ও অ্যাক্টিভিটি হিস্টোরি।
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchAnalytics(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Live'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Online Now & Active Today */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Online Now</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 flex items-center gap-2">
            <span>{summary.onlineNowCount}</span>
            {summary.onlineNowCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            <strong className="text-slate-700 dark:text-slate-200">{summary.activeTodayCount}</strong> active today ·{' '}
            <strong className="text-slate-700 dark:text-slate-200">{summary.activeThisWeekCount}</strong> this week
          </div>
        </div>

        {/* KPI 2: Tracked vs Registered Users */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Tracked Users</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {summary.activeUsersCount}{' '}
            <span className="text-xs text-slate-400 font-semibold">/ {summary.totalRegisteredUsers} Total</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {summary.neverUsedCount} never used · {batchComparison.length} batches
          </div>
        </div>

        {/* KPI 3: Total Usage Time & Sessions */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Usage Time</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {formatDuration(summary.totalTrackedDurationSec)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
            {summary.totalSessions} sessions · Avg {formatDuration(summary.avgSessionDurationSec)}
          </div>
        </div>

        {/* KPI 4: Device Traffic & Top Feature */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Device Split &amp; Top Page</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-2 flex items-center gap-1.5">
            <span className="text-emerald-600 dark:text-emerald-400">{summary.mobileUsagePercent}% Mobile</span>
            <span className="text-slate-300 dark:text-slate-600 text-sm">|</span>
            <span className="text-blue-600 dark:text-blue-400 text-base">{summary.desktopUsagePercent}% PC</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1 truncate">
            Top: {summary.mostUsedFeature}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => setActiveTab('STUDENTS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'STUDENTS'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User Activity &amp; Usage</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold">
            {userBreakdown.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FEATURES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'FEATURES'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Feature Rankings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BATCHES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'BATCHES'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Batches &amp; 7-Day Activity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECOMMENDATIONS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'RECOMMENDATIONS'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Insights</span>
          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black">
            {recommendations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LIVE_FEED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'LIVE_FEED'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>Live Stream</span>
          {recentStream.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-black">
              {recentStream.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1 (DEFAULT): USER ACTIVITY & USAGE */}
      {activeTab === 'STUDENTS' && (
        <div className="space-y-4">
          {/* Status Quick Filter Strip + Search/Sort Controls */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { key: 'ALL', label: 'All Users', count: statusCounts.ALL },
                  { key: 'ONLINE', label: 'Online Now', count: statusCounts.ONLINE },
                  { key: 'TODAY', label: 'Active Today', count: statusCounts.TODAY },
                  { key: 'THIS_WEEK', label: 'This Week', count: statusCounts.THIS_WEEK },
                  { key: 'INACTIVE', label: 'Inactive (7d+)', count: statusCounts.INACTIVE },
                  { key: 'NEVER', label: 'Never Used', count: statusCounts.NEVER },
                ] as Array<{ key: StatusFilter; label: string; count: number }>
              ).map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border ${
                    statusFilter === item.key
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-blue-600 dark:border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.key === 'ONLINE' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  <span>{item.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                      statusFilter === item.key
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search + Role + Batch + Sort */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
              <div className="lg:col-span-5 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user name, ID, email, batch, or feature..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white font-semibold"
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="CR">CR</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <select
                  value={batchFilter}
                  onChange={e => setBatchFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white font-semibold"
                >
                  <option value="ALL">All Batches</option>
                  {batchComparison.map(b => (
                    <option key={b.batchName} value={b.batchName}>
                      {b.batchName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortKey)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white font-semibold"
                >
                  <option value="LAST_ACTIVE">Sort: Last Active (Recent First)</option>
                  <option value="TOTAL_TIME">Sort: Most Total Time Used</option>
                  <option value="TODAY_TIME">Sort: Most Time Today</option>
                  <option value="SESSIONS">Sort: Most Sessions</option>
                  <option value="EVENTS">Sort: Most Interactions</option>
                  <option value="NAME_ASC">Sort: Name (A → Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Activity Table (Desktop) + Cards (Mobile) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50/60 dark:bg-slate-800/40">
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Showing {filteredUsers.length} of {userBreakdown.length} Users
              </span>
              <span className="text-[11px] text-slate-400">
                Click any user to inspect complete timeline &amp; feature breakdown
              </span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No users match your selected filters.
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map(user => {
                    const stMeta = getActivityStatusMeta(user.activityStatus);
                    return (
                      <div
                        key={user.userId}
                        onClick={() => openUserDossier(user)}
                        className="p-4 space-y-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${stMeta.dotClass}`} />
                              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {user.userName}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                  user.userRole === 'ADMIN'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : user.userRole === 'CR'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              >
                                {user.userRole}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {user.studentId ? formatStudentId(user.studentId) : 'Registered'} · {user.batchName}
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${stMeta.badgeClass}`}
                          >
                            {formatRelativeTime(user.lastActive, user.isOnline)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Total Time</span>
                            <strong className="text-slate-900 dark:text-white">
                              {formatDuration(user.totalDurationSec)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Today</span>
                            <strong className="text-emerald-600 dark:text-emerald-400">
                              {formatDuration(user.todayDurationSec)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Sessions</span>
                            <strong className="text-slate-900 dark:text-white">
                              {user.totalSessions} ({user.totalEvents} hits)
                            </strong>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate max-w-[65%]">
                            {user.lastFeatureName
                              ? `Last: ${user.lastFeatureName}`
                              : 'No page visited yet'}
                          </span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold inline-flex items-center gap-0.5 shrink-0">
                            Full Details <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">User &amp; Batch</th>
                        <th className="px-4 py-3">Last Used</th>
                        <th className="px-4 py-3">Usage Duration</th>
                        <th className="px-4 py-3">Sessions &amp; Activity</th>
                        <th className="px-4 py-3">Last Page &amp; Device</th>
                        <th className="px-4 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredUsers.map(user => {
                        const stMeta = getActivityStatusMeta(user.activityStatus);
                        return (
                          <tr
                            key={user.userId}
                            onClick={() => openUserDossier(user)}
                            className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                          >
                            {/* User & Batch */}
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2.5">
                                <span
                                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${stMeta.dotClass}`}
                                  title={stMeta.label}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[190px]">
                                      {user.userName}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                        user.userRole === 'ADMIN'
                                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                          : user.userRole === 'CR'
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                    >
                                      {user.userRole}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                    {user.studentId && (
                                      <span className="font-mono font-semibold text-slate-600 dark:text-slate-300">
                                        {formatStudentId(user.studentId)}
                                      </span>
                                    )}
                                    <span>·</span>
                                    <span>{user.batchName}</span>
                                    {user.cgpa > 0 && user.userRole !== 'ADMIN' && (
                                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                        · CGPA {user.cgpa.toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Last Used */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${stMeta.badgeClass}`}
                              >
                                {formatRelativeTime(user.lastActive, user.isOnline)}
                              </span>
                              <div className="text-[10.5px] text-slate-400 mt-1 font-mono">
                                {formatExactDateTime(user.lastActive)}
                              </div>
                            </td>

                            {/* Usage Duration */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                                {formatDuration(user.totalDurationSec)}
                              </div>
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Today:{' '}
                                <strong className={user.todayDurationSec > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                                  {formatDuration(user.todayDurationSec)}
                                </strong>{' '}
                                · 7d: <strong>{formatDuration(user.last7DaysDurationSec)}</strong>
                              </div>
                            </td>

                            {/* Sessions & Activity */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {user.totalSessions} sessions
                                {user.avgSessionDurationSec > 0 && (
                                  <span className="text-[10.5px] text-slate-400 font-normal ml-1">
                                    (avg {formatDuration(user.avgSessionDurationSec)})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {user.totalViews} views · {user.totalActions} actions
                              </div>
                            </td>

                            {/* Last Page & Device */}
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px] flex items-center gap-1">
                                <Compass className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">{user.lastFeatureName || 'Not visited yet'}</span>
                              </div>
                              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                {user.lastDevice === 'Mobile' || user.devicePreference === 'Mobile' ? (
                                  <Smartphone className="w-3 h-3 text-emerald-600 shrink-0" />
                                ) : (
                                  <Monitor className="w-3 h-3 text-blue-600 shrink-0" />
                                )}
                                <span className="truncate max-w-[180px]">
                                  {user.lastDevice || user.devicePreference}
                                  {user.lastBrowser ? ` · ${user.lastBrowser}` : ''}
                                  {user.lastOs ? ` · ${user.lastOs}` : ''}
                                </span>
                              </div>
                            </td>

                            {/* Action */}
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  openUserDossier(user);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Full Info</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FEATURE RANKINGS */}
      {activeTab === 'FEATURES' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search features (Routine, Question Bank, CGPA, Exams...)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">Category:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-medium"
              >
                <option value="ALL">All Categories</option>
                <option value="ACADEMIC">Academic</option>
                <option value="ASSESSMENT">Assessment (Exams, CGPA)</option>
                <option value="RESOURCE">Resources (Question Bank, FAQ)</option>
                <option value="COMMUNICATION">Communication</option>
                <option value="MANAGEMENT">Management (CR, Admin)</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Feature Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Total Time Spent</th>
                    <th className="px-4 py-3">Interactions</th>
                    <th className="px-4 py-3">User Adoption</th>
                    <th className="px-4 py-3">Avg / Visit</th>
                    <th className="px-4 py-3">Top Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredFeatures.map((f, idx) => (
                    <tr key={f.featureKey} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {f.featureName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{f.featureKey}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.category === 'ACADEMIC'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : f.category === 'ASSESSMENT'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : f.category === 'RESOURCE'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {f.category}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-extrabold text-blue-700 dark:text-blue-400">
                        {formatDuration(f.totalDurationSec)}
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {f.totalEvents.toLocaleString()}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {f.totalViews} views · {f.totalActions} clicks
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <span>{f.adoptionRatePercent}%</span>
                            <span className="text-[10px] text-slate-400 font-normal">{f.uniqueUsers} users</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${f.adoptionRatePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">
                        {formatDuration(f.avgDurationSec)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {f.topUsers?.length > 0 ? (
                            f.topUsers.map((u: any, uIdx: number) => (
                              <span
                                key={uIdx}
                                className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px]"
                                title={`${u.name} (${u.batchName}) - ${formatDuration(u.durationSec)}`}
                              >
                                {u.name.split(' ')[0]} ({formatDuration(u.durationSec)})
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400">No usage yet</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BATCH COMPARISON & 7-DAY TREND */}
      {activeTab === 'BATCHES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {batchComparison.map(batch => (
              <div
                key={batch.batchName}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {batch.batchName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                    {batch.activeUsers}/{batch.totalUsers} Active
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatDuration(batch.totalDurationSec)}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{batch.totalEvents} interactions</span>
                  {batch.onlineUsers > 0 && (
                    <span className="text-emerald-600 font-bold">{batch.onlineUsers} online</span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 truncate">
                  Top Feature: <strong className="text-blue-600 dark:text-blue-400">{batch.topFeature}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Last 7 Days Portal Activity
                </h3>
                <p className="text-xs text-slate-500">
                  Real daily active usage time, page views, and interactive actions across all users
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Views
                </span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Interactive Actions
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-4">
              {dailyTrends.map((d, idx) => {
                const total = (d.views || 0) + (d.actions || 0);
                const maxHeight = 140;
                const barHeight = total > 0 ? Math.max(16, Math.round((total / maxDailyTotal) * maxHeight)) : 6;
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                      {formatDuration(d.durationSec)}
                    </span>
                    <div
                      className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800 rounded-t-lg flex flex-col justify-end overflow-hidden"
                      style={{ height: `${maxHeight}px` }}
                    >
                      <div
                        className="w-full bg-emerald-500 transition-all"
                        style={{ height: `${Math.round(((d.actions || 0) / Math.max(1, total)) * barHeight)}px` }}
                        title={`${d.actions} actions`}
                      />
                      <div
                        className="w-full bg-blue-600 transition-all"
                        style={{ height: `${Math.round(((d.views || 0) / Math.max(1, total)) * barHeight)}px` }}
                        title={`${d.views} views`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 text-center">
                      {d.label.split(',')[0]}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {d.uniqueUsers} users · {total} hits
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INSIGHTS */}
      {activeTab === 'RECOMMENDATIONS' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-extrabold text-amber-900 dark:text-amber-200 block text-sm">
                Live Usage Insights &amp; Recommendations
              </span>
              <p className="text-amber-800 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                এই রিপোর্টগুলো শিক্ষার্থীদের বাস্তব সেশন, ব্যবহারের সময় ও ডিভাইস ডাটা বিশ্লেষণ করে তৈরি করা হয়েছে।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendations.map(rec => (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black ${
                        rec.priority === 'HIGH'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : rec.priority === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {rec.priority} PRIORITY
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">{rec.metric}</span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{rec.title}</h4>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                    <strong>Finding:</strong> {rec.finding}
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl text-xs space-y-1">
                  <span className="font-extrabold text-emerald-900 dark:text-emerald-300 flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Recommended Action:
                  </span>
                  <p className="text-emerald-800 dark:text-emerald-300/80 leading-relaxed text-[11.5px]">
                    {rec.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: LIVE ACTION STREAM */}
      {activeTab === 'LIVE_FEED' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-Time Portal Activity Stream</span>
              </h3>
              <p className="text-xs text-slate-500">
                Chronological stream of real page visits, interactive actions, and active time logs
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{recentStream.length} Events</span>
          </div>

          {recentStream.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No live activity events recorded yet. Events appear automatically as users browse the portal.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
              {recentStream.map((evt, idx) => (
                <div
                  key={evt.id || idx}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                      {evt.deviceType === 'Mobile' ? (
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Monitor className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">{evt.userName}</span>
                        <span className="text-slate-500 text-[11px]">({evt.batchName || 'Student'})</span>
                        {evt.browser && (
                          <span className="text-[10px] text-slate-400">
                            · {evt.browser}
                            {evt.os ? ` / ${evt.os}` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11.5px] mt-0.5 truncate">
                        {evt.actionDetail} ·{' '}
                        <span className="font-mono text-blue-600 dark:text-blue-400">{evt.path}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {evt.durationSec > 0 && (
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                        {formatDuration(evt.durationSec)} active
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {formatExactDateTime(evt.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Activity Dossier Modal */}
      <UserActivityDossierModal
        user={selectedUser}
        isLoading={isLoadingUserDetail}
        onClose={() => setSelectedUser(null)}
        onRefresh={selectedUser ? () => openUserDossier(selectedUser) : undefined}
      />
    </div>
  );
};

export default AdminFeatureAnalyticsPage;
