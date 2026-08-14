import React from 'react';
import { Clock, MapPin, User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RoutineSlot } from '../../types';

interface TodaysRoutineCardProps {
  routine: RoutineSlot[];
}

export const TodaysRoutineCard: React.FC<TodaysRoutineCardProps> = ({ routine }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] flex flex-col h-full overflow-hidden">
      <div className="bg-[#F5F8FF] px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#DCE6F2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#0A2147]">Today's Schedule</h3>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] sm:text-xs font-bold rounded-full">
          {routine.length} {routine.length === 1 ? 'Class' : 'Classes'}
        </span>
      </div>

      <div className="flex-1 p-3.5 sm:p-4 space-y-2.5">
        {routine.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-[#F6F9FD] rounded-lg border border-dashed border-[#D8E2EE]">
            🎉 No classes scheduled for today!
          </div>
        ) : (
          routine.map(slot => (
            <div
              key={slot.id}
              className="p-3 bg-white hover:bg-[#F7FAFF] rounded-lg border border-[#E5EBF3] transition-all space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[#10213B] truncate">{slot.courseTitle}</h4>
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#2563EB]">{slot.courseCode}</span>
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 bg-[#F6F9FD] px-2 py-0.5 rounded-md border border-[#D8E2EE] shrink-0 font-mono">
                  {slot.startTime} – {slot.endTime}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-600 pt-1 border-t border-[#E5EBF3]">
                <span className="flex items-center gap-1 font-medium truncate">
                  <User className="w-3 h-3 text-slate-400 shrink-0" /> {slot.teacherName}
                </span>
                <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                  <MapPin className="w-3 h-3 text-amber-600" /> {slot.room}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3.5 pt-0 bg-white flex justify-end">
        <button
          onClick={() => navigate('/routine')}
          className="text-[11px] sm:text-xs font-bold text-[#2563EB] hover:text-blue-800 flex items-center gap-1 hover:underline"
        >
          View Full Weekly Routine <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

