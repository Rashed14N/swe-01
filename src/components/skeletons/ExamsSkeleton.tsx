import React from 'react';

export const ExamsMobileSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="pt-3 first:pt-0 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-5 w-16 bg-blue-100 dark:bg-blue-900/40 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 w-14 bg-rose-100 dark:bg-rose-900/40 rounded" />
          </div>
          <div className="space-y-1">
            <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ExamsTableSkeleton: React.FC<{ rows?: number; canManage?: boolean }> = ({
  rows = 5,
  canManage = false,
}) => {
  return (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs animate-pulse">
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
          {/* DATE */}
          <td className="px-5 py-4">
            <div className="space-y-1">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </td>
          {/* TYPE */}
          <td className="px-5 py-4">
            <div className="h-5 w-16 bg-rose-100 dark:bg-rose-900/40 rounded" />
          </td>
          {/* COURSE */}
          <td className="px-5 py-4">
            <div className="space-y-1">
              <div className="h-4 w-16 bg-blue-100 dark:bg-blue-900/40 rounded" />
              <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </td>
          {/* TITLE */}
          <td className="px-5 py-4">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
          </td>
          {/* ROOM & TIME */}
          <td className="px-5 py-4">
            <div className="space-y-1">
              <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-14 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </td>
          {/* STATUS */}
          <td className="px-5 py-4">
            <div className="h-5 w-18 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </td>
          {/* ACTIONS */}
          {canManage && (
            <td className="px-5 py-4 text-right">
              <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
            </td>
          )}
        </tr>
      ))}
    </tbody>
  );
};
