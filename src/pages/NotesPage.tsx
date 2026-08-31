import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { FileText, Download, Eye, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Resource } from '../types';
import { FilePreviewModal } from '../components/common/FilePreviewModal';
=======
import { FileText, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Resource } from '../types';
import { ResourceDetailModal } from '../components/common/ResourceDetailModal';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
import { ContributorLeaderboard } from '../components/resources/ContributorLeaderboard';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

export const NotesPage: React.FC = () => {
  const { token } = useAuth();
  const [notes, setNotes] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('');
<<<<<<< HEAD
  const [selectedPreview, setSelectedPreview] = useState<Resource | null>(null);
=======
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotes = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ type: 'NOTE' });
    if (search) params.append('search', search);
    if (semester) params.append('semester', semester);

    fetch(`/api/resources?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setNotes(data.resources || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchNotes();
  }, [search, semester]);

  const handleDownload = (resourceId: string) => {
    fetch(`/api/resources/${resourceId}/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Notes & Handouts Repository"
<<<<<<< HEAD
        description="Digitized handwritten lecture notes, slides, and summary handouts verified by faculty."
        breadcrumb="VERIFIED LECTURE NOTES"
=======
        description="Digitized handwritten lecture notes, slides, and summary handouts contributed by students and CRs."
        breadcrumb="LECTURE NOTES"
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      />

      <ContributorLeaderboard />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search notes by topic, course title, code, author..."
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
        ]}
        onReset={() => {
          setSearch('');
          setSemester('');
        }}
        isFiltered={Boolean(search || semester)}
      />

      {/* Structured Resource List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] p-4 divide-y divide-[#E5EBF3] dark:divide-slate-800">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading notes repository...</div>
        ) : notes.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No lecture notes match your search criteria.
          </div>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
<<<<<<< HEAD
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-[#EFF5FF] text-[#2563EB] rounded-lg flex items-center justify-center shrink-0 border border-[#DBEAFE] mt-0.5">
=======
              onClick={() => setSelectedResource(n)}
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 px-3 rounded-xl transition-all duration-150 cursor-pointer hover:shadow-xs group"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-[#DBEAFE] dark:border-blue-900/50 mt-0.5 group-hover:scale-105 transition-transform">
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                  <FileText className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
<<<<<<< HEAD
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">{n.title}</h3>
                    <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#2563EB] font-mono text-[10px] font-bold rounded border border-[#DBEAFE]">
                      {n.courseCode}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                    </span>
                  </div>

                  <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">
                    {n.courseTitle} • Semester {n.semester}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                    <span>Uploaded by <strong className="text-[#0F172A] dark:text-slate-200">{n.uploaderName}</strong></span>
=======
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
                      {n.title}
                    </h3>
                    <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 font-mono text-[10px] font-bold rounded border border-[#DBEAFE] dark:border-blue-900/50">
                      {n.courseCode}
                    </span>
                  </div>

                  <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">
                    {n.courseTitle} • Semester {n.semester} ({n.academicYear})
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#64748B] dark:text-slate-400 pt-0.5">
                    <span>
                      by <strong className="text-[#0F172A] dark:text-slate-200">{n.uploaderName}</strong>
                    </span>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                    <span>•</span>
                    <span>{n.fileSize || 'PDF'}</span>
                    <span>•</span>
                    <span>{n.downloadCount} downloads</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
<<<<<<< HEAD
                  onClick={() => setSelectedPreview(n)}
                  className="px-3 py-1.5 bg-[#F1F5FA] hover:bg-[#E2EDFE] text-[#1E293B] text-xs font-bold rounded-lg border border-[#DCE5F0] transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  onClick={() => {
                    handleDownload(n.id);
                    window.open(n.fileUrl, '_blank');
                  }}
                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
=======
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(n.id);
                    if (n.fileUrl) window.open(n.fileUrl, '_blank');
                  }}
                  className="px-3.5 py-1.5 bg-[#EFF5FF] hover:bg-[#2563EB] text-[#2563EB] hover:text-white dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white text-xs font-bold rounded-lg border border-[#DBEAFE] dark:border-blue-900/50 shadow-2xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

<<<<<<< HEAD
      <FilePreviewModal
        isOpen={Boolean(selectedPreview)}
        onClose={() => setSelectedPreview(null)}
        resource={selectedPreview}
=======
      <ResourceDetailModal
        isOpen={Boolean(selectedResource)}
        onClose={() => setSelectedResource(null)}
        resource={selectedResource}
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
        onDownload={handleDownload}
      />
    </div>
  );
};
