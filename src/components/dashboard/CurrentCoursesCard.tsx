import React from 'react';
import { BookOpen, User, ChevronRight, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Course } from '../../types';

interface CurrentCoursesCardProps {
  courses: Course[];
}

export const CurrentCoursesCard: React.FC<CurrentCoursesCardProps> = ({ courses }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] flex flex-col h-full overflow-hidden">
      <div className="bg-[#F5F8FF] px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#DCE6F2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#0A2147]">Current Semester Courses</h3>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Registered courses</span>
          </div>
        </div>
        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] sm:text-xs font-bold rounded-full">
          {courses.length} Courses
        </span>
      </div>

      <div className="flex-1 p-3.5 sm:p-4 space-y-2.5">
        {courses.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-[#F6F9FD] rounded-lg border border-dashed border-[#D8E2EE]">
            No active courses found for your batch.
          </div>
        ) : (
          courses.slice(0, 4).map(course => (
            <div
              key={course.id}
              onClick={() => navigate(`/courses/${course.id}`)}
              className="p-2.5 sm:p-3 bg-white hover:bg-[#F7FAFF] rounded-lg border border-[#E5EBF3] flex items-center justify-between cursor-pointer transition-all duration-150 ease-out active:scale-[0.98] group"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-[#10213B] group-hover:text-[#2563EB] transition-colors truncate">
                    {course.title}
                  </span>
                  <span className="px-1.5 py-0.2 bg-[#F6F9FD] text-[#2563EB] text-[9px] sm:text-[10px] font-mono font-bold rounded border border-[#D8E2EE] shrink-0">
                    {course.code}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px] text-slate-500 mt-1">
                  <span className="flex items-center gap-1 truncate">
<<<<<<< HEAD
                    <User className="w-3 h-3 text-slate-400 shrink-0" /> {course.assignedFacultyName || 'Dept Faculty'}
=======
                    <User className="w-3 h-3 text-slate-400 shrink-0" /> {course.assignedFacultyName || 'Not Assigned'}
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                  </span>
                  <span className="flex items-center gap-1 font-bold text-amber-700 shrink-0">
                    <Award className="w-3 h-3 text-amber-600" /> {course.credits} Cr
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          ))
        )}
      </div>

      <div className="p-3.5 pt-0 bg-white flex justify-end">
        <button
          onClick={() => navigate('/courses')}
          className="text-[11px] sm:text-xs font-bold text-[#2563EB] hover:text-blue-800 flex items-center gap-1 hover:underline"
        >
          View All Courses & Materials <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

