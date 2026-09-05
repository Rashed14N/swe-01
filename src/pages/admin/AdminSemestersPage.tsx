import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers, BookOpen, Plus, Search, ArrowRight, ArrowLeftRight,
  CheckCircle2, RefreshCw, GraduationCap, Users, Award,
  SlidersHorizontal, Edit2, Trash2, Check, AlertCircle, Sparkles
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { adminApiClient } from '../../services/adminApiClient';
import type { Course, Faculty, Batch } from '../../types';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const AdminSemestersPage: React.FC = () => {
  const { addToast } = useNotifications();

  const [courses, setCourses] = useState<Course[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [batchesList, setBatchesList] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Active view state
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Course Edit/Create Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [targetSemesterForNewCourse, setTargetSemesterForNewCourse] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Assign Existing Course Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetSemester, setAssignTargetSemester] = useState<number>(1);
  const [selectedCourseIdsToAssign, setSelectedCourseIdsToAssign] = useState<string[]>([]);

  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    shortName: '',
    credits: 3,
    type: 'THEORY' as 'THEORY' | 'LAB' | 'PROJECT',
    semester: 1,
    assignedFacultyId: '',
    batchIds: [] as string[],
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [coursesData, facultyData, batchesData] = await Promise.all([
        adminApiClient.getCourses(),
        adminApiClient.getFaculty(),
        adminApiClient.getBatches(),
      ]);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      setFacultyList(Array.isArray(facultyData) ? facultyData : []);
      setBatchesList(Array.isArray(batchesData) ? batchesData : []);
    } catch (e: any) {
      console.error(e);
      addToast('error', e.message || 'Failed to load semester & curriculum data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map active batches per semester
  const batchesBySemester = useMemo(() => {
    const map: Record<number, Batch[]> = {};
    SEMESTERS.forEach((s) => {
      map[s] = batchesList.filter((b) => b.currentSemester === s && b.status === 'ACTIVE');
    });
    return map;
  }, [batchesList]);

  // Group courses by semester
  const coursesBySemester = useMemo(() => {
    const map: Record<number, Course[]> = {};
    SEMESTERS.forEach((s) => {
      map[s] = [];
    });

    courses.forEach((c) => {
      const sem = c.semester >= 1 && c.semester <= 8 ? c.semester : 1;
      if (!map[sem]) map[sem] = [];
      map[sem].push(c);
    });

    return map;
  }, [courses]);

  // Handler: Move single course to another semester
  const handleMoveCourseSemester = async (course: Course, newSemester: number) => {
    if (course.semester === newSemester) return;

    try {
      // Find active batches for the new semester
      const activeBatchesInNewSem = batchesList.filter(
        (b) => b.currentSemester === newSemester && b.status === 'ACTIVE'
      );
      const newBatchIds = activeBatchesInNewSem.map((b) => b.id);

      // Optimistic update
      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id
            ? {
                ...c,
                semester: newSemester,
                batchIds: newBatchIds.length > 0 ? newBatchIds : c.batchIds,
              }
            : c
        )
      );

      await adminApiClient.updateCourse(course.id, {
        semester: newSemester,
        ...(newBatchIds.length > 0 ? { batchIds: newBatchIds } : {}),
      });

      addToast(
        'success',
        `Course ${course.code} moved to Semester ${newSemester} and synchronized with Supabase & database!`
      );
      fetchData();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to update course semester');
      fetchData();
    }
  };

  // Open Add Course Modal for a specific semester
  const handleOpenAddCourseModal = (semester: number) => {
    setEditingCourse(null);
    setTargetSemesterForNewCourse(semester);
    const activeBatches = batchesList.filter(
      (b) => b.currentSemester === semester && b.status === 'ACTIVE'
    );
    setCourseForm({
      code: '',
      title: '',
      shortName: '',
      credits: 3,
      type: 'THEORY',
      semester,
      assignedFacultyId: facultyList[0]?.id || '',
      batchIds: activeBatches.map((b) => b.id),
    });
    setIsCourseModalOpen(true);
  };

  // Open Edit Course Modal
  const handleOpenEditCourseModal = (course: Course) => {
    setEditingCourse(course);
    setTargetSemesterForNewCourse(course.semester);
    setCourseForm({
      code: course.code,
      title: course.title,
      shortName: course.shortName || '',
      credits: course.credits,
      type: course.type,
      semester: course.semester,
      assignedFacultyId: course.assignedFacultyId || '',
      batchIds: course.batchIds || [],
    });
    setIsCourseModalOpen(true);
  };

  // Open Quick Assign Modal for a specific semester
  const handleOpenAssignModal = (semester: number) => {
    setAssignTargetSemester(semester);
    setSelectedCourseIdsToAssign([]);
    setIsAssignModalOpen(true);
  };

  // Submit Quick Assign
  const handleConfirmBatchAssign = async () => {
    if (selectedCourseIdsToAssign.length === 0) {
      addToast('error', 'Please select at least one course to assign.');
      return;
    }

    setIsSubmitting(true);
    try {
      const activeBatches = batchesList.filter(
        (b) => b.currentSemester === assignTargetSemester && b.status === 'ACTIVE'
      );
      const batchIds = activeBatches.map((b) => b.id);

      for (const courseId of selectedCourseIdsToAssign) {
        await adminApiClient.updateCourse(courseId, {
          semester: assignTargetSemester,
          ...(batchIds.length > 0 ? { batchIds } : {}),
        });
      }

      addToast(
        'success',
        `Successfully assigned ${selectedCourseIdsToAssign.length} course(s) to Semester ${assignTargetSemester}!`
      );
      setIsAssignModalOpen(false);
      fetchData();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to reassign courses');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Course Form
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!courseForm.code.trim() || !courseForm.title.trim()) {
      addToast('error', 'Course code and title are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const faculty = facultyList.find((f) => f.id === courseForm.assignedFacultyId);
      const payload: Partial<Course> = {
        code: courseForm.code.trim().toUpperCase(),
        title: courseForm.title.trim(),
        shortName: courseForm.shortName.trim() || undefined,
        credits: Number(courseForm.credits),
        type: courseForm.type,
        semester: Number(courseForm.semester),
        assignedFacultyId: faculty ? faculty.id : undefined,
        assignedFacultyName: faculty ? faculty.name : undefined,
        batchIds: courseForm.batchIds,
      };

      if (editingCourse) {
        await adminApiClient.updateCourse(editingCourse.id, payload);
        addToast('success', `Course ${payload.code} updated and synced with database!`);
      } else {
        await adminApiClient.createCourse(payload);
        addToast('success', `Course ${payload.code} added to Semester ${payload.semester}!`);
      }

      setIsCourseModalOpen(false);
      fetchData();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to save course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (course: Course) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete course "${course.code} - ${course.title}" from the curriculum and all associated tables?`
      )
    ) {
      return;
    }

    try {
      await adminApiClient.deleteCourse(course.id);
      addToast('success', `Course ${course.code} deleted successfully.`);
      fetchData();
    } catch (e: any) {
      addToast('error', e.message || 'Failed to delete course');
    }
  };

  // Filtered displayed semesters
  const displayedSemesters = useMemo(() => {
    if (selectedSemesterTab === 'ALL') return SEMESTERS;
    return [selectedSemesterTab];
  }, [selectedSemesterTab]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-[#2563EB] font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" /> Academic Curriculum Matrix
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Semester & Course Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage which courses are allocated to each semester (1st through 8th). Reassign courses, configure credit distributions, and synchronize changes across all student tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/courses"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Standard Course List</span>
          </Link>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Refresh Curriculum Matrix"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Global Curriculum Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Total Offerings</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{courses.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all 8 semesters</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Total Syllabus Credits</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {courses.reduce((acc, c) => acc + (c.credits || 0), 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Standard 4-year degree</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Active Batches</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {batchesList.filter((b) => b.status === 'ACTIVE').length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Assigned to semesters</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <GraduationCap className="w-4 h-4 text-purple-600" />
            <span>Faculty Instructors</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{facultyList.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Assigned to courses</p>
        </div>
      </div>

      {/* Semester Tabs Navigation & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedSemesterTab('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedSemesterTab === 'ALL'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            All Semesters (Matrix)
          </button>
          {SEMESTERS.map((sem) => {
            const count = coursesBySemester[sem]?.length || 0;
            const isSelected = selectedSemesterTab === sem;
            return (
              <button
                key={sem}
                type="button"
                onClick={() => setSelectedSemesterTab(sem)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>Sem {sem}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search courses in semesters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Semester Columns / Sections */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="py-20 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Loading semester curriculum data...
          </div>
        ) : (
          displayedSemesters.map((semester) => {
            const semCourses = (coursesBySemester[semester] || []).filter((c) => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                c.code.toLowerCase().includes(q) ||
                c.title.toLowerCase().includes(q) ||
                c.assignedFacultyName?.toLowerCase().includes(q)
              );
            });

            const activeBatches = batchesBySemester[semester] || [];
            const totalCredits = (coursesBySemester[semester] || []).reduce(
              (sum, c) => sum + (c.credits || 0),
              0
            );
            const theoryCount = (coursesBySemester[semester] || []).filter(
              (c) => c.type === 'THEORY'
            ).length;
            const labCount = (coursesBySemester[semester] || []).filter(
              (c) => c.type === 'LAB'
            ).length;

            return (
              <div
                key={semester}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden"
              >
                {/* Semester Header */}
                <div className="p-4 sm:p-5 bg-linear-to-r from-slate-50 via-white to-blue-50/40 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-[#2563EB] text-white text-xs font-black rounded-lg uppercase tracking-wider">
                        Semester {semester}
                      </span>
                      <h2 className="text-base font-extrabold text-slate-900">
                        {semester <= 2
                          ? `1st Year (${semester === 1 ? '1st' : '2nd'} Term)`
                          : semester <= 4
                          ? `2nd Year (${semester === 3 ? '1st' : '2nd'} Term)`
                          : semester <= 6
                          ? `3rd Year (${semester === 5 ? '1st' : '2nd'} Term)`
                          : `4th Year (${semester === 7 ? '1st' : '2nd'} Term)`}
                      </h2>

                      {/* Active Batches Chip */}
                      {activeBatches.length > 0 ? (
                        activeBatches.map((b) => (
                          <span
                            key={b.id}
                            className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md border border-emerald-200 flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Active: {b.name}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[11px] font-medium rounded-md">
                          No currently enrolled active batch
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      <strong>{coursesBySemester[semester]?.length || 0} Courses</strong> •{' '}
                      <strong>{totalCredits} Total Credits</strong> (Theory: {theoryCount}, Lab: {labCount})
                    </p>
                  </div>

                  {/* Actions for this Semester */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenAssignModal(semester)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="Move existing courses from other semesters to Semester"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                      <span>Reassign / Pull Course</span>
                    </button>
                    <button
                      onClick={() => handleOpenAddCourseModal(semester)}
                      className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Course to Sem {semester}</span>
                    </button>
                  </div>
                </div>

                {/* Courses List */}
                <div className="p-4 sm:p-5">
                  {semCourses.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No courses assigned to Semester {semester} yet. Click "Add Course" or "Reassign / Pull Course" above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {semCourses.map((course) => (
                        <div
                          key={course.id}
                          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono font-bold text-xs rounded border border-blue-200">
                                  {course.code}
                                </span>
                                {course.shortName && (
                                  <span className="px-1.5 py-0.5 bg-slate-900 text-amber-300 font-black text-[10px] rounded">
                                    {course.shortName}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
                                  {course.type}
                                </span>
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded border border-amber-200">
                                  {course.credits} Cr
                                </span>
                              </div>
                            </div>

                            <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                              {course.title}
                            </h3>

                            <div className="mt-2 text-xs text-slate-500 space-y-1">
                              <p className="flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">
                                  {course.assignedFacultyName || 'No Faculty Assigned'}
                                </span>
                              </p>
                              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {course.batchIds && course.batchIds.length > 0
                                    ? `${course.batchIds.length} batch(es) linked`
                                    : 'All batches eligible'}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Controls: Reassign Semester Quick Switcher */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500">Move to:</span>
                              <select
                                value={course.semester}
                                onChange={(e) =>
                                  handleMoveCourseSemester(course, Number(e.target.value))
                                }
                                className="bg-slate-50 border border-slate-200 hover:border-blue-300 text-xs font-bold text-blue-700 py-1 px-2 rounded-lg cursor-pointer transition-colors"
                              >
                                {SEMESTERS.map((s) => (
                                  <option key={s} value={s}>
                                    Sem {s}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditCourseModal(course)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit course details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCourse(course)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete course from curriculum"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QUICK REASSIGN MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-[#E2E8F0] shadow-xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Reassign Courses to Semester {assignTargetSemester}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Select courses from other semesters to pull into Semester {assignTargetSemester}. Database records will synchronize automatically.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1">
              {courses
                .filter((c) => c.semester !== assignTargetSemester)
                .map((c) => {
                  const isChecked = selectedCourseIdsToAssign.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCourseIdsToAssign((prev) =>
                          isChecked ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                        );
                      }}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-50 border-blue-300 text-blue-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700">{c.code}</span>
                          <span className="font-bold text-slate-900">{c.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Currently in <strong>Semester {c.semester}</strong> • {c.credits} Credits • {c.type}
                        </p>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                          isChecked
                            ? 'bg-[#2563EB] border-[#2563EB] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}

              {courses.filter((c) => c.semester !== assignTargetSemester).length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  All departmental courses are already in Semester {assignTargetSemester}.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                {selectedCourseIdsToAssign.length} course(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedCourseIdsToAssign.length === 0 || isSubmitting}
                  onClick={handleConfirmBatchAssign}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Updating Database...' : `Move to Semester ${assignTargetSemester}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT COURSE MODAL */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-[#E2E8F0] shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingCourse ? `Edit Course ${editingCourse.code}` : `Add New Course to Semester ${courseForm.semester}`}
              </h3>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-mono text-xs font-bold rounded-md">
                Semester {courseForm.semester}
              </span>
            </div>

            <form onSubmit={handleCourseSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SWE 311"
                    value={courseForm.code}
                    onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Architecture & Design"
                    value={courseForm.title}
                    onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester *</label>
                  <select
                    value={courseForm.semester}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, semester: Number(e.target.value) })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold text-blue-700"
                  >
                    {SEMESTERS.map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credits *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="6"
                    required
                    value={courseForm.credits}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, credits: Number(e.target.value) })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type *</label>
                  <select
                    value={courseForm.type}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        type: e.target.value as 'THEORY' | 'LAB' | 'PROJECT',
                      })
                    }
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-medium"
                  >
                    <option value="THEORY">Theory</option>
                    <option value="LAB">Lab</option>
                    <option value="PROJECT">Project / Thesis</option>
                  </select>
                </div>
              </div>

              {/* Faculty Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Instructing Faculty</label>
                <select
                  value={courseForm.assignedFacultyId}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, assignedFacultyId: e.target.value })
                  }
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-medium"
                >
                  <option value="">-- No Faculty Assigned --</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.designation})
                    </option>
                  ))}
                </select>
              </div>

              {/* Batches Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assigned Academic Batches
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                  {batchesList.map((b) => {
                    const isSelected = courseForm.batchIds.includes(b.id);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => {
                          setCourseForm((prev) => {
                            const exists = prev.batchIds.includes(b.id);
                            return {
                              ...prev,
                              batchIds: exists
                                ? prev.batchIds.filter((id) => id !== b.id)
                                : [...prev.batchIds, b.id],
                            };
                          });
                        }}
                        className={`p-2 rounded-lg text-left text-xs font-bold transition-all flex items-center justify-between border ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{b.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingCourse ? 'Save Changes' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
