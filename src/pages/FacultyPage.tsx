import React, { useState, useEffect, useMemo } from 'react';
import { Faculty, sortFacultyByHierarchy } from '../types';
import { safeParseJson } from '../lib/apiClient';
import { PageHeader } from '../components/common/PageHeader';
import { FilterBar } from '../components/common/FilterBar';
import { FacultyCard } from '../components/faculty/FacultyCard';
import { FacultyGridSkeleton } from '../components/faculty/FacultyCardSkeleton';

export const FacultyPage: React.FC = () => {
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all faculty records once on mount
  const fetchFaculty = () => {
    setIsLoading(true);
    fetch('/api/faculty')
      .then((res) => safeParseJson(res))
      .then((data) => setAllFaculty(sortFacultyByHierarchy(data.faculty || [])))
      .catch((err) => {
        console.warn('Could not fetch faculty:', err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchFaculty();
  }, []);

  // Client-side filtering: 0 additional API requests when searching or clearing
  const filteredFaculty = useMemo(() => {
    if (!search.trim()) return allFaculty;
    const q = search.toLowerCase().trim();
    return allFaculty.filter((fac) => {
      const matchName = fac.name?.toLowerCase().includes(q);
      const matchShortName = fac.shortName?.toLowerCase().includes(q);
      const matchDesignation = fac.designation?.toLowerCase().includes(q);
      const matchEmail = fac.email?.toLowerCase().includes(q);
      const matchPhone = fac.phone?.toLowerCase().includes(q);
      const matchDept = fac.department?.toLowerCase().includes(q);
      const matchRoom = fac.officeRoom?.toLowerCase().includes(q);
      return (
        matchName ||
        matchShortName ||
        matchDesignation ||
        matchEmail ||
        matchPhone ||
        matchDept ||
        matchRoom
      );
    });
  }, [allFaculty, search]);

  return (
    <div className="space-y-5 max-w-[1550px]">
      <PageHeader
        title="Faculty & Academic Staff Directory"
        breadcrumb="SOFTWARE ENGINEERING FACULTY"
      />

      <FilterBar
        searchQuery={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search faculty by name, short code (e.g. FA, NSC, RP), or designation..."
      />

      {isLoading ? (
        <FacultyGridSkeleton count={8} />
      ) : filteredFaculty.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-[#E2E8F0] dark:border-slate-800 text-center text-xs text-slate-500">
          No faculty members found matching search.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5">
          {filteredFaculty.map((fac) => (
            <FacultyCard key={fac.id} faculty={fac} onPhotoUpdated={fetchFaculty} />
          ))}
        </div>
      )}
    </div>
  );
};
