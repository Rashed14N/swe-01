import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  actionText: string;
  onClick: () => void;
  icon: LucideIcon;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  actionText,
  onClick,
  icon: Icon,
}) => {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-white dark:bg-[#0F172A] rounded-xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-slate-800 shadow-xs hover:border-[#CBD5E1] dark:hover:border-slate-700 transition-all duration-150 ease-out flex flex-col justify-between"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#64748B] dark:text-slate-400 truncate">
          {title}
        </span>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </div>
      </div>

      <div className="mt-3">
        <span className="text-2xl sm:text-3xl font-bold text-[#0F172A] dark:text-white tracking-tight">
          {value}
        </span>
      </div>

      <div className="mt-4 pt-3 border-t border-[#F1F5F9] dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 group-hover:underline flex items-center gap-1">
          {actionText}
        </span>
      </div>
    </div>
  );
};
