import React from 'react';
import { Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RoutineSlot } from '../../types';
import { RoutineClassCard } from '../routine/RoutineClassCard';

interface TodaysRoutineCardProps {
  routine: RoutineSlot[];
}

export const TodaysRoutineCard: React.FC<TodaysRoutineCardProps> = ({ routine }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] flex flex-col h-full overflow-hidden">
      <div
        className="relative overflow-hidden px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#D8E2EE] flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 85% 30%, rgba(126, 140, 255, 0.16), transparent 50%)',
            }}
          />
        </div>

        <div className="relative z-10 flex items-center">
          <h3 className="text-xs sm:text-sm font-bold text-[#0A2147]">Today's Class Schedule</h3>
        </div>
        <span className="relative z-10 px-2.5 py-0.5 bg-blue-50/90 text-blue-700 border border-blue-200 text-[10px] sm:text-xs font-bold rounded-full">
          {routine.length} {routine.length === 1 ? 'Class' : 'Classes'}
        </span>
      </div>

      <div className="flex-1 p-2.5 sm:p-3 space-y-2 sm:space-y-2.5">
        {routine.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-[#F6F9FD] rounded-lg border border-dashed border-[#D8E2EE]">
            🎉 No classes scheduled for today!
          </div>
        ) : (
          routine.map(slot => (
            <RoutineClassCard key={slot.id} slot={slot} />
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

