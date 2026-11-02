import React, { useState, useEffect } from 'react';
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
  Filter,
  RefreshCw,
  Lightbulb,
  Layers,
  ChevronRight,
  Activity,
  CheckCircle2,
  Calendar,
  BookOpen,
  FileText,
  Calculator,
  Megaphone,
  Bell,
  GraduationCap,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { AnalyticsSkeleton } from '../../components/skeletons/AnalyticsSkeleton';

export const AdminFeatureAnalyticsPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'FEATURES' | 'STUDENTS' | 'BATCHES' | 'RECOMMENDATIONS' | 'LIVE_FEED'>('FEATURES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const fetchAnalytics = async (isManual = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analytics/overview', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (isManual) {
          addToast('success', 'Analytics data refreshed!');
        }
      } else {
        addToast('error', 'Failed to load feature analytics');
      }
    } catch {
      addToast('error', 'Network error loading analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  const summary = data?.summary || {
    totalEvents: 0,
    activeUsersCount: 0,
    totalRegisteredStudents: 0,
    avgSessionDurationSec: 0,
    mobileUsagePercent: 65,
    desktopUsagePercent: 35,
    mostUsedFeature: 'Class Routine',
    leastUsedFeature: 'Academic FAQ',
  };

  const featureBreakdown: any[] = data?.featureBreakdown || [];
  const userBreakdown: any[] = data?.userBreakdown || [];
  const batchComparison: any[] = data?.batchComparison || [];
  const dailyTrends: any[] = data?.dailyTrends || [];
  const recommendations: any[] = data?.recommendations || [];
  const recentStream: any[] = data?.recentStream || [];

  // Filter features
  const filteredFeatures = featureBreakdown.filter(f => {
    const matchesSearch =
      f.featureName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.featureKey.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || f.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Filter users
  const filteredUsers = userBreakdown.filter(u => {
    return (
      u.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.studentId && u.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.batchName && u.batchName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.favoriteFeature && u.favoriteFeature.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  if (isLoading && !data) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" /> Feature Usage & Student Behavior Tracking
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">
            Product Analytics & Improvement Trends
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            কোন শিক্ষার্থী কোন ফিচার সবচেয়ে বেশি ব্যবহার করছে, কোন ফিচারের ট্রেন্ড বাড়ছে বা কমছে এবং পোর্টালকে আরও উন্নত করার জন্য রিয়েল-টাইম ডাটা ট্র্যাকিং।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Feature Hits</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {summary.totalEvents.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Active Student Engagement</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Students</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {summary.activeUsersCount} <span className="text-xs text-slate-400 font-normal">/ {summary.totalRegisteredStudents} Total</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Across {batchComparison.length} Academic Batches
          </div>
        </div>

        {/* Metric 3: Device Split */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Device Traffic</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2 flex items-center gap-2">
            <span className="text-emerald-600">{summary.mobileUsagePercent}% Mobile</span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600 text-base">{summary.desktopUsagePercent}% PC</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            Avg Session: ~{summary.avgSessionDurationSec}s per feature
          </div>
        </div>

        {/* Metric 4: Star Feature */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>#1 Most Used Feature</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base font-black text-slate-900 dark:text-white mt-2 truncate">
            {summary.mostUsedFeature}
          </div>
          <div className="text-[11px] text-amber-600 font-bold mt-1 truncate">
            Top Student Choice for Daily Prep
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/80">
        <button
          onClick={() => setActiveTab('FEATURES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'FEATURES'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Feature Rankings & Trends</span>
        </button>

        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'STUDENTS'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Student by Student Tracking</span>
        </button>

        <button
          onClick={() => setActiveTab('BATCHES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'BATCHES'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Batch Comparison & 7-Day Activity</span>
        </button>

        <button
          onClick={() => setActiveTab('RECOMMENDATIONS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'RECOMMENDATIONS'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>UX & Improvement Insights</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-100 text-amber-800 font-black">
            {recommendations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('LIVE_FEED')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'LIVE_FEED'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
          <span>Live Action Stream</span>
        </button>
      </div>

      {/* TAB 1: FEATURE RANKINGS & TRENDS */}
      {activeTab === 'FEATURES' && (
        <div className="space-y-4">
          {/* Filter Bar */}
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
                <option value="ACADEMIC">Academic (Routine, Courses, Retakes)</option>
                <option value="ASSESSMENT">Assessment (Exams, CGPA)</option>
                <option value="RESOURCE">Resources (Question Bank, FAQ)</option>
                <option value="COMMUNICATION">Communication (Announcements, Notices)</option>
              </select>
            </div>
          </div>

          {/* Feature Matrix Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Feature Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Total Interactions</th>
                    <th className="px-4 py-3">Student Adoption</th>
                    <th className="px-4 py-3">Usage Share</th>
                    <th className="px-4 py-3">7-Day Trend</th>
                    <th className="px-4 py-3">Avg Time Spent</th>
                    <th className="px-4 py-3">Top Active Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredFeatures.map((f, idx) => (
                    <tr key={f.featureKey} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                            #{idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {f.featureName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Key: {f.featureKey}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.category === 'ACADEMIC'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : f.category === 'ASSESSMENT'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : f.category === 'RESOURCE'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {f.category}
                        </span>
                      </td>

                      {/* Total Events */}
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {f.totalEvents.toLocaleString()}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {f.totalViews} views • {f.totalActions} clicks
                        </span>
                      </td>

                      {/* Adoption Rate */}
                      <td className="px-4 py-3">
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            <span>{f.adoptionRatePercent}%</span>
                            <span className="text-[10px] text-slate-400 font-normal">{f.uniqueUsers} students</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${f.adoptionRatePercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Usage Share */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {f.sharePercent}%
                        </span>
                        <span className="text-[10px] text-slate-400 block">of portal traffic</span>
                      </td>

                      {/* Trend */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${
                          f.trendPercent > 0
                            ? 'text-emerald-600'
                            : f.trendPercent < 0
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}>
                          {f.trendPercent > 0 ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : f.trendPercent < 0 ? (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          ) : null}
                          <span>{f.trendPercent > 0 ? `+${f.trendPercent}%` : `${f.trendPercent}%`}</span>
                        </span>
                      </td>

                      {/* Avg Duration */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {f.avgDurationSec >= 60
                          ? `${Math.floor(f.avgDurationSec / 60)}m ${f.avgDurationSec % 60}s`
                          : `${f.avgDurationSec}s`}
                      </td>

                      {/* Top Users */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {f.topUsers?.map((u: any, uIdx: number) => (
                            <span
                              key={uIdx}
                              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px]"
                              title={`${u.name} (${u.batchName}) - ${u.count} times`}
                            >
                              {u.name.split(' ')[0]} ({u.count})
                            </span>
                          ))}
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

      {/* TAB 2: STUDENT BY STUDENT TRACKING */}
      {activeTab === 'STUDENTS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, ID, or batch..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Showing {filteredUsers.length} Tracked Students
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(student => (
              <div
                key={student.userId}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{student.userName}</span>
                      {student.userRole === 'CR' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          CR
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {student.studentId || 'ID: Registered'} • {student.batchName}
                    </div>
                  </div>

                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold flex items-center gap-1">
                    {student.devicePreference === 'Mobile' ? (
                      <Smartphone className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Monitor className="w-3 h-3 text-blue-600" />
                    )}
                    <span>{student.devicePreference}</span>
                  </span>
                </div>

                {/* Primary Favorite Feature */}
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-blue-900 dark:text-blue-200 font-bold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-amber-500" /> Favorite Feature:
                    </span>
                    <span className="font-extrabold text-blue-700 dark:text-blue-400">
                      {student.favoriteFeature}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-blue-200/50 dark:border-blue-900/40">
                    <span>Total Hits: <strong>{student.totalEvents}</strong></span>
                    <span>Total Time: <strong>~{student.totalTimeMinutes}m</strong></span>
                  </div>
                </div>

                {/* Top Features Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Feature Usage Distribution
                  </span>
                  <div className="space-y-1">
                    {student.topFeatures?.slice(0, 3).map((tf: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[170px]">
                          {tf.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-white">{tf.count}x</span>
                          <span className="text-[10px] text-slate-400">({tf.percent}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Actions Feed Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Active: {new Date(student.lastActive).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setSelectedUser(student)}
                    className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View Activity Stream</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal for detailed student activity */}
          {selectedUser && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {selectedUser.userName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedUser.studentId} • {selectedUser.batchName} • {selectedUser.totalEvents} actions recorded
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-sm cursor-pointer p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {selectedUser.recentActions?.map((act: any, idx: number) => (
                    <div key={idx} className="pt-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {act.actionDetail}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Feature: {act.featureName} • Spent {act.durationSec}s
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BATCH COMPARISON & 7-DAY TREND */}
      {activeTab === 'BATCHES' && (
        <div className="space-y-6">
          {/* Batch-wise comparison cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {batchComparison.map(batch => (
              <div
                key={batch.batchName}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {batch.batchName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {batch.activeUsers} Students
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {batch.totalEvents} <span className="text-xs text-slate-400 font-normal">interactions</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Most Visited: <strong className="text-blue-600 dark:text-blue-400">{batch.topFeature}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* 7-Day Trend Visual Bars */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Last 7 Days Usage Progression
                </h3>
                <p className="text-xs text-slate-500">
                  Daily page views vs interactive user actions (saving grades, downloading questions, checking exams)
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span> Views
                </span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600"></span> Interactive Actions
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 pt-4">
              {dailyTrends.map((d, idx) => {
                const total = d.views + d.actions;
                const maxHeight = 160;
                const height = Math.min(maxHeight, Math.max(30, total * 3.5));
                return (
                  <div key={idx} className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">{total} hits</span>
                    <div
                      className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800 rounded-t-lg flex flex-col justify-end overflow-hidden"
                      style={{ height: `${maxHeight}px` }}
                    >
                      <div
                        className="w-full bg-emerald-500 transition-all"
                        style={{ height: `${Math.round((d.actions / Math.max(1, total)) * height)}px` }}
                        title={`${d.actions} actions`}
                      />
                      <div
                        className="w-full bg-blue-600 transition-all"
                        style={{ height: `${Math.round((d.views / Math.max(1, total)) * height)}px` }}
                        title={`${d.views} views`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 text-center">
                      {d.label.split(',')[0]}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {d.uniqueUsers} users
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: UX & IMPROVEMENT RECOMMENDATIONS */}
      {activeTab === 'RECOMMENDATIONS' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-extrabold text-amber-900 dark:text-amber-200 block text-sm">
                Data-Driven Feature Improvement Roadmaps
              </span>
              <p className="text-amber-800 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                এই অ্যানালিটিক্স রিপোর্টগুলো শিক্ষার্থীদের বাস্তব ব্যবহারের ডাটা (Usage Frequency, Time-on-page, Device ratio) বিশ্লেষণ করে তৈরি করা হয়েছে। নিচের প্রস্তাবনাগুলো বাস্তবায়ন করলে পোর্টালের ব্যবহার ও শিক্ষার্থীদের সন্তুষ্টি বৃদ্ধি পাবে।
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      rec.priority === 'HIGH'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : rec.priority === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {rec.priority} PRIORITY
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {rec.metric}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                    {rec.title}
                  </h4>

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
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Real-Time Student Activity Stream</span>
              </h3>
              <p className="text-xs text-slate-500">Live feed of student page visits, calculator usages, and routine checks</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">{recentStream.length} Events Logged</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
            {recentStream.map(evt => (
              <div key={evt.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    {evt.deviceType === 'Mobile' ? (
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Monitor className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {evt.userName}
                    </span>
                    <span className="text-slate-500 text-[11px] ml-1.5">
                      ({evt.batchName || 'Student'})
                    </span>
                    <p className="text-slate-600 dark:text-slate-300 text-[11.5px] mt-0.5">
                      {evt.actionDetail} • <span className="font-mono text-blue-600 dark:text-blue-400">{evt.path}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    {evt.durationSec}s session
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeatureAnalyticsPage;
