import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  primaryAction?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  };
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumb,
  primaryAction,
  children,
}) => {
  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#DDE5F0]">
      <div>
        {breadcrumb && (
          <div className="text-[11px] font-bold text-[#1D5FD1] uppercase tracking-wider mb-1">
            {breadcrumb}
          </div>
        )}
        <h1 className="text-xl md:text-2xl font-black text-[#0A2147] tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-[#52657C] mt-0.5 leading-relaxed font-medium">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {children}
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-2xs active:scale-[0.98] transition-all duration-150 flex items-center gap-2 ${
              primaryAction.variant === 'secondary'
                ? 'bg-[#F4F7FF] hover:bg-[#EAF2FF] text-[#1D5FD1] border border-[#D5E2FA]'
                : primaryAction.variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-[#1769E8] hover:bg-[#1158C8] text-white'
            }`}
          >
            {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
            {primaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
};
