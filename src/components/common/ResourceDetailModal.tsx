import React, { useEffect, useRef } from 'react';
import {
  X,
  Download,
  FileText,
  BookOpen,
  Users,
  Calendar,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { Resource } from '../../types';

export interface ResourceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  onDownload: (id: string) => void;
}

// Format human-friendly upload timestamp
function formatUploadDate(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const formattedDate = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${formattedDate} • ${formattedTime}`;
  } catch {
    return dateStr;
  }
}

// Dynamic header badge label based on resource & exam type
function getResourceBadgeText(resource: Resource): string {
  if (resource.type === 'QUESTION') {
    if (resource.examType === 'MIDTERM') return 'MIDTERM EXAM';
    if (resource.examType === 'FINAL') return 'FINAL EXAM';
    if (resource.examType === 'QUIZ') return 'QUIZ PAPER';
    if (resource.examType === 'CLASS_TEST') return 'CLASS TEST';
    if (resource.examType === 'LAB_EXAM') return 'LAB EXAM';
    return 'QUESTION PAPER';
  }
  if (resource.type === 'NOTE') return 'LECTURE NOTE';
  if (resource.type === 'LAB') {
    if (resource.labCategory === 'LAB_MANUAL') return 'LAB MANUAL';
    if (resource.labCategory === 'SOURCE_CODE') return 'SOURCE CODE';
    if (resource.labCategory === 'LAB_REPORT') return 'LAB REPORT';
    if (resource.labCategory === 'VIVA_QUESTIONS') return 'VIVA PREP';
    return 'LAB RESOURCE';
  }
  return 'STUDY RESOURCE';
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  isOpen,
  onClose,
  resource,
  onDownload,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store triggering active element to return focus on modal close
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Prevent body/page scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus inside modal
    const focusTimer = setTimeout(() => {
      downloadButtonRef.current?.focus();
    }, 40);

    // Keyboard handlers: ESC to close, Tab to trap focus inside modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previous active element
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen || !resource) return null;

  const badgeText = getResourceBadgeText(resource);
  const batchDisplay =
    resource.targetBatch || resource.uploaderBatchName || 'SWE 9th Batch';
  const uploaderDisplay = resource.uploaderName || 'Department Student';
  const facultyDisplay = resource.facultyName || 'Department Faculty';
  const fileTypeDisplay = (resource.fileType || 'PDF').toUpperCase();
  const uploadDateDisplay = formatUploadDate(resource.createdAt);

  const handleDownloadClick = () => {
    onDownload(resource.id);
    if (resource.fileUrl) {
      window.open(resource.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5 md:p-6 bg-[#0B1528]/50 backdrop-blur-xs transition-opacity duration-180 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-modal-title"
    >
      {/* Centered Modal Surface with soft scale + fade entry */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[94%] sm:max-w-[88%] md:max-w-[740px] lg:max-w-[760px] max-h-[88vh] sm:max-h-[86vh] bg-white dark:bg-[#0F172A] rounded-2xl sm:rounded-[20px] shadow-[0_16px_48px_rgba(10,33,71,0.16)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)] border border-[#D8E2EE] dark:border-slate-800 overflow-hidden flex flex-col transform animate-modal-entry select-text"
      >
        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-5 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
          {/* Top Header: Badge + Close button */}
          <div className="flex items-start justify-between gap-3">
            {/* Left: Small Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EFF5FF] dark:bg-blue-950/50 border border-[#DBEAFE] dark:border-blue-900/60 text-[#2563EB] dark:text-blue-400 font-bold text-[11px] uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 shrink-0" />
              <span>{badgeText}</span>
            </div>

            {/* Right: Subtle circular close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#DCE5F0] dark:border-slate-700 bg-[#F8FAFD] dark:bg-slate-800/80 text-[#64748B] hover:text-[#0A2147] dark:hover:text-white hover:bg-[#EFF5FF] dark:hover:bg-slate-700 flex items-center justify-center transition-colors duration-150 shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Uploader Section */}
          <div className="space-y-1">
            <h2
              id="resource-modal-title"
              className="text-lg sm:text-xl md:text-[22px] font-bold text-[#0A2147] dark:text-white leading-snug break-words"
            >
              {resource.title}
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 font-normal">
              by{' '}
              <span className="font-semibold text-[#2563EB] dark:text-blue-400">
                {uploaderDisplay}
              </span>{' '}
              <span className="text-[#64748B] dark:text-slate-400">
                ({batchDisplay})
              </span>
            </p>
          </div>

          {/* Subtle Horizontal Divider */}
          <div className="border-b border-[#E2EAF4] dark:border-slate-800" />

          {/* Resource Information: Clean 2-Column Grid on Desktop / 1-Column on Mobile */}
          <div className="bg-[#F8FAFD] dark:bg-slate-900/60 rounded-xl border border-[#DCE5F0] dark:border-slate-800 overflow-hidden divide-y sm:divide-y-0 divide-[#EBF1F8] dark:divide-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-px sm:bg-[#E5EBF3] dark:sm:bg-slate-800">
              {/* Field 1: Course Code */}
              <div className="bg-[#F8FAFD] dark:bg-slate-900/80 p-3 sm:p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#64748B] dark:text-slate-400">
                  <div className="w-6 h-6 rounded-md bg-[#EFF5FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium">Course Code</span>
                </div>
                <span className="px-2 py-0.5 bg-[#EFF5FF] dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 font-mono font-bold text-xs rounded border border-[#DBEAFE] dark:border-blue-900/60">
                  {resource.courseCode}
                </span>
              </div>

              {/* Field 2: Course Title */}
              <div className="bg-[#F8FAFD] dark:bg-slate-900/80 p-3 sm:p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#64748B] dark:text-slate-400 shrink-0">
                  <div className="w-6 h-6 rounded-md bg-[#EFF5FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium">Course</span>
                </div>
                <span className="text-xs font-bold text-[#0A2147] dark:text-slate-100 text-right truncate max-w-[190px]">
                  {resource.courseTitle || 'Software Engineering'}
                </span>
              </div>

              {/* Field 3: Batch */}
              <div className="bg-[#F8FAFD] dark:bg-slate-900/80 p-3 sm:p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#64748B] dark:text-slate-400">
                  <div className="w-6 h-6 rounded-md bg-[#EFF5FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium">Batch</span>
                </div>
                <span className="text-xs font-bold text-[#0A2147] dark:text-slate-100 text-right">
                  {batchDisplay}
                </span>
              </div>

              {/* Field 4: Semester & Year */}
              <div className="bg-[#F8FAFD] dark:bg-slate-900/80 p-3 sm:p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#64748B] dark:text-slate-400">
                  <div className="w-6 h-6 rounded-md bg-[#EFF5FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium">Semester & Year</span>
                </div>
                <span className="text-xs font-bold text-[#0A2147] dark:text-slate-100 text-right">
                  {resource.semester}th Sem ({resource.academicYear})
                </span>
              </div>

              {/* Field 5: Faculty (Spans 2 columns on desktop for balanced alignment) */}
              <div className="bg-[#F8FAFD] dark:bg-slate-900/80 p-3 sm:p-3.5 flex items-center justify-between gap-3 sm:col-span-2">
                <div className="flex items-center gap-2 text-[#64748B] dark:text-slate-400">
                  <div className="w-6 h-6 rounded-md bg-[#EFF5FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium">Faculty</span>
                </div>
                <span className="text-xs font-bold text-[#0A2147] dark:text-slate-100 text-right truncate max-w-[280px]">
                  {facultyDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Description / Notes from Uploader (if provided) */}
          {resource.description && (
            <div className="bg-[#F8FAFD] dark:bg-slate-900/40 p-3 rounded-xl border border-[#DCE5F0] dark:border-slate-800 text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
              <span className="font-semibold text-[#0A2147] dark:text-slate-200 block mb-0.5">
                Notes:
              </span>
              {resource.description}
            </div>
          )}

          {/* Download Action Area */}
          <div className="pt-1 sm:pt-2 space-y-2">
            {/* Primary Download Button */}
            <button
              ref={downloadButtonRef}
              type="button"
              onClick={handleDownloadClick}
              aria-label="Download PDF"
              className="w-full py-3 sm:py-3.5 px-6 bg-[#2563EB] hover:bg-[#1D5FD1] active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-[0_2px_8px_rgba(37,99,235,0.22)] hover:shadow-[0_4px_16px_rgba(37,99,235,0.32)] transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
            >
              <Download className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span>Download PDF</span>
            </button>

            {/* Footer Metadata */}
            <div className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 text-center font-medium flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
              <span>
                File Type:{' '}
                <strong className="text-[#0F172A] dark:text-slate-200">
                  {fileTypeDisplay}
                </strong>
              </span>
              <span>•</span>
              <span>
                Uploaded:{' '}
                <strong className="text-[#0F172A] dark:text-slate-200">
                  {uploadDateDisplay}
                </strong>
              </span>
              {resource.fileSize && (
                <>
                  <span>•</span>
                  <span>{resource.fileSize}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
