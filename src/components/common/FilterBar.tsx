import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
}

interface FilterBarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onReset?: () => void;
  isFiltered?: boolean;
  children?: React.ReactNode;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onReset,
  isFiltered = false,
  children,
}) => {
  return (
    <div className="bg-[#F6F9FD] p-3 sm:p-3.5 rounded-xl border border-[#DCE5F0] shadow-[0_1px_2px_rgba(15,35,70,0.04)] mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex-1 min-w-[220px] max-w-md relative">
        {onSearchChange && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-white border border-[#D8E2EE] rounded-lg pl-9 pr-3 py-2 text-xs text-[#10213B] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-3 focus:ring-blue-500/10 transition-all h-[38px]"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <div key={f.id} className="flex items-center">
            <select
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className="bg-white border border-[#D8E2EE] rounded-lg px-3 py-2 text-xs font-semibold text-[#10213B] hover:border-[#A3C0EE] focus:outline-none focus:border-[#2563EB] transition-all h-[38px]"
            >
              <option value="">{f.label}</option>
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {children}

        {onReset && isFiltered && (
          <button
            onClick={onReset}
            className="px-3.5 py-2 text-xs font-bold text-[#1769E8] bg-[#EFF5FF] hover:bg-[#E6EFFF] active:scale-[0.98] rounded-lg border border-[#C7D8F7] transition-all duration-150 flex items-center gap-1.5 h-[38px] shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
};
