import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Upload,
  Users,
} from 'lucide-react';
import { Resource, RetakeSummaryOverview, User } from '../../types';

export interface ProfileCgpaSummary {
  cgpa: number;
  totalCompletedCredits: number;
  totalGradedCredits: number;
  totalDegreeCredits: number;
  totalCourses: number;
  gradedCourseCount: number;
  pendingCourseCount: number;
  completedSemestersCount: number;
  currentSemester: number;
  batchName: string;
  academicStanding: string;
  sessionName?: string;
}

export interface ProfileSemesterBreakdownItem {
  semester: number;
  semesterName: string;
  sgpa: number | null;
  cumulativeCgpa: number | null;
  completedCredits: number;
  totalCredits: number;
  isPublished: boolean;
}

interface AcademicSnapshotPanelProps {
  user: User | null;
  cgpaSummary: ProfileCgpaSummary | null;
  semesterBreakdown: ProfileSemesterBreakdownItem[];
  isLoadingCgpa: boolean;
  retakeOverview: RetakeSummaryOverview | null;
  isLoadingRetakes: boolean;
  contributions: Resource[];
  onSwitchTab: (tab: 'overview' | 'account' | 'contribute' | 'uploads') => void;
}

export const AcademicSnapshotPanel: React.FC<AcademicSnapshotPanelProps> = ({
  user,
  cgpaSummary,
  semesterBreakdown,
  isLoadingCgpa,
  retakeOverview,
  isLoadingRetakes,
  contributions,
  onSwitchTab,
}) => {
  const isAdmin = user?.role === 'ADMIN';

  const approvedCount = contributions.filter((c) => c.status === 'APPROVED').length;
  const pendingCount = contributions.filter((c) => c.status !== 'APPROVED' && c.status !== 'REJECTED').length;

  const activeRetakes = (retakeOverview?.registrations || []).filter((r) => r.status !== 'DROPPED');
  const publishedSemesters = semesterBreakdown.filter((s) => s.isPublished && s.sgpa !== null);

  const completedCredits = cgpaSummary?.totalCompletedCredits ?? 0;
  const totalDegreeCredits = cgpaSummary?.totalDegreeCredits || 148;
  const degreeCompletionPct = Math.min(
    100,
    Math.round((completedCredits / Math.max(1, totalDegreeCredits)) * 100)
  );

  const effectiveCgpa =
    cgpaSummary && cgpaSummary.totalGradedCredits > 0
      ? cgpaSummary.cgpa
      : user?.cgpa && user.cgpa > 0
      ? user.cgpa
      : null;

  return (
    <div className="space-y-5">
      {isAdmin ? (
        /* ADMIN OVERSIGHT SNAPSHOT */
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                Administration Workspace
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct shortcuts to department controls and student oversight
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              Verified Admin
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
            <Link
              to="/admin/students"
              className="p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    Student Directory & Usage
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Inspect activity dossiers and batch rosters
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
            </Link>

            <Link
              to="/admin/features"
              className="p-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    Feature Controls & Analytics
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Toggle portal modules and monitor traffic
                  </p>
                </div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 transition-colors" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 1. ACADEMIC SNAPSHOT (CGPA + CREDITS PROGRESS + SEMESTER STRIP) */}
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                  Academic Snapshot
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Live cumulative performance and SWE degree completion
                </p>
              </div>
              <Link
                to="/cgpa"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap shrink-0"
              >
                CGPA Calculator
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoadingCgpa ? (
              <div className="p-5 space-y-4 animate-pulse">
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                  <div className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                </div>
                <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              </div>
            ) : (
              <div>
                {/* 3-Column Hairline-Divided Metrics Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800/80">
                  <div className="p-4 sm:p-5">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                      Cumulative CGPA
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                        {effectiveCgpa !== null ? effectiveCgpa.toFixed(2) : '—'}
                      </span>
                      <span className="text-xs font-medium text-slate-400 tabular-nums">
                        / 4.00
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {cgpaSummary?.academicStanding || 'Add grades in My CGPA'}
                    </p>
                  </div>

                  <div className="p-4 sm:p-5">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                      Credits Completed
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                        {completedCredits.toFixed(1)}
                      </span>
                      <span className="text-xs font-medium text-slate-400 tabular-nums">
                        / {totalDegreeCredits.toFixed(0)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                      {degreeCompletionPct}% of SWE curriculum
                    </p>
                  </div>

                  <div className="p-4 sm:p-5">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                      Graded Courses
                    </span>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                        {cgpaSummary?.gradedCourseCount ?? 0}
                      </span>
                      <span className="text-xs font-medium text-slate-400 tabular-nums">
                        / {cgpaSummary?.totalCourses || 0}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                      {cgpaSummary?.completedSemestersCount ?? 0} semester{(cgpaSummary?.completedSemestersCount ?? 0) === 1 ? '' : 's'} recorded
                    </p>
                  </div>
                </div>

                {/* Degree Completion Progress Bar */}
                <div className="px-4 sm:px-5 py-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      B.Sc. in Software Engineering Progress
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                      {degreeCompletionPct}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-500"
                      style={{ width: `${degreeCompletionPct}%` }}
                    />
                  </div>
                </div>

                {/* Compact Semester SGPA Strip (Only for published semesters) */}
                {publishedSemesters.length > 0 ? (
                  <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Semester SGPA History
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {publishedSemesters.length} published
                      </span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                      {publishedSemesters.map((sem) => (
                        <div
                          key={sem.semester}
                          className="shrink-0 px-3 py-2 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 min-w-[92px]"
                        >
                          <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                            Sem {sem.semester}
                          </span>
                          <span className="block text-sm font-mono font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                            {sem.sgpa !== null ? sem.sgpa.toFixed(2) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Record your semester grades to unlock CGPA analytics and credit tracking.
                    </p>
                    <Link
                      to="/cgpa"
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
                    >
                      Add Grades
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. RETAKE & IMPROVEMENT TRACKER */}
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
                  Retake & Improvement Courses
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Active cross-batch retake registrations and schedule sync
                </p>
              </div>
              <Link
                to="/retake-courses"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 whitespace-nowrap shrink-0"
              >
                Manage
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {isLoadingRetakes ? (
              <div className="p-5 space-y-2.5 animate-pulse">
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg" />
              </div>
            ) : activeRetakes.length === 0 ? (
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100">
                      All Clear — No Active Retakes
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      You have no active retake or improvement courses registered this term.
                    </p>
                  </div>
                </div>
                <Link
                  to="/retake-courses"
                  className="self-start sm:self-center text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 whitespace-nowrap shrink-0"
                >
                  Register Course
                </Link>
              </div>
            ) : (
              <div>
                {retakeOverview && retakeOverview.stats.conflictsCount > 0 && (
                  <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/70 dark:border-amber-900/50 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong>{retakeOverview.stats.conflictsCount}</strong> routine schedule overlap{retakeOverview.stats.conflictsCount > 1 ? 's' : ''} detected with your regular batch classes.
                    </span>
                  </div>
                )}

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {activeRetakes.slice(0, 4).map((reg) => (
                    <div
                      key={reg.id}
                      className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                            {reg.courseCode}
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                            {reg.courseTitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {reg.type === 'IMPROVEMENT' ? 'Improvement' : 'Retake'} · With {reg.retakeBatchName || 'Target Batch'}
                          {reg.previousGrade ? ` · Prev: ${reg.previousGrade}` : ''}
                          {reg.targetGrade ? ` → Target: ${reg.targetGrade}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px] font-semibold">
                        <span className={reg.type === 'IMPROVEMENT' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}>
                          <RefreshCw className="w-3 h-3 inline mr-1" />
                          {reg.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {activeRetakes.length > 4 && (
                  <div className="px-5 py-2.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 text-right">
                    <Link
                      to="/retake-courses"
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View all {activeRetakes.length} registered courses
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* 3. CONTRIBUTION SUMMARY BAR */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
              Question Bank Contributions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your shared papers, verification progress, and contributor points
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSwitchTab('contribute')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Contribute Paper
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-slate-100 dark:divide-slate-800/80">
          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Total Uploads
            </span>
            <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5 block">
              {contributions.length}
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Approved
            </span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5 block">
              {approvedCount}
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Pending Review
            </span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-0.5 block">
              {pendingCount}
            </span>
          </div>

          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Contributor Pts
            </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums mt-0.5 flex items-center gap-1">
              <Award className="w-4 h-4 shrink-0" />
              {user?.points ?? 0}
            </span>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Earn +10 pts per upload and +25 bonus pts on verification
          </span>
          <button
            type="button"
            onClick={() => onSwitchTab('uploads')}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" />
            View Uploads
          </button>
        </div>
      </div>
    </div>
  );
};
