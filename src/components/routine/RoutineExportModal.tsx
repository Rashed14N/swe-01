import React, { useRef, useState } from 'react';
import { Download, Image as ImageIcon, X, CheckCircle2, Calendar, Sparkles, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';
import { RoutineSlot } from '../../types';
import { cleanRoomNumber } from '../../constants/rooms';

interface RoutineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routines: RoutineSlot[];
  batchName?: string;
  semester?: number;
}

const DAYS: ('SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY')[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
];

const DAY_LABELS: Record<string, string> = {
  SUNDAY: 'Sunday',
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
};

export const RoutineExportModal: React.FC<RoutineExportModalProps> = ({
  isOpen,
  onClose,
  routines,
  batchName = 'SWE 9th Batch',
  semester = 5,
}) => {
  const exportCardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [exportTheme, setExportTheme] = useState<'light' | 'navy' | 'dark'>('light');

  if (!isOpen) return null;

  const handleDownloadImage = async () => {
    if (!exportCardRef.current) return;
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      const node = exportCardRef.current;
      const cleanBatch = (batchName || 'Batch').replace(/\s+/g, '_');
      const filename = `${cleanBatch}_Semester_${semester}_Weekly_Routine.png`;

      let dataUrl: string = '';

      try {
        // Preferred: html2canvas rendered canvas
        const canvas = await html2canvas(node, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: exportTheme === 'navy' ? '#071224' : exportTheme === 'dark' ? '#0F172A' : '#F8FAFC',
        });
        dataUrl = canvas.toDataURL('image/png');
      } catch (canvasErr) {
        console.warn('html2canvas failed, falling back to toPng:', canvasErr);
        // Fallback: toPng with fontEmbedCSS completely bypassed
        dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2.5,
          fontEmbedCSS: '',
          skipFonts: true,
          backgroundColor: exportTheme === 'navy' ? '#071224' : exportTheme === 'dark' ? '#0F172A' : '#F8FAFC',
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

  const totalClasses = routines.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Download Weekly Routine as PNG
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                High-resolution, printable weekly schedule image for {batchName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Toolbar & Options */}
        <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Theme Style:</span>
            <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setExportTheme('light')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  exportTheme === 'light'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Clean White
              </button>
              <button
                type="button"
                onClick={() => setExportTheme('navy')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  exportTheme === 'navy'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Royal Navy
              </button>
              <button
                type="button"
                onClick={() => setExportTheme('dark')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  exportTheme === 'dark'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Dark Slate
              </button>
            </div>
          </div>

          <button
            onClick={handleDownloadImage}
            disabled={isGenerating || totalClasses === 0}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer"
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
                Download PNG Image
              </>
            )}
          </button>
        </div>

        {/* Image Preview Canvas Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/60 dark:bg-slate-950 flex justify-center items-start">
          
          {/* THE ACTUAL RENDERED CONTAINER TO BE CONVERTED TO PNG */}
          <div
            ref={exportCardRef}
            className={`w-full max-w-[880px] rounded-2xl shadow-xl border overflow-hidden p-6 sm:p-7 transition-all ${
              exportTheme === 'navy'
                ? 'bg-[#0A192F] border-slate-700 text-white'
                : exportTheme === 'dark'
                ? 'bg-[#0F172A] border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
            style={{ minWidth: '700px' }}
          >
            {/* Header / Brand Banner */}
            <div className="border-b pb-4 mb-5 flex items-center justify-between border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-lg shadow-md">
                  SWE
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      Official Class Timetable
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Semester {semester}
                    </span>
                  </div>
                  <h1 className="text-lg font-black tracking-tight mt-0.5 text-slate-900 dark:text-white">
                    {batchName} • Weekly Routine
                  </h1>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Total {totalClasses} Scheduled Classes
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  Sunday – Thursday
                </div>
              </div>
            </div>

            {/* Routine Days Grid */}
            <div className="space-y-4">
              {DAYS.map((day) => {
                const daySlots = routines
                  .filter((r) => r.day === day)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                return (
                  <div
                    key={day}
                    className={`rounded-xl border overflow-hidden ${
                      exportTheme === 'navy'
                        ? 'bg-slate-900/80 border-slate-800'
                        : exportTheme === 'dark'
                        ? 'bg-slate-800/60 border-slate-700/60'
                        : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    {/* Day Subheader */}
                    <div
                      className={`px-4 py-2 flex items-center justify-between border-b ${
                        exportTheme === 'navy'
                          ? 'bg-slate-800/80 border-slate-700 text-blue-300'
                          : exportTheme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-blue-300'
                          : 'bg-blue-50/80 border-slate-200 text-blue-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-black uppercase tracking-wider">
                          {DAY_LABELS[day]}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {daySlots.length} {daySlots.length === 1 ? 'Class' : 'Classes'}
                      </span>
                    </div>

                    {/* Day Slots List */}
                    <div className="p-2.5">
                      {daySlots.length === 0 ? (
                        <div className="py-3 text-center text-slate-400 text-xs italic">
                          No classes scheduled
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {daySlots.map((slot) => {
                            const isLab = slot.courseTitle.toLowerCase().includes('lab') || (slot as any).type === 'lab';

                            return (
                              <div
                                key={slot.id}
                                className={`p-2.5 rounded-lg border flex flex-col justify-between gap-2 shadow-2xs ${
                                  exportTheme === 'navy'
                                    ? 'bg-[#0c1e3d] border-slate-800 text-slate-100'
                                    : exportTheme === 'dark'
                                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                                    : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1.5 mb-1">
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                                          isLab
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                        }`}
                                      >
                                        {slot.courseCode}
                                      </span>
                                      {slot.courseShortName && (
                                        <span className="px-1 py-0.2 rounded bg-slate-900 text-amber-300 font-extrabold text-[9px]">
                                          {slot.courseShortName}
                                        </span>
                                      )}
                                    </div>

                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                                      {slot.startTime} - {slot.endTime}
                                    </span>
                                  </div>

                                  <h3 className="font-bold text-xs leading-snug line-clamp-1">
                                    {slot.courseTitle}
                                  </h3>
                                </div>

                                <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400">
                                  <span className="font-medium truncate max-w-[140px]">
                                    {slot.teacherName || 'Faculty'} {slot.teacherShortName ? `(${slot.teacherShortName})` : ''}
                                  </span>
                                  <span className="font-extrabold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                                    {cleanRoomNumber(slot.room)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / Watermark */}
            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Department of Software Engineering (SWE Portal)</span>
              <span>Generated on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Tip: The downloaded PNG is saved in 2.5x high resolution, perfect for printing or sharing on Messenger/WhatsApp.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
