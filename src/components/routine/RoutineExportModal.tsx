import React, { useRef, useState, useMemo } from 'react';
import { Download, Image as ImageIcon, X, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { RoutineSlot } from '../../types';
import { cleanRoomNumber } from '../../constants/rooms';
import { deduplicateAndMergeRoutineSlots } from '../../utils/routineUtils';
import sweLogoImg from '../../assets/images/swe_emblem_logo_1787573363177.jpg';

interface RoutineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routines: RoutineSlot[];
  batchName?: string;
  semester?: number;
}

type DayOfWeek = RoutineSlot['day'];

const DEFAULT_DAYS: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
];

const DAY_SHORT_LABELS: Record<string, string> = {
  SUNDAY: 'Sun',
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
};

interface SchedulePeriod {
  id: number;
  label: string;
  startMinutes: number;
  endMinutes: number;
}

const SCHEDULE_PERIODS: SchedulePeriod[] = [
  { id: 0, label: '9:00 - 10:30', startMinutes: 540, endMinutes: 630 },
  { id: 1, label: '10:30 - 12:00', startMinutes: 630, endMinutes: 720 },
  { id: 2, label: '12:00 - 1:30', startMinutes: 720, endMinutes: 810 },
  { id: 3, label: '1:30 - 3:00', startMinutes: 810, endMinutes: 900 },
  { id: 4, label: '3:00 - 4:30', startMinutes: 900, endMinutes: 990 },
  { id: 5, label: '4:30 - 6:00', startMinutes: 990, endMinutes: 1080 },
];

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const isPM = clean.includes('PM');
  const isAM = clean.includes('AM');
  const timePart = clean.replace(/[^\d:]/g, '');
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  if (!isAM && !isPM && h >= 1 && h <= 6) h += 12;

  return h * 60 + m;
}

function getSlotPeriods(slot: RoutineSlot): number[] {
  const startM = parseTimeToMinutes(slot.startTime);
  const endM = parseTimeToMinutes(slot.endTime);

  const matched: number[] = [];
  SCHEDULE_PERIODS.forEach((period) => {
    const overlapStart = Math.max(startM, period.startMinutes);
    const overlapEnd = Math.min(endM, period.endMinutes);
    const overlapDuration = overlapEnd - overlapStart;

    if (overlapDuration >= 30 || Math.abs(startM - period.startMinutes) <= 35) {
      matched.push(period.id);
    }
  });

  if (matched.length === 0) {
    let closestId = 0;
    let minDiff = 9999;
    SCHEDULE_PERIODS.forEach((period) => {
      const diff = Math.abs(startM - period.startMinutes);
      if (diff < minDiff) {
        minDiff = diff;
        closestId = period.id;
      }
    });
    matched.push(closestId);
  }

  return Array.from(new Set(matched));
}

