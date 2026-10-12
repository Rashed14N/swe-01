import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Award, BookOpen, Download, ClipboardList,
  Edit3, Check, X, ChevronDown, ChevronUp, FileText,
  Printer, RefreshCw, AlertCircle, Plus,
  Search, Info, Trash2, RotateCcw,
  Send, MessageSquareWarning, Eye, CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { safeParseJson } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';
import { SweLogo } from '../components/common/SweLogo';
import { getEffectiveSemester } from '../utils/semester';

export interface EnrichedCourse {
  id: string;
  code: string;
  shortName: string;
  title: string;
  credits: number;
  type: string;
  semester: number;
  grade: string;
  gradePoint: number | null;
  isPublished: boolean;
  isCustom?: boolean;
}

export interface SemesterData {
  semester: number;
  semesterName: string;
  courses: EnrichedCourse[];
  totalCredits: number;
  completedCredits: number;
  gradedCredits: number;
  sgpa: number | null;
  isPublished: boolean;
}

export interface CGPASummary {
  cgpa: number;
  totalCompletedCredits: number;
  totalGradedCredits: number;
  totalDegreeCredits: number;
  totalCourses: number;
  gradedCourseCount: number;
  pendingCourseCount: number;
  completedSemestersCount: number;
  currentSemester?: number;
  batchName?: string;
  academicStanding: string;
  sessionName?: string;
  excludedCount?: number;
}

const MU_GRADE_OPTIONS = [
  { grade: 'A+', gradePoint: 4.00, label: 'A+ (4.00) · 80% and above · Outstanding' },
  { grade: 'A',  gradePoint: 3.75, label: 'A  (3.75) · 75% to <80% · Excellent' },
  { grade: 'A-', gradePoint: 3.50, label: 'A- (3.50) · 70% to <75% · Very Good' },
  { grade: 'B+', gradePoint: 3.25, label: 'B+ (3.25) · 65% to <70% · Good' },
  { grade: 'B',  gradePoint: 3.00, label: 'B  (3.00) · 60% to <65% · Satisfactory' },
  { grade: 'B-', gradePoint: 2.75, label: 'B- (2.75) · 55% to <60% · Above Average' },
  { grade: 'C+', gradePoint: 2.50, label: 'C+ (2.50) · 50% to <55% · Average' },
  { grade: 'C',  gradePoint: 2.25, label: 'C  (2.25) · 45% to <50% · Below Average' },
  { grade: 'D',  gradePoint: 2.00, label: 'D  (2.00) · 40% to <45% · Pass' },
  { grade: 'F',  gradePoint: 0.00, label: 'F  (0.00) · Less than 40% · Fail' },
  { grade: 'N/A', gradePoint: 0.00, label: 'Not Published / Clear Grade' },
];

