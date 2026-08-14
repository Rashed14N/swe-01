import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, Clock, Megaphone,
  HelpCircle, FileText, FolderGit2, Bell, Users,
  UserCheck, Shield, ChevronLeft, ChevronRight, Sparkles,
  Layers, Settings, GraduationCap, X, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { user } = useAuth();

  const isRole = (role: string) => user?.role === role;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 ease-out active:scale-[0.98] ${
      isActive
        ? 'bg-gradient-to-r from-[#1769E8] to-[#2563EB] text-white font-bold shadow-md shadow-blue-950/40 translate-x-0.5'
        : 'text-blue-100/70 hover:bg-white/10 hover:text-white hover:translate-x-0.5 font-medium'
    }`;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container with Deep Navy Gradient */}
      <aside
        style={{
          background: 'linear-gradient(180deg, #031B3F 0%, #042B64 55%, #063A80 100%)',
        }}
        className={`fixed top-0 bottom-0 left-0 z-40 text-white flex flex-col transition-all duration-300 border-r border-[#0A397B] shadow-xl ${
          isCollapsed ? 'w-20' : 'w-60'
        } ${
          isMobileOpen ? 'translate-x-0 w-60' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#1769E8] flex items-center justify-center text-white shrink-0 font-bold shadow-xs">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-extrabold tracking-tight text-white truncate">
                  SWE Portal
                </span>
                <span className="text-[10px] text-blue-200/70 truncate font-medium">
                  Software Engineering Dept
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-300 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex text-slate-300 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* MAIN */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-blue-200/60 block mb-1.5">
                MAIN
              </span>
            )}
            <NavLink to="/dashboard" className={navLinkClass} onClick={onCloseMobile}>
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>
          </div>

          {/* CR PANEL */}
          {isRole('CR') && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-300/90 block mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> CR MANAGEMENT
                </span>
              )}
              <div className="space-y-1">
                <NavLink to="/cr/dashboard" className={navLinkClass} onClick={onCloseMobile}>
                  <Shield className="w-4 h-4 shrink-0 text-amber-400" />
                  {!isCollapsed && <span>CR Control Desk</span>}
                </NavLink>
                <NavLink to="/cr/announcements" className={navLinkClass} onClick={onCloseMobile}>
                  <Megaphone className="w-4 h-4 shrink-0 text-amber-300" />
                  {!isCollapsed && <span>Batch Notices</span>}
                </NavLink>
                <NavLink to="/cr/exams" className={navLinkClass} onClick={onCloseMobile}>
                  <Clock className="w-4 h-4 shrink-0 text-amber-300" />
                  {!isCollapsed && <span>Schedule Exams</span>}
                </NavLink>
                <NavLink to="/cr/routine-requests" className={navLinkClass} onClick={onCloseMobile}>
                  <Calendar className="w-4 h-4 shrink-0 text-amber-300" />
                  {!isCollapsed && <span>Routine Requests</span>}
                </NavLink>
              </div>
            </div>
          )}

          {/* CENTRAL ADMIN */}
          {isRole('ADMIN') && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-rose-300/90 block mb-1.5 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-rose-300" /> CENTRAL ADMIN
                </span>
              )}
              <div className="space-y-1">
                <NavLink to="/admin/dashboard" className={navLinkClass} onClick={onCloseMobile}>
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-rose-300" />
                  {!isCollapsed && <span>Admin Overview</span>}
                </NavLink>
                <NavLink to="/admin/students" className={navLinkClass} onClick={onCloseMobile}>
                  <Users className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Student Directory</span>}
                </NavLink>
                <NavLink to="/admin/cr-management" className={navLinkClass} onClick={onCloseMobile}>
                  <UserCheck className="w-4 h-4 shrink-0 text-amber-300" />
                  {!isCollapsed && <span>CR Management</span>}
                </NavLink>
                <NavLink to="/admin/batches" className={navLinkClass} onClick={onCloseMobile}>
                  <Layers className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Batches</span>}
                </NavLink>
                <NavLink to="/admin/routine" className={navLinkClass} onClick={onCloseMobile}>
                  <Calendar className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Routine & Requests</span>}
                </NavLink>
                <NavLink to="/admin/verification" className={navLinkClass} onClick={onCloseMobile}>
                  <UserCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  {!isCollapsed && <span>Verification Queue</span>}
                </NavLink>
                <NavLink to="/admin/notices" className={navLinkClass} onClick={onCloseMobile}>
                  <Megaphone className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Dept Notices</span>}
                </NavLink>
                <NavLink to="/admin/faculty" className={navLinkClass} onClick={onCloseMobile}>
                  <Users className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Faculty Roster</span>}
                </NavLink>
                <NavLink to="/admin/courses" className={navLinkClass} onClick={onCloseMobile}>
                  <BookOpen className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Courses Catalog</span>}
                </NavLink>
                <NavLink to="/admin/activity" className={navLinkClass} onClick={onCloseMobile}>
                  <Shield className="w-4 h-4 shrink-0 text-slate-400" />
                  {!isCollapsed && <span>Audit Trail</span>}
                </NavLink>
              </div>
            </div>
          )}

          {/* MY BATCH */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-blue-200/60 block mb-1.5">
                MY BATCH
              </span>
            )}
            <div className="space-y-1">
              <NavLink to="/routine" className={navLinkClass} onClick={onCloseMobile}>
                <Calendar className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Routine</span>}
              </NavLink>
              <NavLink to="/courses" className={navLinkClass} onClick={onCloseMobile}>
                <BookOpen className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Courses</span>}
              </NavLink>
              <NavLink to="/exams" className={navLinkClass} onClick={onCloseMobile}>
                <Clock className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Upcoming Exams</span>}
              </NavLink>
              <NavLink to="/announcements" className={navLinkClass} onClick={onCloseMobile}>
                <Megaphone className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Announcements</span>}
              </NavLink>
            </div>
          </div>

          {/* RESOURCES */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-blue-200/60 block mb-1.5">
                RESOURCES
              </span>
            )}
            <div className="space-y-1">
              <NavLink to="/resources/questions" className={navLinkClass} onClick={onCloseMobile}>
                <HelpCircle className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Question Bank</span>}
              </NavLink>
              <NavLink to="/resources/notes" className={navLinkClass} onClick={onCloseMobile}>
                <FileText className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Notes</span>}
              </NavLink>
              <NavLink to="/resources/labs" className={navLinkClass} onClick={onCloseMobile}>
                <FolderGit2 className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Lab Files</span>}
              </NavLink>
            </div>
          </div>

          {/* DEPARTMENT */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-blue-200/60 block mb-1.5">
                DEPARTMENT
              </span>
            )}
            <div className="space-y-1">
              <NavLink to="/notices" className={navLinkClass} onClick={onCloseMobile}>
                <Bell className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Department Notice</span>}
              </NavLink>
              <NavLink to="/faculty" className={navLinkClass} onClick={onCloseMobile}>
                <Users className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Faculty</span>}
              </NavLink>
            </div>
          </div>

          {/* ACCOUNT */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-blue-200/60 block mb-1.5">
                ACCOUNT
              </span>
            )}
            <NavLink to="/profile" className={navLinkClass} onClick={onCloseMobile}>
              <Settings className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Profile & Settings</span>}
            </NavLink>
          </div>
        </div>

        {/* Bottom Batch Panel */}
        {!isCollapsed && (
          <div className="p-3 border-t border-white/10 shrink-0">
            <div
              style={{
                background: 'rgba(37, 99, 235, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
              className="rounded-xl p-2.5 text-xs flex items-center justify-between"
            >
              <div>
                <span className="text-[10px] text-blue-200/80 uppercase block font-semibold">
                  My Batch
                </span>
                <span className="font-bold text-white block">
                  {user?.batchName || 'SWE 9th Batch'}
                </span>
                <span className="text-[11px] text-blue-200/70">
                  Current Semester: {user?.currentSemester || 5}th
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-blue-200/80" />
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

