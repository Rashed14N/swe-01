import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Clock, BookOpen } from 'lucide-react';
import { Faculty } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';

export const FacultyPage: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/faculty?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => setFaculty(data.faculty || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [search]);

  return (
    <div className="space-y-6 max-w-[1500px]">
      <PageHeader
        title="Faculty & Academic Staff Directory"
        description="Contact information, office rooms, research specializations, and assigned batch courses."
        breadcrumb="SOFTWARE ENGINEERING FACULTY"
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search faculty name, designation, specialization..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {faculty.map((fac) => (
            <div
              key={fac.id}
              className="bg-white p-5 rounded-xl border border-[#CBD8E8] shadow-sm hover:border-[#A3C0EE] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={fac.photoUrl}
                    alt={fac.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-600 shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">{fac.name}</h3>
                    <span className="text-xs font-bold text-blue-600 block">{fac.designation}</span>
                    <span className="text-[11px] text-slate-500 font-medium block">
                      {fac.department}
                    </span>
                  </div>
                </div>

                {fac.specialization && (
                  <p className="text-xs text-slate-700 bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] mb-4 leading-relaxed">
                    <span className="font-bold text-slate-900 block text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                      Specialization & Research
                    </span>
                    {fac.specialization}
                  </p>
                )}

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`mailto:${fac.email}`}
                      className="text-blue-600 font-medium hover:underline truncate"
                    >
                      {fac.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">{fac.phone || 'Extension 402'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">Office Room 402, SWE Building</span>
                  </div>
                </div>
              </div>

              {fac.assignedCourses.length > 0 && (
                <div className="mt-5 pt-3 border-t border-[#E2E8F0]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Assigned Courses
                  </span>
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
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
