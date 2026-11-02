import React from 'react';

export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-32 rounded-2xl bg-slate-800/80 border border-slate-700/50 p-6 flex flex-col justify-between" />

      {/* KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#0F172A] p-4.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
            <div className="space-y-1">
              <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Tabs & Table Skeleton */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-28 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            <div className="h-8 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            <div className="h-8 w-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          </div>
          <div className="h-8 w-40 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-1">
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-12 bg-emerald-100 dark:bg-emerald-900/40 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
