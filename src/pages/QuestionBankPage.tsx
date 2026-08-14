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
    if (examType) params.append('examType', examType);
    if (year) params.append('year', year);

    fetch(`/api/resources?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const list = data.resources || [];
        setQuestions(list);
        if (list.length > 0 && !selectedResource) {
          setSelectedResource(list[0]);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, [search, semester, examType, year]);

  const handleDownload = (resourceId: string) => {
    fetch(`/api/resources/${resourceId}/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Question Paper Repository"
        description="Searchable document library of verified midterm, final, and quiz question papers."
        breadcrumb="VERIFIED QUESTION BANK"
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
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
          <div className="bg-white rounded-xl border border-[#CBD8E8] shadow-md overflow-hidden">
            {/* Mobile Cards (block md:hidden) */}
            <div className="block md:hidden divide-y divide-[#EDF2F7] p-3 space-y-3">
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
                          ? 'bg-[#EFF6FF] border-[#2563EB] shadow-xs'
                          : 'bg-white border-[#E2E8F0] hover:border-[#CBD8E8]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-extrabold rounded border border-blue-200">
                          {q.courseCode}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {q.targetBatch || q.uploaderBatchName || 'SWE 9th Batch'} • {q.academicYear}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{q.title}</h4>
                          <span className="text-[11px] text-slate-500 font-medium">by {q.uploaderName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </span>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setPreviewModalResource(q)}
                            className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Preview
                          </button>
                          <button
                            onClick={() => {
                              handleDownload(q.id);
                              window.open(q.fileUrl, '_blank');
                            }}
                            className="px-2 py-1 bg-blue-600 text-white text-xs font-bold rounded flex items-center gap-1"
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
                  <tr className="bg-[#F1F5FA] border-b border-[#CBD8E8] text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                    <th className="px-4 py-3.5">TITLE</th>
                    <th className="px-4 py-3.5 w-28">COURSE</th>
                    <th className="px-4 py-3.5 w-24">FACULTY</th>
                    <th className="px-4 py-3.5 w-28">BATCH</th>
                    <th className="px-4 py-3.5">UPLOADED BY</th>
                    <th className="px-4 py-3.5 w-24">STATUS</th>
                    <th className="px-4 py-3.5 text-right w-24">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF2F7] text-xs">
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
                              ? 'bg-[#EFF6FF] border-l-4 border-l-blue-600 font-semibold'
                              : 'hover:bg-[#F8FBFF]'
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                              <span className="line-clamp-1">{q.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded border border-blue-200">
                              {q.courseCode}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 truncate max-w-[110px]">
                            {q.facultyName || 'Dr. Tanvir Rahman'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {q.targetBatch || q.uploaderBatchName || 'SWE 9th Batch'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 truncate max-w-[120px]">
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
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#CBD8E8] shadow-md p-5 sticky top-20 space-y-4">
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] uppercase rounded-full border border-blue-200">
                  {selectedResource.examType || 'EXAM PAPER'}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1.5 leading-snug">
                  {selectedResource.title}
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  by <span className="text-slate-800 font-bold">{selectedResource.uploaderName}</span> ({selectedResource.uploaderBatchName || 'SWE 9th Batch'})
                </p>
              </div>
              <button
                onClick={() => setSelectedResource(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Question Paper Details Specification Cards */}
            <div className="space-y-2 text-xs">
              <div className="bg-[#F7FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Course Code</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
                    {selectedResource.courseCode}
                  </span>
                </div>
                <div className="text-slate-800 font-semibold text-xs border-t border-slate-200/60 pt-1.5">
                  {selectedResource.courseTitle}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F7FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Batch</span>
                  <span className="font-bold text-slate-900">
                    {selectedResource.targetBatch || selectedResource.uploaderBatchName || 'SWE 9th Batch'}
                  </span>
                </div>

                <div className="bg-[#F7FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Semester & Year</span>
                  <span className="font-bold text-slate-900">
                    {selectedResource.semester}th Sem ({selectedResource.academicYear})
                  </span>
                </div>
              </div>

              <div className="bg-[#F7FAFC] p-3 rounded-lg border border-[#E2E8F0]">
                <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Faculty</span>
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  👨‍🏫 {selectedResource.facultyName || 'Dr. Tanvir Rahman'}
                </span>
              </div>
            </div>

            {selectedResource.description && (
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                {selectedResource.description}
              </p>
            )}

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setPreviewModalResource(selectedResource)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
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
    </div>
  );
};
