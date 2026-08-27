import React, { useState } from 'react';
import sweLogoImg from '../../assets/images/swe_emblem_logo_1787573363177.jpg';

interface SweLogoProps {
  variant?: string;
  theme?: 'white' | 'navy';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  subText?: string;
}

export const SweLogo: React.FC<SweLogoProps> = ({
  theme = 'navy',
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeMap = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl'
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  if (hasError) {
    return (
      <div
        className={`${currentSize} rounded-xl bg-gradient-to-br from-[#2563EB] to-[#0A2147] text-white flex items-center justify-center font-black tracking-tight shadow-sm shrink-0 select-none border border-blue-400/20 ${className}`}
      >
        <span>SWE</span>
      </div>
    );
  }

  return (
    <div className={`relative ${currentSize} shrink-0 rounded-xl overflow-hidden shadow-xs border border-[#DCE5F0] dark:border-slate-800 bg-[#0A2147] flex items-center justify-center ${className}`}>
      <img
        src={sweLogoImg}
        alt="SWE Department Logo"
        onError={() => setHasError(true)}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover select-none transform hover:scale-105 transition-transform"
      />
    </div>
  );
};






