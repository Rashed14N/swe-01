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
              className="bg-white p-5 rounded-xl border border-[#CBD8E8] hover:border-blue-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-xs rounded border border-blue-200 font-mono">
                    {course.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {course.shortName && (
                      <span className="px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[10px] rounded">
                        {course.shortName}
                      </span>
                    )}
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded uppercase">
                      {course.type}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {course.title}
                </h3>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-800">
                      {course.assignedFacultyName || 'Department Faculty'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-700">
                      {course.credits} Academic Credits
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-[#CBD8E8] flex items-center justify-between text-xs font-bold text-blue-600 group-hover:underline">
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
