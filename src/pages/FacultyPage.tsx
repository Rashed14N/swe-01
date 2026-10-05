import React, { useState, useEffect } from 'react';
import { Faculty, sortFacultyByHierarchy } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';
import { FacultyCard } from '../components/faculty/FacultyCard';
import { FacultyGridSkeleton } from '../components/faculty/FacultyCardSkeleton';

export const FacultyPage: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchFaculty = () => {
    setIsLoading(true);
    fetch(`/api/faculty?search=${encodeURIComponent(search)}`)
      .then((res) => safeParseJson(res))
      .then((data) => setFaculty(sortFacultyByHierarchy(data.faculty || [])))
      .catch((err) => {
        console.warn('Could not fetch faculty:', err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchFaculty();
  }, [search]);

  return (
    <div className="space-y-5 max-w-[1550px]">
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
        <FacultyGridSkeleton count={8} />
      ) : faculty.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-[#E2E8F0] dark:border-slate-800 text-center text-xs text-slate-500">
          No faculty members found matching search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
          {faculty.map((fac) => (
            <FacultyCard key={fac.id} faculty={fac} onPhotoUpdated={fetchFaculty} />
          ))}
        </div>
      )}
    </div>
  );
};
