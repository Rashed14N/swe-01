import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Search, User, LogOut, Settings,
  ChevronDown, ShieldCheck, Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SupabaseSetupModal } from '../common/SupabaseSetupModal';
import { getUserAvatarUrl } from '../../data/avatars';

interface TopNavbarProps {
  onOpenMobileMenu: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [supabaseLive, setSupabaseLive] = useState(true);

  useEffect(() => {
    const checkStatus = () => {
      fetch('/api/supabase/status')
        .then(res => res.json())
        .then(data => {
          if (data && typeof data.isConfigured === 'boolean') {
            setSupabaseLive(data.isConfigured);
          }
        })
        .catch(() => {});
    };

    checkStatus();
    const handleConfigured = () => setSupabaseLive(true);
    window.addEventListener('supabase-configured', handleConfigured);
    const interval = setInterval(checkStatus, 10000);
    return () => {
      window.removeEventListener('supabase-configured', handleConfigured);
      clearInterval(interval);
    };
  }, [isSupabaseModalOpen]);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Student Dashboard';
    if (path.includes('/routine')) return 'Class Routine';
    if (path.includes('/courses')) return 'Enrolled Courses';
    if (path.includes('/exams')) return 'Upcoming Exams';
    if (path.includes('/announcements')) return 'Announcements';
    if (path.includes('/resources/questions')) return 'Question Bank';
    if (path.includes('/faq')) return 'Frequently Asked Questions (FAQ)';
    if (path.includes('/notices')) return 'Department Notices';
    if (path.includes('/faculty')) return 'Faculty Directory';
    if (path.includes('/profile')) return 'Profile & Settings';
    if (path.includes('/cr')) return 'CR Dashboard';
    if (path.includes('/admin')) return 'Admin Dashboard';
    return 'Student Dashboard';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/resources/questions?search=${encodeURIComponent(searchQuery)}`);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'ST';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 shadow-2xs transition-colors duration-200">
      {/* Left: Mobile Toggle + Page Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-sm sm:text-base font-bold text-[#0B2348] dark:text-white tracking-tight truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center: Global Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <form onSubmit={handleSearchSubmit} className="w-full relative">
          <Search className="w-4 h-4 text-[#94A3B8] dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search courses, exams, notes, notices..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFC] dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-xs text-[#0F172A] dark:text-slate-100 placeholder-[#94A3B8] dark:placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 focus:border-[#2563EB] focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all h-[38px]"
          />
        </form>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0B2348] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs border border-slate-200 dark:border-slate-700">
              <img
                src={getUserAvatarUrl(user)}
                alt={user?.name || 'User Avatar'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[#0B2348] dark:text-slate-100 leading-tight">
                {user?.name || 'Rashed Ahmed'}
              </span>
              <span className="text-[10px] text-[#64748B] dark:text-slate-400">
                {user?.batchName || 'SWE 9th Batch'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline-block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0F172A] rounded-2xl shadow-xl border border-[#E2E8F0] dark:border-slate-700 overflow-hidden z-50 divide-y divide-[#E2E8F0] dark:divide-slate-800 animate-dropdown-entry">
              <div className="p-3.5 bg-[#F8FAFC] dark:bg-slate-800/60">
                <p className="text-xs font-bold text-[#0B2348] dark:text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">{user?.studentId || user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] font-bold rounded-md uppercase">
                    {user?.role}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    {user?.batchName}
                  </span>
                </div>
              </div>

              <div className="py-1 text-xs text-[#0F172A] dark:text-slate-200">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsProfileOpen(false);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-[#EFF6FF] dark:hover:bg-slate-800 text-left transition-colors font-medium"
                >
                  <User className="w-4 h-4 text-[#2563EB]" /> My Profile
                </button>
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsProfileOpen(false);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-[#EFF6FF] dark:hover:bg-slate-800 text-left transition-colors font-medium"
                >
                  <Settings className="w-4 h-4 text-slate-400" /> Settings
                </button>
                {user?.role === 'CR' && (
                  <button
                    onClick={() => {
                      navigate('/cr/dashboard');
                      setIsProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-left text-amber-800 dark:text-amber-300 font-bold transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600" /> CR Dashboard
                  </button>
                )}
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 text-left transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SupabaseSetupModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </header>
  );
};
