import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, Clock, Megaphone,
  HelpCircle, FileText, FolderGit2, Bell, Users,
  UserCheck, Shield, ChevronLeft, ChevronRight, Sparkles,
<<<<<<< HEAD
  Layers, Settings, X, ChevronDown
=======
  Layers, Settings, X, ChevronDown, ShieldCheck, FileCheck,
  History, GraduationCap
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
} from 'lucide-react';
import { SweLogo } from '../common/SweLogo';
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
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all duration-150 ease-out active:scale-[0.98] ${
      isActive
        ? 'bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold shadow-2xs'
        : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 hover:text-[#0F172A] dark:hover:text-slate-100 font-medium'
    }`;

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container: Clean White in Light Theme */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] flex flex-col transition-all duration-300 border-r border-[#E2E8F0] dark:border-slate-800 shadow-xs ${
          isCollapsed ? 'w-20' : 'w-60'
        } ${
          isMobileOpen ? 'translate-x-0 w-60' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E8F0] dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <SweLogo theme="navy" size="sm" />
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight text-[#0B2348] dark:text-white truncate leading-tight">
                  Student Portal
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-slate-400 truncate font-medium">
                  Dept of Software Engineering
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center">
            <button
              onClick={onCloseMobile}
              className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {/* MAIN */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
                MAIN
              </span>
            )}
            <NavLink to="/dashboard" className={navLinkClass} onClick={onCloseMobile}>
              <LayoutDashboard className="w-4 h-4 shrink-0 text-[#2563EB] dark:text-blue-400" />
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>
          </div>

<<<<<<< HEAD
=======
          {/* ADMIN PANEL */}
          {isRole('ADMIN') && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> CENTRAL ADMIN
                </span>
              )}
              <div className="space-y-1">
                <NavLink to="/admin/dashboard" className={navLinkClass} onClick={onCloseMobile}>
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Admin Overview</span>}
                </NavLink>
                <NavLink to="/admin/students" className={navLinkClass} onClick={onCloseMobile}>
                  <Users className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Students & Users</span>}
                </NavLink>
                <NavLink to="/admin/cr-management" className={navLinkClass} onClick={onCloseMobile}>
                  <UserCheck className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>CR Permissions</span>}
                </NavLink>
                <NavLink to="/admin/batches" className={navLinkClass} onClick={onCloseMobile}>
                  <Layers className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Academic Batches</span>}
                </NavLink>
                <NavLink to="/admin/courses" className={navLinkClass} onClick={onCloseMobile}>
                  <BookOpen className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Curriculum & Courses</span>}
                </NavLink>
                <NavLink to="/admin/faculty" className={navLinkClass} onClick={onCloseMobile}>
                  <GraduationCap className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Faculty Directory</span>}
                </NavLink>
                <NavLink to="/admin/routine" className={navLinkClass} onClick={onCloseMobile}>
                  <Calendar className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Routine Matrix</span>}
                </NavLink>
                <NavLink to="/admin/verification" className={navLinkClass} onClick={onCloseMobile}>
                  <FileCheck className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Resource Queue</span>}
                </NavLink>
                <NavLink to="/admin/notices" className={navLinkClass} onClick={onCloseMobile}>
                  <Bell className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Dept Notices</span>}
                </NavLink>
                <NavLink to="/admin/activity" className={navLinkClass} onClick={onCloseMobile}>
                  <History className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Audit Trail</span>}
                </NavLink>
              </div>
            </div>
          )}

>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
          {/* CR PANEL */}
          {isRole('CR') && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> CR MANAGEMENT
                </span>
              )}
              <div className="space-y-1">
                <NavLink to="/cr/dashboard" className={navLinkClass} onClick={onCloseMobile}>
                  <Shield className="w-4 h-4 shrink-0 text-amber-600" />
                  {!isCollapsed && <span>CR Control Desk</span>}
                </NavLink>
                <NavLink to="/cr/announcements" className={navLinkClass} onClick={onCloseMobile}>
                  <Megaphone className="w-4 h-4 shrink-0 text-amber-600" />
                  {!isCollapsed && <span>Batch Notices</span>}
                </NavLink>
                <NavLink to="/cr/exams" className={navLinkClass} onClick={onCloseMobile}>
                  <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                  {!isCollapsed && <span>Schedule Exams</span>}
                </NavLink>
                <NavLink to="/cr/routine-requests" className={navLinkClass} onClick={onCloseMobile}>
                  <Calendar className="w-4 h-4 shrink-0 text-amber-600" />
                  {!isCollapsed && <span>Routine Requests</span>}
                </NavLink>
              </div>
            </div>
          )}

<<<<<<< HEAD
          {/* CENTRAL ADMIN */}
          {isRole('ADMIN') && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-rose-500" /> CENTRAL ADMIN
                </span>
              )}
              <div className="space-y-1">
                <NavLink to="/admin/dashboard" className={navLinkClass} onClick={onCloseMobile}>
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-rose-500" />
                  {!isCollapsed && <span>Admin Overview</span>}
                </NavLink>
                <NavLink to="/admin/students" className={navLinkClass} onClick={onCloseMobile}>
                  <Users className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Student Directory</span>}
                </NavLink>
                <NavLink to="/admin/cr-management" className={navLinkClass} onClick={onCloseMobile}>
                  <UserCheck className="w-4 h-4 shrink-0 text-amber-600" />
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
                  <UserCheck className="w-4 h-4 shrink-0 text-emerald-600" />
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
=======

>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

          {/* MY BATCH */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
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
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
                RESOURCES
              </span>
            )}
            <div className="space-y-1">
              <NavLink to="/resources/questions" className={navLinkClass} onClick={onCloseMobile}>
<<<<<<< HEAD
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
=======
                <GraduationCap className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>Question Bank</span>}
              </NavLink>
              <NavLink to="/faq" className={navLinkClass} onClick={onCloseMobile}>
                <HelpCircle className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>FAQ</span>}
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
              </NavLink>
            </div>
          </div>

          {/* DEPARTMENT */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
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
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
                ACCOUNT
              </span>
            )}
            <NavLink to="/profile" className={navLinkClass} onClick={onCloseMobile}>
              <Settings className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span>Profile & Settings</span>}
            </NavLink>
          </div>
        </div>

        {/* Bottom Batch Panel: Clean Academic Card */}
        {!isCollapsed && (
          <div className="p-3 border-t border-[#E2E8F0] dark:border-slate-800 shrink-0">
            <div className="rounded-xl p-3 bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700/60 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#64748B] dark:text-slate-400 uppercase block font-semibold">
                  Current Batch
                </span>
                <span className="font-bold text-[#0B2348] dark:text-white block mt-0.5">
                  {user?.batchName || 'SWE 9th Batch'}
                </span>
                <span className="text-[11px] text-[#2563EB] dark:text-blue-400 font-medium">
                  Semester {user?.currentSemester || 4}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
