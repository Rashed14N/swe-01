import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { FolderGit2, Download, Eye, CheckCircle2, Code2, FileCode, BookOpen, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Resource } from '../types';
import { FilePreviewModal } from '../components/common/FilePreviewModal';
=======
import { FolderGit2, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Resource } from '../types';
import { ResourceDetailModal } from '../components/common/ResourceDetailModal';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

export const LabResourcesPage: React.FC = () => {
  const { token } = useAuth();
  const [labs, setLabs] = useState<Resource[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
<<<<<<< HEAD
  const [selectedPreview, setSelectedPreview] = useState<Resource | null>(null);
=======
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
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
<<<<<<< HEAD
    switch (cat) {
      case 'LAB_MANUAL':
        return <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-extrabold text-[10px] rounded border border-purple-200 uppercase">Lab Manual</span>;
      case 'SOURCE_CODE':
        return <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded border border-blue-200 uppercase">Source Code</span>;
      case 'LAB_REPORT':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded border border-emerald-200 uppercase">Lab Report</span>;
      case 'VIVA_QUESTIONS':
        return <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-extrabold text-[10px] rounded border border-amber-200 uppercase">Viva Prep</span>;
      case 'DATASET':
        return <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 font-extrabold text-[10px] rounded border border-cyan-200 uppercase">Dataset</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded border border-slate-200 uppercase">Lab File</span>;
    }
=======
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
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Software Engineering Lab Resources"
        description="Packet Tracer topologies, database schema SQL files, architecture diagrams, and viva question sets."
<<<<<<< HEAD
        breadcrumb="VERIFIED LAB RESOURCES"
=======
        breadcrumb="LAB RESOURCES"
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
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
<<<<<<< HEAD
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-purple-50 text-purple-700 rounded-lg flex items-center justify-center shrink-0 border border-purple-200 mt-0.5">
=======
              onClick={() => setSelectedResource(l)}
              className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F6FAFF] dark:hover:bg-slate-800/50 px-3 rounded-xl transition-all duration-150 cursor-pointer hover:shadow-xs group"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-[#DBEAFE] dark:border-blue-900/50 mt-0.5 group-hover:scale-105 transition-transform">
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                  <FolderGit2 className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
<<<<<<< HEAD
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">{l.title}</h3>
                    {getCategoryBadge(l.labCategory)}
                    <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#2563EB] font-mono text-[10px] font-bold rounded border border-[#DBEAFE]">
=======
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
                      {l.title}
                    </h3>
                    {getCategoryBadge(l.labCategory)}
                    <span className="px-2 py-0.5 bg-[#EFF5FF] text-[#2563EB] dark:bg-blue-950/40 dark:text-blue-400 font-mono text-[10px] font-bold rounded border border-[#DBEAFE] dark:border-blue-900/50">
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                      {l.courseCode}
                    </span>
                  </div>

                  <p className="text-xs text-[#475569] dark:text-slate-400 font-medium">
<<<<<<< HEAD
                    {l.courseTitle} • Semester {l.semester}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                    <span>File: <strong className="text-[#0F172A] dark:text-slate-200">{l.fileName}</strong></span>
=======
                    {l.courseTitle} • Semester {l.semester} ({l.academicYear})
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-[#64748B] dark:text-slate-400 pt-0.5">
                    <span>
                      File: <strong className="text-[#0F172A] dark:text-slate-200">{l.fileName}</strong>
                    </span>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                    <span>•</span>
                    <span>{l.fileSize || '3.2 MB'}</span>
                    <span>•</span>
                    <span>{l.downloadCount} downloads</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
<<<<<<< HEAD
                  onClick={() => setSelectedPreview(l)}
                  className="px-3 py-1.5 bg-[#F1F5FA] hover:bg-[#E2EDFE] text-[#1E293B] text-xs font-bold rounded-lg border border-[#DCE5F0] transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview
                </button>
                <button
                  onClick={() => {
                    handleDownload(l.id);
                    window.open(l.fileUrl, '_blank');
                  }}
                  className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
=======
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(l.id);
                    if (l.fileUrl) window.open(l.fileUrl, '_blank');
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
