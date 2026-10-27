import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, User, Award, ArrowRight, RotateCcw, CheckCircle2, Bookmark
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import type { Course, ClassTask } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';
import { getEffectiveSemester } from '../utils/semester';

export const CoursesPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const effectiveSemester = getEffectiveSemester(user);
  const isStudentOrCR = user?.role === 'STUDENT' || user?.role === 'CR';

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [classTasks, setClassTasks] = useState<ClassTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // By default: student/CR sees their enrolled courses ('my-batch')
  const [semesterFilter, setSemesterFilter] = useState<string>('my-batch');
  const [isLoading, setIsLoading] = useState(true);

  // Sync to enrolled courses when user loads
  useEffect(() => {
    if (user && (user.role === 'STUDENT' || user.role === 'CR')) {
      if (semesterFilter === '') {
        setSemesterFilter('my-batch');
      }
    }
  }, [user]);

  // Fetch courses
  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/courses?all=true', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => safeParseJson(res))
      .then((data) => setAllCourses(data.courses || []))
      .catch((err) => {
        console.warn('Could not fetch courses:', err);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  // Fetch class tasks to show count on course cards
  const fetchClassTasks = () => {
    if (!token) return;
    fetch('/api/class-tasks', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => safeParseJson(res))
      .then((data) => {
        if (data.success && Array.isArray(data.tasks)) {
          setClassTasks(data.tasks);
        } else if (Array.isArray(data.topics)) {
          setClassTasks(data.topics);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch class tasks:', err);
      });
  };

  useEffect(() => {
    fetchClassTasks();
  }, [token]);

  // Check if a course is enrolled for the current user
  const isCourseEnrolled = (c: Course) => {
    if (c.isRetakeCourse) return true;
    if (user?.batchId && c.batchIds?.includes(user.batchId)) return true;
    return c.semester === effectiveSemester;
  };

  // Client-side filtering
  const filteredCourses = useMemo(() => {
    let result = allCourses;

    if (semesterFilter === 'my-batch') {
      result = result.filter(isCourseEnrolled);
    } else if (semesterFilter) {
      const semNum = Number(semesterFilter);
      result = result.filter((c) => c.semester === semNum);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q) ||
          (c.shortName && c.shortName.toLowerCase().includes(q)) ||
          (c.assignedFacultyName && c.assignedFacultyName.toLowerCase().includes(q)) ||
          (c.type && c.type.toLowerCase().includes(q)) ||
          String(c.semester).includes(q) ||
          `semester ${c.semester}`.includes(q) ||
          `${c.semester}th semester`.includes(q)
      );
    }

    return result;
  }, [allCourses, semesterFilter, searchQuery, user, effectiveSemester]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* 1. Header with Title */}
      <PageHeader
        title="Current Academic Courses"
      />

      {/* 2. Retake & Improvement Quick Access Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-3.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Retake or Improvement Courses?
          </h4>
        </div>
        <button
          onClick={() => navigate('/retake-courses')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <span>Retake & Improvement Desk</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5. Client-Side Search & Semester Filtering Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search courses by code (e.g. SWE 305), title, semester, faculty..."
        filters={[
          {
            id: 'semester',
            label: 'All Semesters',
            value: semesterFilter,
            onChange: (val) => {
              setSemesterFilter(val);
            },
            options: [
              { label: 'My Batch Enrolled', value: 'my-batch' },
              { label: 'All Semesters (1–12)', value: '' },
              { label: '1st Semester', value: '1' },
              { label: '2nd Semester', value: '2' },
              { label: '3rd Semester', value: '3' },
              { label: '4th Semester', value: '4' },
              { label: '5th Semester', value: '5' },
              { label: '6th Semester', value: '6' },
              { label: '7th Semester', value: '7' },
              { label: '8th Semester', value: '8' },
              { label: '9th Semester', value: '9' },
              { label: '10th Semester', value: '10' },
              { label: '11th Semester', value: '11' },
              { label: '12th Semester', value: '12' },
            ],
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setSemesterFilter(isStudentOrCR ? 'my-batch' : '');
        }}
        isFiltered={Boolean(searchQuery || (semesterFilter !== (isStudentOrCR ? 'my-batch' : '')))}
      />

      {/* 6. Courses Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading course catalog...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-12 border border-[#D8E2EE] dark:border-slate-800 text-center text-xs text-slate-400 space-y-2">
          <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="font-bold text-slate-700 dark:text-slate-300">
            {searchQuery || semesterFilter
              ? 'No courses found matching search criteria.'
              : 'No courses currently available.'}
          </p>
          {semesterFilter === 'my-batch' && (
            <button
              onClick={() => setSemesterFilter('')}
              className="px-3 py-1.5 text-xs text-blue-600 hover:underline font-bold"
            >
              Browse All 12 Semesters Curriculum
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Courses Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {semesterFilter === 'my-batch' ? 'My Enrolled Courses' : 'Academic Courses'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {filteredCourses.filter((c) => !c.isRetakeCourse).length} Courses
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses
                .filter((c) => !c.isRetakeCourse)
                .map((course) => {
                  const enrolled = isCourseEnrolled(course);
                  const courseTasksCount = classTasks.filter(
                    (t) =>
                      t.courseId === course.id ||
                      t.courseCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
                        course.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
                  ).length;

                  return (
                    <div
                      key={course.id}
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                        enrolled
                          ? 'bg-white dark:bg-[#0F172A] border-[#C8DCF0] dark:border-slate-800 hover:border-blue-500 shadow-[0_2px_8px_rgba(37,99,235,0.06)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.12)]'
                          : 'bg-white dark:bg-[#0F172A] border-[#D8E2EE] dark:border-slate-800 hover:border-blue-400 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-2.5 py-0.5 bg-[#EFF5FF] dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 font-bold text-xs rounded-md border border-[#DBEAFE] dark:border-blue-900 font-mono">
                            {course.code}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {enrolled && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] rounded-full border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>Enrolled</span>
                              </span>
                            )}
                            {course.shortName && (
                              <span className="px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[10px] rounded">
                                {course.shortName}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded uppercase">
                              Sem {course.semester} • {course.type}
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
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="font-semibold text-[#475569] dark:text-slate-300">
                                {course.credits} Credits
                              </span>
                            </div>
                            {courseTasksCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                <Bookmark className="w-3 h-3" />
                                <span>{courseTasksCount} tasks/updates</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-[#E5EBF3] dark:border-slate-800 flex items-center justify-between text-xs font-bold text-[#2563EB] group-hover:underline">
                        <span>View Tasks & Course Materials</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Registered Retake / Improvement Courses */}
          {filteredCourses.some((c) => c.isRetakeCourse) && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-900/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Registered Retake & Improvement Courses
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {filteredCourses.filter((c) => c.isRetakeCourse).length} Active
                  </span>
                </div>
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  Synchronized with Junior Batches
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCourses
                  .filter((c) => c.isRetakeCourse)
                  .map((course) => (
                    <div
                      key={course.id}
                      onClick={() => navigate(`/courses/${course.id}`)}
                      className="bg-white dark:bg-[#0F172A] p-5 rounded-2xl border-2 border-amber-300 dark:border-amber-700/60 hover:border-amber-500 shadow-[0_2px_8px_rgba(245,158,11,0.08)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.16)] transition-all cursor-pointer group flex flex-col justify-between"
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
                        <span>View Tasks & Course Materials</span>
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
