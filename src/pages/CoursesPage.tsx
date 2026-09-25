import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, User, Award, ArrowRight, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Course } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';

export const CoursesPage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [token, user]);

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
        </div>
      )}
    </div>
  );
};
