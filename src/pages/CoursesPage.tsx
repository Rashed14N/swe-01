import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, User, Award, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Course } from '../types';
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
      .then((res) => res.json())
      .then((data) => setCourses(data.courses || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [token, user]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        title="Current Academic Courses"
        description="Registered courses for your batch semester. Select any course to access assigned question papers, notes, and lab manuals."
        breadcrumb={`${user?.batchName || 'SWE Batch'} • Semester ${user?.currentSemester}`}
      />

      {isLoading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading course catalog...
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-[#E2E8F0] text-center text-xs text-slate-400">
          No courses currently assigned to this batch.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
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
                      {course.assignedFacultyName || 'Department Faculty'}
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
      )}
    </div>
  );
};
