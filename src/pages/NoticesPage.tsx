import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download } from 'lucide-react';
import { DepartmentNotice } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

export const NoticesPage: React.FC = () => {
  const [notices, setNotices] = useState<DepartmentNotice[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (category) params.append('category', category);

    fetch(`/api/notices?${params.toString()}`)
      .then(res => res.json())
      .then(data => setNotices(data.notices || []))
      .catch(console.error)
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
                className="bg-white dark:bg-[#0F172A] p-6 rounded-xl border border-[#D8E2EE] dark:border-slate-800 shadow-[0_1px_2px_rgba(15,35,70,0.04),0_6px_18px_rgba(15,35,70,0.07)] hover:border-[#A3C0EE] transition-all space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-[#EFF5FF] text-[#2563EB] text-[10px] font-bold rounded-md border border-[#DBEAFE] uppercase">
                    {notice.category}
                  </span>
                  <span className="text-xs font-medium text-slate-400">{notice.publishDate}</span>
                </div>

                <h3 className="text-base font-bold text-[#0F172A] dark:text-white">{notice.title}</h3>
                <p className="text-xs text-[#334155] dark:text-slate-300 leading-relaxed whitespace-pre-line">{notice.content}</p>

                {notice.attachmentUrl && (
                  <div className="pt-2">
                    <a
                      href={notice.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF5FF] hover:bg-[#E2EDFE] text-[#2563EB] text-xs font-semibold rounded-lg border border-[#DBEAFE] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-[#2563EB]" /> Download Notice Attachment
                    </a>
                  </div>
                )}

                <div className="pt-3 border-t border-[#E5EBF3] dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Published by: <strong className="text-[#0F172A] dark:text-slate-200">{notice.createdByName}</strong></span>
                  <span className="text-blue-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2563EB]" /> Department Verified
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
