import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, User, Award, ArrowRight, RotateCcw,
  ShieldCheck, Mail, Phone, Clock, UserCheck, Copy, Check, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Course } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';
import { getUserAvatarUrl } from '../data/avatars';
import { CRProfileModal, CRProfileData } from '../components/common/CRProfileModal';

export const CoursesPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Batch CR State
  const [cr, setCr] = useState<CRProfileData | null>(null);
  const [isCRLoading, setIsCRLoading] = useState(true);
  const [isCRModalOpen, setIsCRModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch(`/api/courses?batchId=${user?.batchId || 'batch-9'}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => safeParseJson(res))
      .then((data) => setCourses(data.courses || []))
      .catch((err) => {
        console.warn('Could not fetch courses:', err);
      })
      .finally(() => setIsLoading(false));

    // Fetch Batch CR Profile
    setIsCRLoading(true);
    fetch('/api/batches/my-cr', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => safeParseJson(res))
      .then((data) => {
        if (data?.success && data?.crs?.length > 0) {
          setCr(data.crs[0]);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch CR profile:', err);
      })
      .finally(() => setIsCRLoading(false));
  }, [token, user]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    addToast('success', 'Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        title="Current Academic Courses"
        description="Registered courses for your batch semester. Select any course to access assigned question papers, notes, and lab manuals."
        breadcrumb={`${user?.batchName || 'SWE Batch'} • Semester ${user?.currentSemester}`}
      />

      {/* Retake & Improvement Quick Access Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Retake or Improvement Courses?
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              General students can register retake/improvement courses with junior batches, sync routine periods, and monitor exam schedules.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/retake-courses')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-xs transition-all"
        >
          <span>Retake & Improvement Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading course catalog...
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-[#E2E8F0] text-center text-xs text-slate-400">
          No courses currently assigned to this batch.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Enrolled Courses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Enrolled Semester Courses
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {courses.filter(c => !c.isRetakeCourse).length} Courses
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {user?.batchName || 'SWE Batch'} • Semester {user?.currentSemester}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {courses.filter(c => !c.isRetakeCourse).map((course) => (
                <div
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="bg-white dark:bg-[#0F172A] p-5 rounded-xl border border-[#D8E2EE] dark:border-slate-800 hover:border-blue-400 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] hover:shadow-[0_6px_18px_rgba(15,35,70,0.12)] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 bg-[#EFF5FF] text-[#2563EB] font-bold text-xs rounded-md border border-[#DBEAFE] font-mono">
                        {course.code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {course.shortName && (
                          <span className="px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[10px] rounded">
                            {course.shortName}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded uppercase">
                          {course.type}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-[#0F172A] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                      {course.title}
                    </h3>

                    <div className="mt-4 space-y-2 text-xs text-[#475569] dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-[#0F172A] dark:text-slate-200">
                          {course.assignedFacultyName || 'Not Assigned'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-semibold text-[#475569] dark:text-slate-300">
                          {course.credits} Academic Credits
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-[#E5EBF3] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#2563EB] group-hover:underline">
                    <span>View Course Materials</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Registered Retake / Improvement Courses */}
          {courses.some(c => c.isRetakeCourse) && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Registered Retake & Improvement Courses
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {courses.filter(c => c.isRetakeCourse).length} Active
                  </span>
                </div>
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  Synchronized with Junior Batches
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {courses.filter(c => c.isRetakeCourse).map((course) => (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="bg-white dark:bg-[#0F172A] p-5 rounded-xl border-2 border-amber-300 dark:border-amber-700/60 hover:border-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.08)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.16)] transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-md border border-amber-300 dark:border-amber-700 font-mono">
                          {course.code}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-500 text-white font-extrabold text-[10px] rounded-full uppercase tracking-wider shadow-2xs">
                          {course.retakeType || 'RETAKE'}
                        </span>
                      </div>

                      <div className="mb-3">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded">
                          Running in: {course.retakeBatchName || 'Junior Batch'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#0F172A] dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
                        {course.title}
                      </h3>

                      <div className="mt-4 space-y-2 text-xs text-[#475569] dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-[#0F172A] dark:text-slate-200">
                            {course.assignedFacultyName || 'Course Teacher (Junior Batch)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-semibold text-[#475569] dark:text-slate-300">
                            {course.credits} Academic Credits
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-amber-100 dark:border-amber-950 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:underline">
                      <span>View Course Materials</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Class Representative (CR) Sector - Placed Under Courses */}
          {cr && (
            <div id="batch-cr" className="pt-2 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Batch Class Representative (CR)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase tracking-wide">
                    Academic Coordinator
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {cr.batchName || user?.batchName || 'SWE Batch'}
                </span>
              </div>

              {/* Short Profile Card */}
              <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-800/60 transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
                {/* SIDE 1: Profile Avatar + Name, ID, CR Batch (Stacked upor-nic) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={getUserAvatarUrl({
                        name: cr.name,
                        studentId: cr.studentId,
                        profileImage: cr.profileImage,
                      })}
                      alt={cr.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 border-blue-500/20 dark:border-blue-400/20 bg-blue-50 dark:bg-slate-800 object-cover shadow-2xs"
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0F172A] flex items-center justify-center text-white text-[9px] font-bold" title="Active CR">
                      ✓
                    </span>
                  </div>

                  {/* Name, ID, CR Batch (Stacked upor-nic) */}
                  <div className="flex flex-col gap-1 min-w-0 w-full sm:w-auto">
                    {/* 1. Name */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                        {cr.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-300/60 dark:border-amber-800/60">
                        CR
                      </span>
                    </div>

                    {/* 2. ID */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        ID:
                      </span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
                        {cr.studentId}
                      </span>
                    </div>

                    {/* 3. CR Batch */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        CR Batch:
                      </span>
                      <span className="font-bold text-blue-700 dark:text-blue-400">
                        {cr.batchName || user?.batchName || 'SWE 9th Batch'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SIDE 2: Email & Number (Stacked upor-nic) + View Details */}
                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto md:min-w-[280px] pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
                  {/* 1. Email (upor) */}
                  <div className="flex items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email</span>
                        <a
                          href={`mailto:${cr.email}`}
                          className="font-mono font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 truncate text-xs transition-colors"
                          title={`Email ${cr.email}`}
                        >
                          {cr.email}
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(cr.email, 'cr-email')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 ml-1"
                      title="Copy Email"
                    >
                      {copiedField === 'cr-email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* 2. Number (nic) */}
                  <div className="flex items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 px-3 py-2 rounded-xl text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Number / WhatsApp</span>
                        <a
                          href={`tel:${cr.phone || '01312321255'}`}
                          className="font-mono font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 truncate text-xs transition-colors"
                          title={`Call ${cr.phone || '01312321255'}`}
                        >
                          {cr.phone || '01312321255'}
                        </a>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(cr.phone || '01312321255', 'cr-phone')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0 ml-1"
                      title="Copy Phone"
                    >
                      {copiedField === 'cr-phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* 3. View Full CR Profile */}
                  <button
                    type="button"
                    onClick={() => setIsCRModalOpen(true)}
                    className="w-full px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>View Full CR Profile</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CR Profile Modal */}
          <CRProfileModal
            isOpen={isCRModalOpen}
            onClose={() => setIsCRModalOpen(false)}
            cr={cr}
          />
        </div>
      )}
    </div>
  );
};
