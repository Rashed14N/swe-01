import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Link as LinkIcon,
  Globe,
  FileText,
  Upload,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ExamType } from '../../types';

interface UploadQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UploadQuestionModal: React.FC<UploadQuestionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('SWE 311');
  const [courseTitle, setCourseTitle] = useState('Software Engineering');
  const [semester, setSemester] = useState<number>(user?.currentSemester || 5);
  const [academicYear, setAcademicYear] = useState<number>(new Date().getFullYear());
  const [examType, setExamType] = useState<ExamType>('FINAL');
  const [facultyName, setFacultyName] = useState('');
  const [targetBatch, setTargetBatch] = useState(user?.batchName || 'SWE 9th Batch');
  const [description, setDescription] = useState('');
  
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !courseCode.trim() || !courseTitle.trim()) {
      addToast('error', 'Please fill in question title, course code, and course name.');
      return;
    }

    const finalDownloadUrl = fileUrl.trim();
    if (!finalDownloadUrl) {
      addToast('error', 'Please enter a direct download link.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedFileName = `${courseCode.replace(/\s+/g, '_')}_${examType}_${academicYear}.pdf`;
      const isDrive = finalDownloadUrl.includes('drive.google.com') || finalDownloadUrl.includes('docs.google.com');

      const res = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          type: 'QUESTION',
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim(),
          semester: Number(semester),
          academicYear: Number(academicYear),
          examType,
          facultyName: facultyName.trim() || undefined,
          targetBatch: targetBatch.trim() || 'SWE Department',
          description: description.trim() || undefined,
          fileUrl: finalDownloadUrl,
          fileName: generatedFileName,
          fileSize: isDrive ? 'Google Drive' : '1.8 MB',
          fileType: 'application/pdf',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (isAdmin) {
          addToast('success', 'Question paper published instantly as Admin!');
        } else {
          addToast('success', 'Question paper submitted for Admin verification (+10 pts earned)!');
        }
        // Reset form
        setTitle('');
        setDescription('');
        setFileUrl('');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        addToast('error', data.error || 'Failed to upload question paper');
      }
    } catch (err: any) {
      console.error(err);
      addToast('error', 'Network error during question upload');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#0A2147] dark:text-white text-base">
                  {isAdmin ? 'Add Official Question Paper' : 'Contribute Question Paper'}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  {isAdmin
                    ? 'Directly publishes to the department Question Bank repository'
                    : 'Submissions are verified by department admin before publishing (+10 Pts)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            {/* Title */}
            <div>
              <label className="block font-bold text-[#0A2147] dark:text-slate-200 mb-1">
                Question Paper Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SWE 311 Final Exam Autumn 2025"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB]"
              />
            </div>

            {/* Course Code & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#0A2147] dark:text-slate-200 mb-1">
                  Course Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SWE 311"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0A2147] dark:text-slate-200 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Architecture"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Question Type & Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[#0A2147] dark:text-slate-200 mb-1">
                  Exam Type *
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value as ExamType)}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 cursor-pointer"
                >
                  <option value="QUIZ">Quiz Question</option>
                  <option value="FINAL">Final Exam Question</option>
                  <option value="SUPPLE">Supple Exam Question</option>
                  <option value="CLASS_TEST">CT Question</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0A2147] dark:text-slate-200 mb-1">
                  Semester *
                </label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 cursor-pointer"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0A2147] dark:text-slate-200 mb-1">
                  Academic Year *
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(Number(e.target.value))}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 cursor-pointer"
                >
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Faculty & Batch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#0A2147] dark:text-slate-200 mb-1">
                  Faculty / Teacher Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Md. Kamrul Hasan"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0A2147] dark:text-slate-200 mb-1">
                  Target Batch
                </label>
                <input
                  type="text"
                  placeholder="e.g. SWE 9th Batch"
                  value={targetBatch}
                  onChange={(e) => setTargetBatch(e.target.value)}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                />
              </div>
            </div>

            {/* Download Link Input */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="flex items-center gap-1.5 font-bold text-[#0A2147] dark:text-white text-xs">
                  <LinkIcon className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Download Link *</span>
                </label>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/50">
                  Direct Download Link
                </span>
              </div>
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="Paste instant download link or Google Drive link"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white font-mono placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 shadow-2xs"
                />
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Paste your instant download link directly.
              </p>
            </div>

            {/* Verification Notice */}
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#2563EB] dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-[#334155] dark:text-slate-300 leading-relaxed">
                {isAdmin ? (
                  <span>
                    <strong>Admin Privilege:</strong> Questions added by admin are immediately verified, marked public, and indexed for all students.
                  </span>
                ) : (
                  <span>
                    <strong>Verification Process:</strong> Your upload will be routed to the <strong>Admin Verification Queue</strong>. Once approved, it will be published to the Question Bank and you will receive +25 Contributor Points!
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[#64748B] dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>{isAdmin ? 'Publish Question Paper' : 'Submit for Verification'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
