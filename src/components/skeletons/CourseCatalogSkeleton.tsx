import React from 'react';

interface CourseCatalogSkeletonProps {
  count?: number;
}

export const CourseCatalogSkeleton: React.FC<CourseCatalogSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 space-y-4 shadow-xs flex flex-col justify-between"
        >
          <div className="space-y-3">
            {/* Top row: Code badge & Type pill */}
            <div className="flex items-center justify-between gap-2">
              <div className="h-6 w-20 bg-blue-100 dark:bg-blue-900/50 rounded-lg" />
              <div className="h-5 w-14 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>

            {/* Title & Short name */}
            <div className="space-y-1.5 pt-1">
              <div className="h-4.5 w-4/5 bg-slate-200 dark:bg-slate-700 rounded-md" />
              <div className="h-3.5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>

            {/* Credits & Semester tags */}
            <div className="flex items-center gap-2 pt-1">
              <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-md" />
              <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>
          </div>

          {/* Bottom row: Faculty member placeholder */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};
