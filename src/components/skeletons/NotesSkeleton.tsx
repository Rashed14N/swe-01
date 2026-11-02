import React from 'react';

export const NotesSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-3 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5 flex-1">
            <div className="w-10 h-10 rounded-xl bg-blue-100/70 dark:bg-blue-900/30 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-16 bg-blue-100 dark:bg-blue-900/40 rounded" />
              </div>
              <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="flex items-center gap-3 pt-0.5">
                <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-2.5 w-12 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          </div>
          <div className="h-8 w-24 bg-blue-100 dark:bg-blue-900/40 rounded-lg shrink-0 self-end sm:self-center" />
        </div>
      ))}
    </div>
  );
};
