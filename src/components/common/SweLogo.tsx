import React from 'react';

interface SweLogoProps {
  variant?: 'full' | 'icon' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  subText?: string;
}

export const SweLogo: React.FC<SweLogoProps> = ({
  variant = 'full',
  size = 'md',
  showText = false,
  className = '',
  subText
}) => {
  // Dimension presets to ensure it's never weirdly stretched or excessively large
  const sizeMap = {
    xs: { icon: 'h-6 w-6', full: 'h-6 max-w-[90px]', text: 'text-xs' },
    sm: { icon: 'h-8 w-8', full: 'h-7.5 max-w-[120px]', text: 'text-sm' },
    md: { icon: 'h-9.5 w-9.5', full: 'h-9 max-w-[150px]', text: 'text-base' },
    lg: { icon: 'h-11 w-11', full: 'h-11 max-w-[180px]', text: 'text-lg' },
    xl: { icon: 'h-14 w-14', full: 'h-14 max-w-[220px]', text: 'text-xl' }
  };

  const currentSize = sizeMap[size];

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <img
          src="/favicon.png"
          alt="SWE Logo"
          referrerPolicy="no-referrer"
          className={`${currentSize.icon} object-contain rounded-xl shadow-xs transition-transform duration-200 hover:scale-105`}
        />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs ${className}`}>
        <img
          src="/swe-logo.png"
          alt="SWE"
          referrerPolicy="no-referrer"
          className={`${currentSize.full} object-contain`}
        />
        {subText && (
          <span className="text-[11px] font-bold text-slate-500 border-l border-slate-200 pl-2 uppercase tracking-wider whitespace-nowrap">
            {subText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/swe-logo.png"
        alt="SWE Department Logo"
        referrerPolicy="no-referrer"
        className={`${currentSize.full} object-contain filter drop-shadow-xs transition-opacity duration-200`}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-black tracking-tight text-slate-900 ${currentSize.text}`}>
            SWE Portal
          </span>
          {subText && (
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
              {subText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
