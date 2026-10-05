import React from 'react';

interface FacultyCardSkeletonProps {
  count?: number;
}

export const FacultyCardSkeleton: React.FC = () => {
  return (
    <div className="relative w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0F172A] shadow-[0_2px_10px_rgba(15,23,42,0.02)] p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden animate-pulse">
      {/* Top Section: Avatar, Name, Designation */}
      <div className="flex flex-col items-center flex-1">
        {/* 1. Circular Avatar Placeholder */}
        <div className="relative mb-2.5 flex items-center justify-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-white dark:border-slate-900 shadow-2xs shrink-0" />
        </div>

        {/* 2. Faculty Name Placeholder */}
        <div className="h-4 w-32 sm:w-36 bg-slate-200 dark:bg-slate-700/80 rounded-md mb-1.5 mx-auto" />

        {/* 3. Academic Designation Placeholder */}
        <div className="h-3 w-24 sm:w-28 bg-slate-100 dark:bg-slate-800 rounded-md mb-3 mx-auto" />

        {/* 4. Contact Information Rows Placeholder */}
        <div className="w-full space-y-1.5 sm:space-y-2 mt-auto">
          {/* Email Row Placeholder */}
          <div className="w-full bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-2 w-8 bg-slate-200/80 dark:bg-slate-700/80 rounded" />
                <div className="h-2.5 w-28 sm:w-32 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
          </div>

          {/* Phone Row Placeholder */}
          <div className="w-full bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-6 h-6 sm:w-6.5 sm:h-6.5 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="h-2 w-10 bg-slate-200/80 dark:bg-slate-700/80 rounded" />
                <div className="h-2.5 w-24 sm:w-28 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </div>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const FacultyGridSkeleton: React.FC<FacultyCardSkeletonProps> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
      {Array.from({ length: count }).map((_, index) => (
        <FacultyCardSkeleton key={index} />
      ))}
    </div>
  );
};
