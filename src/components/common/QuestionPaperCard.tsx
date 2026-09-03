import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Users, Calendar, User, Download, ChevronDown, Sparkles } from 'lucide-react';
import { parseGoogleDriveLink } from '../../lib/driveUtils';

export interface QuestionPaperCardProps {
  title: string;
  courseName: string;
  courseCode: string;
  batch: string;
  semester: string | number;
  faculty: string;
  author: string;
  downloadLink: string;
  typeBadge?: string;
  academicYear?: string | number;
  fileSize?: string;
  isCurrentSemesterMatch?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onDownload?: () => void;
  onAuthorClick?: (author: string) => void;
  className?: string;
}

export const QuestionPaperCard: React.FC<QuestionPaperCardProps> = ({
  title,
  courseName,
  courseCode,
  batch,
  semester,
  faculty,
  author,
  downloadLink,
  typeBadge = 'QUIZ PAPER',
  academicYear,
  fileSize,
  isCurrentSemesterMatch = false,
  isExpanded: controlledExpanded,
  onToggle,
  onDownload,
  onAuthorClick,
  className = '',
}) => {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const parsedDrive = parseGoogleDriveLink(downloadLink);

  const handleCardClick四周 = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload();
    }
    const targetUrl = parsedDrive.directDownloadUrl || downloadLink;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAuthorClick) {
      onAuthorClick(author);
    }
  };

  const semesterDisplay述 = academicYear
    ? `${semester}th Sem (${academicYear})`
    : typeof semester === 'number'
    ? `${semester}th Semester`
    : semester;

  return (
    <motion.div
      onClick={handleCardClick四周}
      animate={{
        scale: expanded ? 1.01 : 1,
      }}
      transition={{
        duration: 0.25,
        ease: 'easeOut',
      }}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick四周();
        }
      }}
      className={`w-full self-start bg-white dark:bg-[#0F172A] rounded-2xl border p-4 sm:p-5 cursor-pointer select-none transition-all duration-200 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 ${
        expanded
          ? 'shadow-[0_8px_24px_rgba(15,35,70,0.12)] border-[#2563EB] dark:border-blue-600 ring-1 ring-[#2563EB]/20'
          : isCurrentSemesterMatch
          ? 'shadow-[0_2px_10px_rgba(37,99,235,0.06)] border-[#BFDBFE] dark:border-blue-900/70 hover:shadow-[0_6px_20px_rgba(15,35,70,0.08)] hover:border-[#2563EB]/60'
          : 'shadow-[0_1px_3px_rgba(15,35,70,0.04),0_4px_12px_rgba(15,35,70,0.04)] border-[#E2E8F0] dark:border-slate-800 hover:shadow-[0_6px_18px_rgba(15,35,70,0.08)] hover:border-[#CBD8E8] dark:hover:border-slate-700'
      } ${className}`}
    >
      <div>
        {/* HEADER SECTION: Badges */}
        <div className="flex items-center justify-between gap-2">
          {/* Left Badges: Document Icon + Type Badge + (Optional Recommendation Tag) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EFF5FF] dark:bg-blue-950/50 border border-[#DBEAFE] dark:border-blue-900/60 text-[#2563EB] dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider">
              <FileText className="w-3 h-3 text-[#2563EB] dark:text-blue-400 shrink-0" />
              <span>{typeBadge}</span>
            </div>

            {isCurrentSemesterMatch && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] dark:bg-emerald-950/50 border border-[#A7F3D0] dark:border-emerald-900/60 text-[#059669] dark:text-emerald-400 font-bold text-[9px] uppercase tracking-wider">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Your Sem</span>
              </div>
            )}
          </div>

          {/* Right Badge: Course Code */}
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EFF5FF] dark:bg-blue-950/50 border border-[#DBEAFE] dark:border-blue-900/60 text-[#2563EB] dark:text-blue-400 font-mono font-bold text-[11px] shrink-0">
            {courseCode}
          </div>
        </div>

        {/* MAIN CONTENT: Compact, high-contrast typography */}
        <div className="mt-3 space-y-0.5">
          {/* Title */}
          <h3 className="text-sm sm:text-base font-bold text-[#0A2147] dark:text-white leading-snug tracking-tight line-clamp-2">
            {title}
          </h3>

          {/* Subtitle / Course Name */}
          <p className="text-xs text-[#64748B] dark:text-slate-400 font-medium truncate">
            {courseName}
          </p>
        </div>

        {/* INFORMATION SECTION: 3 Compact Rows */}
        <div className="mt-3.5 pt-3 border-t border-[#F0F4F8] dark:border-slate-800/80 space-y-2 text-xs">
          {/* Row 1: Batch */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 font-medium">
              <div className="w-5 h-5 rounded-md bg-[#EFF5FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
                <Users className="w-3 h-3" />
              </div>
              <span className="text-[11px]">Batch</span>
            </div>
            <span className="font-semibold text-[#0A2147] dark:text-slate-100 text-right text-[11px] truncate max-w-[140px]">
              {batch}
            </span>
          </div>

          {/* Row 2: Semester & Year */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 font-medium">
              <div className="w-5 h-5 rounded-md bg-[#EFF5FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
                <Calendar className="w-3 h-3" />
              </div>
              <span className="text-[11px]">Semester & Year</span>
            </div>
            <span className="font-semibold text-[#0A2147] dark:text-slate-100 text-right text-[11px]">
              {semesterDisplay述}
            </span>
          </div>

          {/* Row 3: Faculty */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 font-medium">
              <div className="w-5 h-5 rounded-md bg-[#EFF5FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
                <User className="w-3 h-3" />
              </div>
              <span className="text-[11px]">Faculty</span>
            </div>
            <span className="font-semibold text-[#0A2147] dark:text-slate-100 text-right text-[11px] truncate max-w-[140px]">
              {faculty}
            </span>
          </div>
        </div>
      </div>

      <div>
        {/* AUTHOR & EXPAND INDICATOR */}
        <div className="mt-3 pt-2.5 border-t border-[#F0F4F8] dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="text-[11px] text-[#64748B] dark:text-slate-400 truncate max-w-[150px]">
            by{' '}
            <span
              onClick={handleAuthorClick}
              className="text-[#2563EB] dark:text-blue-400 font-semibold cursor-pointer hover:underline transition-colors"
            >
              {author}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] font-medium shrink-0">
            <span>{expanded ? 'Collapse' : 'Download'}</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                expanded ? 'rotate-180 text-[#2563EB]' : ''
              }`}
            />
          </div>
        </div>

        {/* ANIMATED IN-CARD DOWNLOAD SECTION */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="download-section"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{
                duration: 0.25,
                ease: 'easeOut',
              }}
              className="overflow-hidden"
            >
              <div className="bg-[#F7FAFF] dark:bg-slate-900/90 border border-[#DBEAFE] dark:border-slate-800 rounded-xl p-2.5 sm:p-3 mt-2.5 mb-1 shadow-2xs">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={handleDownloadClick}
                  className="w-full py-2 px-3 bg-white dark:bg-[#0F172A] border border-[#2563EB] hover:bg-[#EFF5FF] dark:hover:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 font-semibold text-[11px] sm:text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                >
                  <Download className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 shrink-0" />
                  <span>Download Question</span>
                  {fileSize && (
                    <span className="text-[10px] font-normal text-[#64748B] dark:text-slate-400">
                      ({fileSize})
                    </span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
