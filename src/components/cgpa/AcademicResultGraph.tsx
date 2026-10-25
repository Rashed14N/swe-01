import React, { useState, useMemo } from 'react';
import {
  Award, BarChart3, PieChart, CheckCircle2,
  Sparkles, ChevronRight, GraduationCap
} from 'lucide-react';
import type { SemesterData, EnrichedCourse, CGPASummary } from '../../pages/CGPAPage';

interface AcademicResultGraphProps {
  semesters: SemesterData[];
  courses: EnrichedCourse[];
  summary: CGPASummary | null;
  currentSemester?: number;
  onSelectSemester?: (semester: number) => void;
}

export const AcademicResultGraph: React.FC<AcademicResultGraphProps> = ({
  semesters,
  courses,
  summary,
  currentSemester = 5,
  onSelectSemester,
}) => {
  const [activeTab, setActiveTab] = useState<'BARS' | 'DISTRIBUTION'>('BARS');
  const [selectedSem, setSelectedSem] = useState<number | null>(null);

  // Normalize all 12 Semesters
  const semesterPoints = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const semNum = i + 1;
      const semData = semesters.find((s) => s.semester === semNum);
      const isGraded = Boolean(semData && semData.isPublished && semData.gradedCredits > 0);
      const sgpa = isGraded && semData?.sgpa !== null && semData?.sgpa !== undefined ? semData.sgpa : null;

      const topCourse = isGraded && semData?.courses?.length
        ? [...semData.courses]
            .filter((c) => c.isPublished && typeof c.gradePoint === 'number')
            .sort((a, b) => (b.gradePoint || 0) - (a.gradePoint || 0))[0]
        : null;

      return {
        semester: semNum,
        name: `Sem ${semNum}`,
        fullName:
          semNum === 1
            ? '1st Semester'
            : semNum === 2
            ? '2nd Semester'
            : semNum === 3
            ? '3rd Semester'
            : `${semNum}th Semester`,
        sgpa,
        cumulativeCgpa: semData?.cumulativeCgpa || null,
        isGraded,
        totalCredits: semData ? semData.totalCredits : 0,
        gradedCredits: semData ? semData.gradedCredits : 0,
        completedCredits: semData ? semData.completedCredits : 0,
        coursesCount: semData ? semData.courses.length : 0,
        isCurrent: semNum === currentSemester,
        isFuture: semNum > currentSemester,
        topCourse,
      };
    });
  }, [semesters, currentSemester]);

  // Performance Highlights
  const stats = useMemo(() => {
    const graded = semesterPoints.filter((s) => s.isGraded && s.sgpa !== null);
    if (graded.length === 0) {
      return {
        best: null,
        avg: null,
        gradedCount: 0,
      };
    }

    const sorted = [...graded].sort((a, b) => (b.sgpa || 0) - (a.sgpa || 0));
    const best = sorted[0];
    const avg = Number((graded.reduce((acc, s) => acc + (s.sgpa || 0), 0) / graded.length).toFixed(2));

    return {
      best,
      avg,
      gradedCount: graded.length,
    };
  }, [semesterPoints]);

  // Letter Grade Distribution
  const gradeDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      'A+': 0, 'A': 0, 'A-': 0,
      'B+': 0, 'B': 0, 'B-': 0,
      'C+': 0, 'C': 0, 'D': 0, 'F': 0,
    };

    let totalGraded = 0;
    courses.forEach((c) => {
      if (c.isPublished && c.grade && counts[c.grade] !== undefined) {
        counts[c.grade] += 1;
        totalGraded += 1;
      }
    });

    return { counts, totalGraded };
  }, [courses]);

  const activeSemData = useMemo(() => {
    if (selectedSem === null) return null;
    return semesterPoints.find((p) => p.semester === selectedSem) || null;
  }, [selectedSem, semesterPoints]);

  return (
    <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-2xs overflow-hidden transition-all print:hidden">
      {/* 1. Header Toolbar */}
      <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#FAFBFD] dark:bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-[#0B2348] dark:text-white tracking-tight">
                Academic Results Graph
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                12 Semesters
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Semester GPA performance overview across your degree
            </p>
          </div>
        </div>

        {/* Tab Controls: Results Bars & Grade Distribution */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0 self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('BARS');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'BARS'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Semester Results</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('DISTRIBUTION');
            }}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'DISTRIBUTION'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Grade Distribution</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Performance Highlights Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-3 py-2.5 sm:px-4 sm:py-3 bg-white dark:bg-[#0F172A] border-b border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Peak SGPA</span>
            <Award className="w-3 h-3 text-amber-500" />
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
              {stats.best?.sgpa !== null && stats.best?.sgpa !== undefined
                ? stats.best.sgpa.toFixed(2)
                : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold truncate">
              {stats.best ? `(${stats.best.name})` : ''}
            </span>
          </div>
        </div>

        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Average SGPA</span>
            <Sparkles className="w-3 h-3 text-blue-500" />
          </div>
          <div className="mt-0.5">
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono">
              {stats.avg !== null ? stats.avg.toFixed(2) : '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold ml-1">
              / 4.00
            </span>
          </div>
        </div>

        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Completed Terms</span>
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          </div>
          <div className="mt-0.5">
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.gradedCount}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold ml-1">
              of 12 Semesters
            </span>
          </div>
        </div>

        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            <span>Current CGPA</span>
            <GraduationCap className="w-3 h-3 text-blue-500" />
          </div>
          <div className="mt-0.5">
            <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
              {summary && summary.totalGradedCredits > 0 ? summary.cgpa.toFixed(2) : '0.00'}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold ml-1">
              / 4.00
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Visual Content */}
      <div className="p-3 sm:p-4.5">
        {activeTab === 'BARS' ? (
          <div>
            {/* Benchmark Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-medium">
                Tap or click any semester bar to inspect detailed results & top courses:
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>≥ 3.75 Dean's List</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>≥ 3.00 Good</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>≥ 2.50 Average</span>
                </span>
              </div>
            </div>

            {/* 12-Semester Responsive Results Bar Chart */}
            <div className="relative pt-6 pb-2 px-1 sm:px-2 bg-slate-50/60 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
              {/* Benchmark Reference Lines */}
              <div className="absolute inset-x-2 sm:inset-x-4 top-6 bottom-11 pointer-events-none flex flex-col justify-between opacity-35">
                <div className="border-b border-dashed border-emerald-600 w-full" title="3.75 Dean's List" />
                <div className="border-b border-dashed border-blue-500 w-full" title="3.00 Good Standing" />
                <div className="border-b border-dashed border-slate-400 w-full" title="2.00 Minimum Pass" />
              </div>

              {/* Bar Columns Container (Mobile Horizontal Scrollable or Grid) */}
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2 relative z-10">
                {semesterPoints.map((sem) => {
                  const gpa = sem.sgpa || 0;
                  const heightPct = sem.isGraded ? Math.max(12, Math.min(100, (gpa / 4.0) * 100)) : 6;
                  const isSelected = selectedSem === sem.semester;

                  let barBg = 'bg-slate-200 dark:bg-slate-700/80';
                  let numColor = 'text-slate-400 dark:text-slate-500';

                  if (sem.isGraded && sem.sgpa !== null) {
                    if (gpa >= 3.75) {
                      barBg = 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-xs shadow-emerald-500/20';
                      numColor = 'text-emerald-700 dark:text-emerald-400';
                    } else if (gpa >= 3.0) {
                      barBg = 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-xs shadow-blue-500/20';
                      numColor = 'text-blue-700 dark:text-blue-400';
                    } else if (gpa >= 2.5) {
                      barBg = 'bg-gradient-to-t from-amber-500 to-amber-400 shadow-xs shadow-amber-500/20';
                      numColor = 'text-amber-700 dark:text-amber-400';
                    } else {
                      barBg = 'bg-gradient-to-t from-rose-500 to-rose-400 shadow-xs shadow-rose-500/20';
                      numColor = 'text-rose-700 dark:text-rose-400';
                    }
                  }

                  return (
                    <div
                      key={sem.semester}
                      onClick={() => {
                        setSelectedSem(selectedSem === sem.semester ? null : sem.semester);
                      }}
                      className={`flex flex-col items-center group cursor-pointer p-1 rounded-xl transition-all select-none ${
                        isSelected
                          ? 'bg-blue-100/70 dark:bg-blue-950/80 ring-2 ring-blue-500 scale-102'
                          : 'hover:bg-white dark:hover:bg-slate-800/80'
                      }`}
                    >
                      {/* GPA Value Badge */}
                      <span className={`text-[10px] sm:text-[11px] font-mono font-black mb-1.5 transition-transform group-hover:scale-105 ${numColor}`}>
                        {sem.isGraded && sem.sgpa !== null ? sem.sgpa.toFixed(2) : '—'}
                      </span>

                      {/* Bar Pillar */}
                      <div className="w-full max-w-[28px] sm:max-w-[34px] h-32 sm:h-40 bg-slate-200/50 dark:bg-slate-800/70 rounded-t-lg relative flex items-end overflow-hidden p-0.5">
                        <div
                          className={`w-full rounded-t-md transition-all duration-500 ${barBg}`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>

                      {/* Semester Identifier */}
                      <span
                        className={`text-[10px] font-bold mt-1.5 px-1.5 py-0.5 rounded transition-colors ${
                          sem.isCurrent
                            ? 'bg-blue-600 text-white font-extrabold shadow-2xs'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        S{sem.semester}
                      </span>

                      {/* Credit indicator */}
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                        {sem.isGraded ? `${sem.gradedCredits}Cr` : 'Plan'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* VIEW: GRADE DISTRIBUTION */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <p>Breakdown of letter grades recorded across your curriculum:</p>
              <span className="font-bold text-slate-900 dark:text-white">
                Total Graded: {gradeDistribution.totalGraded} Courses
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {Object.entries(gradeDistribution.counts).map(([grade, count]) => {
                const pct =
                  gradeDistribution.totalGraded > 0
                    ? (count / gradeDistribution.totalGraded) * 100
                    : 0;

                let badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
                if (grade === 'A+' || grade === 'A') {
                  badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
                } else if (grade === 'C+' || grade === 'C') {
                  badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
                } else if (grade === 'D' || grade === 'F') {
                  badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                }

                return (
                  <div
                    key={grade}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-black ${badgeColor}`}>
                        {grade}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-1">
                        {pct.toFixed(0)}% of grades
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                        {count}
                      </span>
                      <span className="block text-[9px] uppercase font-bold text-slate-400">
                        courses
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Active Semester Inspection Card */}
        {activeSemData && (
          <div className="mt-3.5 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-white dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-800 border border-blue-200 dark:border-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                S{activeSemData.semester}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {activeSemData.fullName}
                  </h4>
                  {activeSemData.isCurrent && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                      Current Active Semester
                    </span>
                  )}
                  {activeSemData.isGraded && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Recorded Result
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  {activeSemData.topCourse
                    ? `Highest Grade: ${activeSemData.topCourse.code} (${activeSemData.topCourse.grade}) • ${activeSemData.topCourse.title}`
                    : activeSemData.isGraded
                    ? `${activeSemData.coursesCount} courses in this semester`
                    : 'Upcoming semester in degree curriculum'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Semester SGPA
                </span>
                <span className="text-sm sm:text-base font-mono font-black text-blue-600 dark:text-blue-400">
                  {activeSemData.sgpa !== null ? `${activeSemData.sgpa.toFixed(2)}` : 'Not Published'}
                </span>
              </div>

              {activeSemData.cumulativeCgpa !== null && (
                <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Cumulative CGPA
                  </span>
                  <span className="text-sm sm:text-base font-mono font-black text-amber-600 dark:text-amber-400">
                    {activeSemData.cumulativeCgpa.toFixed(2)}
                  </span>
                </div>
              )}

              <button
                onClick={() => onSelectSemester?.(activeSemData.semester)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 ml-1"
              >
                <span>Filter Courses</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