export const CGPAPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();
  const effectiveSemester = getEffectiveSemester(user);

  // Primary State
  const [summary, setSummary] = useState<CGPASummary | null>(null);
  const [courses, setCourses] = useState<EnrichedCourse[]>([]);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filters & Search
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'GRADED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSemesters, setCollapsedSemesters] = useState<Record<number, boolean>>({});

  // Modals
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [singleEditingCourse, setSingleEditingCourse] = useState<EnrichedCourse | null>(null);
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);

  // Bug Report to Admin State
  const [bugCategory, setBugCategory] = useState('Result Discrepancy');
  const [bugMessage, setBugMessage] = useState('');
  const [isSubmittingBug, setIsSubmittingBug] = useState(false);
  const [bugSubmittedSuccess, setBugSubmittedSuccess] = useState(false);

  // Form State for Add Course
  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    shortName: '',
    credits: 3.0,
    semester: 1,
    type: 'THEORY',
    grade: 'N/A',
  });

  // Bulk Edit Buffer
  const [editingGrades, setEditingGrades] = useState<Record<string, string>>({});
  const [editSemesterFilter, setEditSemesterFilter] = useState<number | 'ALL'>('ALL');

  // Paste Results State
  const [pastedResults, setPastedResults] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Record<string, string>>({});

  // Lock body scroll whenever any popup is open to prevent page scrolling behind modal
  const anyModalOpen = isPasteModalOpen || isBulkEditModalOpen || isAddCourseModalOpen || !!singleEditingCourse || isTranscriptModalOpen;
  useEffect(() => {
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [anyModalOpen]);

  // Fetch CGPA Data
  const fetchCGPAData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/cgpa', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeParseJson(res);
      if (data?.success) {
        setSummary(data.cgpaSummary);
        const isAcmCourse = (c: EnrichedCourse) => 
          c.code.toUpperCase() === 'ACM' || 
          c.code.toUpperCase().startsWith('ACM-') || 
          c.code.toUpperCase().includes('ACM') || 
          (c.title && c.title.toUpperCase().includes('ACM'));

        const validCourses = (data.courses || []).filter(
          (c: EnrichedCourse) => !isAcmCourse(c)
        );
        const validSemesters = (data.semesterBreakdown || []).map((s: SemesterData) => ({
          ...s,
          courses: (s.courses || []).filter(
            (c: EnrichedCourse) => !isAcmCourse(c)
          ),
        }));
        setCourses(validCourses);
        setSemesters(validSemesters);

        const initGrades: Record<string, string> = {};
        validCourses.forEach((c: EnrichedCourse) => {
          initGrades[c.code] = c.isPublished ? c.grade : 'N/A';
        });
        setEditingGrades(initGrades);
      } else {
        addToast('error', data?.error || 'Failed to fetch CGPA record');
      }
    } catch (err: any) {
      console.error('Fetch CGPA Error:', err);
      addToast('error', 'Could not load CGPA details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCGPAData();
  }, [token, user]);

  // Toggle Collapse
  const toggleSemesterCollapse = (semNumber: number) => {
    setCollapsedSemesters(prev => ({
      ...prev,
      [semNumber]: !prev[semNumber],
    }));
  };

  // Filtered Semesters and Courses
  const filteredSemesters = useMemo(() => {
    let result = [...semesters];

    if (selectedSemesterTab !== 'ALL') {
      result = result.filter(s => s.semester === selectedSemesterTab);
    }

    return result.map(s => {
      let filteredCourses = (s.courses || []).filter(
        c => c.code.toUpperCase() !== 'ACM' && !c.code.toUpperCase().startsWith('ACM-') && !c.code.toUpperCase().includes('ACM') && !c.title.toUpperCase().includes('ACM')
      );

      if (statusFilter === 'GRADED') {
        filteredCourses = filteredCourses.filter(c => c.isPublished);
      } else if (statusFilter === 'PENDING') {
        filteredCourses = filteredCourses.filter(c => !c.isPublished);
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filteredCourses = filteredCourses.filter(
          c =>
            c.code.toLowerCase().includes(query) ||
            c.title.toLowerCase().includes(query) ||
            (c.shortName && c.shortName.toLowerCase().includes(query))
        );
      }

      return {
        ...s,
        courses: filteredCourses,
      };
    }).filter(s => s.courses.length > 0 || selectedSemesterTab === s.semester);
  }, [semesters, selectedSemesterTab, statusFilter, searchQuery]);

  // Courses to Print: only semesters up to student's current batch semester or with published results
  const printableSemesters = useMemo(() => {
    const activeBatchSem = effectiveSemester;
    return semesters
      .filter(s => s.semester <= activeBatchSem || s.isPublished)
      .map(s => ({
        ...s,
        courses: (s.courses || []).filter(
          c => c.code.toUpperCase() !== 'ACM' && !c.code.toUpperCase().startsWith('ACM-') && !c.code.toUpperCase().includes('ACM') && !c.title.toUpperCase().includes('ACM')
        ),
      }));
  }, [semesters, user]);

  // Save Single Course Grade
  const handleSaveSingleGrade = async (courseCode: string, newGrade: string) => {
    if (!token) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/cgpa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          grades: {
            [courseCode]: newGrade === 'N/A' ? 'N/A' : newGrade,
          },
        }),
      });

      const data = await safeParseJson(res);
      if (data?.success) {
        setSummary(data.cgpaSummary);
        setCourses(data.courses);
        setSemesters(data.semesterBreakdown);
        setEditingGrades(prev => ({ ...prev, [courseCode]: newGrade }));
        setSingleEditingCourse(null);
        addToast('success', `Grade updated for ${courseCode}`);
      } else {
        addToast('error', data?.error || 'Failed to save grade');
      }
    } catch (err: any) {
      console.error('Save grade error:', err);
      addToast('error', 'Error updating grade');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Bulk Grades
  const handleSaveBulkGrades = async () => {
    if (!token) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/cgpa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grades: editingGrades }),
      });

      const data = await safeParseJson(res);
      if (data?.success) {
        setSummary(data.cgpaSummary);
        setCourses(data.courses);
        setSemesters(data.semesterBreakdown);
        setIsBulkEditModalOpen(false);
        addToast('success', 'Grades updated successfully');
      } else {
        addToast('error', data?.error || 'Failed to update grades');
      }
    } catch (err: any) {
      console.error('Bulk save error:', err);
      addToast('error', 'Error updating grades');
    } finally {
      setIsSaving(false);
    }
  };

  // Add Course
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!courseForm.code.trim() || !courseForm.title.trim()) {
      addToast('error', 'Course code and title are required');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/cgpa/course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(courseForm),
      });

      const data = await safeParseJson(res);
      if (data?.success) {
        setSummary(data.cgpaSummary);
        setCourses(data.courses);
        setSemesters(data.semesterBreakdown);
        setIsAddCourseModalOpen(false);
        setCourseForm({
          code: '',
          title: '',
          shortName: '',
          credits: 3.0,
          semester: 1,
          type: 'THEORY',
          grade: 'N/A',
        });
        addToast('success', data.message || 'Course saved');
      } else {
        addToast('error', data?.error || 'Failed to save course');
      }
    } catch (err: any) {
      console.error('Add course error:', err);
      addToast('error', 'Failed to save course');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove Any Course from Personalized Curriculum
  const handleRemoveCourse = async (courseCode: string) => {
    if (!token) return;
    if (!confirm(`Remove ${courseCode} from your personalized curriculum? You can restore it anytime.`)) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/cgpa/course/${encodeURIComponent(courseCode)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await safeParseJson(res);
      if (data?.success) {
        setSummary(data.cgpaSummary);
        setCourses(data.courses);
        setSemesters(data.semesterBreakdown);
        addToast('success', `Course ${courseCode} removed`);
      } else {
        addToast('error', data?.error || 'Failed to remove course');
      }
    } catch (err) {
      addToast('error', 'Failed to remove course');
    } finally {
      setIsSaving(false);
    }
  };

  // Restore Default Courses
  const handleRestoreDefaultCourses = async () => {
    if (!token) return;
    if (!confirm('Restore standard syllabus courses for your batch?')) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/cgpa/course/restore', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeParseJson(res);
      if (data?.success) {
        setSummary(data.cgpaSummary);
        setCourses(data.courses);
        setSemesters(data.semesterBreakdown);
        addToast('success', data.message || 'Default courses restored');
      }
    } catch (err) {
      addToast('error', 'Failed to restore default courses');
    } finally {
      setIsSaving(false);
    }
  };

  // Text Parser for Paste Area
  const handleParseTextResults = (text: string) => {
    setPastedResults(text);
    if (!text.trim()) {
      setParsedPreview({});
      return;
    }

    const detected: Record<string, string> = {};
    const lines = text.split('\n');

    lines.forEach(line => {
      const clean = line.trim();
      if (!clean) return;

      const match = clean.match(/([A-Z]{2,4}[-\s]?\d{3})[\s:,=-]+([A-D][+-]?|F)/i);
      if (match) {
        const code = match[1].toUpperCase().replace(/\s+/, '-');
        if (code === 'ACM' || code.startsWith('ACM-') || code.includes('ACM')) return;
        const grade = match[2].toUpperCase();
        detected[code] = grade;
      }
    });

    setParsedPreview(detected);
  };

  // Save Pasted Results
  const handleSavePastedResults = async () => {
    if (!token) return;
    if (Object.keys(parsedPreview).length === 0) {
      addToast('error', 'No valid course grades detected in pasted text');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/cgpa/paste-results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ results: parsedPreview }),
      });

      const data = await safeParseJson(res);
      if (data?.success) {
        setSummary(data.cgpaSummary);
        setCourses(data.courses);
        setSemesters(data.semesterBreakdown);
        setIsPasteModalOpen(false);
        setPastedResults('');
        setParsedPreview({});
        addToast('success', data.message || 'Grades recorded successfully!');
      } else {
        addToast('error', data?.error || 'Failed to save pasted results');
      }
    } catch (err) {
      addToast('error', 'Failed to save results');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    setIsTranscriptModalOpen(true);
  };

  const handleExecuteBrowserPrint = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Browser print failed:', err);
      addToast('info', 'Print dialog triggered.');
    }
  };

  // Submit Text Bug Report to Admin
  const handleBugReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      addToast('error', 'Please log in to report a bug to admin.');
      return;
    }
    if (!bugMessage.trim()) {
      addToast('error', 'Please describe the bug or issue in text.');
      return;
    }

    setIsSubmittingBug(true);
    try {
      const res = await fetch('/api/cgpa/report-bug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: bugCategory,
          message: bugMessage.trim(),
        }),
      });

      const data = await safeParseJson(res);
      if (data?.success) {
        addToast('success', 'Bug report delivered directly to Department Admin!');
        setBugMessage('');
        setBugSubmittedSuccess(true);
        setTimeout(() => setBugSubmittedSuccess(false), 5000);
      } else {
        addToast('error', data?.error || 'Failed to submit bug report');
      }
    } catch (err: any) {
      addToast('error', 'Network error submitting bug report');
    } finally {
      setIsSubmittingBug(false);
    }
  };

  return (
    <div className="space-y-3.5 max-w-[1260px] print:max-w-none print:m-0 print:p-0">
      {/* 1. Header Bar: Responsive Academic Look */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-4 sm:p-5 border border-[#D8E2EE] dark:border-slate-800 shadow-2xs space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            {/* Academic Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-800/80">
                <GraduationCap className="w-3.5 h-3.5" />
                {user?.batchName || 'SWE 9th Batch'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                Semester {effectiveSemester}
              </span>
              {user?.studentId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700">
                  ID: {user.studentId}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[#0B2348] dark:text-white tracking-tight">
              My CGPA & Academic Results
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Official curriculum courses, semester GPA (SGPA), cumulative CGPA, and registered grades.
            </p>
          </div>

          {/* Action Buttons: Responsive Wrap */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setCourseForm({
                  code: '',
                  title: '',
                  shortName: '',
                  credits: 3.0,
                  semester: selectedSemesterTab === 'ALL' ? effectiveSemester : selectedSemesterTab,
                  type: 'THEORY',
                  grade: 'N/A',
                });
                setIsAddCourseModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0F172A] dark:text-slate-100 border border-[#D8E2EE] dark:border-slate-700 text-xs font-semibold shadow-2xs hover:border-[#2563EB] transition-all cursor-pointer active:scale-98"
            >
              <Plus className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400 shrink-0" />
              <span>Add Course</span>
            </button>

            <button
              onClick={() => setIsPasteModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0F172A] dark:text-slate-100 border border-[#D8E2EE] dark:border-slate-700 text-xs font-semibold shadow-2xs hover:border-[#2563EB] transition-all cursor-pointer active:scale-98"
            >
              <ClipboardList className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Paste Results</span>
            </button>

            <button
              onClick={() => setIsBulkEditModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0F172A] dark:text-slate-100 border border-[#D8E2EE] dark:border-slate-700 text-xs font-semibold shadow-2xs hover:border-[#2563EB] transition-all cursor-pointer active:scale-98"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Edit Grades</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Print Transcript</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PRINT-ONLY OFFICIAL ACADEMIC TRANSCRIPT LAYOUT         */}
      {/* ========================================================= */}
      <div id="printable-academic-transcript" className="hidden print:block font-sans text-black bg-white p-6 leading-tight">
        {/* University Official Letterhead */}
        <div className="border-b-2 border-black pb-4 text-center">
          <h1 className="text-xl font-bold tracking-tight text-[#0B2348] uppercase">
            METROPOLITAN UNIVERSITY, SYLHET
          </h1>
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-0.5">
            DEPARTMENT OF SOFTWARE ENGINEERING
          </p>
          <p className="text-[11px] font-semibold text-slate-600">
            OFFICIAL GRADE REPORT & ACADEMIC RECORD
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Academic Session: {summary?.sessionName || 'Autumn 2026'}
          </p>
        </div>

        {/* Student Information Grid */}
        <div className="my-4 p-3 border border-slate-300 rounded-lg text-xs grid grid-cols-2 gap-y-1.5 gap-x-4 bg-slate-50/50">
          <div>
            <span className="font-semibold text-slate-600">Student Name: </span>
            <strong className="text-slate-900">{user?.name}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Student ID / Roll: </span>
            <strong className="text-slate-900 font-mono">{user?.studentId}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Academic Batch: </span>
            <strong className="text-slate-900">{user?.batchName || 'SWE Batch'}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Current Semester: </span>
            <strong className="text-slate-900">Semester {effectiveSemester}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Degree Program: </span>
            <span className="text-slate-900">B.Sc. in Software Engineering</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">Academic Standing: </span>
            <strong className="text-slate-900">{summary?.academicStanding || 'Regular'}</strong>
          </div>
        </div>

        {/* Printable Course Tables by Semester */}
        <div className="space-y-4">
          {printableSemesters.map((sem) => (
            <div key={sem.semester} className="break-inside-avoid">
              <div className="flex items-center justify-between border-b border-black pb-1 mb-1">
                <span className="font-bold text-xs uppercase text-[#0B2348]">
                  {sem.semesterName}
                </span>
                <span className="text-xs font-bold">
                  SGPA: {sem.sgpa !== null ? sem.sgpa.toFixed(2) : 'N/A'} · ({sem.totalCredits} Cr)
                </span>
              </div>

              <table className="w-full text-left text-[11px] border-collapse mb-2">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100/80 font-bold">
                    <th className="py-1 px-2 w-28">Course Code</th>
                    <th className="py-1 px-2">Course Title</th>
                    <th className="py-1 px-2 text-center w-16">Credit</th>
                    <th className="py-1 px-2 text-center w-16">Grade</th>
                    <th className="py-1 px-2 text-center w-20">Grade Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sem.courses.map((c) => (
                    <tr key={c.code}>
                      <td className="py-1 px-2 font-mono font-bold">{c.code}</td>
                      <td className="py-1 px-2">{c.title}</td>
                      <td className="py-1 px-2 text-center">{c.credits.toFixed(1)}</td>
                      <td className="py-1 px-2 text-center font-bold">
                        {c.isPublished ? c.grade : 'Not Published'}
                      </td>
                      <td className="py-1 px-2 text-center font-mono">
                        {c.isPublished && c.gradePoint !== null ? c.gradePoint.toFixed(2) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Printable Cumulative Summary Box */}
        <div className="mt-5 p-3 border-2 border-black rounded-lg text-xs flex items-center justify-between bg-slate-50 break-inside-avoid">
          <div>
            <span className="block font-semibold text-slate-600">Total Completed Credits:</span>
            <span className="text-base font-bold text-slate-900">
              {summary ? summary.totalCompletedCredits.toFixed(1) : '0.0'} / {summary?.totalDegreeCredits || 148} Cr
            </span>
          </div>
          <div>
            <span className="block font-semibold text-slate-600">Graded Courses:</span>
            <span className="text-base font-bold text-slate-900">
              {summary ? summary.gradedCourseCount : 0} Courses
            </span>
          </div>
          <div className="text-right">
            <span className="block font-semibold text-slate-600">Cumulative GPA (CGPA):</span>
            <span className="text-lg font-bold text-[#0B2348]">
              {summary && summary.totalGradedCredits > 0 ? summary.cgpa.toFixed(2) : '0.00'} / 4.00
            </span>
          </div>
        </div>

        {/* Verification Signatures & Stamp */}
        <div className="mt-12 pt-4 flex items-end justify-between text-xs break-inside-avoid">
          <div className="text-center w-48">
            <div className="border-t border-black pt-1 font-semibold text-slate-800">
              Prepared & Verified By
            </div>
            <div className="text-[10px] text-slate-500">Academic Records Section</div>
          </div>

          <div className="text-center w-48">
            <div className="border-t border-black pt-1 font-semibold text-slate-800">
              Controller of Examinations
            </div>
            <div className="text-[10px] text-slate-500">Metropolitan University, Sylhet</div>
          </div>
        </div>

        {/* Footer Generator Stamp */}
        <div className="mt-8 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 break-inside-avoid">
          <span>Generated by MU SWE Student Portal</span>
          <span>Printed on: {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. SCREEN-ONLY KPI STATS ROW (2 Clean Cards, 1 Row on Mobile) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-xl sm:max-w-2xl print:hidden">
        {/* Card 1: Cumulative CGPA */}
        <div className="bg-white dark:bg-[#0F172A] rounded-xl p-2.5 sm:p-3.5 border border-[#D8E2EE] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
              CGPA
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
              <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>

          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0B2348] dark:text-white tracking-tight font-sans">
              {summary && summary.totalGradedCredits > 0 ? summary.cgpa.toFixed(2) : '0.00'}
            </span>
            <span className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 font-semibold">
              / 4.00
            </span>
          </div>

          <div className="mt-0.5 text-[10px] sm:text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
            {summary && summary.totalGradedCredits > 0 ? summary.academicStanding : 'No results recorded'}
          </div>

          <div className="mt-1 sm:mt-1.5 pt-1 sm:pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Graded</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {summary ? summary.totalGradedCredits.toFixed(1) : '0.0'} Cr
            </span>
          </div>
        </div>

        {/* Card 2: Completed Credits */}
        <div className="bg-white dark:bg-[#0F172A] rounded-xl p-2.5 sm:p-3.5 border border-[#D8E2EE] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
              Credits
            </span>
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>
          </div>

          <div className="mt-0.5 sm:mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#0B2348] dark:text-white tracking-tight">
              {summary ? summary.totalCompletedCredits.toFixed(1) : '0.0'}
            </span>
            <span className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 font-semibold truncate">
              / {summary?.totalDegreeCredits || 148} Cr
            </span>
          </div>

          <div className="mt-1 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  summary && summary.totalDegreeCredits > 0
                    ? (summary.totalCompletedCredits / summary.totalDegreeCredits) * 100
                    : 0
                )}%`,
              }}
            />
          </div>

          <div className="mt-1 sm:mt-1.5 pt-1 sm:pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Progress</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {summary && summary.totalDegreeCredits > 0
                ? ((summary.totalCompletedCredits / summary.totalDegreeCredits) * 100).toFixed(1)
                : '0.0'}%
            </span>
          </div>
        </div>
      </div>

      {/* 4. Report Bug or Result Issue to Admin (Direct Section Below MY CGPA) */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-4 sm:p-5 border border-[#D8E2EE] dark:border-slate-800 shadow-2xs space-y-3.5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0B2348] dark:text-white flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Report Bug or Result Discrepancy to Admin</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Found a missing course, incorrect grade point, or result calculation bug? Submit your report directly in plain text to Department Administration.
            </p>
          </div>
          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 self-start sm:self-auto shrink-0 uppercase tracking-wider">
            Direct Admin Inbox
          </span>
        </div>

        {bugSubmittedSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Thank you! Your bug report has been forwarded to Department Admin for review and resolution.</span>
          </div>
        )}

        <form onSubmit={handleBugReportSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Issue Category *
              </label>
              <select
                value={bugCategory}
                onChange={e => setBugCategory(e.target.value)}
                className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-[#D8E2EE] dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
              >
                <option value="Result Discrepancy">Result / Grade Discrepancy</option>
                <option value="Course Mismatch">Missing or Wrong Semester Course</option>
                <option value="CGPA Calculation Issue">CGPA / SGPA Calculation Issue</option>
                <option value="Transcript Print Issue">Transcript or Print Issue</option>
                <option value="General Bug">General Portal Bug</option>
                <option value="Other">Other Query</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Submitting Student Account
              </label>
              <div className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-600 dark:text-slate-300 font-mono text-[11px] flex items-center justify-between">
                <span>{user?.name || 'Student'} ({user?.studentId || 'ID'})</span>
                <span className="text-slate-400 font-sans">{user?.batchName || 'SWE 9th Batch'} • Sem {effectiveSemester}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Bug Report / Message Description in Plain Text *
            </label>
            <textarea
              required
              rows={3}
              maxLength={1000}
              placeholder="Explain the issue clearly (e.g. 'My SWE-223 grade was published as A- on notice board but shows B+ in portal', or 'Course SWE-211 has incorrect credits')..."
              value={bugMessage}
              onChange={e => setBugMessage(e.target.value)}
              className="w-full bg-[#F8FAFC] dark:bg-slate-900 border border-[#D8E2EE] dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              {bugMessage.length}/1000 characters
            </span>
            <button
              type="submit"
              disabled={isSubmittingBug || !bugMessage.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-98"
            >
              {isSubmittingBug ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Report...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Report to Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 5. Filter Toolbar */}
      <div className="bg-white dark:bg-[#0F172A] rounded-xl p-2.5 sm:p-3 border border-[#D8E2EE] dark:border-slate-800 shadow-2xs space-y-2 print:hidden">
        {/* Semester Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
          <button
            onClick={() => setSelectedSemesterTab('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedSemesterTab === 'ALL'
                ? 'bg-[#2563EB] text-white shadow-2xs'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            All Semesters (1–8)
          </button>

          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
            const semInfo = semesters.find(s => s.semester === sem);
            const isGraded = semInfo && semInfo.isPublished;
            return (
              <button
                key={sem}
                onClick={() => setSelectedSemesterTab(sem)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedSemesterTab === sem
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <span>Sem {sem}</span>
                {isGraded && (
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedSemesterTab === sem ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search course code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F8FAFC] dark:bg-slate-800 text-xs text-[#0F172A] dark:text-slate-100 placeholder-slate-400 pl-8 pr-2.5 py-1.5 rounded-lg border border-[#D8E2EE] dark:border-slate-700 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div className="flex items-center gap-1.5 justify-between sm:justify-end">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-[11px]">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2 py-0.5 font-semibold rounded-md transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('GRADED')}
                className={`px-2 py-0.5 font-semibold rounded-md transition-all ${
                  statusFilter === 'GRADED'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Graded
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2 py-0.5 font-semibold rounded-md transition-all ${
                  statusFilter === 'PENDING'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Pending
              </button>
            </div>

            {summary && (summary.excludedCount || 0) > 0 && (
              <button
                onClick={handleRestoreDefaultCourses}
                title="Restore removed syllabus courses"
                className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Curriculum</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Semester Tables (Course removal enabled for every course) */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#0F172A] rounded-xl p-8 border border-[#D8E2EE] dark:border-slate-800 text-center space-y-2 print:hidden">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Loading courses...</p>
        </div>
      ) : filteredSemesters.length === 0 ? (
        <div className="bg-white dark:bg-[#0F172A] rounded-xl p-8 border border-[#D8E2EE] dark:border-slate-800 text-center print:hidden">
          <AlertCircle className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No courses match the filters</p>
        </div>
      ) : (
        <div className="space-y-3 print:hidden">
          {filteredSemesters.map((sem) => {
            const isCollapsed = collapsedSemesters[sem.semester];

            return (
              <div
                key={sem.semester}
                className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-2xs overflow-hidden"
              >
                {/* Semester Header: Tight & Compact */}
                <div className="px-3 py-2 sm:px-4 bg-[#F8FAFC] dark:bg-slate-800/40 border-b border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      onClick={() => toggleSemesterCollapse(sem.semester)}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                    </button>

                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#0B2348] dark:text-white">
                        {sem.semesterName}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1.5">
                        · {sem.totalCredits} Cr · {sem.courses.length} Courses
                      </span>
                    </div>
                  </div>

                  {/* Right Status */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-semibold block leading-tight">
                        SGPA
                      </span>
                      {sem.sgpa !== null ? (
                        <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">
                          {sem.sgpa.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          0.00
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setCourseForm({
                          code: '',
                          title: '',
                          shortName: '',
                          credits: 3.0,
                          semester: sem.semester,
                          type: 'THEORY',
                          grade: 'N/A',
                        });
                        setIsAddCourseModalOpen(true);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-[#2563EB] border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700"
                      title="Add course to this semester"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        setEditSemesterFilter(sem.semester);
                        setIsBulkEditModalOpen(true);
                      }}
                      className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-[#2563EB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 transition-all"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white dark:bg-[#0F172A] border-b border-[#E2E8F0] dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2 px-3 sm:px-4">Course</th>
                          {/* Desktop Only: Title */}
                          <th className="py-2 px-3 hidden sm:table-cell">Course Title</th>
                          <th className="py-2 px-2.5 text-center">Cr</th>
                          <th className="py-2 px-2.5 text-center hidden md:table-cell">Term</th>
                          <th className="py-2 px-3 text-center">Grade</th>
                          <th className="py-2 px-3 text-center">GP</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]/80 dark:divide-slate-800/60 text-xs">
                        {sem.courses.map((course) => {
                          return (
                            <tr
                              key={course.id || course.code}
                              className="hover:bg-blue-50/20 dark:hover:bg-slate-800/20 transition-colors"
                            >
                              {/* 1. Course Code (+ Short Name on Mobile, Title removed on mobile) */}
                              <td className="py-2 px-3 sm:px-4 whitespace-nowrap">
                                <div>
                                  <div className="font-mono font-bold text-xs text-[#0B2348] dark:text-white flex items-center gap-1.5">
                                    <span>{course.code}</span>
                                    {course.isCustom && (
                                      <span className="text-[9px] font-sans px-1 py-0.2 bg-blue-50 text-blue-600 rounded">
                                        Custom
                                      </span>
                                    )}
                                  </div>
                                  {/* Mobile: Short Name right under Course Code */}
                                  <div className="sm:hidden text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                    {course.shortName || course.title}
                                  </div>
                                </div>
                              </td>

                              {/* 2. Course Title (Desktop/Tablet Only) */}
                              <td className="py-2 px-3 hidden sm:table-cell text-slate-800 dark:text-slate-200">
                                <div className="truncate max-w-[280px]">
                                  {course.title}
                                  {course.shortName && course.shortName !== course.code && (
                                    <span className="text-[11px] text-slate-400 ml-1.5 font-medium">
                                      ({course.shortName})
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 3. Credit */}
                              <td className="py-2 px-2.5 text-center font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {course.credits.toFixed(1)}
                              </td>

                              {/* 4. Semester (Tablet/Desktop) */}
                              <td className="py-2 px-2.5 text-center text-slate-400 whitespace-nowrap hidden md:table-cell">
                                Sem {course.semester}
                              </td>

                              {/* 5. Grade */}
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                {course.isPublished ? (
                                  <span
                                    className={`font-bold ${
                                      course.grade.startsWith('A')
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : course.grade.startsWith('B')
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : course.grade.startsWith('C')
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : course.grade === 'D'
                                        ? 'text-orange-600 dark:text-orange-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {course.grade}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 font-medium text-[11px]">
                                    Not Published
                                  </span>
                                )}
                              </td>

                              {/* 6. Grade Point */}
                              <td className="py-2 px-3 text-center font-mono whitespace-nowrap">
                                {course.isPublished && course.gradePoint !== null ? (
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {course.gradePoint.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-sans text-[11px]">
                                    N/A
                                  </span>
                                )}
                              </td>

                              {/* 7. Action: Edit Grade + Remove Course from Personal Curriculum */}
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    onClick={() => setSingleEditingCourse(course)}
                                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Edit grade or details"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleRemoveCourse(course.code)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                                    title={`Remove ${course.code} from my curriculum`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Metropolitan University Grading Scale Reference (Compact) */}
      <div className="bg-white dark:bg-[#0F172A] rounded-xl p-3 border border-[#D8E2EE] dark:border-slate-800 shadow-2xs space-y-1.5 print:hidden">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#0B2348] dark:text-white uppercase tracking-wider">
            Metropolitan University Grading Policy
          </span>
          <span className="text-[10px] text-slate-400">
            UGC Standard 4.00 Scale
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
          {MU_GRADE_OPTIONS.filter(g => g.grade !== 'N/A').map((item) => (
            <div
              key={item.grade}
              className="p-1.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E2E8F0] dark:border-slate-800 flex items-center justify-between"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-white block text-xs">
                  {item.grade}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {item.gradePoint.toFixed(2)}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                {item.grade === 'A+' && '80%+'}
                {item.grade === 'A' && '75%'}
                {item.grade === 'A-' && '70%'}
                {item.grade === 'B+' && '65%'}
                {item.grade === 'B' && '60%'}
                {item.grade === 'B-' && '55%'}
                {item.grade === 'C+' && '50%'}
                {item.grade === 'C' && '45%'}
                {item.grade === 'D' && '40%'}
                {item.grade === 'F' && '<40%'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* POPUP 1: Paste Course Results Modal (Centered, Portal)    */}
      {/* ========================================================= */}
      {isPasteModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={() => setIsPasteModalOpen(false)}
        >
          <div
            className="relative my-auto w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-2xl p-4 sm:p-5 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#0B2348] dark:text-white">
                    Paste Academic Results
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Quickly record grades by pasting course list.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Paste Course Grades (e.g. <span className="font-mono text-blue-600">SWE-111: A+</span>):
              </label>
              <textarea
                rows={5}
                value={pastedResults}
                onChange={(e) => handleParseTextResults(e.target.value)}
                placeholder={`SWE-111: A+\nSWE-121: A\nSWE-122: A+\nSWE-223: A-`}
                className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {Object.keys(parsedPreview).length > 0 && (
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 text-xs">
                <span className="font-bold text-blue-700 dark:text-blue-300 block mb-1">
                  Detected {Object.keys(parsedPreview).length} Grades:
                </span>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(parsedPreview).map(([c, g]) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 bg-white dark:bg-slate-800 rounded font-mono text-[11px] border border-blue-200 dark:border-blue-800"
                    >
                      {c}: <strong className="text-blue-600 dark:text-blue-400">{g}</strong>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || Object.keys(parsedPreview).length === 0}
                onClick={handleSavePastedResults}
                className="px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
              >
                {isSaving ? 'Saving...' : 'Save Results to My CGPA'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* POPUP 2: Add Personalized Course Modal (Centered, Portal) */}
      {/* ========================================================= */}
      {isAddCourseModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={() => setIsAddCourseModalOpen(false)}
        >
          <div
            className="relative my-auto w-full max-w-md bg-white dark:bg-[#0F172A] rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-2xl p-5 space-y-3.5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2348] dark:text-white">
                Add Course to My Curriculum
              </h3>
              <button
                onClick={() => setIsAddCourseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SWE-223"
                    value={courseForm.code}
                    onChange={e => setCourseForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Short Name (Mobile) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OOP"
                    value={courseForm.shortName}
                    onChange={e => setCourseForm(p => ({ ...p, shortName: e.target.value.toUpperCase() }))}
                    className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Object Oriented Programming"
                  value={courseForm.title}
                  onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Semester
                  </label>
                  <select
                    value={courseForm.semester}
                    onChange={e => setCourseForm(p => ({ ...p, semester: Number(e.target.value) }))}
                    className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Credits
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="6"
                    value={courseForm.credits}
                    onChange={e => setCourseForm(p => ({ ...p, credits: Number(e.target.value) }))}
                    className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Type
                  </label>
                  <select
                    value={courseForm.type}
                    onChange={e => setCourseForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="THEORY">Theory</option>
                    <option value="LAB">Lab</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Grade (Optional)
                </label>
                <select
                  value={courseForm.grade}
                  onChange={e => setCourseForm(p => ({ ...p, grade: e.target.value }))}
                  className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500"
                >
                  {MU_GRADE_OPTIONS.map(opt => (
                    <option key={opt.grade} value={opt.grade}>
                      {opt.grade === 'N/A' ? 'Not Published / Pending' : `${opt.grade} (${opt.gradePoint.toFixed(2)})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCourseModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  {isSaving ? 'Saving...' : 'Add Course'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* POPUP 3: Single Course Grade Editor (Centered, Portal)     */}
      {/* ========================================================= */}
      {singleEditingCourse && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={() => setSingleEditingCourse(null)}
        >
          <div
            className="relative my-auto w-full max-w-sm bg-white dark:bg-[#0F172A] rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-2xl p-4 sm:p-5 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-[#0B2348] dark:text-white font-mono">
                  {singleEditingCourse.code} · {singleEditingCourse.shortName}
                </h4>
                <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                  {singleEditingCourse.title}
                </p>
              </div>
              <button
                onClick={() => setSingleEditingCourse(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Grade
              </label>
              <select
                defaultValue={singleEditingCourse.isPublished ? singleEditingCourse.grade : 'N/A'}
                id="single-grade-select"
                className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              >
                {MU_GRADE_OPTIONS.map(opt => (
                  <option key={opt.grade} value={opt.grade}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => {
                  handleRemoveCourse(singleEditingCourse.code);
                  setSingleEditingCourse(null);
                }}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                Remove Course
              </button>

              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setSingleEditingCourse(null)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    const selectEl = document.getElementById('single-grade-select') as HTMLSelectElement;
                    if (selectEl) {
                      handleSaveSingleGrade(singleEditingCourse.code, selectEl.value);
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-1 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* POPUP 4: Bulk Grade Editor (Centered, Portal)              */}
      {/* ========================================================= */}
      {isBulkEditModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
          onClick={() => setIsBulkEditModalOpen(false)}
        >
          <div
            className="relative my-auto w-full max-w-xl bg-white dark:bg-[#0F172A] rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-2xl p-4 sm:p-5 space-y-3 max-h-[88vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B2348] dark:text-white">
                  Quick Grade Entry
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select grades for curriculum courses.
                </p>
              </div>
              <button
                onClick={() => setIsBulkEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Semester Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 shrink-0">
              <button
                onClick={() => setEditSemesterFilter('ALL')}
                className={`px-2 py-0.5 text-xs font-semibold rounded-md ${
                  editSemesterFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                All
              </button>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setEditSemesterFilter(s)}
                  className={`px-2 py-0.5 text-xs font-semibold rounded-md ${
                    editSemesterFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Sem {s}
                </button>
              ))}
            </div>

            {/* Course List Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-slate-800 pr-1 space-y-1">
              {courses
                .filter(c => editSemesterFilter === 'ALL' || c.semester === editSemesterFilter)
                .map((course) => {
                  const currentVal = editingGrades[course.code] || (course.isPublished ? course.grade : 'N/A');

                  return (
                    <div
                      key={course.code}
                      className="py-1.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{course.code}</span>
                          <span className="text-[10px] text-slate-400 font-sans font-normal">
                            Sem {course.semester} · {course.credits} Cr
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {course.shortName} · {course.title}
                        </p>
                      </div>

                      <div className="shrink-0 w-32">
                        <select
                          value={currentVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditingGrades(prev => ({
                              ...prev,
                              [course.code]: val,
                            }));
                          }}
                          className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                        >
                          {MU_GRADE_OPTIONS.map(opt => (
                            <option key={opt.grade} value={opt.grade}>
                              {opt.grade === 'N/A' ? 'Not Published' : `${opt.grade} (${opt.gradePoint.toFixed(2)})`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsBulkEditModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveBulkGrades}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Grades</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* POPUP 5: Interactive Academic Transcript Modal & Print Viewer */}
      {/* ========================================================= */}
      {isTranscriptModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto no-print-backdrop print:hidden"
          onClick={() => setIsTranscriptModalOpen(false)}
        >
          <div
            className="relative my-auto w-full max-w-4xl bg-white text-black rounded-2xl shadow-2xl border border-slate-300 p-4 sm:p-7 space-y-4 max-h-[92vh] overflow-y-auto font-sans"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Control Header (Hidden when printing) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 no-print">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Official Academic Transcript Viewer</h3>
                  <p className="text-[11px] text-slate-500">Official student academic record ready for print or saving as PDF</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteBrowserPrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTranscriptModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Transcript Document Body */}
            <div className="bg-white p-2 sm:p-4 text-black font-sans leading-tight">
              {/* University Official Letterhead */}
              <div className="border-b-2 border-black pb-4 text-center">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#0B2348] uppercase">
                  METROPOLITAN UNIVERSITY, SYLHET
                </h1>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-0.5">
                  DEPARTMENT OF SOFTWARE ENGINEERING
                </p>
                <p className="text-[11px] font-semibold text-slate-600">
                  OFFICIAL GRADE REPORT & ACADEMIC RECORD
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Academic Session: {summary?.sessionName || 'Autumn 2026'}
                </p>
              </div>

              {/* Student Information Grid */}
              <div className="my-4 p-3 border border-slate-300 rounded-lg text-xs grid grid-cols-2 gap-y-1.5 gap-x-4 bg-slate-50/70">
                <div>
                  <span className="font-semibold text-slate-600">Student Name: </span>
                  <strong className="text-slate-900">{user?.name}</strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Student ID / Roll: </span>
                  <strong className="text-slate-900 font-mono">{user?.studentId}</strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Academic Batch: </span>
                  <strong className="text-slate-900">{user?.batchName || 'SWE 9th Batch'}</strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Current Semester: </span>
                  <strong className="text-slate-900">Semester {effectiveSemester}</strong>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Degree Program: </span>
                  <span className="text-slate-900">B.Sc. in Software Engineering</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-600">Academic Standing: </span>
                  <strong className="text-slate-900">{summary?.academicStanding || 'Regular'}</strong>
                </div>
              </div>

              {/* Printable Course Tables by Semester */}
              <div className="space-y-4">
                {printableSemesters.map((sem) => (
                  <div key={sem.semester} className="break-inside-avoid">
                    <div className="flex items-center justify-between border-b border-black pb-1 mb-1">
                      <span className="font-bold text-xs uppercase text-[#0B2348]">
                        {sem.semesterName}
                      </span>
                      <span className="text-xs font-bold">
                        SGPA: {sem.sgpa !== null ? sem.sgpa.toFixed(2) : 'N/A'} · ({sem.totalCredits} Cr)
                      </span>
                    </div>

                    <table className="w-full text-left text-[11px] border-collapse mb-2">
                      <thead>
                        <tr className="border-b border-slate-300 bg-slate-100/80 font-bold">
                          <th className="py-1 px-2 w-28">Course Code</th>
                          <th className="py-1 px-2">Course Title</th>
                          <th className="py-1 px-2 text-center w-16">Credit</th>
                          <th className="py-1 px-2 text-center w-16">Grade</th>
                          <th className="py-1 px-2 text-center w-20">Grade Point</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {sem.courses.map((c) => (
                          <tr key={c.code}>
                            <td className="py-1 px-2 font-mono font-bold">{c.code}</td>
                            <td className="py-1 px-2">{c.title}</td>
                            <td className="py-1 px-2 text-center">{c.credits.toFixed(1)}</td>
                            <td className="py-1 px-2 text-center font-bold">
                              {c.isPublished ? c.grade : 'Not Published'}
                            </td>
                            <td className="py-1 px-2 text-center font-mono">
                              {c.isPublished && c.gradePoint !== null ? c.gradePoint.toFixed(2) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>

              {/* Printable Cumulative Summary Box */}
              <div className="mt-5 p-3 border-2 border-black rounded-lg text-xs flex items-center justify-between bg-slate-50 break-inside-avoid">
                <div>
                  <span className="block font-semibold text-slate-600">Total Completed Credits:</span>
                  <span className="text-base font-bold text-slate-900">
                    {summary ? summary.totalCompletedCredits.toFixed(1) : '0.0'} / {summary?.totalDegreeCredits || 148} Cr
                  </span>
                </div>
                <div>
                  <span className="block font-semibold text-slate-600">Graded Courses:</span>
                  <span className="text-base font-bold text-slate-900">
                    {summary ? summary.gradedCourseCount : 0} Courses
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-semibold text-slate-600">Cumulative GPA (CGPA):</span>
                  <span className="text-lg font-bold text-[#0B2348]">
                    {summary && summary.totalGradedCredits > 0 ? summary.cgpa.toFixed(2) : '0.00'} / 4.00
                  </span>
                </div>
              </div>

              {/* Verification Signatures & Stamp */}
              <div className="mt-12 pt-4 flex items-end justify-between text-xs break-inside-avoid">
                <div className="text-center w-48">
                  <div className="border-t border-black pt-1 font-semibold text-slate-800">
                    Prepared & Verified By
                  </div>
                  <div className="text-[10px] text-slate-500">Academic Records Section</div>
                </div>

                <div className="text-center w-48">
                  <div className="border-t border-black pt-1 font-semibold text-slate-800">
                    Controller of Examinations
                  </div>
                  <div className="text-[10px] text-slate-500">Metropolitan University, Sylhet</div>
                </div>
              </div>

              {/* Footer Generator Stamp */}
              <div className="mt-8 pt-2 border-t border-slate-300 flex items-center justify-between text-[10px] text-slate-500 break-inside-avoid">
                <span>Generated by MU SWE Student Portal</span>
                <span>Printed on: {new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
