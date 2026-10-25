import React, { useState } from 'react';
import { Modal } from './Modal';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { MessageSquareWarning, CheckCircle2, Loader2, Send, Bug } from 'lucide-react';
import { getEffectiveSemester } from '../../utils/semester';

interface ReportBugModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
}

export const ReportBugModal: React.FC<ReportBugModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'General Bug',
}) => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [category, setCategory] = useState<string>(defaultCategory);
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);

  const effectiveSemester = getEffectiveSemester(user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      addToast('error', 'Please log in to submit a bug report.');
      return;
    }
    if (!message.trim()) {
      addToast('error', 'Please describe the bug or issue in detail.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cgpa/report-bug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (data?.success) {
        addToast('success', 'Bug report delivered directly to Department Admin!');
        setIsSubmittedSuccess(true);
        setMessage('');
        setTimeout(() => {
          setIsSubmittedSuccess(false);
          onClose();
        }, 2200);
      } else {
        addToast('error', data?.error || 'Failed to submit bug report. Please try again.');
      }
    } catch (err: any) {
      console.error('[Report Bug Modal Error]:', err);
      addToast('error', 'Failed to submit report. Please check connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Report Bug / Issue"
      subtitle="Direct report to SWE Department Administration"
      maxWidth="lg"
    >
      <div className="p-4 sm:p-6 space-y-4 font-sans text-xs">
        {isSubmittedSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-300 dark:border-emerald-700">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">Report Successfully Sent!</h4>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto text-xs">
              Thank you for reporting this issue. The Department Administrator has received your note in their central inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/60 dark:border-blue-900/40 flex items-start gap-2.5">
              <MessageSquareWarning className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-blue-900 dark:text-blue-200">Department Admin Inbox</span>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                  Notice an incorrect course, calculation error, routine schedule mismatch, or broken button? Submit a direct note below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Category *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-[#D8E2EE] dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                >
                  <option value="General Bug">General Portal Bug</option>
                  <option value="Result Discrepancy">Result / Grade Discrepancy</option>
                  <option value="Course Mismatch">Missing or Wrong Semester Course</option>
                  <option value="Routine Issue">Routine / Class Schedule Issue</option>
                  <option value="CGPA Calculation Issue">CGPA / SGPA Calculation Issue</option>
                  <option value="Transcript Print Issue">Transcript or Print Issue</option>
                  <option value="Other">Other Query / Feedback</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Submitting Student
                </label>
                <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-300 font-mono text-[11px] flex items-center justify-between">
                  <span className="truncate">{user?.name || 'Student'} ({user?.studentId || 'ID'})</span>
                  <span className="text-slate-400 font-sans shrink-0 ml-1">Sem {effectiveSemester}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bug Report / Message Description *
              </label>
              <textarea
                required
                rows={4}
                maxLength={1000}
                placeholder="Explain the problem clearly (e.g. 'Class routine shows conflicting time slot for SWE-211 on Tuesday', or 'My grade for SWE-121 was missing')..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-[#D8E2EE] dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 leading-relaxed"
              />
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>Maximum 1,000 characters</span>
                <span>{message.length} / 1000</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Report...</span>
                  </>
                ) : (
                  <>
                    <Bug className="w-3.5 h-3.5" />
                    <span>Send Report to Admin</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
