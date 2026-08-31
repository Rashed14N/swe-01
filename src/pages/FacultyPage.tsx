import React, { useState, useEffect } from 'react';
import { Mail, Phone, User, Copy, Check } from 'lucide-react';
import { Faculty } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

export const FacultyPage: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/faculty?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => setFaculty(data.faculty || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [search]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-[1500px]">
      <PageHeader
        title="Faculty & Academic Staff Directory"
        description="Official list of Software Engineering department faculty members, academic designations, short codes, and direct contact numbers."
        breadcrumb="SOFTWARE ENGINEERING FACULTY"
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search faculty by name, short code (e.g. FA, NSC, RP), or designation..."
      />

      {isLoading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading faculty directory...
        </div>
      ) : faculty.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-[#E2E8F0] text-center text-xs text-slate-400">
          No faculty members found matching search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {faculty.map((fac) => (
            <div
              key={fac.id}
              className="bg-white p-5 rounded-2xl border border-[#CBD8E8] shadow-xs hover:border-[#93C5FD] hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Header: Avatar + Name + Short Code */}
                <div className="flex items-start gap-3.5 mb-4">
                  {/* Default Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-sm border-2 border-white ring-2 ring-blue-100">
                      {fac.shortName ? (
                        <span className="font-extrabold text-sm tracking-wider font-mono">{fac.shortName}</span>
                      ) : (
                        <User className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                        {fac.name}
                      </h3>
                      {fac.shortName && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-mono font-extrabold text-[10px] rounded-md shrink-0">
                          {fac.shortName}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-blue-600 block mt-0.5">
                      {fac.designation}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {fac.department || 'Department of Software Engineering'}
                    </span>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-2 text-xs bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                  {/* Phone */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      {fac.phone ? (
                        <a
                          href={`tel:${fac.phone}`}
                          className="font-semibold text-slate-800 hover:text-emerald-600 hover:underline truncate"
                        >
                          {fac.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Phone not provided</span>
                      )}
                    </div>
                    {fac.phone && (
                      <button
                        onClick={() => handleCopy(fac.phone!, `phone-${fac.id}`)}
                        className="p-1 hover:bg-slate-200/60 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copy phone"
                      >
                        {copiedId === `phone-${fac.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      {fac.email ? (
                        <a
                          href={`mailto:${fac.email}`}
                          className="font-semibold text-blue-600 hover:underline truncate"
                        >
                          {fac.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Email not provided</span>
                      )}
                    </div>
                    {fac.email && (
                      <button
                        onClick={() => handleCopy(fac.email!, `email-${fac.id}`)}
                        className="p-1 hover:bg-slate-200/60 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        title="Copy email"
                      >
                        {copiedId === `email-${fac.id}` ? (
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Assigned Courses */}
              <div className="mt-3.5 pt-3 border-t border-[#E2E8F0]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Assigned Courses
                </span>
                {fac.assignedCourses && fac.assignedCourses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {fac.assignedCourses.map((c, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded border border-blue-200"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Not Assigned</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

