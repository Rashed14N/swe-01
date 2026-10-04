import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Users, Calendar, User, Download, ChevronDown, Trash2, RotateCcw, BookOpen } from 'lucide-react';
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
  enrolledBadge?: string;
  retakeBadge?: string;
  isExpanded?: boolean;
  canDelete?: boolean;
  onDelete?: () => void;
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
  enrolledBadge,
  retakeBadge,
  isExpanded: controlledExpanded,
  canDelete = false,
  onDelete,
  onToggle,
  onDownload,
  onAuthorClick,
  className = '',
}) => {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(false);
  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const parsedDrive = parseGoogleDriveLink(downloadLink);

  const handleCardClick = () => {
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

  const semesterDisplay = academicYear
    ? `${semester}th Sem (${academicYear})`
    : typeof semester === 'number'
    ? `${semester}th Semester`
    : semester;

  // Rich exam type badge color mapping matching the portal's aesthetic
  const getBadgeStyle = (badge: string) => {
    const upper = badge.toUpperCase();
    if (upper.includes('FINAL')) {
      return 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/70';
    }
    if (upper.includes('QUIZ')) {
      return 'bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-950/60 dark:to-blue-950/60 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/70';
    }
    if (upper.includes('SUPPLE')) {
      return 'bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/60 dark:to-violet-950/60 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/70';
    }
    if (upper.includes('CT') || upper.includes('CLASS TEST')) {
      return 'bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/60 dark:to-emerald-950/60 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/70';
    }
    if (upper.includes('MIDTERM')) {
      return 'bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/60 dark:to-indigo-950/60 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/70';
    }
    return 'bg-[#EFF5FF] dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 border-[#DBEAFE] dark:border-blue-900/60';
  };

  // Uniform beautiful background styling matching the enrolled course aesthetic across all cards
  const cardBgClass = expanded
    ? 'bg-gradient-to-br from-[#FFFFFF] via-[#F4F8FF] to-[#EAF2FF] dark:from-[#0F172A] dark:via-[#13203A] dark:to-[#162544] border-[#2563EB] dark:border-blue-500 shadow-[0_10px_28px_rgba(37,99,235,0.14)] ring-2 ring-[#2563EB]/20'
    : 'bg-gradient-to-br from-[#FFFFFF] via-[#F4F8FF] to-[#EAF2FF] dark:from-[#0F172A] dark:via-[#13203A] dark:to-[#162544] border-[#B9D5FD] dark:border-blue-900/70 shadow-[0_2px_12px_rgba(37,99,235,0.06)] hover:shadow-[0_8px_24px_rgba(37,99,235,0.12)] hover:border-[#2563EB]';

  return (
    <motion.div
      onClick={handleCardClick}
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
          handleCardClick();
        }
      }}
      className={`w-full self-start rounded-2xl border p-4 sm:p-5 cursor-pointer select-none transition-all duration-200 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 ${cardBgClass} ${className}`}
    >
      <div>
        {/* HEADER SECTION: Badges */}
        <div className="flex items-center justify-between gap-2">
          {/* Left Badges: Document Icon + Type Badge + Enrolled/Retake Tag */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-bold text-[10px] uppercase tracking-wider shadow-2xs ${getBadgeStyle(typeBadge)}`}>
              <FileText className="w-3 h-3 shrink-0" />
              <span>{typeBadge}</span>
            </div>

            {retakeBadge ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100/80 dark:from-amber-950/60 dark:to-amber-900/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-[9px] uppercase tracking-wider shadow-2xs">
                <RotateCcw className="w-2.5 h-2.5" />
                <span>{retakeBadge}</span>
              </div>
            ) : enrolledBadge ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 border border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-bold text-[9px] uppercase tracking-wider shadow-2xs">
                <BookOpen className="w-2.5 h-2.5" />
                <span>{enrolledBadge}</span>
              </div>
            ) : null}
          </div>

          {/* Right Badges: Course Code + Optional Delete */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/80 border border-[#D5E2F5] dark:border-blue-900/60 text-[#1D5FD1] dark:text-blue-400 font-mono font-bold text-[11px] shadow-2xs">
              {courseCode}
            </div>
            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                title="Delete Question (Admin - Permanently from Supabase)"
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* MAIN CONTENT: Compact, high-contrast typography */}
        <div className="mt-3.5 space-y-1">
          {/* Title */}
          <h3 className="text-sm sm:text-base font-bold text-[#0A2147] dark:text-white leading-snug tracking-tight line-clamp-2">
            {title}
          </h3>

          {/* Subtitle / Course Name */}
          <p className="text-xs text-[#52657C] dark:text-slate-400 font-medium truncate">
            {courseName}
          </p>
        </div>

        {/* INFORMATION SECTION: 3 Compact Rows */}
        <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 space-y-2 text-xs">
          {/* Row 1: Batch */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 font-medium">
              <div className="w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
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
              <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                <Calendar className="w-3 h-3" />
              </div>
              <span className="text-[11px]">Semester & Year</span>
            </div>
            <span className="font-semibold text-[#0A2147] dark:text-slate-100 text-right text-[11px]">
              {semesterDisplay}
            </span>
          </div>

          {/* Row 3: Faculty */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 font-medium">
              <div className="w-5 h-5 rounded-md bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
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
        <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="text-[11px] text-[#64748B] dark:text-slate-400 truncate max-w-[150px]">
            by{' '}
            <span
              onClick={handleAuthorClick}
              className="text-[#2563EB] dark:text-blue-400 font-semibold cursor-pointer hover:underline transition-colors"
            >
              {author}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] font-semibold shrink-0">
            <span>{expanded ? 'Collapse' : 'Download'}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
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
              initial={{ opacity: 0, height: 0, y: -4 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -4 }}
              transition={{
                duration: 0.2,
                ease: 'easeOut',
              }}
              className="overflow-hidden mt-2.5 m-0 p-0"
            >
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={handleDownloadClick}
                className="w-full py-2 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold text-[11px] sm:text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 m-0"
              >
                <Download className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Download</span>
                {fileSize && (
                  <span className="text-[10px] font-normal text-blue-100 dark:text-blue-200">
                    ({fileSize})
                  </span>
                )}
              </motion.button>

              {canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                  className="w-full mt-1.5 py-1.5 px-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 font-semibold text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Question (Supabase)</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
