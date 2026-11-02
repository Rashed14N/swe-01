import React from 'react';

export const NoticesSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5"
        >
          {/* Top row: Category & Date */}
          <div className="flex items-center justify-between gap-2">
            <div className="h-5 w-20 bg-blue-100 dark:bg-blue-900/40 rounded-md" />
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>

          {/* Title */}
          <div className="h-5 w-3/4 sm:w-2/3 bg-slate-200 dark:bg-slate-700 rounded-md" />

          {/* Body excerpt lines */}
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-5/6 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>

          {/* Footer: Publisher info */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
