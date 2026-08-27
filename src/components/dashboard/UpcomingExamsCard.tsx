import React from 'react';
import { ChevronRight, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Exam, Course } from '../../types';

interface UpcomingExamsCardProps {
  exams: (Exam & { daysLeft?: number; courseShortName?: string })[];
  courses?: Course[];
  className?: string;
}

const COURSE_SHORT_NAMES: Record<string, string> = {
  'SWE 305': 'SADP',
  'SWE 307': 'DBMS',
  'SWE 309': 'WET',
  'SWE 301': 'SE',
  'SWE 201': 'DSA',
  'SWE 203': 'OOP',
  'SWE 101': 'SPL',
  'SWE 401': 'SQA',
  'SWE 403': 'CN',
  'SWE 205': 'DAA',
  'SWE 303': 'OS',
};

export const UpcomingExamsCard: React.FC<UpcomingExamsCardProps> = ({
  exams,
  courses = [],
  className = '',
}) => {
  const navigate = useNavigate();

  const getCourseShortName = (exam: Exam & { courseShortName?: string }) => {
    if (exam.courseShortName) return exam.courseShortName;

    const matchedCourse = courses.find(
      c =>
        (c.id && c.id === exam.courseId) ||
        (c.code && c.code.trim().toUpperCase() === exam.courseCode?.trim().toUpperCase())
    );
    if (matchedCourse?.shortName) return matchedCourse.shortName;

    const code = exam.courseCode?.trim().toUpperCase() || '';
    const title = exam.courseTitle?.trim().toUpperCase() || '';

    for (const [key, value] of Object.entries(COURSE_SHORT_NAMES)) {
      if (code.includes(key.replace('SWE ', '')) || code === key) {
        return value;
      }
    }

    if (title.includes('ARCHITECTURE') || title.includes('DESIGN PATTERNS')) return 'SADP';
    if (title.includes('DATABASE') || title.includes('DBMS')) return 'DBMS';
    if (title.includes('WEB ENGINEERING') || title.includes('TECHNOLOGY')) return 'WET';
    if (title.includes('SOFTWARE ENGINEERING')) return 'SE';
    if (title.includes('DATA STRUCTURE')) return 'DSA';
    if (title.includes('OBJECT ORIENTED') || title.includes('OOP')) return 'OOP';
    if (title.includes('STRUCTURED PROGRAMMING') || title.includes('SPL')) return 'SPL';
    if (title.includes('QUALITY ASSURANCE') || title.includes('SQA')) return 'SQA';
    if (title.includes('NETWORKING') || title.includes('NETWORK')) return 'CN';
    if (title.includes('ALGORITHM')) return 'DAA';
    if (title.includes('OPERATING')) return 'OS';

    return undefined;
  };

  return (
    <div
      className={`bg-white dark:bg-[#0F172A] border border-[#D8E2EE] dark:border-slate-800 rounded-xl shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden transition-all font-['Geist',sans-serif] ${className}`}
      style={{ fontFamily: '"Geist", sans-serif' }}
    >
      {/* Header Area with Ambient Gradient Background */}
      <div
        className="relative overflow-hidden px-4 py-3 sm:px-4.5 sm:py-3 border-b border-[#D8E2EE] dark:border-blue-900/30 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #FBFCFF 0%, #F4F6FF 38%, #ECEFFF 68%, #E4E9FF 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Soft Radial Ambient Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 85% 30%, rgba(126, 140, 255, 0.16), transparent 50%)',
            }}
          />
          <div
            className="absolute top-0 right-10 w-36 h-full pointer-events-none opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgba(101, 120, 255, 0.2) 1px, transparent 1px)',
              backgroundSize: '10px 10px',
            }}
          />
        </div>

        <div className="relative z-10 flex items-center gap-2 sm:gap-2.5">
          <GraduationCap className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.4} />
          <h2 className="text-[15px] sm:text-[16px] font-bold text-[#0A2147] dark:text-white tracking-tight leading-snug">
            Upcoming Exams
          </h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/exams')}
          className="relative z-10 text-xs font-semibold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-colors shrink-0"
        >
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Exam Rows with thin dividers */}
      {exams.length === 0 ? (
        <div className="py-10 px-4 text-center text-xs text-[#64748B] dark:text-slate-400 font-medium">
          No upcoming exams scheduled.
        </div>
      ) : (
        <div className="divide-y divide-[#EEF2F7] dark:divide-slate-800/80">
          {exams.map(exam => {
            const examDate = new Date(exam.date);
            const weekday = isNaN(examDate.getTime())
              ? ''
              : examDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
            const month = isNaN(examDate.getTime())
              ? 'EXAM'
              : examDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const day = isNaN(examDate.getTime())
              ? '—'
              : examDate.toLocaleDateString('en-US', { day: 'numeric' });

            // Accurate Days Left Calculation
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const target = new Date(exam.date);
            target.setHours(0, 0, 0, 0);
            const calculatedDiff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            const diffDays = isNaN(target.getTime()) ? (exam.daysLeft ?? 0) : calculatedDiff;
            const isUrgent = diffDays <= 2;

            let daysLeftText = `${diffDays} Days Left`;
            if (diffDays <= 0) {
              daysLeftText = 'Today';
            } else if (diffDays === 1) {
              daysLeftText = '1 Day Left';
            }

            const typeLabel = (exam.type || 'EXAM').replace(/_/g, ' ');
            const shortName = getCourseShortName(exam);

            return (
              <div
                key={exam.id}
                onClick={() => navigate('/exams')}
                className="group px-4 py-3 sm:px-4.5 sm:py-3 bg-white dark:bg-[#0F172A] hover:bg-[#FAFCFF] dark:hover:bg-slate-800/40 transition-colors duration-150 cursor-pointer min-h-[72px] grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 sm:gap-3.5"
              >
                {/* 1. Date Text (No large card box) */}
                <div className="flex items-center gap-2 select-none shrink-0">
                  <div className="flex flex-col items-center justify-center text-center w-[46px] shrink-0">
                    {weekday && (
                      <span className="text-[9px] font-semibold text-[#64748B] dark:text-slate-400 uppercase leading-none mb-0.5">
                        {weekday}
                      </span>
                    )}
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider leading-none"
                      style={{ color: isUrgent ? '#EF4444' : '#2563EB' }}
                    >
                      {month}
                    </span>
                    <span
                      className="text-[24px] font-extrabold leading-none mt-0.5"
                      style={{ color: isUrgent ? '#EF4444' : '#2563EB' }}
                    >
                      {day}
                    </span>
                  </div>
                  {/* Subtle vertical separator bar */}
                  <div
                    className="w-[2px] h-[34px] rounded-full shrink-0"
                    style={{ backgroundColor: isUrgent ? '#FCA5A5' : '#DBEAFE' }}
                  />
                </div>

                {/* 2. Middle Exam Info Area */}
                <div className="min-w-0 pr-1 flex flex-col justify-center">
                  {/* Top Metadata Row: Type and Course Short Name */}
                  <div className="flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis leading-none">
                    {/* Exam Type */}
                    <span className="text-[10px] font-bold uppercase text-[#5C6B82] dark:text-slate-300 shrink-0">
                      {typeLabel}
                    </span>

                    {/* Course Short Name (or fallback to course code if short name not present) */}
                    {(shortName || exam.courseCode) && (
                      <>
                        <span className="text-[#94A3B8] dark:text-slate-600 text-[10px] select-none shrink-0">·</span>
                        <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400 shrink-0">
                          {shortName || exam.courseCode}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Bottom: Exam Title (Shown in full without truncation) */}
                  <h3 className="text-[13.5px] sm:text-[14px] font-[650] text-[#14213D] dark:text-white leading-snug group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors mt-1 break-words">
                    {exam.title}
                  </h3>
                </div>

                {/* 3. Compact Days Left Status Pill */}
                <div className="shrink-0 justify-self-end">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-[650] border whitespace-nowrap select-none transition-colors ${
                      isUrgent
                        ? 'bg-[#FFF5F5] text-[#EF4444] border-[#F8CECE] dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60'
                        : 'bg-[#F3F7FF] text-[#2563EB] border-[#D9E5FB] dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60'
                    }`}
                  >
                    {daysLeftText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
