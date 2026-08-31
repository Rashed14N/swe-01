import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-[#F8FAFD] rounded-xl border border-dashed border-[#CDD9E8]">
      <div className="p-3 bg-[#EFF5FF] text-[#155EEF] rounded-xl mb-3 border border-[#C7D8F7]">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-bold text-[#0A2147]">{title}</h3>
      <p className="text-xs text-[#52657C] mt-1 max-w-sm leading-relaxed">{description}</p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-[#1769E8] hover:bg-[#1158C8] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
