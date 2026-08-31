import React from 'react';
import { LucideIcon, ArrowUpRight } from 'lucide-react';

export interface DashboardSummaryCardProps {
  id?: string;
  title: string;
  count: number | string;
  icon: LucideIcon;
  actionLabel: string;
  onClick: () => void;
  accent: {
    iconBg: string;
    iconColor: string;
    actionBg: string;
    actionBorder: string;
    actionTextColor: string;
    darkIconBg?: string;
    darkIconColor?: string;
    darkActionBg?: string;
    darkActionBorder?: string;
    darkActionTextColor?: string;
  };
}

export const DashboardSummaryCard: React.FC<DashboardSummaryCardProps> = ({
  id,
  title,
  count,
  icon: Icon,
  actionLabel,
  onClick,
  accent,
}) => {
  return (
    <div
      id={id}
      onClick={onClick}
      className="group cursor-pointer rounded-2xl sm:rounded-[20px] p-3 sm:p-4 lg:p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-[2px] h-full min-w-0 overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #FFFFFF 0%, #F7FAFF 45%, #EEF5FF 100%)',
        border: '1px solid rgba(120, 170, 230, 0.35)',
        boxShadow: '0 6px 20px rgba(30, 90, 160, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
      }}
    >
      {/* Top Section: Title and Icon */}
      <div>
        <div className="flex items-center justify-between gap-2 min-h-[32px] sm:min-h-[36px] lg:min-h-[40px]">
          <h3 className="text-[12.5px] min-[360px]:text-[13px] sm:text-[14px] lg:text-[15px] font-bold text-[#123361] dark:text-slate-100 tracking-tight select-none leading-snug flex-1">
            {title}
          </h3>
          <div
            className="w-7 h-7 min-[360px]:w-8 min-[360px]:h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
            style={{
              backgroundColor: accent.iconBg,
              color: accent.iconColor,
            }}
          >
            <Icon className="w-3.5 h-3.5 min-[360px]:w-4 min-[360px]:h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* Central Count */}
        <div className="py-2.5 sm:py-3.5 lg:py-4 flex items-center justify-center">
          <span className="text-[28px] min-[360px]:text-[32px] sm:text-[38px] lg:text-[46px] font-extrabold text-[#0A2F6B] dark:text-slate-50 tracking-tight leading-none text-center select-none font-sans">
            {count}
          </span>
        </div>
      </div>

      {/* Bottom Section: Divider and Action Row */}
      <div className="space-y-2 sm:space-y-2.5 lg:space-y-3 pt-1 shrink-0 min-w-0">
        <div
          className="h-[1px] w-full"
          style={{ backgroundColor: '#D8E4F2' }}
        />

        <div
          className="flex items-center justify-between px-2.5 py-1.5 sm:px-3 sm:py-2 lg:px-3.5 lg:py-2.5 rounded-[10px] sm:rounded-[12px] transition-all duration-160 border min-w-0"
          style={{
            backgroundColor: accent.actionBg,
            borderColor: accent.actionBorder,
            color: accent.actionTextColor,
          }}
        >
          <span className="text-[11px] sm:text-[12.5px] lg:text-[14px] font-semibold tracking-tight truncate min-w-0">
            {actionLabel}
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-160 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 stroke-[2.5] shrink-0 ml-1" />
        </div>
      </div>
    </div>
  );
};
