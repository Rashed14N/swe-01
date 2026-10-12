import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, Paperclip, Image as ImageIcon, X, ExternalLink } from 'lucide-react';
import { DepartmentNotice } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

export const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<DepartmentNotice[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (category) params.append('category', category);

    fetch(`/api/notices?${params.toString()}`)
      .then(res => safeParseJson(res))
      .then(data => setNotices(data.notices || []))
      .catch((err) => {
        console.warn('Could not fetch notices:', err);
      })
      .finally(() => setIsLoading(false));
  }, [category]);

  const filteredNotices = notices.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        title="Department Circulars & Academic Notices"
        description="Published directly by Department Administration, Head of Department, and Examination Committee."
        breadcrumb="Official Department Desk"
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search notice title or content..."
        filters={[
          {
            id: 'category',
            label: 'All Categories',
            value: category,
            onChange: setCategory,
            options: [
              { label: 'Academic', value: 'ACADEMIC' },
              { label: 'Exam Circulars', value: 'EXAM' },
              { label: 'Holidays', value: 'HOLIDAY' },
              { label: 'Scholarships', value: 'SCHOLARSHIP' },
              { label: 'Department Events', value: 'EVENT' },
              { label: 'General', value: 'GENERAL' },
            ],
          },
        ]}
        onReset={() => {
          setSearch('');
          setCategory('');
        }}
        isFiltered={Boolean(search || category)}
      />

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading notices...</div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.length === 0 ? (
            <div className="bg-white dark:bg-[#0F172A] p-12 text-center rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)]">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No notices found.</p>
            </div>
          ) : (
            filteredNotices.map(notice => (
              <div
                key={notice.id}
                className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] hover:border-[#A3C0EE] transition-all space-y-3.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-[#EFF5FF] text-[#2563EB] text-[10px] font-bold rounded-md border border-[#DBEAFE] uppercase">
                    {notice.category}
                  </span>
                  <span className="text-xs font-medium text-slate-400">{notice.publishDate}</span>
                </div>

                {/* Featured Photo Banner if present */}
                {notice.featuredImageUrl && (
                  <div
                    onClick={() => setPreviewImage({ url: notice.featuredImageUrl!, title: notice.title })}
                    className="relative cursor-pointer group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-80 bg-slate-100 dark:bg-slate-900"
                  >
                    <img
                      src={notice.featuredImageUrl}
                      alt={notice.title}
                      className="w-full h-48 sm:h-64 object-cover group-hover:scale-102 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-2xs">
                      <ImageIcon className="w-4 h-4" /> Click to view full image
                    </div>
                  </div>
                )}

                <h3 className="text-base sm:text-lg font-bold text-[#0F172A] dark:text-white leading-snug">
                  {notice.title}
                </h3>
                <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {notice.content}
                </p>

                {/* File Attachment Pill */}
                {notice.attachmentUrl && (
                  <div className="pt-1">
                    <a
                      href={notice.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-[#EFF5FF] hover:bg-[#E2EDFE] dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-[#2563EB] dark:text-blue-300 text-xs font-semibold rounded-xl border border-[#DBEAFE] dark:border-blue-800 transition-colors shadow-2xs"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                      <span className="truncate max-w-xs">{notice.attachmentFileName || 'Download Attached Circular Document'}</span>
                      {notice.attachmentSize && (
                        <span className="text-[10px] bg-blue-200/80 dark:bg-blue-800/80 text-blue-900 dark:text-blue-100 px-1.5 py-0.5 rounded font-mono shrink-0">
                          {notice.attachmentSize}
                        </span>
                      )}
                      <Download className="w-3 h-3 text-[#2563EB] ml-1 shrink-0" />
                    </a>
                  </div>
                )}

                <div className="pt-3 border-t border-[#E5EBF3] dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Published by: <strong className="text-[#0F172A] dark:text-slate-200">{notice.createdByName}</strong>
                  </span>
                  <span className="text-blue-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" /> Department Verified
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Feature Photo Modal Lightbox */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {previewImage.title}
              </h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-black/90 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Official Department Notice Photo</span>
              <a
                href={previewImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Open in full resolution</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
