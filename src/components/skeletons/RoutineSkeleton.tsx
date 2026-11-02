import React from 'react';

export const RoutineGridSkeleton: React.FC = () => {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];

  return (
    <div className="space-y-4 animate-pulse">
      {/* Mobile Day Selector Tabs Skeleton */}
      <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1">
        {days.map((_, idx) => (
          <div key={idx} className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0" />
        ))}
      </div>

      {/* Routine Timetable Grid */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        {/* Desktop Header Row */}
        <div className="hidden md:grid grid-cols-5 gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
          {days.map((day) => (
            <div key={day} className="space-y-1 text-center">
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded mx-auto" />
              <div className="h-3 w-10 bg-slate-100 dark:bg-slate-800 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Timetable Columns */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-4">
          {days.map((day, colIdx) => (
            <div key={day} className="space-y-3">
              {/* Day title on mobile only */}
              <div className="md:hidden h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2" />

              {/* Class Slot Skeletons */}
              {Array.from({ length: colIdx % 2 === 0 ? 3 : 2 }).map((_, slotIdx) => (
                <div
                  key={slotIdx}
                  className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-4 w-16 bg-blue-100 dark:bg-blue-900/50 rounded" />
                    <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                  <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
