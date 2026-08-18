import React from 'react';
import appLogo from '../../assets/images/swe_app_icon_1787048700418.jpg';

interface SweLogoProps {
  variant?: 'full' | 'icon' | 'badge';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  subText?: string;
}

export const SweLogo: React.FC<SweLogoProps> = ({
  variant = 'icon',
  size = 'md',
  showText = false,
  className = '',
  subText
}) => {
  // Dimension presets to ensure it's never weirdly stretched or excessively large
  const sizeMap = {
    xs: { icon: 'h-6 w-6', rounded: 'rounded-lg', full: 'h-6 max-w-[90px]', text: 'text-xs' },
    sm: { icon: 'h-8 w-8', rounded: 'rounded-xl', full: 'h-8 max-w-[120px]', text: 'text-sm' },
    md: { icon: 'h-10 w-10', rounded: 'rounded-xl', full: 'h-10 max-w-[150px]', text: 'text-base' },
    lg: { icon: 'h-12 w-12', rounded: 'rounded-2xl', full: 'h-12 max-w-[180px]', text: 'text-lg' },
    xl: { icon: 'h-16 w-16', rounded: 'rounded-3xl', full: 'h-16 max-w-[220px]', text: 'text-xl' }
  };

  const currentSize = sizeMap[size];

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        <img
          src={appLogo}
          alt="SWE Portal Logo"
          referrerPolicy="no-referrer"
          className={`${currentSize.icon} ${currentSize.rounded} object-cover shadow-sm transition-transform duration-200 hover:scale-105`}
        />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs ${className}`}>
        <img
          src={appLogo}
          alt="SWE Portal"
          referrerPolicy="no-referrer"
          className={`${currentSize.icon} ${currentSize.rounded} object-cover`}
        />
        {subText && (
          <span className="text-[11px] font-bold text-slate-600 border-l border-slate-200 pl-2 uppercase tracking-wider whitespace-nowrap">
            {subText}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src={appLogo}
        alt="SWE Portal Logo"
        referrerPolicy="no-referrer"
        className={`${currentSize.icon} ${currentSize.rounded} object-cover shadow-sm transition-opacity duration-200`}
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

