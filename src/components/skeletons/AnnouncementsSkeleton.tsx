import React from 'react';

export const AnnouncementsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3.5"
        >
          {/* Top row: Priority & Meta */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 bg-blue-100 dark:bg-blue-900/40 rounded-md" />
              <div className="h-5 w-24 bg-slate-100 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>

          {/* Title */}
          <div className="h-5 w-4/5 sm:w-1/2 bg-slate-200 dark:bg-slate-700 rounded-md" />

          {/* Body Lines */}
          <div className="space-y-2 pt-1">
            <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-3.5 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>

          {/* Publisher */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const AnnouncementsTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs animate-pulse">
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx}>
          <td className="px-5 py-4">
            <div className="space-y-1.5">
              <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </td>
          <td className="px-5 py-4">
            <div className="h-5 w-16 bg-blue-100 dark:bg-blue-900/40 rounded" />
          </td>
          <td className="px-5 py-4">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          </td>
          <td className="px-5 py-4 text-right">
            <div className="h-5 w-12 bg-rose-100 dark:bg-rose-900/40 rounded ml-auto" />
          </td>
        </tr>
      ))}
    </tbody>
  );
};
