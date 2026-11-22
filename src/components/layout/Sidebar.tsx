import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, Clock, Megaphone,
  HelpCircle, FileText, FolderGit2, Bell, Users,
  UserCheck, Shield, ChevronLeft, ChevronRight, Sparkles,
  Layers, Settings, X, ChevronDown, ShieldCheck, FileCheck,
  History, GraduationCap, SlidersHorizontal, RotateCcw, Award,
  Bug, Activity, BrainCircuit, Power
} from 'lucide-react';
import { SweLogo } from '../common/SweLogo';
import { ReportBugModal } from '../common/ReportBugModal';
import { useAuth } from '../../context/AuthContext';
import { useFeatureFlags, FeatureKey } from '../../context/FeatureFlagContext';
import { getEffectiveSemester } from '../../utils/semester';

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
  const { isFeatureEnabled } = useFeatureFlags();
  const [isReportBugModalOpen, setIsReportBugModalOpen] = useState(false);

  const isRole = (role: string) => user?.role === role;
  const isAdmin = isRole('ADMIN');
  const canShowFeature = (key: FeatureKey) => isFeatureEnabled(key) || isAdmin;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 ${isCollapsed ? 'justify-center px-0' : 'px-3'} py-2.5 rounded-xl text-xs font-sans tracking-tight transition-all duration-150 ease-out active:scale-[0.98] ${
      isActive
        ? 'bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold shadow-2xs [&>svg]:stroke-[2.6px]'
        : 'text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 hover:text-[#0F172A] dark:hover:text-slate-100 font-medium [&>svg]:stroke-[2.4px]'
    }`;

  const featureNavLinkClass = (key: FeatureKey) => (state: { isActive: boolean }) =>
    `${navLinkClass(state)}${!isFeatureEnabled(key) ? ' opacity-60' : ''}`;

  const renderOffBadge = (key: FeatureKey) =>
    !isCollapsed && isAdmin && !isFeatureEnabled(key) ? (
      <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0">
        OFF
      </span>
    ) : null;

  const showMyBatchSection = (
    ['routine', 'courses', 'retake_courses', 'exams', 'announcements'] as FeatureKey[]
  ).some(canShowFeature);
  const showResourcesSection = (['question_bank', 'faq'] as FeatureKey[]).some(canShowFeature);
  const showDepartmentSection = (['notices', 'faculty'] as FeatureKey[]).some(canShowFeature);

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
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white dark:bg-[#0F172A] text-[#0F172A] dark:text-[#F8FAFC] font-sans flex flex-col transition-all duration-300 border-r border-[#E2E8F0] dark:border-slate-800 shadow-xs ${
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
                <span className="text-[10px] text-[#64748B] dark:text-slate-400 truncate font-medium tracking-tight">
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
              <X strokeWidth={2.5} className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isCollapsed ? <ChevronRight strokeWidth={2.5} className="w-4 h-4" /> : <ChevronLeft strokeWidth={2.5} className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-4">
          {/* MAIN */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
                MAIN
              </span>
            )}
            <NavLink to="/dashboard" className={navLinkClass} onClick={onCloseMobile}>
              <LayoutDashboard strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-[#2563EB] dark:text-blue-400" />
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>
          </div>

          {/* ADMIN PANEL */}
          {isRole('ADMIN') && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1 flex items-center gap-1">
                  <ShieldCheck strokeWidth={2.5} className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> CENTRAL ADMIN
                </span>
              )}
              <div className="space-y-1">
                <NavLink to="/admin/dashboard" className={navLinkClass} onClick={onCloseMobile}>
                  <LayoutDashboard strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Admin Overview</span>}
                </NavLink>
                <NavLink to="/admin/students" className={navLinkClass} onClick={onCloseMobile}>
                  <Users strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Students & Users</span>}
                </NavLink>
                <NavLink to="/admin/cr-management" className={navLinkClass} onClick={onCloseMobile}>
                  <UserCheck strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>CR Permissions</span>}
                </NavLink>
                <NavLink to="/admin/batches" className={navLinkClass} onClick={onCloseMobile}>
                  <Layers strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Academic Batches</span>}
                </NavLink>
                <NavLink to="/admin/courses" className={navLinkClass} onClick={onCloseMobile}>
                  <BookOpen strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Curriculum & Courses</span>}
                </NavLink>
                <NavLink to="/admin/semesters" className={navLinkClass} onClick={onCloseMobile}>
                  <SlidersHorizontal strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Semester Management</span>}
                </NavLink>
                <NavLink to="/admin/faculty" className={navLinkClass} onClick={onCloseMobile}>
                  <GraduationCap strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Faculty Directory</span>}
                </NavLink>
                <NavLink to="/admin/routine" className={navLinkClass} onClick={onCloseMobile}>
                  <Calendar strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Routine Matrix</span>}
                </NavLink>
                <NavLink to="/admin/verification" className={navLinkClass} onClick={onCloseMobile}>
                  <FileCheck strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Resource Queue</span>}
                </NavLink>
                <NavLink to="/admin/notices" className={navLinkClass} onClick={onCloseMobile}>
                  <Bell strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Dept Notices</span>}
                </NavLink>
                <NavLink to="/admin/knowledge-base" className={navLinkClass} onClick={onCloseMobile}>
                  <BrainCircuit strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-purple-600 dark:text-purple-400" />
                  {!isCollapsed && <span>Chatbot Knowledge</span>}
                </NavLink>
                <NavLink to="/announcements" className={navLinkClass} onClick={onCloseMobile}>
                  <Megaphone strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Announcements</span>}
                </NavLink>
                <NavLink to="/admin/features" className={navLinkClass} onClick={onCloseMobile}>
                  <Power strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Feature Controls</span>}
                </NavLink>
                <NavLink to="/admin/analytics" className={navLinkClass} onClick={onCloseMobile}>
                  <Activity strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Feature Analytics</span>}
                </NavLink>
                <NavLink to="/admin/activity" className={navLinkClass} onClick={onCloseMobile}>
                  <History strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-rose-600 dark:text-rose-400" />
                  {!isCollapsed && <span>Audit Trail</span>}
                </NavLink>
              </div>
            </div>
          )}

          {/* CR PANEL */}
          {isRole('CR') && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1 flex items-center gap-1">
                  <Sparkles strokeWidth={2.5} className="w-3 h-3 text-amber-500" /> CR MANAGEMENT
                </span>
              )}
              <div className="space-y-1">
                <NavLink to="/cr/dashboard" className={navLinkClass} onClick={onCloseMobile}>
                  <Shield strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-amber-600" />
                  {!isCollapsed && <span>CR Control Desk</span>}
                </NavLink>
                {canShowFeature('announcements') && (
                  <NavLink to="/cr/announcements" className={featureNavLinkClass('announcements')} onClick={onCloseMobile}>
                    <Megaphone strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-amber-600" />
                    {!isCollapsed && <span className="truncate">Batch Notices</span>}
                    {renderOffBadge('announcements')}
                  </NavLink>
                )}
                {canShowFeature('exams') && (
                  <NavLink to="/cr/exams" className={featureNavLinkClass('exams')} onClick={onCloseMobile}>
                    <Clock strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-amber-600" />
                    {!isCollapsed && <span className="truncate">Schedule Exams</span>}
                    {renderOffBadge('exams')}
                  </NavLink>
                )}
                {canShowFeature('cr_routine_requests') && (
                  <NavLink to="/cr/routine-requests" className={featureNavLinkClass('cr_routine_requests')} onClick={onCloseMobile}>
                    <Calendar strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-amber-600" />
                    {!isCollapsed && <span className="truncate">Routine Requests</span>}
                    {renderOffBadge('cr_routine_requests')}
                  </NavLink>
                )}
                {canShowFeature('retake_courses') && (
                  <NavLink to="/cr/retakes" className={featureNavLinkClass('retake_courses')} onClick={onCloseMobile}>
                    <RotateCcw strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-amber-600" />
                    {!isCollapsed && <span className="truncate">Retake Students</span>}
                    {renderOffBadge('retake_courses')}
                  </NavLink>
                )}
              </div>
            </div>
          )}



          {/* MY BATCH */}
          {showMyBatchSection && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
                  MY BATCH
                </span>
              )}
              <div className="space-y-1">
                {canShowFeature('routine') && (
                  <NavLink to="/routine" className={featureNavLinkClass('routine')} onClick={onCloseMobile}>
                    <Calendar strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">Routine</span>}
                    {renderOffBadge('routine')}
                  </NavLink>
                )}
                {canShowFeature('courses') && (
                  <NavLink to="/courses" className={featureNavLinkClass('courses')} onClick={onCloseMobile}>
                    <BookOpen strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">Courses</span>}
                    {renderOffBadge('courses')}
                  </NavLink>
                )}
                {canShowFeature('retake_courses') && (
                  <NavLink to="/retake-courses" className={featureNavLinkClass('retake_courses')} onClick={onCloseMobile}>
                    <RotateCcw strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-amber-600 dark:text-amber-400" />
                    {!isCollapsed && <span className="truncate">Retake / Improvement</span>}
                    {renderOffBadge('retake_courses')}
                  </NavLink>
                )}
                {canShowFeature('exams') && (
                  <NavLink to="/exams" className={featureNavLinkClass('exams')} onClick={onCloseMobile}>
                    <Clock strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">Exams Schedules</span>}
                    {renderOffBadge('exams')}
                  </NavLink>
                )}
                {canShowFeature('announcements') && (
                  <NavLink to="/announcements" className={featureNavLinkClass('announcements')} onClick={onCloseMobile}>
                    <Megaphone strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">Announcements</span>}
                    {renderOffBadge('announcements')}
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* RESOURCES */}
          {showResourcesSection && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
                  RESOURCES
                </span>
              )}
              <div className="space-y-1">
                {canShowFeature('question_bank') && (
                  <NavLink to="/resources/questions" className={featureNavLinkClass('question_bank')} onClick={onCloseMobile}>
                    <GraduationCap strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">Question Bank</span>}
                    {renderOffBadge('question_bank')}
                  </NavLink>
                )}
                {canShowFeature('faq') && (
                  <NavLink to="/faq" className={featureNavLinkClass('faq')} onClick={onCloseMobile}>
                    <HelpCircle strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">FAQ</span>}
                    {renderOffBadge('faq')}
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* DEPARTMENT */}
          {showDepartmentSection && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
                  DEPARTMENT
                </span>
              )}
              <div className="space-y-1">
                {canShowFeature('notices') && (
                  <NavLink to="/notices" className={featureNavLinkClass('notices')} onClick={onCloseMobile}>
                    <Bell strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">Department Notice</span>}
                    {renderOffBadge('notices')}
                  </NavLink>
                )}
                {canShowFeature('faculty') && (
                  <NavLink to="/faculty" className={featureNavLinkClass('faculty')} onClick={onCloseMobile}>
                    <Users strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0" />
                    {!isCollapsed && <span className="truncate">Faculty</span>}
                    {renderOffBadge('faculty')}
                  </NavLink>
                )}
              </div>
            </div>
          )}

          {/* ACCOUNT */}
          <div>
            {!isCollapsed && (
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
                ACCOUNT
              </span>
            )}
            <div className="space-y-1">
              <NavLink to="/profile" className={navLinkClass} onClick={onCloseMobile}>
                <Settings strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0" />
                {!isCollapsed && <span>Profile & Settings</span>}
              </NavLink>
              {canShowFeature('cgpa') && (
                <NavLink to="/cgpa" className={featureNavLinkClass('cgpa')} onClick={onCloseMobile}>
                  <Award strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-[#2563EB] dark:text-blue-400" />
                  {!isCollapsed && <span className="truncate">My CGPA</span>}
                  {renderOffBadge('cgpa')}
                </NavLink>
              )}
            </div>
          </div>

          {/* REPORT BAR */}
          {canShowFeature('bug_report') && (
            <div>
              {!isCollapsed && (
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] dark:text-slate-500 block mb-1">
                  REPORT BAR
                </span>
              )}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsReportBugModalOpen(true);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 ${
                    isCollapsed ? 'justify-center px-0' : 'px-3'
                  } py-2.5 rounded-xl text-xs font-sans tracking-tight transition-all duration-150 ease-out active:scale-[0.98] text-[#64748B] dark:text-slate-400 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/60 hover:text-[#0F172A] dark:hover:text-slate-100 font-medium group cursor-pointer text-left [&>svg]:stroke-[2.4px]${
                    !isFeatureEnabled('bug_report') ? ' opacity-60' : ''
                  }`}
                  title={isCollapsed ? 'Report Bug' : undefined}
                >
                  <Bug strokeWidth={2.5} className="w-[18px] h-[18px] shrink-0 text-[#64748B] dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-slate-100 transition-colors" />
                  {!isCollapsed && <span className="truncate">Report Bug</span>}
                  {renderOffBadge('bug_report')}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Global Quick Bug Report Modal */}
      <ReportBugModal
        isOpen={isReportBugModalOpen}
        onClose={() => setIsReportBugModalOpen(false)}
      />
    </>
  );
};

