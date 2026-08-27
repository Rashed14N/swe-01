import React from 'react';
import { User, Edit, Trash2 } from 'lucide-react';
import { RoutineSlot } from '../../types';
import { cleanRoomNumber } from '../../constants/rooms';

export interface RoutineClassCardProps {
  slot?: RoutineSlot;
  room?: string;
  startTime?: string;
  endTime?: string;
  subject?: string;
  courseTitle?: string;
  teacher?: string;
  teacherName?: string;
  courseCode?: string;
  courseShortName?: string;
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const RoutineClassCard: React.FC<RoutineClassCardProps> = ({
  slot,
  room: propRoom,
  startTime: propStartTime,
  endTime: propEndTime,
  subject: propSubject,
  courseTitle: propCourseTitle,
  teacher: propTeacher,
  teacherName: propTeacherName,
  courseCode: propCourseCode,
  courseShortName: propCourseShortName,
  canEdit = false,
  onEdit,
  onDelete,
  className = '',
}) => {
  // Resolve data from props or slot object
  const rawRoom = propRoom ?? slot?.room;
  const rawStartTime = propStartTime ?? slot?.startTime;
  const rawEndTime = propEndTime ?? slot?.endTime;
  const rawSubject = propSubject ?? propCourseTitle ?? slot?.courseTitle;
  const rawTeacher = propTeacher ?? propTeacherName ?? slot?.teacherName;
  const courseCode = propCourseCode ?? slot?.courseCode;
  const shortName = propCourseShortName ?? slot?.courseShortName;

  // Format Room text (cleaned of extra suffixes like "Network Lab")
  const cleanedRoom = cleanRoomNumber(rawRoom);
  let roomLabel = 'ROOM';
  let roomValue = 'TBA';

  if (cleanedRoom && cleanedRoom.trim() && cleanedRoom !== 'TBA') {
    const trimmed = cleanedRoom.trim();
    if (/^auditorium/i.test(trimmed)) {
      roomLabel = 'VENUE';
      roomValue = trimmed.toUpperCase();
    } else if (/^exten/i.test(trimmed)) {
      roomLabel = 'EXTEN';
      roomValue = trimmed.replace(/^exten[- ]*/i, '').trim() || trimmed;
    } else if (/^xl\b/i.test(trimmed)) {
      roomLabel = 'HALL';
      roomValue = trimmed.toUpperCase();
    } else {
      roomLabel = 'ROOM';
      roomValue = trimmed.replace(/^room\s*/i, '').trim() || trimmed;
    }
  }

  // Format Time string with non-breaking spaces for AM/PM stability
  let timeDisplay = 'Time TBA';
  if (rawStartTime && rawEndTime) {
    const start = rawStartTime.replace(/\s+/g, '\u00A0');
    const end = rawEndTime.replace(/\s+/g, '\u00A0');
    timeDisplay = `${start} – ${end}`;
  } else if (rawStartTime) {
    timeDisplay = rawStartTime.replace(/\s+/g, '\u00A0');
  }

  const subjectText = rawSubject?.trim() || 'Course Title Unavailable';
  const teacherText = rawTeacher?.trim() || 'Teacher not assigned';

  return (
    <div className={`routine-card-container @container ${className}`}>
      <div
        className="routine-class-card group relative px-3 py-2 sm:px-3.5 sm:py-2.5 overflow-hidden flex flex-col justify-center"
      >
        {/* =========================================================================
            1. LARGE DESKTOP & WIDE CONTAINER (CLEAN COMPACT 3-COLUMN LAYOUT >= 560px)
           ========================================================================= */}
        <div className="hidden @[560px]:grid @[560px]:grid-cols-[auto_1px_auto_1fr_auto] items-center gap-x-3.5 sm:gap-x-4">
          {/* 1. ROOM SECTION (Compact & Sleek) */}
          <div
            className="routine-room-block shrink-0 w-[56px] sm:w-[60px] h-[52px] sm:h-[54px] rounded-lg sm:rounded-xl text-white flex flex-col items-center justify-center text-center shadow-2xs transition-all duration-180 select-none"
            style={{
              background: 'linear-gradient(145deg, #2563EB 0%, #1D4ED8 45%, #0E46C9 100%)',
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-100/90 leading-none">
              {roomLabel}
            </span>
            <span
              className={`font-black tracking-tight leading-tight mt-0.5 truncate max-w-full text-center ${
                roomValue.length > 5 ? 'text-[11px]' : 'text-base sm:text-[17px]'
              }`}
              title={roomValue}
            >
              {roomValue}
            </span>
          </div>

          {/* ROOM DIVIDER */}
          <div className="w-[1px] h-8 sm:h-9 bg-[#E2E8F0] dark:bg-slate-800 shrink-0 self-center" />

          {/* 2. TIME SECTION */}
          <div className="flex items-center whitespace-nowrap min-w-0 pr-0.5">
            <div className="text-[#1556D8] dark:text-blue-400 font-bold text-xs sm:text-[13.5px] tracking-tight whitespace-nowrap">
              {timeDisplay}
            </div>
          </div>

          {/* 3. COURSE SECTION (Title + Teacher) */}
          <div className="flex flex-col justify-center min-w-0 pl-0.5">
            <h3 className="font-bold text-[#0A2147] dark:text-white leading-snug tracking-tight text-[13px] sm:text-[14px] truncate">
              {subjectText}
              {shortName && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[9px] rounded inline-block align-middle">
                  {shortName}
                </span>
              )}
            </h3>

            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 text-[11.5px] sm:text-xs font-medium mt-0.5">
              <User className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.2} />
              <span className="truncate">{teacherText}</span>
            </div>
          </div>

          {/* Action Buttons (if canEdit) */}
          {canEdit && (onEdit || onDelete) ? (
            <div className="flex items-center gap-1 shrink-0 pl-1.5">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Edit routine slot"
                  aria-label="Edit routine slot"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                  title="Delete routine slot"
                  aria-label="Delete routine slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* =========================================================================
            2. MEDIUM CONTAINER (450px - 559px)
           ========================================================================= */}
        <div className="hidden @[450px]:flex @[560px]:hidden items-center justify-between gap-3">
          {/* Left Column: Room Block */}
          <div
            className="routine-room-block shrink-0 w-[52px] h-[48px] rounded-lg text-white flex flex-col items-center justify-center text-center shadow-2xs transition-all duration-180 select-none"
            style={{
              background: 'linear-gradient(145deg, #2563EB 0%, #1D4ED8 45%, #0E46C9 100%)',
            }}
          >
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-blue-100/90 leading-none">
              {roomLabel}
            </span>
            <span
              className={`font-black tracking-tight leading-tight mt-0.5 truncate max-w-full text-center ${
                roomValue.length > 5 ? 'text-[10px]' : 'text-sm'
              }`}
              title={roomValue}
            >
              {roomValue}
            </span>
          </div>

          {/* Thin Vertical Divider Line */}
          <div className="w-[1px] h-7 bg-[#E2E8F0] dark:bg-slate-800 shrink-0" />

          {/* Right Column: Time + Course Title + Teacher Area */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="text-[#1556D8] dark:text-blue-400 font-bold text-xs whitespace-nowrap tracking-tight">
              {timeDisplay}
            </div>

            <h3 className="font-bold text-[#0A2147] dark:text-white leading-snug tracking-tight text-xs sm:text-[13px] truncate">
              {subjectText}
              {shortName && (
                <span className="ml-1 px-1 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[8.5px] rounded inline-block align-middle">
                  {shortName}
                </span>
              )}
            </h3>

            <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 text-[11px] font-medium">
              <User className="w-3 h-3 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.2} />
              <span className="truncate">{teacherText}</span>
            </div>
          </div>

          {/* Edit / Delete Action Buttons */}
          {canEdit && (onEdit || onDelete) && (
            <div className="flex items-center gap-1 shrink-0 pl-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  className="p-1 text-slate-400 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 rounded border border-slate-200"
                  title="Edit routine slot"
                >
                  <Edit className="w-3 h-3" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1 text-slate-400 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 rounded border border-slate-200"
                  title="Delete routine slot"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            3. MOBILE / NARROW CONTAINER (< 450px)
           ========================================================================= */}
        <div className="block @[450px]:hidden space-y-2">
          {/* Top Row: Room Pill + Time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="routine-room-block shrink-0 px-3 py-1.5 rounded-xl text-white flex items-center gap-1.5 shadow-xs"
                style={{
                  background: 'linear-gradient(145deg, #2563EB 0%, #0E46C9 100%)',
                }}
              >
                <span className="text-[9.5px] font-bold uppercase tracking-wider text-blue-100/90 leading-none">
                  {roomLabel}
                </span>
                <span className="font-black text-xs sm:text-sm tracking-tight leading-none truncate max-w-[90px]">
                  {roomValue}
                </span>
              </div>

              <span className="text-[#1556D8] dark:text-blue-400 font-bold text-sm sm:text-base tracking-tight truncate">
                {timeDisplay}
              </span>
            </div>

            {canEdit && (onEdit || onDelete) && (
              <div className="flex items-center gap-1 shrink-0">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="p-1 text-slate-500 hover:text-blue-600 rounded border border-slate-200 dark:border-slate-700"
                    title="Edit routine slot"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    className="p-1 text-slate-500 hover:text-rose-600 rounded border border-slate-200 dark:border-slate-700"
                    title="Delete routine slot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Middle: Subject Title */}
          <div className="pt-0.5">
            <h3 className="text-sm sm:text-base font-bold text-[#101D3D] dark:text-white leading-snug tracking-tight">
              {subjectText}
              {shortName && (
                <span className="ml-2 px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[10px] rounded inline-block align-middle">
                  {shortName}
                </span>
              )}
            </h3>
          </div>

          {/* Bottom: Teacher Row */}
          <div className="flex items-center gap-1.5 text-[#64748B] dark:text-slate-400 text-xs sm:text-sm font-medium pt-1.5 border-t border-[#E5EBF3] dark:border-slate-800">
            <User className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 shrink-0" strokeWidth={2.2} />
            <span className="truncate">{teacherText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