export const RoutineExportModal: React.FC<RoutineExportModalProps> = ({
  isOpen,
  onClose,
  routines,
  batchName = 'SWE 9th Batch',
}) => {
  const exportCardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // Two clean options as requested: Cyan Schedule and Clean White Background
  const [exportTheme, setExportTheme] = useState<'cyan' | 'white'>('cyan');

  // Format Batch Name (e.g. "SWE Portal  Batch : 09")
  const batchDigits = (batchName || '').match(/\d+/)?.[0] || '09';
  const batchHeaderTitle = `SWE Portal  Batch : ${batchDigits.padStart(2, '0')}`;

  const cleanedRoutines = useMemo(() => deduplicateAndMergeRoutineSlots(routines), [routines]);
  const totalClasses = cleanedRoutines.length;

  if (!isOpen) return null;

  const handleDownloadImage = async () => {
    if (!exportCardRef.current) return;
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const node = exportCardRef.current;
      const cleanBatch = (batchName || 'Batch').replace(/\s+/g, '_');
      const filename = `${cleanBatch}_Class_Schedule_${exportTheme === 'cyan' ? 'Cyan' : 'White'}.png`;

      let dataUrl: string = '';

      try {
        const canvas = await html2canvas(node, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: exportTheme === 'cyan' ? '#00c5d6' : '#FFFFFF',
        });
        dataUrl = canvas.toDataURL('image/png');
      } catch (canvasErr) {
        console.warn('html2canvas fallback to toPng:', canvasErr);
        dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2.5,
          fontEmbedCSS: '',
          skipFonts: true,
          backgroundColor: exportTheme === 'cyan' ? '#00c5d6' : '#FFFFFF',
        });
      }

      if (dataUrl) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        link.remove();

        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Failed to generate PNG routine image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const activeDays: DayOfWeek[] = DEFAULT_DAYS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center shadow-xs">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Download Routine Image
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Weekly class timetable for {batchName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Toolbar: Cyan Schedule & Clean White Background Selection */}
        <div className="px-5 py-3 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-slate-700 dark:text-slate-300">Choose Style:</span>
            
            {/* Simple Segmented Toggle for Cyan Schedule and Clean White Background */}
            <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setExportTheme('cyan')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  exportTheme === 'cyan'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Cyan Schedule
              </button>

              <button
                type="button"
                onClick={() => setExportTheme('white')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  exportTheme === 'white'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Clean White Background
              </button>
            </div>
          </div>

          {/* Direct Download Button */}
          <button
            onClick={handleDownloadImage}
            disabled={isGenerating || totalClasses === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating PNG...
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                Downloaded!
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Download Routine PNG
              </>
            )}
          </button>
        </div>

        {/* Live Preview Canvas Container */}
        <div className="p-3 sm:p-6 overflow-y-auto overflow-x-auto flex-1 bg-slate-200/70 dark:bg-slate-950 flex justify-center items-start">
          <div
            ref={exportCardRef}
            className="relative w-full max-w-[1020px] p-8 sm:p-12 overflow-hidden shadow-2xl rounded-none select-none text-slate-900"
            style={{
              minWidth: '820px',
              background:
                exportTheme === 'cyan'
                  ? 'linear-gradient(135deg, #1ad4e5 0%, #00c0d4 45%, #00b4c8 100%)'
                  : '#FFFFFF',
            }}
          >
            {/* Diagonal Light Highlight Overlay for Cyan Theme */}
            {exportTheme === 'cyan' && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(125deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 35%, rgba(0,0,0,0.04) 60%, rgba(255,255,255,0.15) 100%)',
                }}
              />
            )}

            {/* Top Right Official SWE Emblem Logo from src/assets/images/ */}
            <div className="absolute right-7 top-7 sm:right-10 sm:top-10 z-10">
              <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 border-black shadow-md bg-[#0A1E3F] flex items-center justify-center">
                <img
                  src={sweLogoImg}
                  alt="SWE Metropolitan University"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Centered Main Titles */}
            <div className="text-center relative z-10 pt-2 pb-6 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-wide text-slate-900 leading-tight">
                {batchHeaderTitle}
              </h2>

              <div className="inline-block mt-2">
                <h1 className="text-4xl sm:text-5xl font-serif font-black tracking-tight text-slate-900 pb-1">
                  Class Schedule
                </h1>
                {/* Horizontal Underline */}
                <div className="h-1 bg-slate-900 mx-auto w-3/4 rounded-full mt-0.5"></div>
              </div>
            </div>

            {/* Main Schedule Grid Table with Solid Black Borders */}
            <div className="relative z-10 mt-3 overflow-hidden">
              <table className="w-full border-collapse border-[2.5px] border-black bg-transparent">
                {/* Table Header: Time & 6 Standard Period Slots */}
                <thead>
                  <tr>
                    <th
                      className={`border-[2px] border-black p-2.5 sm:p-3 text-center font-black text-sm sm:text-base text-black w-[11%] ${
                        exportTheme === 'cyan' ? 'bg-white/10' : 'bg-slate-100'
                      }`}
                    >
                      Time
                    </th>
                    {SCHEDULE_PERIODS.map((period) => (
                      <th
                        key={period.id}
                        className={`border-[2px] border-black p-2.5 sm:p-3 text-center font-black text-xs sm:text-sm text-black w-[14.8%] ${
                          exportTheme === 'cyan' ? 'bg-white/10' : 'bg-slate-100'
                        }`}
                      >
                        {period.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body: Sun, Mon, Tue, Wed, Thu */}
                <tbody>
                  {activeDays.map((day) => {
                    const daySlots = cleanedRoutines.filter((r) => r.day === day);

                    return (
                      <tr key={day}>
                        {/* Day Row Label */}
                        <td
                          className={`border-[2px] border-black p-2.5 sm:p-3 text-center font-black text-sm sm:text-base text-black ${
                            exportTheme === 'cyan' ? 'bg-white/5' : 'bg-slate-50'
                          }`}
                        >
                          {DAY_SHORT_LABELS[day] || day}
                        </td>

                        {/* 6 Period Cells */}
                        {SCHEDULE_PERIODS.map((period) => {
                          const matchingSlot = daySlots.find((s) => {
                            const periods = getSlotPeriods(s);
                            return periods.includes(period.id);
                          });

                          if (matchingSlot) {
                            const courseDisplay =
                              matchingSlot.courseShortName ||
                              matchingSlot.courseCode ||
                              matchingSlot.courseTitle;
                            const roomDisplay = cleanRoomNumber(matchingSlot.room);
                            const teacherDisplay =
                              matchingSlot.teacherShortName ||
                              (matchingSlot.teacherName
                                ? matchingSlot.teacherName.split(' ').pop()
                                : '');

                            return (
                              <td
                                key={period.id}
                                className={`border-[2px] border-black p-2 text-center align-middle ${
                                  exportTheme === 'cyan' ? 'bg-white/10' : 'bg-white'
                                }`}
                              >
                                <div className="flex flex-col items-center justify-center min-h-[58px]">
                                  <span className="font-black text-xs sm:text-sm text-black leading-tight uppercase">
                                    {courseDisplay}
                                  </span>
                                  <span className="font-bold text-[11px] sm:text-xs text-black leading-tight mt-1">
                                    {roomDisplay}
                                    {teacherDisplay ? ` | ${teacherDisplay}` : ''}
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={period.id}
                              className={`border-[2px] border-black p-1 text-center align-middle ${
                                exportTheme === 'cyan' ? 'bg-transparent' : 'bg-white'
                              }`}
                            >
                              <div className="min-h-[58px]"></div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Total {totalClasses} classes loaded from portal routine. Saved in 2.5x high-resolution PNG format.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleDownloadImage}
              disabled={isGenerating || totalClasses === 0}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating PNG...
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Direct Download PNG
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
