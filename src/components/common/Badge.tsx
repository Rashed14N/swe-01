import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', size = 'sm', className = '' }) => {
  const styles = {
    primary: 'bg-[#EFF5FF] text-[#1D5FD1] border-[#C7D8F7]',
    success: 'bg-[#E9F8F1] text-[#087A55] border-[#C2EBD6]',
    warning: 'bg-[#FFF6DE] text-[#A66300] border-[#F3E1B8]',
    danger: 'bg-[#FDECEC] text-[#C63838] border-[#F5C2C2]',
    info: 'bg-[#EFF5FF] text-[#1D5FD1] border-[#C7D8F7]',
    purple: 'bg-[#F3E8FF] text-[#7C3AED] border-[#E9D5FF]',
    gray: 'bg-[#F1F5FA] text-[#52657C] border-[#DDE5F0]',
  };

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5 rounded-full font-bold',
    md: 'text-xs px-3 py-1 rounded-full font-extrabold',
  };

  return (
    <span className={`inline-flex items-center gap-1 border ${styles[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
