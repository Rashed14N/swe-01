import React, { useState, useEffect } from 'react';
import { Bell, Search, Filter, ShieldCheck, Download, ExternalLink } from 'lucide-react';
import { DepartmentNotice } from '../types';

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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              Official Department Desk
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Department Circulars & Academic Notices</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Published directly by Department Administration, Head of Department, and Examination Committee.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notice title or content..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs focus:bg-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold sm:w-48"
        >
          <option value="">All Categories</option>
          <option value="ACADEMIC">Academic</option>
          <option value="EXAM">Exam Circulars</option>
          <option value="HOLIDAY">Holidays</option>
          <option value="SCHOLARSHIP">Scholarships</option>
          <option value="EVENT">Department Events</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading notices...</div>
      ) : (
        <div className="space-y-4">
          {filteredNotices.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-200">
              <p className="text-sm font-semibold text-slate-700">No notices found.</p>
            </div>
          ) : (
            filteredNotices.map(notice => (
              <div
                key={notice.id}
                className="bg-white p-6 rounded-xl border border-[#CBD8E8] shadow-sm hover:border-[#A3C0EE] hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full uppercase">
                    {notice.category}
                  </span>
                  <span className="text-xs font-medium text-slate-400">{notice.publishDate}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{notice.title}</h3>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{notice.content}</p>

                {notice.attachmentUrl && (
                  <div className="pt-2">
                    <a
                      href={notice.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" /> Download Notice Attachment
                    </a>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Published by: <strong className="text-slate-800">{notice.createdByName}</strong></span>
                  <span className="text-blue-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Department Verified
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
