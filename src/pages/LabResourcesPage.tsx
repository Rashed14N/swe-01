import React, { useState, useEffect } from 'react';
import { FolderGit2, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Resource } from '../types';
import { ResourceDetailModal } from '../components/common/ResourceDetailModal';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

export const LabResourcesPage: React.FC = () => {
  const { token } = useAuth();
  const [labs, setLabs] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLabs = () => {
    setIsLoading(true);
    const params = new URLSearchParams({ type: 'LAB' });
    if (search) params.append('search', search);
    if (category) params.append('category', category);

    fetch(`/api/resources?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setLabs(data.resources || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLabs();
  }, [search, category]);

  const handleDownload = (resourceId: string) => {
    fetch(`/api/resources/${resourceId}/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

  const getCategoryBadge = (cat?: string) => {
    let label = 'Lab Resource';
    if (cat === 'LAB_MANUAL') label = 'Lab Manual';
    else if (cat === 'SOURCE_CODE') label = 'Source Code';
    else if (cat === 'LAB_REPORT') label = 'Lab Report';
    else if (cat === 'VIVA_QUESTIONS') label = 'Viva Prep';
    else if (cat === 'DATASET') label = 'Dataset';

    return (
      <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 font-bold text-[10px] rounded border border-[#DBEAFE] dark:border-blue-900/50 uppercase">
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Software Engineering Lab Resources"
        description="Packet Tracer topologies, database schema SQL files, architecture diagrams, and viva question sets."
        breadcrumb="LAB RESOURCES"
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search lab manuals, source code, viva questions..."
        filters={[
          {
            id: 'category',
            label: 'All Lab Categories',
            value: category,
            onChange: setCategory,
            options: [
              { label: 'Lab Manuals', value: 'LAB_MANUAL' },
              { label: 'Sample Lab Reports', value: 'LAB_REPORT' },
              { label: 'Source Code & Projects', value: 'SOURCE_CODE' },
              { label: 'Lab Exam Papers', value: 'LAB_QUESTIONS' },
              { label: 'Viva Prep Questions', value: 'VIVA_QUESTIONS' },
              { label: 'Sample Datasets', value: 'DATASET' },
            ],
          },
        ]}
        onReset={() => {
          setSearch('');
          setCategory('');
        }}
        isFiltered={Boolean(search || category)}
      />

      {/* Structured Lab Resource List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] p-4 divide-y divide-[#E5EBF3] dark:divide-slate-800">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading lab files...</div>
        ) : labs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No lab files found matching your search.
          </div>
        ) : (
          labs.map((l) => (
            <div
              key={l.id}
              onClick={() => setSelectedResource(l)}
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 px-3 rounded-xl transition-all duration-150 cursor-pointer hover:shadow-xs group"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-[#DBEAFE] dark:border-blue-900/50 mt-0.5 group-hover:scale-105 transition-transform">
                  <FolderGit2 className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
                      {l.title}
                    </h3>
                    {getCategoryBadge(l.labCategory)}
                    <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 font-mono text-[10px] font-bold rounded border border-[#DBEAFE] dark:border-blue-900/50">
                      {l.courseCode}
                    </span>
                  </div>

                  <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">
                    {l.courseTitle} • Semester {l.semester} ({l.academicYear})
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#64748B] dark:text-slate-400 pt-0.5">
                    <span>
                      File: <strong className="text-[#0F172A] dark:text-slate-200">{l.fileName}</strong>
                    </span>
                    <span>•</span>
                    <span>{l.fileSize || '3.2 MB'}</span>
                    <span>•</span>
                    <span>{l.downloadCount} downloads</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(l.id);
                    if (l.fileUrl) window.open(l.fileUrl, '_blank');
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
