import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ShieldCheck, Mail, Phone, Calendar, Clock,
  Sparkles, Check, Copy, UserCheck, GraduationCap,
  MessageSquare, ExternalLink, HelpCircle
} from 'lucide-react';
import { getUserAvatarUrl } from '../../data/avatars';

export interface CRProfileData {
  id: string;
  name: string;
  studentId: string;
  email: string;
  phone?: string;
  role: string;
  batchId?: string;
  batchName: string;
  currentSemester: number;
  profileImage?: string;
  bio?: string;
  responsibilities?: string[];
  officeHours?: string;
}

interface CRProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  cr: CRProfileData | null;
}

export const CRProfileModal: React.FC<CRProfileModalProps> = ({
  isOpen,
  onClose,
  cr,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !cr) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const avatarUrl = getUserAvatarUrl({
    name: cr.name,
    studentId: cr.studentId,
    profileImage: cr.profileImage,
  });

  const defaultResponsibilities = [
    'Coordinates with course teachers to schedule and publish upcoming Class Tests, Quizzes & Midterms.',
    'Dispatches official batch announcements, emergency room shifts, and syllabus notices.',
    'Submits class timetable adjustments and room reservation requests to the department coordinator.',
    'Maintains communication with students registered for retake and improvement courses in this batch.',
  ];

  const responsibilities = cr.responsibilities && cr.responsibilities.length > 0
    ? cr.responsibilities
    : defaultResponsibilities;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header Banner */}
          <div
            className="relative px-6 pt-6 pb-12 overflow-hidden text-white"
            style={{
              background: 'linear-gradient(135deg, #071F42 0%, #0E3572 50%, #1D4ED8 100%)',
            }}
          >
            <div className="absolute top-0 right-0 p-4">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/90 flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold tracking-wide uppercase">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" /> Official Class Representative (CR)
              </span>
            </div>

            <h2 className="text-xl font-black text-white tracking-tight">
              Class Representative Profile
            </h2>
            <p className="text-xs text-blue-100/90 mt-0.5">
              {cr.batchName} • Department of Software Engineering
            </p>
          </div>

          {/* CR Profile Header with Floating Avatar */}
          <div className="px-6 -mt-9 relative z-10 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="flex items-end gap-3.5">
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={cr.name}
                    className="w-18 h-18 rounded-2xl border-4 border-white dark:border-[#0F172A] bg-blue-100 dark:bg-slate-800 object-cover shadow-md"
                  />
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0F172A] flex items-center justify-center text-white" title="Active CR">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                </div>

                <div className="pb-1">
                  <h3 className="text-lg font-extrabold text-[#0A2147] dark:text-white leading-tight">
                    {cr.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>Student ID: <strong className="text-[#0A2147] dark:text-slate-200 font-mono">{cr.studentId}</strong></span>
                    <span>•</span>
                    <span>Sem {cr.currentSemester}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 pb-1">
                <a
                  href={`mailto:${cr.email}`}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email CR</span>
                </a>
              </div>
            </div>
          </div>

          {/* Body Content - Scrollable */}
          <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
            {/* Bio / Notice */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-white dark:from-blue-950/30 dark:via-slate-900/60 dark:to-[#0F172A] border border-blue-200/70 dark:border-blue-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <p>
                {cr.bio || `Official Class Representative (CR) for ${cr.batchName}. Reach out for upcoming exam schedules, syllabus updates, class routine queries, and CR coordination.`}
              </p>
            </div>

            {/* Verified Contact Details Grid */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Direct Contact Channels
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Email Box */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
                      University & Official Email
                    </span>
                    <a
                      href={`mailto:${cr.email}`}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block font-mono"
                    >
                      {cr.email}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(cr.email, 'email')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                    title="Copy Email"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Phone Box */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">
                      Phone / WhatsApp Contact
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block font-mono">
                      {cr.phone || '+880 1712-345678'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(cr.phone || '+880 1712-345678', 'phone')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                    title="Copy Phone"
                  >
                    {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Office & Consultation Hours */}
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>CR Consultation & Campus Hours</span>
              </div>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                {cr.officeHours || 'Sunday - Thursday: 10:00 AM - 04:00 PM (SWE Department Corridor / Room 502). Feel free to message on WhatsApp for urgent schedule notices.'}
              </p>
            </div>

            {/* Responsibilities */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Class Representative Role & Scope
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                {responsibilities.map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      ✓
                    </div>
                    <span className="leading-tight">{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              SWE Academic Portal • Batch Leadership
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
