import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  Link as LinkIcon,
  Globe,
  FileText,
  Upload,
  Check,
  ChevronDown,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ExamType, Course, Faculty, getFacultyRank } from '../../types';

interface UploadQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialCourseCode?: string;
  initialCourseTitle?: string;
}

export const UploadQuestionModal: React.FC<UploadQuestionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCourseCode,
  initialCourseTitle,
}) => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState(initialCourseCode || 'SWE 311');
  const [courseTitle, setCourseTitle] = useState(initialCourseTitle || 'Software Engineering');
  const [academicYear, setAcademicYear] = useState<number>(new Date().getFullYear());
  const [examType, setExamType] = useState<ExamType>('FINAL');
  const [facultyName, setFacultyName] = useState('');
  const [isCustomFaculty, setIsCustomFaculty] = useState(false);
  const [targetBatch, setTargetBatch] = useState(user?.batchName || 'SWE 9th Batch');
  const [description, setDescription] = useState('');

  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [autoMatchedCourse, setAutoMatchedCourse] = useState<Course | null>(null);
  
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load courses and faculty members for dropdowns and auto-detection
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const [resCourses, resFaculty] = await Promise.all([
          fetch('/api/courses?all=true'),
          fetch('/api/faculty'),
        ]);

        if (resCourses.ok && isMounted) {
          const cData = await resCourses.json();
          const list: Course[] = Array.isArray(cData.courses) ? cData.courses : [];
          setCoursesList(list);

          // If courseCode is already populated, attempt match
          if (courseCode) {
            matchAndFillCourse(courseCode, list);
          }
        }

        if (resFaculty.ok && isMounted) {
          const fData = await resFaculty.json();
          const list: Faculty[] = Array.isArray(fData) ? fData : fData.faculty || [];
          // Sort faculty by rank (Head -> Professor -> Associate -> Assistant -> Lecturer)
          list.sort((a, b) => {
            const rankA = getFacultyRank ? getFacultyRank(a.designation) : 99;
            const rankB = getFacultyRank ? getFacultyRank(b.designation) : 99;
            if (rankA !== rankB) return rankA - rankB;
            return a.name.localeCompare(b.name);
          });
          setFacultyList(list);
        }
      } catch (err) {
        console.error('Failed to load courses or faculty for upload:', err);
      }
    };

    fetchMetadata();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Reset or initialize on modal open
  useEffect(() => {
    if (isOpen) {
      if (initialCourseCode) {
        setCourseCode(initialCourseCode);
        if (coursesList.length > 0) {
          matchAndFillCourse(initialCourseCode, coursesList);
        }
      }
      if (initialCourseTitle) {
        setCourseTitle(initialCourseTitle);
      }
    }
  }, [isOpen, initialCourseCode, initialCourseTitle]);

  // Function to search course by code and auto-fill course title
  const matchAndFillCourse = (inputCode: string, courses = coursesList) => {
    if (!inputCode || !inputCode.trim()) {
      setAutoMatchedCourse(null);
      return;
    }

    const cleanInput = inputCode.trim().toUpperCase().replace(/[\s\-_]/g, '');
    const cleanNumbersOnly = inputCode.trim().replace(/\D/g, '');

    const matched =
      courses.find((c) => c.code.trim().toUpperCase().replace(/[\s\-_]/g, '') === cleanInput) ||
      courses.find((c) => c.code.trim().toUpperCase() === inputCode.trim().toUpperCase()) ||
      courses.find((c) => {
        if (cleanNumbersOnly.length >= 3) {
          return c.code.replace(/\D/g, '') === cleanNumbersOnly;
        }
        return false;
      });

    if (matched) {
      setCourseTitle(matched.title);
      setAutoMatchedCourse(matched);
      // Auto-suggest faculty if not already selected and course has assigned faculty
      if (!facultyName && matched.assignedFacultyName) {
        setFacultyName(matched.assignedFacultyName);
        setIsCustomFaculty(false);
      }
    } else {
      setAutoMatchedCourse(null);
    }
  };

  const handleCourseCodeChange = (newCode: string) => {
    setCourseCode(newCode);
    matchAndFillCourse(newCode, coursesList);
  };

  // Quick auto-generate title if empty
  const handleAutoGenerateTitle = () => {
    const examLabel =
      examType === 'FINAL'
        ? 'Final Exam'
        : examType === 'MIDTERM'
        ? 'Midterm Exam'
        : examType === 'QUIZ'
        ? 'Quiz Question'
        : examType === 'SUPPLE'
        ? 'Supple Exam'
        : 'Class Test';
    setTitle(`${courseCode} ${examLabel} ${academicYear}`);
  };

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

    const activeToken =
      token ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('auth_token') ||
          localStorage.getItem('swe_admin_token') ||
          localStorage.getItem('token')
        : null);

    if (!user && !activeToken) {
      addToast('error', 'Please log in to upload or contribute question papers.');
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
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          type: 'QUESTION',
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim(),
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
        const errorMsg =
          typeof data.error === 'string'
            ? data.error
            : typeof data.message === 'string'
            ? data.message
            : data.error?.message || data.error?.code || 'Failed to upload question paper';
        addToast('error', errorMsg);
      }
    } catch (err: any) {
      console.error(err);
      const msg = typeof err === 'string' ? err : err?.message || 'Network error during question upload';
      addToast('error', msg);
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
            {/* Title with auto-generate helper */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-[#0A2147] dark:text-slate-200">
                  Question Paper Title *
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateTitle}
                  className="text-[11px] font-semibold text-[#2563EB] dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Generate standard title from Course, Exam Type, and Year"
                >
                  <Sparkles className="w-3 h-3" /> Auto-suggest Title
                </button>
              </div>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#0A2147] dark:text-slate-200">
                    Course Code *
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Type or pick from list</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    list="upload-course-codes"
                    placeholder="e.g. SWE 311 or 311"
                    value={courseCode}
                    onChange={(e) => handleCourseCodeChange(e.target.value)}
                    className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 focus:border-[#2563EB]"
                  />
                  <datalist id="upload-course-codes">
                    {coursesList.map((c) => (
                      <option key={c.id || c.code} value={c.code}>
                        {c.code} — {c.title} {c.semester ? `(Sem ${c.semester})` : ''}
                      </option>
                    ))}
                  </datalist>
                </div>
                {autoMatchedCourse ? (
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3 shrink-0" /> Recognized: {autoMatchedCourse.code} (Sem {autoMatchedCourse.semester})
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Entering code (e.g. SWE 311) auto-fills Course Title.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#0A2147] dark:text-slate-200">
                    Course Title *
                  </label>
                  {autoMatchedCourse && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
                      Auto-filled
                    </span>
                  )}
                </div>
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

            {/* Question Type & Academic Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-[#0A2147] dark:text-slate-200">
                    Faculty / Teacher <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                  </label>
                  {isCustomFaculty ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomFaculty(false);
                        setFacultyName('');
                      }}
                      className="text-[10px] text-[#2563EB] dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                    >
                      ← Dropdown
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCustomFaculty(true)}
                      className="text-[10px] text-slate-500 hover:text-[#2563EB] dark:hover:text-blue-400 font-medium cursor-pointer"
                    >
                      + Custom
                    </button>
                  )}
                </div>

                {!isCustomFaculty ? (
                  <div className="relative">
                    <select
                      value={
                        facultyList.some((f) => f.name === facultyName)
                          ? facultyName
                          : facultyName
                          ? '__CUSTOM__'
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__CUSTOM__') {
                          setIsCustomFaculty(true);
                        } else {
                          setFacultyName(val);
                        }
                      }}
                      className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 cursor-pointer appearance-none pr-8"
                    >
                      <option value="">-- Select Faculty / Teacher --</option>
                      {facultyList.map((f) => (
                        <option key={f.id || f.name} value={f.name}>
                          {f.name} {f.shortName ? `(${f.shortName})` : ''} — {f.designation}
                        </option>
                      ))}
                      <option value="__CUSTOM__">✍️ Other / Custom Faculty Name...</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Type teacher name..."
                      value={facultyName}
                      onChange={(e) => setFacultyName(e.target.value)}
                      className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-[#0A2147] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
                      autoFocus
                    />
                  </div>
                )}
                {facultyName && !isCustomFaculty && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 font-medium">
                    <GraduationCap className="w-3 h-3 shrink-0" /> {facultyName}
                  </p>
                )}
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
