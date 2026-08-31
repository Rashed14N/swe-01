<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, Eye, CheckCircle2, FileText, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Resource } from '../types';
import { FilePreviewModal } from '../components/common/FilePreviewModal';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

export const QuestionBankPage: React.FC = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();

  const [questions, setQuestions] = useState<Resource[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [semester, setSemester] = useState<string>('');
  const [examType, setExamType] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [previewModalResource, setPreviewModalResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ type: 'QUESTION' });
    if (search) params.append('search', search);
    if (semester) params.append('semester', semester);
=======
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
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    if (examType) params.append('examType', examType);
    if (year) params.append('year', year);

    fetch(`/api/resources?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
<<<<<<< HEAD
        const list = data.resources || [];
        setQuestions(list);
        if (list.length > 0 && !selectedResource) {
          setSelectedResource(list[0]);
        }
=======
        const list: Resource[] = data.resources || [];
        setQuestions(list);
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
<<<<<<< HEAD
  }, [search, semester, examType, year]);
=======
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
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

  const handleDownload = (resourceId: string) => {
    fetch(`/api/resources/${resourceId}/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

<<<<<<< HEAD
=======
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

>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Question Paper Repository"
<<<<<<< HEAD
        description="Searchable document library of verified midterm, final, and quiz question papers."
        breadcrumb="VERIFIED QUESTION BANK"
=======
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
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
<<<<<<< HEAD
        searchPlaceholder="Search question title, course code, topic..."
        filters={[
          {
            id: 'semester',
            label: 'All Semesters',
            value: semester,
            onChange: setSemester,
            options: [1, 2, 3, 4, 5, 6, 7, 8].map((s) => ({
              label: `Semester ${s}`,
              value: String(s),
            })),
          },
          {
            id: 'examType',
            label: 'All Exam Types',
            value: examType,
            onChange: setExamType,
            options: [
              { label: 'Final Exam', value: 'FINAL' },
              { label: 'Midterm Exam', value: 'MIDTERM' },
              { label: 'Quiz / Test', value: 'QUIZ' },
              { label: 'Lab Practical', value: 'LAB_EXAM' },
=======
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
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
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
<<<<<<< HEAD
          setSemester('');
          setExamType('');
          setYear('');
        }}
        isFiltered={Boolean(search || semester || examType || year)}
      />

      {/* Document Library Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Table / List View (3/5 cols when item selected on desktop, else full width) */}
        <div className={`${selectedResource ? 'lg:col-span-3' : 'lg:col-span-5'} space-y-4`}>
          <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] overflow-hidden">
            {/* Mobile Cards (block md:hidden) */}
            <div className="block md:hidden divide-y divide-[#E5EBF3] dark:divide-slate-800 p-3 space-y-3">
              {isLoading ? (
                <div className="py-8 text-center text-slate-400 text-xs">Searching question library...</div>
              ) : questions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No question papers match your filters.</div>
              ) : (
                questions.map((q) => {
                  const isSelected = selectedResource?.id === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedResource(q)}
                      className={`pt-3 first:pt-0 space-y-2 cursor-pointer p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-[#EFF5FF] dark:bg-blue-950/30 border-[#2563EB] shadow-xs'
                          : 'bg-white dark:bg-[#0F172A] border-[#D8E2EE] dark:border-slate-800 hover:border-[#A3C0EE]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#2563EB] font-mono text-[10px] font-extrabold rounded border border-[#DBEAFE]">
                          {q.courseCode}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {q.targetBatch || q.uploaderBatchName || 'SWE 9th Batch'} • {q.academicYear}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-[#0F172A] dark:text-white">{q.title}</h4>
                          <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">by {q.uploaderName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#E5EBF3] dark:border-slate-800">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </span>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setPreviewModalResource(q)}
                            className="px-2 py-1 bg-[#F1F5FA] hover:bg-[#E2EDFE] text-[#1E293B] text-xs font-semibold rounded border border-[#DCE5F0] flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Preview
                          </button>
                          <button
                            onClick={() => {
                              handleDownload(q.id);
                              window.open(q.fileUrl, '_blank');
                            }}
                            className="px-2 py-1 bg-[#2563EB] text-white text-xs font-bold rounded flex items-center gap-1 shadow-2xs"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (hidden md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F2F6FB] dark:bg-[#121D30] border-b border-[#DCE6F2] dark:border-slate-800 text-[11px] font-extrabold text-[#0A2147] dark:text-white uppercase tracking-wider">
                    <th className="px-4 py-3.5">TITLE</th>
                    <th className="px-4 py-3.5 w-28">COURSE</th>
                    <th className="px-4 py-3.5 w-24">FACULTY</th>
                    <th className="px-4 py-3.5 w-28">BATCH</th>
                    <th className="px-4 py-3.5">UPLOADED BY</th>
                    <th className="px-4 py-3.5 w-24">STATUS</th>
                    <th className="px-4 py-3.5 text-right w-24">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5EBF3] dark:divide-slate-800 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        Searching question library...
                      </td>
                    </tr>
                  ) : questions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        No question papers match your filters.
                      </td>
                    </tr>
                  ) : (
                    questions.map((q) => {
                      const isSelected = selectedResource?.id === q.id;
                      return (
                        <tr
                          key={q.id}
                          onClick={() => setSelectedResource(q)}
                          className={`cursor-pointer transition-colors h-14 ${
                            isSelected
                              ? 'bg-[#EFF5FF] dark:bg-blue-950/30 border-l-4 border-l-[#2563EB] font-semibold'
                              : 'bg-white dark:bg-[#0F172A] hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-[#0F172A] dark:text-white">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
                              <span className="line-clamp-1">{q.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#2563EB] font-mono text-[10px] font-bold rounded border border-[#DBEAFE]">
                              {q.courseCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#475569] dark:text-slate-300 truncate max-w-[110px]">
                            {q.facultyName || 'Dr. Tanvir Rahman'}
                          </td>
                          <td className="px-4 py-3 font-medium text-[#475569] dark:text-slate-300">
                            {q.targetBatch || q.uploaderBatchName || 'SWE 9th Batch'}
                          </td>
                          <td className="px-4 py-3 text-[#64748B] dark:text-slate-400 truncate max-w-[120px]">
                            {q.uploaderName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setPreviewModalResource(q)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Full Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  handleDownload(q.id);
                                  window.open(q.fileUrl, '_blank');
                                }}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Detail Panel (2/5 cols) */}
        {selectedResource && (
          <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] p-5 sticky top-20 space-y-4">
            <div className="flex items-start justify-between border-b border-[#E5EBF3] dark:border-slate-800 pb-3">
              <div>
                <span className="px-2.5 py-0.5 bg-[#EFF5FF] text-[#2563EB] font-bold text-[10px] uppercase rounded-full border border-[#DBEAFE]">
                  {selectedResource.examType || 'EXAM PAPER'}
                </span>
                <h3 className="text-base font-extrabold text-[#0F172A] dark:text-white mt-1.5 leading-snug">
                  {selectedResource.title}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  by <span className="text-[#0F172A] dark:text-slate-200 font-bold">{selectedResource.uploaderName}</span> ({selectedResource.uploaderBatchName || 'SWE 9th Batch'})
                </p>
              </div>
              <button
                onClick={() => setSelectedResource(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Question Paper Details Specification Cards */}
            <div className="space-y-2 text-xs">
              <div className="bg-[#F8FAFD] dark:bg-slate-800/60 p-3 rounded-lg border border-[#DCE5F0] dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Course Code</span>
                  <span className="font-bold text-[#2563EB] bg-[#EFF5FF] px-2 py-0.5 rounded border border-[#DBEAFE] font-mono">
                    {selectedResource.courseCode}
                  </span>
                </div>
                <div className="text-[#0F172A] dark:text-slate-200 font-semibold text-xs border-t border-[#E5EBF3] dark:border-slate-700/60 pt-1.5">
                  {selectedResource.courseTitle}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F8FAFD] dark:bg-slate-800/60 p-3 rounded-lg border border-[#DCE5F0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Batch</span>
                  <span className="font-bold text-[#0F172A] dark:text-slate-200">
                    {selectedResource.targetBatch || selectedResource.uploaderBatchName || 'SWE 9th Batch'}
                  </span>
                </div>

                <div className="bg-[#F8FAFD] dark:bg-slate-800/60 p-3 rounded-lg border border-[#DCE5F0] dark:border-slate-700">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Semester & Year</span>
                  <span className="font-bold text-[#0F172A] dark:text-slate-200">
                    {selectedResource.semester}th Sem ({selectedResource.academicYear})
                  </span>
                </div>
              </div>

              <div className="bg-[#F8FAFD] dark:bg-slate-800/60 p-3 rounded-lg border border-[#DCE5F0] dark:border-slate-700">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Faculty</span>
                <span className="font-bold text-[#0F172A] dark:text-slate-200 text-xs flex items-center gap-1.5">
                  👨‍🏫 {selectedResource.facultyName || 'Dr. Tanvir Rahman'}
                </span>
              </div>
            </div>

            {selectedResource.description && (
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed bg-[#F8FAFD] dark:bg-slate-800/60 p-3 rounded-lg border border-[#DCE5F0] dark:border-slate-700">
                {selectedResource.description}
              </p>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setPreviewModalResource(selectedResource)}
                className="flex-1 py-2.5 bg-[#F1F5FA] hover:bg-[#E2EDFE] text-[#1E293B] text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-[#DCE5F0]"
              >
                <Eye className="w-4 h-4" /> Preview File
              </button>
              <button
                onClick={() => {
                  handleDownload(selectedResource.id);
                  window.open(selectedResource.fileUrl, '_blank');
                }}
                className="flex-1 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        )}
      </div>

      <FilePreviewModal
        isOpen={Boolean(previewModalResource)}
        onClose={() => setPreviewModalResource(null)}
        resource={previewModalResource}
        onDownload={handleDownload}
      />
=======
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
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    </div>
  );
};
