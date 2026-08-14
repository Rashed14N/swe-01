import React from 'react';
import { HelpCircle, FileText, FolderGit2, Bell, Upload, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QuickLinksCard: React.FC = () => {
  const navigate = useNavigate();

  const links = [
    {
      title: 'Question Bank',
      subtitle: 'Previous Exam Papers',
      icon: HelpCircle,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      path: '/resources/questions',
    },
    {
      title: 'Lecture Notes',
      subtitle: 'Class Notes & Docs',
      icon: FileText,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      path: '/resources/notes',
    },
    {
      title: 'Lab Resources',
      subtitle: 'Manuals & Code',
      icon: FolderGit2,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      path: '/resources/labs',
    },
    {
      title: 'Dept Notices',
      subtitle: 'Official Updates',
      icon: Bell,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      path: '/notices',
    },
    {
      title: 'Upload Material',
      subtitle: 'Contribute Resources',
      icon: Upload,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      path: '/profile',
    },
    {
      title: 'Faculty Directory',
      subtitle: 'Teachers & Office',
      icon: Users,
      color: 'bg-rose-50 text-rose-600 border-rose-100',
      path: '/faculty',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-[#D8E2EE] shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
      <div className="bg-[#F5F8FF] px-4 py-3 sm:px-5 sm:py-3.5 border-b border-[#DCE6F2] flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-[#0A2147]">Academic Quick Access</h3>
        <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Essential tools</span>
      </div>

      <div className="p-3.5 sm:p-4 grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3">
        {links.map((link, idx) => {
          const Icon = link.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(link.path)}
              className="p-2.5 sm:p-3 bg-white hover:bg-[#F7FAFF] rounded-lg border border-[#E5EBF3] cursor-pointer transition-all duration-150 ease-out hover:border-[#2563EB] group text-center flex flex-col items-center justify-between active:scale-[0.98]"
            >
              <div className={`p-2 sm:p-2.5 rounded-lg border mb-1.5 ${link.color}`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h4 className="text-[11px] sm:text-xs font-bold text-[#10213B] group-hover:text-[#2563EB] transition-colors leading-tight">
                  {link.title}
                </h4>
                <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 line-clamp-1 hidden sm:block">
                  {link.subtitle}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

