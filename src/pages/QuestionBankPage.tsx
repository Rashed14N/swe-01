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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Resource } from '../types';
import { QuestionPaperCard } from '../components/common/QuestionPaperCard';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';
import { UploadQuestionModal } from '../components/resources/UploadQuestionModal';

export const QuestionBankPage: React.FC = () => {
  const { token, currentUser, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Resource[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [examType, setExamType] = useState<string>(searchParams.get('examType') || '');
  const [year, setYear] = useState<string>(searchParams.get('year') || '');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  // Fetch base resource list from backend API
  const fetchQuestions = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ type: 'QUESTION' });
    if (examType) params.append('examType', examType);
    if (year) params.append('year', year);

    fetch(`/api/resources?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const list: Resource[] = data.resources || [];
        setQuestions(list);
      })
      .catch(console.error)
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

  // -------------------------------------------------------------
  // INTELLIGENT SEARCH & STUDENT SEMESTER FIRST ALGORITHM
  // -------------------------------------------------------------
  const processedQuestions = useMemo(() => {
    const result = [...questions];
    const userSem = currentUser?.currentSemester;
    const query = search.toLowerCase().trim();

    if (!query) {
      // DEFAULT SORTING ALGORITHM:
      // 1. If student has a semester, and questions of that semester exist, put those FIRST
      // 2. Otherwise/afterwards sort by academic year & creation date
      return result.sort((a, b) => {
        if (userSem) {
          const aMatch = a.semester === userSem ? 1 : 0;
          const bMatch = b.semester === userSem ? 1 : 0;
          if (aMatch !== bMatch) {
            return bMatch - aMatch; // Current semester items first
          }
        }
        // Then by academic year descending
        const yearDiff = (b.academicYear || 0) - (a.academicYear || 0);
        if (yearDiff !== 0) return yearDiff;
        // Then by creation timestamp
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    }

    // SEARCH RANKING ALGORITHM:
    // Split search query into normalized keyword tokens (e.g., "swe 311 quiz")
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
        // Specific Exam Types match tokens
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

      // Boost if every single word in query matches somewhere
      if (allTokensMatch) {
        score += 40;
      }

      // 5. Personalization Bonus: Current Semester Relevance Boost during search
      if (userSem && q.semester === userSem) {
        score += 30;
      }

      // 6. Recency Boost
      if (q.academicYear) {
        score += Math.max(0, (q.academicYear - 2020) * 2);
      }

      // Only include items with non-zero search relevance
      if (score > 0) {
        scored.push({ resource: q, score });
      }
    }

    // Sort by computed relevance score descending
    scored.sort((a, b) => b.score - a.score);
    return scored.map((item) => item.resource);
  }, [questions, search, currentUser]);

  const handleDownload = (resourceId: string) => {
    fetch(`/api/resources/${resourceId}/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
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
        }}
        isFiltered={Boolean(search || examType || year)}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold text-[#64748B] dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
          <span>Showing</span>
          <span className="text-[#0A2147] dark:text-white font-bold">{processedQuestions.length}</span>
          <span>question papers</span>
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
              : 'Try selecting a different filter or search term to browse available question papers.'}
          </p>
          {(search || examType || year) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setExamType('');
                setYear('');
              }}
              className="px-4 py-2 bg-[#EFF5FF] text-[#2563EB] hover:bg-[#DBEAFE] text-xs font-bold rounded-lg border border-[#DBEAFE] transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Clear all filters</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Responsive 3-Column Question Paper Card Grid with Clean In-Card Accordion */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {processedQuestions.map((q) => {
            const isMatch = Boolean(userSemesterNumber && q.semester === userSemesterNumber);
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
                isExpanded={expandedCardId === q.id}
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
                  <th className="px-4 py-3.5 w-28">COURSE</th>
                  <th className="px-4 py-3.5 w-32">FACULTY</th>
                  <th className="px-4 py-3.5 w-28">BATCH</th>
                  <th className="px-4 py-3.5 w-28">SEMESTER</th>
                  <th className="px-4 py-3.5">UPLOADED BY</th>
                  <th className="px-4 py-3.5 text-right w-24">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EBF3] dark:divide-slate-800 text-xs">
                {processedQuestions.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 transition-colors h-14"
                  >
                    <td className="px-4 py-3 font-bold text-[#0F172A] dark:text-white">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
                        <span className="line-clamp-1">{q.title}</span>
                        {userSemesterNumber && q.semester === userSemesterNumber && (
                          <span className="px-1.5 py-0.5 text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 rounded border border-emerald-200 font-bold shrink-0">
                            Your Sem
                          </span>
                        )}
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(q.id);
                          if (q.fileUrl) window.open(q.fileUrl, '_blank');
                        }}
                        className="p-2 text-[#2563EB] hover:bg-[#EFF5FF] dark:hover:bg-blue-950/50 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
