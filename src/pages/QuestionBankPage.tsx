import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  LayoutGrid,
  List,
  Download,
  Search,
  Upload,
  ShieldCheck,
  Trash2,
  BookOpen,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Resource, Course } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { QuestionPaperCard } from '../components/common/QuestionPaperCard';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';
import { UploadQuestionModal } from '../components/resources/UploadQuestionModal';
import { getInstantDownloadUrl } from '../lib/driveUtils';

export const QuestionBankPage: React.FC = () => {
  const { token, currentUser, user } = useAuth();
  const { addToast } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Resource[]>([]);
  const [myCourses, setMyCourses] = useState<Course[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [examType, setExamType] = useState<string>(searchParams.get('examType') || '');
  const [year, setYear] = useState<string>(searchParams.get('year') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  // Fetch enrolled courses & retakes for the student
  useEffect(() => {
    if (!token) return;
    fetch('/api/courses', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => safeParseJson(res))
      .then((data) => {
        setMyCourses(data.courses || []);
      })
      .catch((err) => {
        console.warn('Could not fetch student enrolled courses:', err);
      });
  }, [token, user]);

  // Fetch base resource list from backend API
  const fetchQuestions = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ type: 'QUESTION' });
    if (examType) params.append('examType', examType);
    if (year) params.append('year', year);

    fetch(`/api/resources?${params.toString()}`)
      .then((res) => safeParseJson(res))
      .then((data) => {
        const list: Resource[] = data.resources || [];
        setQuestions(list);
      })
      .catch((err) => {
        console.warn('Could not fetch questions:', err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, [examType, year]);

  // Sync state with URL params
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (search) nextParams.set('search', search);
    if (examType) nextParams.set('examType', examType);
    if (year) nextParams.set('year', year);
    setSearchParams(nextParams, { replace: true });
  }, [search, examType, year, setSearchParams]);

  // Normalization helper for accurate matching
  const normalize = (val?: string) => (val || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  const isCourseMatch = (course: Course, q: Resource) => {
    const cCode = normalize(course.code);
    const cShort = normalize(course.shortName);
    const qCode = normalize(q.courseCode);
    const qTitle = normalize(q.courseTitle || q.title);

    if (q.courseId && q.courseId === course.id) return true;
    if (qCode && cCode && (qCode === cCode || qCode.includes(cCode) || cCode.includes(qCode))) return true;
    if (qCode && cShort && qCode === cShort) return true;
    if (cCode && qTitle && qTitle.includes(cCode)) return true;
    return false;
  };

  // Count question papers per enrolled / retake course
  const coursePaperCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of myCourses) {
      const count = questions.filter((q) => isCourseMatch(c, q)).length;
      map.set(c.id, count);
    }
    return map;
  }, [myCourses, questions]);

  // -------------------------------------------------------------
  // INTELLIGENT FILTERING & PRIORITIZATION ALGORITHM
  // -------------------------------------------------------------
  const processedQuestions = useMemo(() => {
    let result = [...questions];
    const userSem = currentUser?.currentSemester;
    const query = search.toLowerCase().trim();

    // Filter by selected course if a chip in the enrolled courses bar was clicked
    if (selectedCourseFilter) {
      const targetCourse = myCourses.find((c) => c.id === selectedCourseFilter);
      if (targetCourse) {
        result = result.filter((q) => isCourseMatch(targetCourse, q));
      }
    }

    if (!query) {
      // DEFAULT SORTING ALGORITHM:
      // Priority 1: Retake & Enrolled courses of the student are placed FIRST!
      // Priority 2: Student current semester matches
      // Priority 3: Academic year descending & creation timestamp
      return result.sort((a, b) => {
        const aIsRetake = myCourses.some((c) => c.isRetakeCourse && isCourseMatch(c, a)) ? 1 : 0;
        const bIsRetake = myCourses.some((c) => c.isRetakeCourse && isCourseMatch(c, b)) ? 1 : 0;
        if (aIsRetake !== bIsRetake) return bIsRetake - aIsRetake;

        const aIsEnrolled = myCourses.some((c) => !c.isRetakeCourse && isCourseMatch(c, a)) ? 1 : 0;
        const bIsEnrolled = myCourses.some((c) => !c.isRetakeCourse && isCourseMatch(c, b)) ? 1 : 0;
        if (aIsEnrolled !== bIsEnrolled) return bIsEnrolled - aIsEnrolled;

        if (userSem) {
          const aMatch = a.semester === userSem ? 1 : 0;
          const bMatch = b.semester === userSem ? 1 : 0;
          if (aMatch !== bMatch) {
            return bMatch - aMatch;
          }
        }
        // Then by academic year descending
        const yearDiff = (b.academicYear || 0) - (a.academicYear || 0);
        if (yearDiff !== 0) return yearDiff;
        // Then by creation timestamp
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    }

    // SEARCH RANKING ALGORITHM with Enrolled & Retake course boost
    const searchTokens = query.split(/\s+/).filter(Boolean);

    interface ScoredResource {
      resource: Resource;
      score: number;
    }

    const scored: ScoredResource[] = [];

    for (const q of result) {
      let score = 0;
      const titleLower = (q.title || '').toLowerCase();
      const courseTitleLower = (q.courseTitle || '').toLowerCase();
      const courseCodeLower = (q.courseCode || '').toLowerCase().replace(/\s+/g, '');
      const facultyLower = (q.facultyName || '').toLowerCase();
      const uploaderLower = (q.uploaderName || '').toLowerCase();
      const descLower = (q.description || '').toLowerCase();
      const examTypeLower = (q.examType || '').toLowerCase();
      const yearStr = String(q.academicYear || '');
      const semStr = `sem${q.semester} semester${q.semester} ${q.semester}`;

      const queryNormalized = query.replace(/\s+/g, '');

      // 1. Exact or partial course code matches
      if (courseCodeLower === queryNormalized) {
        score += 160;
      } else if (courseCodeLower.includes(queryNormalized)) {
        score += 90;
      }

      // 2. Full Title Match
      if (titleLower.includes(query)) {
        score += 100;
      }

      // 3. Course Title Match
      if (courseTitleLower.includes(query)) {
        score += 70;
      }

      // 4. Token-by-Token Match
      let allTokensMatch = true;
      for (const token of searchTokens) {
        const tokenNorm = token.replace(/\s+/g, '');
        let tokenFound = false;

        if (titleLower.includes(token)) {
          score += 30;
          tokenFound = true;
        }
        if (courseCodeLower.includes(tokenNorm)) {
          score += 40;
          tokenFound = true;
        }
        if (courseTitleLower.includes(token)) {
          score += 25;
          tokenFound = true;
        }
        if (facultyLower.includes(token)) {
          score += 20;
          tokenFound = true;
        }
        if (uploaderLower.includes(token)) {
          score += 15;
          tokenFound = true;
        }
        if (descLower.includes(token)) {
          score += 10;
          tokenFound = true;
        }
        if (
          examTypeLower.includes(token) ||
          (token === 'quiz' && q.examType === 'QUIZ') ||
          (token === 'final' && q.examType === 'FINAL') ||
          (token === 'supple' && (q.examType === 'SUPPLE' || titleLower.includes('supple'))) ||
          (token === 'ct' && (q.examType === 'CLASS_TEST' || titleLower.includes('ct'))) ||
          (token === 'test' && q.examType === 'CLASS_TEST')
        ) {
          score += 35;
          tokenFound = true;
        }
        if (yearStr === token) {
          score += 20;
          tokenFound = true;
        }
        if (semStr.includes(token)) {
          score += 25;
          tokenFound = true;
        }

        if (!tokenFound) {
          allTokensMatch = false;
        }
      }

      if (allTokensMatch) {
        score += 40;
      }

      // Priority boost for student's enrolled courses and retakes
      const isRetake = myCourses.some((c) => c.isRetakeCourse && isCourseMatch(c, q));
      const isEnrolled = myCourses.some((c) => !c.isRetakeCourse && isCourseMatch(c, q));
      if (isRetake) score += 60;
      if (isEnrolled) score += 50;

      if (userSem && q.semester === userSem) {
        score += 30;
      }

      if (q.academicYear) {
        score += Math.max(0, (q.academicYear - 2020) * 2);
      }

      if (score > 0) {
        scored.push({ resource: q, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((item) => item.resource);
  }, [questions, search, currentUser, myCourses, selectedCourseFilter]);

  const handleDownload = (resourceId: string) => {
    fetch(`/api/resources/${resourceId}/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

  const handleDeleteQuestion = async (q: Resource) => {
    if (!window.confirm(`Are you sure you want to delete "${q.title}"? It will be deleted permanently from the Supabase database.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/resources/${q.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete question');
      }
      addToast('success', 'Question deleted permanently from Supabase database!');
      setQuestions((prev) => prev.filter((item) => item.id !== q.id));
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete question');
    }
  };

  const getExamTypeLabel = (q: Resource) => {
    if (q.examType === 'QUIZ') return 'QUIZ QUESTION';
    if (q.examType === 'FINAL') return 'FINAL EXAM QUESTION';
    if (q.examType === 'SUPPLE' || q.title.toLowerCase().includes('supple')) return 'SUPPLE EXAM QUESTION';
    if (q.examType === 'CLASS_TEST' || q.title.toLowerCase().includes('ct')) return 'CT QUESTION';
    if (q.examType === 'MIDTERM') return 'MIDTERM QUESTION';
    if (q.examType === 'LAB_EXAM') return 'LAB EXAM QUESTION';
    return 'EXAM QUESTION';
  };

  const userSemesterNumber = currentUser?.currentSemester;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Question Paper Repository"
        description="Searchable document library of official quiz, final exam, supple exam, and class test question papers."
        breadcrumb="QUESTION BANK"
        primaryAction={{
          label: isAdmin ? 'Add Question Paper' : 'Upload Question',
          icon: Upload,
          onClick: () => setIsUploadModalOpen(true),
        }}
      >
        {isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/admin/verification')}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verification Queue</span>
          </button>
        )}
      </PageHeader>

      <UploadQuestionModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => fetchQuestions()}
      />

      {/* TOP SECTION: Enrolled & Retake Courses Filter Bar */}
      {myCourses.length > 0 && (
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-[#D8E2EE] dark:border-slate-800 p-4 sm:p-5 shadow-[0_1px_3px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.06)] space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  My Enrolled & Retake Courses
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {myCourses.length} Courses
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quick filter: click any enrolled or retake course to filter questions, or view all department questions by default.
              </p>
            </div>

            {selectedCourseFilter && (
              <button
                type="button"
                onClick={() => setSelectedCourseFilter(null)}
                className="self-start sm:self-center px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Clear course filter</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Courses Horizontal Scroll / Flex Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedCourseFilter(null)}
              className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                selectedCourseFilter === null
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Questions</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCourseFilter === null
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {questions.length}
              </span>
            </button>

            {myCourses.map((course) => {
              const count = coursePaperCounts.get(course.id) || 0;
              const isSelected = selectedCourseFilter === course.id;

              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourseFilter(isSelected ? null : course.id)}
                  className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer border text-left ${
                    isSelected
                      ? course.isRetakeCourse
                        ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                        : 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-950 dark:text-blue-200 ring-2 ring-blue-600/20'
                      : course.isRetakeCourse
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-slate-700 dark:text-slate-300 hover:border-amber-300'
                      : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[11px] text-blue-600 dark:text-blue-400">
                        {course.code}
                      </span>
                      {course.isRetakeCourse ? (
                        <span className="px-1.5 py-0.2 bg-amber-500 text-white font-extrabold text-[9px] rounded-full uppercase">
                          {course.retakeType || 'RETAKE'}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[9px] rounded">
                          Sem {course.semester || currentUser?.currentSemester}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 line-clamp-1 max-w-[150px]">
                      {course.title}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    count > 0
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {count} {count === 1 ? 'paper' : 'papers'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search question title, course code (e.g. SWE 311), topic, faculty..."
        filters={[
          {
            id: 'examType',
            label: 'All Question Types',
            value: examType,
            onChange: setExamType,
            options: [
              { label: 'Quiz Question', value: 'QUIZ' },
              { label: 'Final Exam Question', value: 'FINAL' },
              { label: 'Supple Exam Question', value: 'SUPPLE' },
              { label: 'CT Question', value: 'CLASS_TEST' },
              { label: 'Midterm Question', value: 'MIDTERM' },
            ],
          },
          {
            id: 'year',
            label: 'All Years',
            value: year,
            onChange: setYear,
            options: [2026, 2025, 2024, 2023, 2022].map((y) => ({
              label: `Year ${y}`,
              value: String(y),
            })),
          },
        ]}
        onReset={() => {
          setSearch('');
          setExamType('');
          setYear('');
          setSelectedCourseFilter(null);
        }}
        isFiltered={Boolean(search || examType || year || selectedCourseFilter)}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
          <span>Showing</span>
          <span className="text-[#0A2147] dark:text-white font-bold">{processedQuestions.length}</span>
          <span>question papers</span>
          {selectedCourseFilter && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <span>Filtered: {myCourses.find((c) => c.id === selectedCourseFilter)?.code}</span>
              <button
                type="button"
                onClick={() => setSelectedCourseFilter(null)}
                className="hover:text-amber-950 dark:hover:text-amber-100 cursor-pointer ml-0.5"
                title="Clear filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {search && (
            <span className="text-[#64748B] italic">
              • ranked by search relevance for &ldquo;{search}&rdquo;
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-[#0F172A] p-1 rounded-lg border border-[#D8E2EE] dark:border-slate-800 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            aria-label="Table view"
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewMode === 'table'
                ? 'bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-400 font-bold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Loading & Empty States */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-[#64748B] bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800">
          <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading question paper repository...
        </div>
      ) : processedQuestions.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 p-8 space-y-3">
          <FileText className="w-10 h-10 text-[#CBD8E8] dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">No question papers found</h3>
          <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-sm mx-auto">
            {search
              ? `No papers matched your search for "${search}". Try searching by course code (e.g. SWE 311), year, or keywords.`
              : selectedCourseFilter
              ? `No question papers found for ${myCourses.find((c) => c.id === selectedCourseFilter)?.code || 'this course'}. Click below to show all questions.`
              : 'Try selecting a different filter or search term to browse available question papers.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            {selectedCourseFilter && (
              <button
                type="button"
                onClick={() => setSelectedCourseFilter(null)}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Show All Questions</span>
              </button>
            )}
            {(search || examType || year || selectedCourseFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setExamType('');
                  setYear('');
                  setSelectedCourseFilter(null);
                }}
                className="px-4 py-2 bg-[#EFF5FF] text-[#2563EB] hover:bg-[#DBEAFE] text-xs font-bold rounded-lg border border-[#DBEAFE] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Clear all filters</span>
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Responsive 3-Column Question Paper Card Grid with Clean In-Card Accordion */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {processedQuestions.map((q) => {
            const isMatch = Boolean(userSemesterNumber && q.semester === userSemesterNumber);
            const retakeMatch = myCourses.find((c) => c.isRetakeCourse && isCourseMatch(c, q));
            const enrolledMatch = myCourses.find((c) => !c.isRetakeCourse && isCourseMatch(c, q));

            const retakeBadge = retakeMatch
              ? `${retakeMatch.retakeType || 'Retake'} • ${retakeMatch.retakeBatchName || 'Junior Batch'}`
              : undefined;

            const enrolledBadge = enrolledMatch && !retakeMatch
              ? 'Enrolled Course'
              : undefined;

            return (
              <QuestionPaperCard
                key={q.id}
                title={q.title}
                courseName={q.courseTitle || 'Software Engineering'}
                courseCode={q.courseCode}
                batch={q.targetBatch || q.uploaderBatchName || 'SWE 9th Batch'}
                semester={q.semester}
                academicYear={q.academicYear}
                faculty={q.facultyName || 'Department Faculty'}
                author={q.uploaderName || 'Student'}
                downloadLink={q.fileUrl || ''}
                typeBadge={getExamTypeLabel(q)}
                fileSize={q.fileSize}
                isCurrentSemesterMatch={isMatch}
                enrolledBadge={enrolledBadge}
                retakeBadge={retakeBadge}
                isExpanded={expandedCardId === q.id}
                canDelete={isAdmin || currentUser?.id === q.uploaderId}
                onDelete={() => handleDeleteQuestion(q)}
                onToggle={() => setExpandedCardId((prev) => (prev === q.id ? null : q.id))}
                onDownload={() => handleDownload(q.id)}
              />
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_3px_rgba(15,35,70,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F2F6FB] dark:bg-[#121D30] border-b border-[#DCE6F2] dark:border-slate-800 text-[11px] font-extrabold text-[#0A2147] dark:text-white uppercase tracking-wider">
                  <th className="px-4 py-3.5">PAPER TITLE</th>
                  <th className="px-4 py-3.5 w-32">COURSE</th>
                  <th className="px-4 py-3.5 w-32">FACULTY</th>
                  <th className="px-4 py-3.5 w-28">BATCH</th>
                  <th className="px-4 py-3.5 w-28">SEMESTER</th>
                  <th className="px-4 py-3.5">UPLOADED BY</th>
                  <th className="px-4 py-3.5 text-right w-24">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBF3] dark:divide-slate-800 text-xs">
                {processedQuestions.map((q) => {
                  const retakeMatch = myCourses.find((c) => c.isRetakeCourse && isCourseMatch(c, q));
                  const enrolledMatch = myCourses.find((c) => !c.isRetakeCourse && isCourseMatch(c, q));

                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 transition-colors h-14"
                    >
                      <td className="px-4 py-3 font-bold text-[#0F172A] dark:text-white">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
                          <span className="line-clamp-1">{q.title}</span>
                          {retakeMatch ? (
                            <span className="px-1.5 py-0.5 text-[9px] bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 rounded border border-amber-300 font-bold shrink-0">
                              {retakeMatch.retakeType || 'Retake'} • {retakeMatch.retakeBatchName || 'CR Synced'}
                            </span>
                          ) : enrolledMatch ? (
                            <span className="px-1.5 py-0.5 text-[9px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 rounded border border-blue-200 font-bold shrink-0">
                              Enrolled
                            </span>
                          ) : userSemesterNumber && q.semester === userSemesterNumber ? (
                            <span className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded border border-emerald-200 font-bold shrink-0">
                              Your Sem
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 font-mono text-[10px] font-bold rounded border border-[#DBEAFE] dark:border-blue-900/50">
                          {q.courseCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#475569] dark:text-slate-300 truncate max-w-[120px]">
                        {q.facultyName || 'Department Faculty'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#475569] dark:text-slate-300">
                        {q.targetBatch || q.uploaderBatchName || 'SWE 9th Batch'}
                      </td>
                      <td className="px-4 py-3 text-[#475569] dark:text-slate-300 font-medium">
                        {q.semester}th Sem ({q.academicYear})
                      </td>
                      <td className="px-4 py-3 text-[#64748B] dark:text-slate-400 truncate max-w-[120px]">
                        {q.uploaderName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(q.id);
                              if (q.fileUrl) {
                                window.open(getInstantDownloadUrl(q.fileUrl), '_blank', 'noopener,noreferrer');
                              }
                            }}
                            className="p-1.5 text-[#2563EB] hover:bg-[#EFF5FF] dark:hover:bg-blue-950/50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Instant Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        {(isAdmin || currentUser?.id === q.uploaderId) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteQuestion(q);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Delete Question (Supabase)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
