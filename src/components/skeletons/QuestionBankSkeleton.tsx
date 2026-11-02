import React from 'react';

export const QuestionBankGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 space-y-3.5 shadow-xs flex flex-col justify-between"
        >
          <div className="space-y-2.5">
            {/* Top row: Year & Exam Type badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="h-5 w-16 bg-blue-100 dark:bg-blue-900/40 rounded-md" />
              <div className="h-5 w-14 bg-amber-100 dark:bg-amber-900/40 rounded-md" />
            </div>

            {/* Course Code & Title */}
            <div className="space-y-1 pt-1">
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4.5 w-4/5 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>

            {/* Teacher / Subtitle */}
            <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>

          {/* Action Row */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
            <div className="h-8 w-24 bg-blue-600/30 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const QuestionBankTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs animate-pulse">
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx}>
          <td className="px-5 py-3.5">
            <div className="h-4 w-16 bg-blue-100 dark:bg-blue-900/40 rounded" />
          </td>
          <td className="px-5 py-3.5">
            <div className="space-y-1">
              <div className="h-4 w-44 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </td>
          <td className="px-5 py-3.5">
            <div className="h-5 w-14 bg-amber-100 dark:bg-amber-900/40 rounded" />
          </td>
          <td className="px-5 py-3.5">
            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
          </td>
          <td className="px-5 py-3.5 text-right">
            <div className="h-7 w-20 bg-blue-100 dark:bg-blue-900/40 rounded-lg ml-auto" />
          </td>
        </tr>
      ))}
    </tbody>
  );
};
