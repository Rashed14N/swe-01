import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw, Users, Search, Mail, Phone, BookOpen,
  Calendar, CheckCircle2, TrendingUp, Sparkles, Filter,
  RefreshCw, ArrowUpDown, Layers, User, ExternalLink, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { PageHeader } from '../../components/common/PageHeader';
import { getUserAvatarUrl } from '../../data/avatars';

interface RetakeStudentItem {
  id: string;
  studentId: string;
  studentName: string;
  studentRoll: string;
  studentEmail: string;
  studentPhone?: string;
  studentProfileImage?: string;
  studentOriginalBatchName: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  courseCredits: number;
  courseSemester?: number;
  type: 'RETAKE' | 'IMPROVEMENT';
  retakeBatchId?: string;
  retakeBatchName: string;
  previousGrade?: string;
  targetGrade?: string;
  status: string;
  notes?: string;
  isInCRBatch: boolean;
  createdAt: string;
}

export const CRRetakesPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'my_batch' | 'all_department'>('my_batch');

  const [registrations, setRegistrations] = useState<RetakeStudentItem[]>([]);
  const [crBatch, setCrBatch] = useState<{ id: string; name: string; currentSemester: number } | null>(null);
  const [stats, setStats] = useState({
    totalInMyBatch: 0,
    totalDepartment: 0,
    retakeCount: 0,
    improvementCount: 0,
    distinctStudentsCount: 0,
    distinctCoursesCount: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'RETAKE' | 'IMPROVEMENT'>('ALL');

  const fetchRetakeStudents = async (isBackground = false) => {
    if (!token) return;
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/retakes/cr/students', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch retake students');
      }

      const data = await res.json();
      if (data.success) {
        setRegistrations(data.registrations || []);
        setCrBatch(data.crBatch || null);
        if (data.stats) setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Error fetching retake students for CR:', err);
      addToast('error', err.message || 'Failed to load retake students');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRetakeStudents();
  }, [token]);

  // Unique course codes for the filter dropdown
  const uniqueCourseCodes = useMemo(() => {
    const list = activeTab === 'my_batch'
      ? registrations.filter(r => r.isInCRBatch)
      : registrations;
    return Array.from(new Set(list.map(r => r.courseCode))).sort();
  }, [registrations, activeTab]);

  // Filtered List
  const filteredStudents = useMemo(() => {
    let list = activeTab === 'my_batch'
      ? registrations.filter(r => r.isInCRBatch)
      : registrations;

    if (selectedCourseFilter !== 'ALL') {
      list = list.filter(r => r.courseCode === selectedCourseFilter);
    }

    if (selectedTypeFilter !== 'ALL') {
      list = list.filter(r => r.type === selectedTypeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        r.studentName.toLowerCase().includes(q) ||
        r.studentRoll.toLowerCase().includes(q) ||
        r.courseCode.toLowerCase().includes(q) ||
        r.courseTitle.toLowerCase().includes(q) ||
        r.studentEmail.toLowerCase().includes(q)
      );
    }

    return list;
  }, [registrations, activeTab, selectedCourseFilter, selectedTypeFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Retake & Improvement Students"
          description={`View and communicate with all students enrolled in retake or improvement courses running in ${crBatch?.name || user?.batchName || 'your batch'}.`}
          breadcrumb={`${crBatch?.name || 'My Batch'} • Class Representative Desk`}
        />

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchRetakeStudents(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
            title="Refresh retake student directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Directory'}</span>
          </button>
        </div>
      </div>

      {/* CR Batch Overview Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-[#0F172A] border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-[#0B2348] dark:text-white">
                Class Representative Management • {crBatch?.name || 'SWE 9th Batch'}
              </h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> Live Synced
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              When senior or junior students register retake/improvement courses running in your batch, their routine and exam schedules are automatically matched with your batch updates. Use this list to communicate upcoming class tests and exams.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Students in CR Batch */}
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              In Your Batch
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users strokeWidth={2.5} className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2348] dark:text-white tracking-tight">
              {stats.totalInMyBatch}
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              Taking classes with your batch
            </p>
          </div>
        </div>

        {/* Card 2: Retakes */}
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Retakes (Grade F)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <RotateCcw strokeWidth={2.5} className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {stats.retakeCount}
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              Failed course repeats
            </p>
          </div>
        </div>

        {/* Card 3: Improvements */}
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Improvements
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp strokeWidth={2.5} className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
              {stats.improvementCount}
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              CGPA grade upgrades
            </p>
          </div>
        </div>

        {/* Card 4: Total Department */}
        <div className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Dept Wide Retakes
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers strokeWidth={2.5} className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2348] dark:text-white tracking-tight">
              {stats.totalDepartment}
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
              All department retakes
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Top Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('my_batch')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'my_batch'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>In My Batch ({stats.totalInMyBatch})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all_department')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'all_department'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Department Retakes ({stats.totalDepartment})</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, roll number, course code, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>

          {/* Filter Course */}
          <div className="sm:col-span-3">
            <select
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
            >
              <option value="ALL">All Enrolled Courses</option>
              {uniqueCourseCodes.map(code => (
                <option key={code} value={code}>
                  Course: {code}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Type */}
          <div className="sm:col-span-3">
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer"
            >
              <option value="ALL">All Types (Retake & Impr.)</option>
              <option value="RETAKE">Retake Only (Grade F)</option>
              <option value="IMPROVEMENT">Improvement Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students List Display */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading retake students directory...</span>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800">
          <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No retake students found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery || selectedCourseFilter !== 'ALL' || selectedTypeFilter !== 'ALL'
              ? 'Try adjusting your search criteria or resetting filters.'
              : 'There are currently no students registered for retake or improvement courses in this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((item) => {
            const avatarUrl = getUserAvatarUrl({
              name: item.studentName,
              studentId: item.studentRoll,
              profileImage: item.studentProfileImage,
            });

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700/60 transition-all group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        item.type === 'RETAKE'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                      }`}
                    >
                      {item.type === 'RETAKE' ? (
                        <RotateCcw className="w-2.5 h-2.5" />
                      ) : (
                        <TrendingUp className="w-2.5 h-2.5" />
                      )}
                      <span>{item.type}</span>
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                      From: {item.studentOriginalBatchName}
                    </span>
                  </div>

                  {/* Student Info */}
                  <div className="flex items-center gap-3">
                    <img
                      src={avatarUrl}
                      alt={item.studentName}
                      className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 object-cover shrink-0 shadow-2xs"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#0A2147] dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.studentName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        Roll: <strong className="text-slate-800 dark:text-slate-200">{item.studentRoll}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Course Details Box */}
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                        {item.courseCode}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {item.courseCredits} Credits
                      </span>
                    </div>

                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.courseTitle}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Running in: <strong>{item.retakeBatchName}</strong></span>
                      {item.targetGrade && (
                        <span>Target: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{item.targetGrade}</strong></span>
                      )}
                    </div>
                  </div>

                  {item.notes && (
                    <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                      "{item.notes}"
                    </p>
                  )}
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    Enrolled {new Date(item.createdAt).toLocaleDateString()}
                  </span>

                  <a
                    href={`mailto:${item.studentEmail}?subject=[SWE Retake Notice - ${item.courseCode}] Updates from CR&body=Hello ${item.studentName},%0D%0A%0D%0ARegarding your ${item.type} course ${item.courseCode} (${item.courseTitle}) in ${item.retakeBatchName}:%0D%0A%0D%0A`}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title={`Email ${item.studentName}`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Student</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
