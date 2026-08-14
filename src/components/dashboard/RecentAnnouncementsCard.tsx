import React from 'react';
import { Megaphone, ChevronRight, AlertTriangle, Info, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BatchAnnouncement } from '../../types';

interface RecentAnnouncementsCardProps {
  announcements: BatchAnnouncement[];
}

export const RecentAnnouncementsCard: React.FC<RecentAnnouncementsCardProps> = ({ announcements }) => {
  const navigate = useNavigate();

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return {
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
        };
      case 'IMPORTANT':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <Bell className="w-3.5 h-3.5 text-slate-500 shrink-0" />,
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] flex flex-col h-full overflow-hidden">
      <div className="bg-[#F5F8FF] px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#DCE6F2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100 shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-[#0A2147]">Batch Announcements</h3>
            <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block">CR & Dept Notices</span>
          </div>
        </div>
        <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] sm:text-xs font-bold rounded-full">
          {announcements.length} Active
        </span>
      </div>

      <div className="flex-1 p-3.5 sm:p-4 space-y-2.5">
        {announcements.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 bg-[#F6F9FD] rounded-lg border border-dashed border-[#D8E2EE]">
            No active announcements for your batch right now.
          </div>
        ) : (
          announcements.slice(0, 3).map(ann => {
            const pStyle = getPriorityBadge(ann.priority);

            return (
              <div
                key={ann.id}
                className="p-2.5 sm:p-3 bg-white hover:bg-[#F7FAFF] rounded-lg border border-[#E5EBF3] transition-all duration-150 ease-out space-y-1"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {pStyle.icon}
                    <h4 className="text-xs font-bold text-[#10213B] truncate">{ann.title}</h4>
                  </div>
                  <span className={`px-1.5 py-0.2 text-[9px] sm:text-[10px] font-bold rounded border shrink-0 ${pStyle.badge}`}>
                    {ann.priority}
                  </span>
                </div>

                <p className="text-[10px] sm:text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {ann.description}
                </p>

                <div className="pt-1 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 font-medium border-t border-[#E5EBF3] mt-1">
                  <span>By: {ann.createdByName}</span>
                  <span>{ann.publishDate}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3.5 pt-0 bg-white flex justify-end">
        <button
          onClick={() => navigate('/announcements')}
          className="text-[11px] sm:text-xs font-bold text-[#2563EB] hover:text-blue-800 flex items-center gap-1 hover:underline"
        >
          View All Announcements & Archive <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

