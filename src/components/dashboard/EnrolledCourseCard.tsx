import React from 'react';
import { User, ChevronRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Course } from '../../types';

export interface EnrolledCourseCardProps {
  course: Course;
  className?: string;
}

export const EnrolledCourseCard: React.FC<EnrolledCourseCardProps> = ({
  course,
  className = '',
}) => {
  const navigate = useNavigate();

  const creditDisplay = typeof course.credits === 'number' ? course.credits.toFixed(1).replace(/\.0$/, '') : course.credits || '3.0';
  const typeDisplay = course.type ? course.type.toUpperCase() : 'THEORY';

  return (
    <div className={`routine-card-container @container ${className}`}>
      <div
        onClick={() => navigate(`/courses/${course.id}`)}
        className="routine-class-card group relative px-3 py-2 sm:px-3.5 sm:py-2.5 overflow-hidden flex flex-col justify-center cursor-pointer select-none"
      >
        {/* =========================================================================
            1. LARGE DESKTOP & WIDE CONTAINER (CLEAN COMPACT 3-COLUMN LAYOUT >= 560px)
           ========================================================================= */}
        <div className="hidden @[560px]:grid @[560px]:grid-cols-[auto_1px_auto_1fr_auto] items-center gap-x-3.5 sm:gap-x-4">
          {/* 1. CREDIT BADGE SECTION */}
          <div
            className="routine-room-block shrink-0 w-[56px] sm:w-[60px] h-[52px] sm:h-[54px] rounded-lg sm:rounded-xl text-white flex flex-col items-center justify-center text-center shadow-2xs transition-all duration-180 select-none"
            style={{
              background: 'linear-gradient(145deg, #2563EB 0%, #1D4ED8 45%, #0E46C9 100%)',
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-100/90 leading-none">
              CREDIT
            </span>
            <span
              className="font-black tracking-tight leading-tight mt-0.5 truncate max-w-full text-center text-base sm:text-[17px]"
              title={`${creditDisplay} Credits`}
            >
              {creditDisplay}
            </span>
          </div>

          {/* DIVIDER */}
          <div className="w-[1px] h-8 sm:h-9 bg-[#E2E8F0] dark:bg-slate-800 shrink-0 self-center" />

          {/* 2. COURSE CODE & TYPE */}
          <div className="flex flex-col justify-center items-start whitespace-nowrap min-w-0 pr-0.5">
            <div className="text-[#1556D8] dark:text-blue-400 font-bold text-xs sm:text-[13.5px] font-mono tracking-tight whitespace-nowrap">
              {course.code}
            </div>
            <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wide mt-0.5">
              {typeDisplay}
            </span>
          </div>

          {/* 3. COURSE TITLE + FACULTY */}
          <div className="flex flex-col justify-center min-w-0 pl-0.5">
            <h3 className="font-bold text-[#0A2147] dark:text-white leading-snug tracking-tight text-[13px] sm:text-[14px] truncate group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
              {course.title}
              {course.shortName && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[9px] rounded inline-block align-middle">
                  {course.shortName}
                </span>
              )}
            </h3>

            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 text-[11.5px] sm:text-xs font-medium mt-0.5">
              <User className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.2} />
              <span className="truncate">{course.assignedFacultyName || 'Faculty not assigned'}</span>
            </div>
          </div>

          {/* 4. CHEVRON ACTION */}
          <div className="flex items-center gap-2 shrink-0 pl-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-all shadow-2xs">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. MEDIUM CONTAINER (450px - 560px)
           ========================================================================= */}
        <div className="hidden @[450px]:flex @[560px]:hidden items-center justify-between gap-3">
          {/* Left Column: Credit Block */}
          <div
            className="routine-room-block shrink-0 w-[52px] h-[48px] rounded-lg text-white flex flex-col items-center justify-center text-center shadow-2xs transition-all duration-180 select-none"
            style={{
              background: 'linear-gradient(145deg, #2563EB 0%, #1D4ED8 45%, #0E46C9 100%)',
            }}
          >
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-blue-100/90 leading-none">
              CREDIT
            </span>
            <span className="font-black tracking-tight leading-tight mt-0.5 truncate max-w-full text-center text-sm">
              {creditDisplay}
            </span>
          </div>

          {/* Center Column: Course Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-xs font-bold text-[#1556D8] dark:text-blue-400">
                {course.code}
              </span>
              <span className="text-[9.5px] font-semibold text-[#64748B] dark:text-slate-400 uppercase">
                · {typeDisplay}
              </span>
            </div>

            <h3 className="font-bold text-[#0A2147] dark:text-white leading-snug tracking-tight text-[13px] truncate group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
              {course.title}
              {course.shortName && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-slate-900 text-amber-300 font-extrabold text-[8.5px] rounded inline-block align-middle">
                  {course.shortName}
                </span>
              )}
            </h3>

            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 text-[11px] font-medium mt-0.5">
              <User className="w-3 h-3 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.2} />
              <span className="truncate">{course.assignedFacultyName || 'Faculty not assigned'}</span>
            </div>
          </div>

          {/* Right Column: Chevron */}
          <div className="shrink-0">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-all shadow-2xs">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. MOBILE / NARROW CONTAINER (< 450px)
           ========================================================================= */}
        <div className="block @[450px]:hidden space-y-2">
          {/* Top Row: Credit Pill + Code + Type + Chevron */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="routine-room-block shrink-0 px-2.5 py-1 rounded-lg text-white flex items-center gap-1.5 shadow-xs"
                style={{
                  background: 'linear-gradient(145deg, #2563EB 0%, #0E46C9 100%)',
                }}
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-blue-100/90 leading-none">
                  CR
                </span>
                <span className="font-black text-xs tracking-tight leading-none">
                  {creditDisplay}
                </span>
              </div>

              <span className="font-mono text-xs font-bold text-[#1556D8] dark:text-blue-400 truncate">
                {course.code}
              </span>
              <span className="text-[10px] font-medium text-[#64748B] dark:text-slate-400 uppercase shrink-0">
                · {typeDisplay}
              </span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>

          {/* Middle Row: Title */}
          <div>
            <h3 className="font-bold text-[#0A2147] dark:text-white leading-snug tracking-tight text-[13px] truncate group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
              {course.title}
              {course.shortName && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-slate-900 text-amber-300 font-extrabold text-[8.5px] rounded inline-block align-middle">
                  {course.shortName}
                </span>
              )}
            </h3>
          </div>

          {/* Bottom Row: Faculty */}
          <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 text-[11px] font-medium pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <User className="w-3 h-3 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.2} />
            <span className="truncate">{course.assignedFacultyName || 'Faculty not assigned'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
