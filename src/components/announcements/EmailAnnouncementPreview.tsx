import React, { useState } from 'react';
import { Mail, Monitor, Smartphone, Sparkles, CheckCircle2, Calendar, Clock, MapPin, Send, AlertCircle, Copy, Check } from 'lucide-react';

export interface EmailAnnouncementPreviewProps {
  courseTitle?: string;
  courseCode?: string;
  examType: string;
  examDate: string;
  examTime?: string;
  room?: string;
  title?: string;
  description?: string;
  batchName?: string;
  publisherName?: string;
  onSend?: () => void;
  isSending?: boolean;
}

export const EmailAnnouncementPreview: React.FC<EmailAnnouncementPreviewProps> = ({
  courseTitle = 'Course Title',
  courseCode,
  examType = 'Midterm',
  examDate = '2026-10-15',
  examTime,
  room,
  title,
  description,
  batchName = 'SWE 9th Batch',
  publisherName = 'Course Representative (CR)',
  onSend,
  isSending = false,
}) => {
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedSubject, setCopiedSubject] = useState(false);

  const displayCourse = courseCode
    ? `${courseTitle} (${courseCode})`
    : courseTitle || 'Course Title';

  const subject = `[SWE Exam Announcement] ${displayCourse}: ${examType} on ${examDate || 'Scheduled Date'}`;

  // Formatted date string
  const formattedDate = (() => {
    if (!examDate) return 'Date TBA';
    try {
      const d = new Date(examDate);
      if (isNaN(d.getTime())) return examDate;
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return examDate;
    }
  })();

  const handleCopySubject = () => {
    navigator.clipboard.writeText(subject);
    setCopiedSubject(true);
    setTimeout(() => setCopiedSubject(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Live Resend Email Preview
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Ready to Dispatch
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Interactive preview of what enrolled students receive in their inboxes
            </p>
          </div>
        </div>

        {/* View Switcher (Desktop / Mobile) */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
          <button
            type="button"
            onClick={() => setDeviceView('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              deviceView === 'desktop'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setDeviceView('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
              deviceView === 'mobile'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile
          </button>
        </div>
      </div>

      {/* Key Field Format Highlights Pill Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-2.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700 dark:text-blue-300 block mb-0.5">
            1. Formatted Course Title
          </span>
          <span className="text-xs font-black text-slate-900 dark:text-white truncate block" title={displayCourse}>
            {displayCourse}
          </span>
        </div>

        <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 dark:text-amber-300 block mb-0.5">
            2. Formatted Exam Type
          </span>
          <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
            {examType || 'Exam'}
          </span>
        </div>

        <div className="p-2.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-rose-700 dark:text-rose-300 block mb-0.5">
            3. Formatted Exam Date
          </span>
          <span className="text-xs font-black text-rose-600 dark:text-rose-400 truncate block">
            📅 {formattedDate}
          </span>
        </div>
      </div>

      {/* Simulated Email Client Container */}
      <div className="flex justify-center bg-slate-200/70 dark:bg-slate-950 p-3 sm:p-5 rounded-2xl border border-slate-300 dark:border-slate-800 overflow-x-auto">
        <div
          className={`bg-white rounded-xl shadow-xl border border-slate-300 overflow-hidden transition-all duration-200 ${
            deviceView === 'mobile' ? 'w-[370px] min-w-[340px]' : 'w-full max-w-[620px]'
          }`}
        >
          {/* Simulated Email Client Header Bar */}
          <div className="bg-slate-100 border-b border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                <span className="ml-2 text-[10px] font-mono text-slate-400 font-semibold">
                  Inbox • Resend Delivery
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopySubject}
                className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                title="Copy email subject line"
              >
                {copiedSubject ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Subject</span>
                  </>
                )}
              </button>
            </div>

            {/* Email Meta Headers */}
            <div className="space-y-1 text-xs pt-1 border-t border-slate-200/80">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-400 text-[11px] w-14">Subject:</span>
                <span className="font-extrabold text-slate-900 text-xs leading-snug break-words flex-1">
                  {subject}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-400 text-[11px] w-14">From:</span>
                <span className="font-medium text-slate-700 text-[11px]">
                  SWE Academic Desk &lt;<span className="text-blue-600 font-mono">onboarding@resend.dev</span>&gt;
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-400 text-[11px] w-14">To:</span>
                <span className="font-medium text-slate-700 text-[11px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  Enrolled Students in {displayCourse}
                </span>
              </div>
            </div>
          </div>

          {/* Actual Rendered Email Body */}
          <div className="p-0 bg-[#f1f5f9] select-none text-slate-900">
            <div className="w-full bg-white overflow-hidden shadow-2xs">
              
              {/* Official Brand Header */}
              <div className="bg-gradient-to-br from-[#0A2147] to-[#1e3a8a] text-white p-6 sm:p-7 text-left">
                <div className="inline-block bg-rose-500/25 border border-rose-400/40 text-rose-200 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider mb-2">
                  🚨 OFFICIAL EXAM ANNOUNCEMENT
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  {displayCourse}
                </h1>
                <p className="text-xs text-blue-200 mt-1 font-medium">
                  Metropolitan University • Department of Software Engineering
                </p>
              </div>

              {/* Email Content Body */}
              <div className="p-5 sm:p-7 space-y-4 text-xs">
                <div className="font-bold text-slate-800 text-sm">
                  Hello Student,
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  An official <strong className="text-blue-700 font-extrabold">{examType}</strong> announcement has been published by <strong>{publisherName}</strong> for your enrolled course:
                </p>

                {/* The Core Highlighted Exam Card */}
                <div className="bg-[#f0f7ff] border-2 border-blue-600 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
                  <div className="border-b border-blue-200 pb-2 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                      Exam Information Card
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white shadow-2xs">
                      {examType}
                    </span>
                  </div>

                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-blue-100">
                        <td className="py-1.5 pr-2 font-bold text-slate-500 w-28">Course Title:</td>
                        <td className="py-1.5 font-black text-slate-900 text-sm">
                          {displayCourse}
                        </td>
                      </tr>
                      <tr className="border-b border-blue-100">
                        <td className="py-1.5 pr-2 font-bold text-slate-500">Exam Type:</td>
                        <td className="py-1.5">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded font-black text-[11px] uppercase border border-blue-300">
                            {examType}
                          </span>
                        </td>
                      </tr>
                      <tr className="border-b border-blue-100">
                        <td className="py-1.5 pr-2 font-bold text-slate-500">Exam Date:</td>
                        <td className="py-1.5 font-black text-rose-600 text-sm flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formattedDate}
                        </td>
                      </tr>
                      {examTime && (
                        <tr className="border-b border-blue-100">
                          <td className="py-1.5 pr-2 font-bold text-slate-500">Exam Time:</td>
                          <td className="py-1.5 font-bold text-slate-800 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {examTime}
                          </td>
                        </tr>
                      )}
                      {room && (
                        <tr className="border-b border-blue-100">
                          <td className="py-1.5 pr-2 font-bold text-slate-500">Room / Venue:</td>
                          <td className="py-1.5 font-bold text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {room}
                          </td>
                        </tr>
                      )}
                      {batchName && (
                        <tr className="border-b border-blue-100">
                          <td className="py-1.5 pr-2 font-bold text-slate-500">Batch:</td>
                          <td className="py-1.5 font-bold text-slate-800">
                            {batchName}
                          </td>
                        </tr>
                      )}
                      {title && title !== examType && (
                        <tr>
                          <td className="py-1.5 pr-2 font-bold text-slate-500">Announcement:</td>
                          <td className="py-1.5 font-bold text-slate-900">
                            {title}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {description && (
                    <div className="pt-2 border-t border-blue-200">
                      <strong className="block text-[11px] text-slate-700 mb-1">
                        📋 Instructions & Notes:
                      </strong>
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line text-[11px] bg-white p-2.5 rounded-lg border border-blue-100">
                        {description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Enrollment Notice Footer */}
                <div className="bg-slate-50 border-l-4 border-blue-600 p-3 rounded-r-lg text-[11px] text-slate-600 leading-relaxed">
                  📌 <strong>Enrolled Course Notice:</strong> You received this email notification via <strong>Resend</strong> because you are registered in <strong>{displayCourse}</strong> (Active Batch Enrollment / Retake Desk).
                </div>
              </div>

              {/* Email Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-400 leading-normal">
                Department of Software Engineering • Metropolitan University<br />
                Automated Exam Alert Notification Service • Powered by Resend
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {onSend && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Double-checked the preview? Clicking below will publish and trigger live email delivery.
          </div>
          <button
            type="button"
            onClick={onSend}
            disabled={isSending}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            {isSending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Dispatching Emails...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Looks Great, Publish & Dispatch Email
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
