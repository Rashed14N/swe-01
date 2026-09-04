import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Sparkles,
  Users,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Layers,
  GraduationCap
} from 'lucide-react';
import { Batch, Course } from '../../types';
import { adminApiClient } from '../../services/adminApiClient';
import { useNotifications } from '../../context/NotificationContext';

interface BatchSemesterControllerProps {
  batches: Batch[];
  courses: Course[];
  activeBatchId?: string;
  onSelectBatch?: (batchId: string) => void;
  onBatchSemesterUpdated: (updatedBatch: Batch, semester: number, coursesCount: number) => void;
}

export const BatchSemesterController: React.FC<BatchSemesterControllerProps> = ({
  batches,
  courses,
  activeBatchId,
  onSelectBatch,
  onBatchSemesterUpdated,
}) => {
  const { addToast } = useNotifications();

  // Selected batch state (defaults to first batch or activeBatchId)
  const [selectedBatchId, setSelectedBatchId] = useState<string>(() => {
    if (activeBatchId && batches.some(b => b.id === activeBatchId)) {
      return activeBatchId;
    }
    const defaultBatch = batches.find(b => b.id === 'batch-9') || batches[0];
    return defaultBatch?.id || '';
  });

  // Keep selectedBatchId in sync when activeBatchId prop changes
  React.useEffect(() => {
    if (activeBatchId && batches.some(b => b.id === activeBatchId)) {
      setSelectedBatchId(activeBatchId);
    }
  }, [activeBatchId, batches]);

  const selectedBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || batches[0] || null;
  }, [batches, selectedBatchId]);

  // Target semester chosen in the controller (defaults to current semester of selected batch)
  const [targetSemester, setTargetSemester] = useState<number>(() => {
    return selectedBatch?.currentSemester || 1;
  });

  // Whenever selected batch changes, reset target semester to that batch's current semester
  React.useEffect(() => {
    if (selectedBatch) {
      setTargetSemester(selectedBatch.currentSemester);
    }
  }, [selectedBatch?.id, selectedBatch?.currentSemester]);

  const [syncStudents, setSyncStudents] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Group courses by semester (1-8)
  const coursesBySemester = useMemo(() => {
    const map: Record<number, Course[]> = {};
    for (let sem = 1; sem <= 8; sem++) {
      map[sem] = courses.filter(c => c.semester === sem);
    }
    return map;
  }, [courses]);

  // Target semester courses
  const previewCourses = useMemo(() => {
    return coursesBySemester[targetSemester] || [];
  }, [coursesBySemester, targetSemester]);

  // Current semester courses of selected batch
  const currentBatchCourses = useMemo(() => {
    if (!selectedBatch) return [];
    return coursesBySemester[selectedBatch.currentSemester] || [];
  }, [coursesBySemester, selectedBatch]);

  const handleApplySemester = async () => {
    if (!selectedBatch) return;
    if (targetSemester === selectedBatch.currentSemester) {
      addToast('info', `${selectedBatch.name} is already in Semester ${targetSemester}.`);
      return;
    }

    setIsUpdating(true);
    try {
      const res = await adminApiClient.setBatchSemester(selectedBatch.id, targetSemester, syncStudents);
      if (res && res.success) {
        addToast(
          'success',
          `Successfully set ${selectedBatch.name} to Semester ${targetSemester}! All ${res.coursesEnrolledCount} courses are now active in Enrolled Classes.`
        );
        onBatchSemesterUpdated(res.batch, targetSemester, res.coursesEnrolledCount);
      } else {
        addToast('error', res?.message || 'Failed to update semester.');
      }
    } catch (err: any) {
      console.error('Error applying semester:', err);
      addToast('error', err?.message || 'Server error setting batch semester');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!batches || batches.length === 0) {
    return null;
  }

  const isCurrentActive = selectedBatch && targetSemester === selectedBatch.currentSemester;

  return (
    <div
      id="batch-semester-controller"
      className="bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-[#0F172A] dark:via-[#1E293B] dark:to-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 shadow-md p-5 sm:p-6 transition-all"
    >
      {/* Controller Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-blue-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Batch Semester Controller
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                Live Enrolled Classes Sync
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Select a batch and assign its academic semester. All courses of that semester will immediately appear in <strong>Enrolled Classes</strong> for all students in the batch.
            </p>
          </div>
        </div>

        {/* Batch Picker Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="batch-select-dropdown" className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Active Batch:
          </label>
          <select
            id="batch-select-dropdown"
            value={selectedBatchId}
            onChange={e => {
              setSelectedBatchId(e.target.value);
              onSelectBatch?.(e.target.value);
            }}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
          >
            {batches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} (Semester {b.currentSemester})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedBatch && (
        <div className="mt-5 space-y-5">
          {/* Active Batch Summary Banner */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200 dark:border-blue-900">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {selectedBatch.name}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">({selectedBatch.id})</span>
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {selectedBatch.status || 'ACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Academic Session: <strong>{selectedBatch.academicSession}</strong> • Admission: <strong>{selectedBatch.admissionYear}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Current Active Semester</span>
                <span className="font-black text-blue-700 dark:text-blue-300 text-sm">
                  Semester {selectedBatch.currentSemester}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Active Enrolled Courses</span>
                <span className="font-black text-slate-900 dark:text-white text-sm">
                  {currentBatchCourses.length} Courses
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Semester Selection Grid (1 to 8) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Select Academic Semester to Enroll (1st - 8th)
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Click any semester to preview its syllabus and enroll
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                const isSelectedTarget = targetSemester === sem;
                const isBatchCurrent = selectedBatch.currentSemester === sem;
                const courseCount = (coursesBySemester[sem] || []).length;

                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setTargetSemester(sem)}
                    className={`relative p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-between gap-1 select-none ${
                      isSelectedTarget
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400 dark:ring-blue-600'
                        : isBatchCurrent
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700 hover:border-blue-400'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {/* Badges for current status */}
                    {isBatchCurrent && (
                      <span
                        className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full absolute -top-2 left-1/2 -translate-x-1/2 shadow-2xs whitespace-nowrap ${
                          isSelectedTarget
                            ? 'bg-emerald-400 text-emerald-950'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        Active
                      </span>
                    )}

                    <span className="text-xs font-black tracking-tight">
                      Semester {sem}
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isSelectedTarget
                          ? 'bg-blue-700 text-blue-100'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {courseCount} {courseCount === 1 ? 'course' : 'courses'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-Time Course Enrollment Preview Box */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-slate-800 p-4 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold text-xs font-mono">
                  Semester {targetSemester}
                </span>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Courses to be Enrolled in Classes ({previewCourses.length})
                </h3>
                {isCurrentActive && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Currently Enrolled
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Total Credits:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {previewCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0).toFixed(1)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Course Cards Grid */}
            {previewCourses.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No courses configured for Semester {targetSemester} yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {previewCourses.map(course => (
                  <div
                    key={course.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-2 hover:border-blue-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-bold text-xs text-blue-700 dark:text-blue-400">
                          {course.code}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 uppercase">
                            {course.type}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                            {course.credits} Cr
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1" title={course.title}>
                        {course.title}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>Faculty: {course.assignedFacultyName || 'Dept Faculty'}</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">✓ Enrolled Class</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={syncStudents}
                  onChange={e => setSyncStudents(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span>
                  Synchronize all registered student accounts in <strong>{selectedBatch.name}</strong> to Semester {targetSemester}
                </span>
              </label>

              <button
                type="button"
                id="apply-batch-semester-btn"
                onClick={handleApplySemester}
                disabled={isUpdating || isCurrentActive}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                  isCurrentActive
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md cursor-pointer'
                }`}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Applying Semester {targetSemester}...</span>
                  </>
                ) : isCurrentActive ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Currently Active (Semester {targetSemester})</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Set {selectedBatch.name} to Semester {targetSemester}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
