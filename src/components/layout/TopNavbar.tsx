import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Search, Bell, User, LogOut, Settings, CheckCheck,
  ChevronDown, ShieldCheck, Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { SupabaseSetupModal } from '../common/SupabaseSetupModal';
import { isSupabaseConfigured } from '../../lib/supabase';

interface TopNavbarProps {
  onOpenMobileMenu: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBellWiggling, setIsBellWiggling] = useState(false);
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

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const prevUnreadCountRef = useRef<number>(unreadCount);

  // Trigger bell wiggle once when unread count increases or on initial load with unread items
  useEffect(() => {
    if (unreadCount > prevUnreadCountRef.current || (unreadCount > 0 && prevUnreadCountRef.current === 0)) {
      setIsBellWiggling(true);
      const timer = setTimeout(() => setIsBellWiggling(false), 400);
      return () => clearTimeout(timer);
    }
    prevUnreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
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
    if (path.includes('/routine')) return 'Routine';
    if (path.includes('/courses')) return 'Courses';
    if (path.includes('/exams')) return 'Upcoming Exams';
    if (path.includes('/announcements')) return 'Announcements';
    if (path.includes('/resources/questions')) return 'Question Bank';
    if (path.includes('/resources/notes')) return 'Notes';
    if (path.includes('/resources/labs')) return 'Lab Files';
    if (path.includes('/notices')) return 'Department Notice';
    if (path.includes('/faculty')) return 'Faculty';
    if (path.includes('/profile')) return 'Profile';
    if (path.includes('/cr')) return 'CR Dashboard';
    if (path.includes('/admin')) return 'Admin Dashboard';
    return 'SWE Portal';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/resources/questions?search=${encodeURIComponent(searchQuery)}`);
  };

  // User initials if photo unavailable
  const getInitials = (name?: string) => {
    if (!name) return 'RA';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-white/96 backdrop-blur-md border-b border-[#DCE5F0] sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 shadow-2xs">
      {/* Left: Mobile Toggle + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden text-slate-600 hover:text-[#10213B] p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base font-extrabold text-[#0A2147] tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center: Global Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
        <form onSubmit={handleSearchSubmit} className="w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search resources, notices, courses..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#F4F7FF] hover:bg-white text-xs text-[#10213B] placeholder-slate-400 pl-9 pr-4 py-2 rounded-xl border border-[#D5DFEB] focus:border-[#2563EB] focus:bg-white focus:outline-none focus:ring-3 focus:ring-blue-500/10 transition-all h-[38px]"
          />
        </form>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Supabase Status & Setup Trigger */}
        <button
          onClick={() => setIsSupabaseModalOpen(true)}
          title="Supabase Database Connection & Diagnostics"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 border ${
            supabaseLive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {supabaseLive ? 'Supabase Connected' : 'Connect Supabase'}
          </span>
          <span className={`w-2 h-2 rounded-full ${supabaseLive ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative text-slate-600 hover:text-[#10213B] p-2 rounded-xl hover:bg-[#EFF5FF] transition-all duration-150 active:scale-95"
          >
            <Bell className={`w-5 h-5 transition-transform duration-150 ${isBellWiggling ? 'animate-bell-wiggle' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#1769E8] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#DDE5F0] overflow-hidden z-50 animate-dropdown-entry">
              <div className="p-3.5 bg-[#F7F9FD] border-b border-[#DDE5F0] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#0A2147] uppercase tracking-wider">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#1D5FD1] text-[10px] font-bold rounded-full border border-[#C7D8F7]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-[#1F67DA] hover:text-[#1158C8] hover:underline flex items-center gap-1 font-bold active:scale-95 transition-transform duration-150"
                  >
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E9F2]">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No notifications right now.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.linkUrl) navigate(n.linkUrl);
                        setIsNotifOpen(false);
                      }}
                      className={`p-3.5 text-xs hover:bg-[#F1F6FF] cursor-pointer transition-colors duration-150 ${
                        !n.read ? 'bg-[#EFF5FF]/80' : 'text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[#10213B] mb-0.5">
                        <span>{n.title}</span>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[#1769E8]" />}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Avatar Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-[#EFF5FF] transition-all duration-150 active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#031B3F] to-[#063674] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
              {getInitials(user?.name)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-extrabold text-[#0A2147] leading-tight">
                {user?.name || 'Rashed Ahmed'}
              </span>
              <span className="text-[10px] text-[#52657C]">
                {user?.batchName || 'SWE 9th Batch'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline-block transition-transform duration-150" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#DDE5F0] overflow-hidden z-50 divide-y divide-[#E2E9F2] animate-dropdown-entry">
              <div className="p-3.5 bg-[#F7F9FD]">
                <p className="text-xs font-extrabold text-[#0A2147] truncate">{user?.name}</p>
                <p className="text-[11px] text-[#52657C] truncate">{user?.studentId || user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#1D5FD1] border border-[#C7D8F7] text-[10px] font-bold rounded-md uppercase">
                    {user?.role}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {user?.batchName}
                  </span>
                </div>
              </div>

              <div className="py-1 text-xs text-[#10213B]">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsProfileOpen(false);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-[#EFF5FF] text-left transition-colors font-medium"
                >
                  <User className="w-4 h-4 text-[#1769E8]" /> My Profile
                </button>
                <button
                  onClick={() => {
                    navigate('/profile');
                    setIsProfileOpen(false);
                  }}
                  className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-[#EFF5FF] text-left transition-colors font-medium"
                >
                  <Settings className="w-4 h-4 text-slate-400" /> Settings
                </button>
                {user?.role === 'CR' && (
                  <button
                    onClick={() => {
                      navigate('/cr/dashboard');
                      setIsProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-amber-50 text-left text-amber-800 font-bold transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600" /> CR Dashboard
                  </button>
                )}
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      navigate('/admin/dashboard');
                      setIsProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 flex items-center gap-2.5 hover:bg-rose-50 text-left text-rose-800 font-bold transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-rose-600" /> Admin Dashboard
                  </button>
                )}
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 text-left transition-colors"
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

