import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  actionText: string;
  onClick: () => void;
  icon: LucideIcon;
  accentColor: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  actionText,
  onClick,
  icon: Icon,
  accentColor,
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-[#EFF5FF]',
      text: 'text-[#155EEF]',
      border: 'border-[#C7D8F7]',
      button: 'text-[#1D5FD1] group-hover:text-[#1158C8]',
    },
    emerald: {
      bg: 'bg-[#E9F8F1]',
      text: 'text-[#087A55]',
      border: 'border-[#C2EBD6]',
      button: 'text-[#087A55] group-hover:text-[#045238]',
    },
    amber: {
      bg: 'bg-[#FFF6DE]',
      text: 'text-[#A66300]',
      border: 'border-[#F3E1B8]',
      button: 'text-[#A66300] group-hover:text-[#7A4900]',
    },
    purple: {
      bg: 'bg-[#F3E8FF]',
      text: 'text-[#7C3AED]',
      border: 'border-[#E9D5FF]',
      button: 'text-[#7C3AED] group-hover:text-[#5B21B6]',
    },
    rose: {
      bg: 'bg-[#FDECEC]',
      text: 'text-[#C63838]',
      border: 'border-[#F5C2C2]',
      button: 'text-[#C63838] group-hover:text-[#991B1B]',
    },
  };

  const currentTheme = colorMap[accentColor];

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-xl p-3.5 sm:p-5 border border-[#D9E3EF] hover:border-[#A3C0EE] shadow-[0_4px_14px_rgba(15,35,70,0.05)] hover:shadow-[0_6px_18px_rgba(15,35,70,0.08)] active:scale-[0.98] transition-all duration-150 ease-out flex flex-col justify-between"
    >
      <div className="flex items-center justify-between gap-1.5">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#52657C] truncate">
          {title}
        </span>
        <div className={`p-2 sm:p-2.5 rounded-xl border shrink-0 ${currentTheme.bg} ${currentTheme.text} ${currentTheme.border}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-black text-[#0A2147] tracking-tight">
          {value}
        </span>
      </div>

      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-[#E2E9F2] flex items-center justify-between text-[11px] sm:text-xs font-bold">
        <span className={`${currentTheme.button} group-hover:underline flex items-center gap-1`}>
          {actionText}
        </span>
      </div>
    </div>
  );
};


