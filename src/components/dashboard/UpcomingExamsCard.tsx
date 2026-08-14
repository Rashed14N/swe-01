import React from 'react';
import { Calendar, ChevronRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Exam } from '../../types';

interface UpcomingExamsCardProps {
  exams: (Exam & { daysLeft: number })[];
}

export const UpcomingExamsCard: React.FC<UpcomingExamsCardProps> = ({ exams }) => {
  const navigate = useNavigate();

  const getExamBadge = (type: string) => {
    switch (type) {
      case 'MIDTERM': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'FINAL': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'QUIZ': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LAB_EXAM': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] flex flex-col h-full overflow-hidden">
      <div className="bg-[#F5F8FF] px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#DCE6F2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#0A2147]">Upcoming Assessments</h3>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">Nearest exams</span>
          </div>
        </div>
        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] sm:text-xs font-bold rounded-full">
          {exams.length} Upcoming
        </span>
      </div>

      <div className="flex-1 p-3.5 sm:p-4 space-y-2.5">
        {exams.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-[#F6F9FD] rounded-lg border border-dashed border-[#D8E2EE]">
            🎉 No upcoming exams or tests right now!
          </div>
        ) : (
          exams.slice(0, 3).map(exam => {
            const dateObj = new Date(exam.date);
            const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const dayNum = dateObj.getDate();

            return (
              <div
                key={exam.id}
                className="p-2.5 sm:p-3 bg-white hover:bg-[#F7FAFF] rounded-lg border border-[#E5EBF3] flex items-center gap-2.5 transition-all"
              >
                {/* Date Block */}
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#F6F9FD] rounded-lg border border-[#D8E2EE] flex flex-col items-center justify-center shrink-0">
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 tracking-wider uppercase leading-none">
                    {monthStr}
                  </span>
                  <span className="text-sm sm:text-base font-black text-[#0A2147] leading-none mt-0.5">
                    {dayNum}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[#10213B] truncate">{exam.title}</span>
                    <span className={`px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold rounded border ${getExamBadge(exam.type)}`}>
                      {exam.type}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-600 truncate mt-0.5">
                    {exam.courseCode} • {exam.courseTitle}
                  </p>
                  {exam.room && (
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {exam.room}
                    </span>
                  )}
                </div>

                {/* Days left badge */}
                <div className="shrink-0 text-right">
                  <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-lg border inline-block ${
                    exam.daysLeft <= 3
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {exam.daysLeft === 0 ? 'Today!' : exam.daysLeft === 1 ? 'Tomorrow' : `${exam.daysLeft}d left`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3.5 pt-0 bg-white flex justify-end">
        <button
          onClick={() => navigate('/exams')}
          className="text-[11px] sm:text-xs font-bold text-[#2563EB] hover:text-blue-800 flex items-center gap-1 hover:underline"
        >
          View All Exams & Deadlines <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

