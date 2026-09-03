import React, { useState, useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Resource } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { ResourceDetailModal } from '../components/common/ResourceDetailModal';
import { ContributorLeaderboard } from '../components/resources/ContributorLeaderboard';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

export const NotesPage: React.FC = () => {
  const { token } = useAuth();
  const [notes, setNotes] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotes = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ type: 'NOTE' });
    if (search) params.append('search', search);
    if (semester) params.append('semester', semester);

    fetch(`/api/resources?${params.toString()}`)
      .then((res) => safeParseJson(res))
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
        description="Digitized handwritten lecture notes, slides, and summary handouts contributed by students and CRs."
        breadcrumb="LECTURE NOTES"
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
              onClick={() => setSelectedResource(n)}
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 px-3 rounded-xl transition-all duration-150 cursor-pointer hover:shadow-xs group"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-[#DBEAFE] dark:border-blue-900/50 mt-0.5 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
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
                    <span>•</span>
                    <span>{n.fileSize || 'PDF'}</span>
                    <span>•</span>
                    <span>{n.downloadCount} downloads</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(n.id);
                    if (n.fileUrl) window.open(n.fileUrl, '_blank');
                  }}
                  className="px-3.5 py-1.5 bg-[#EFF5FF] hover:bg-[#2563EB] text-[#2563EB] hover:text-white dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white text-xs font-bold rounded-lg border border-[#DBEAFE] dark:border-blue-900/50 shadow-2xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ResourceDetailModal
        isOpen={Boolean(selectedResource)}
        onClose={() => setSelectedResource(null)}
        resource={selectedResource}
        onDownload={handleDownload}
      />
    </div>
  );
};
