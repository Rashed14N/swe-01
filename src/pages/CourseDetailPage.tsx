import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Award,
  HelpCircle,
  FileText,
  FolderGit2,
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  Trash2,
  GraduationCap,
  Paperclip,
  FileUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Course, Faculty, Resource, Exam } from '../types';
import { ResourceDetailModal } from '../components/common/ResourceDetailModal';
import { UploadQuestionModal } from '../components/resources/UploadQuestionModal';
import { ScheduleCourseExamModal } from '../components/courses/ScheduleCourseExamModal';
import { UploadTeacherFileModal } from '../components/courses/UploadTeacherFileModal';

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const { addToast } = useNotifications();
  const navigate = useNavigate();

  const isCR = user?.role === 'ADMIN' || user?.role === 'CR' || (user as any)?.isCR;

  const [course, setCourse] = useState<Course | null>(null);
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [courseExams, setCourseExams] = useState<Exam[]>([]);
  const [resources, setResources] = useState<{
    questions: Resource[];
    notes: Resource[];
    labs: Resource[];
  }>({ questions: [], notes: [], labs: [] });

  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isScheduleExamModalOpen, setIsScheduleExamModalOpen] = useState(false);
  const [isTeacherFileModalOpen, setIsTeacherFileModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  const fetchCourseDetails = useCallback(() => {
    if (!token || !id) return;
    setIsLoading(true);

    fetch(`/api/courses/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setCourse(data.course);
        setFaculty(data.faculty);
        setCourseExams(data.exams || []);
        setResources(data.resources || { questions: [], notes: [], labs: [] });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [token, id]);

  useEffect(() => {
    fetchCourseDetails();
  }, [fetchCourseDetails]);

  const handleDownload = (resourceId: string) => {
    fetch(`/api/resources/${resourceId}/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

  const handleDeleteResource = async (resourceId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this question? It will be deleted permanently from Supabase database.')) {
      return;
    }
    try {
      const res = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete question');
      }
      addToast('success', 'Question deleted permanently from Supabase database!');
      if (selectedResource?.id === resourceId) {
        setSelectedResource(null);
      }
      fetchCourseDetails();
    } catch (err: any) {
      addToast('error', err.message || 'Error deleting question');
    }
  };

  const handleDeleteExam = async (examId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this scheduled exam date? It will be removed for all batch students.')) {
      return;
    }
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete exam');
      }
      addToast('success', 'Exam date removed successfully');
      fetchCourseDetails();
    } catch (err: any) {
      addToast('error', err.message || 'Error deleting exam');
    }
  };

  const availableYears = Array.from(
    new Set(resources.questions.map((q) => q.academicYear).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a));

  const filteredQuestions =
    selectedYear === 'ALL'
      ? resources.questions
      : resources.questions.filter((q) => String(q.academicYear) === selectedYear);

  if (isLoading || !course) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading course details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Back */}
      <button
        type="button"
        onClick={() => navigate('/courses')}
        className="text-xs font-bold text-[#0A2147] dark:text-slate-300 hover:text-[#2563EB] flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to All Courses
      </button>

      {/* Course Banner */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-[#EFF5FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 font-mono font-bold text-xs rounded-lg border border-[#DBEAFE] dark:border-blue-900/50">
              {course.code}
            </span>
            <span className="px-2.5 py-0.5 bg-[#F1F5FA] dark:bg-slate-800 text-[#475569] dark:text-slate-300 text-xs font-semibold rounded-full border border-[#DCE5F0] dark:border-slate-700">
              {course.type} • Semester {course.semester}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#0A2147] dark:text-white">{course.title}</h1>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
            Faculty: <span className="font-semibold text-[#0F172A] dark:text-slate-200">{course.assignedFacultyName || 'Department Faculty'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 bg-[#F8FAFD] dark:bg-slate-800/60 p-3.5 rounded-xl border border-[#DCE5F0] dark:border-slate-700">
          <Award className="w-6 h-6 text-[#2563EB]" />
          <div>
            <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase block">Course Weight</span>
            <span className="text-sm font-bold text-[#0A2147] dark:text-white">{course.credits} Credits</span>
          </div>
        </div>
      </div>

      {/* Upcoming Exam Schedule Section (Coming Exam Date for this Course) */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-blue-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">
                  Upcoming Exam Schedule
                </h3>
                {courseExams.filter((e) => !e.isArchived).length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {courseExams.filter((e) => !e.isArchived).length} Scheduled
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Official coming exam dates, timings, test topics, and room arrangement for {course.code}.
              </p>
            </div>
          </div>

          {isCR && (
            <button
              type="button"
              onClick={() => setIsScheduleExamModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Set Coming Exam Date (CR)</span>
            </button>
          )}
        </div>

        {/* Exams List */}
        <div className="mt-3.5">
          {courseExams.filter((e) => !e.isArchived).length === 0 ? (
            <div className="py-6 px-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                No upcoming exam date currently announced for this course.
              </p>
              {isCR ? (
                <button
                  type="button"
                  onClick={() => setIsScheduleExamModalOpen(true)}
                  className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Set coming exam date now
                </button>
              ) : (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Class Representative (CR) will post exam dates once announced by the course teacher.
                </p>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {courseExams
                .filter((e) => !e.isArchived)
                .map((exam) => (
                  <div
                    key={exam.id}
                    className="p-3.5 rounded-xl border border-blue-100 dark:border-slate-700 bg-gradient-to-br from-blue-50/30 via-white to-white dark:from-slate-800/60 dark:via-slate-800/40 dark:to-slate-800/30 flex flex-col justify-between shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 font-bold text-[10px] rounded uppercase border border-blue-200 dark:border-blue-800">
                          {exam.type}
                        </span>
                        {exam.daysLeft !== undefined && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              exam.daysLeft <= 1
                                ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                                : exam.daysLeft <= 3
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {exam.daysLeft === 0
                              ? '🚨 Today!'
                              : exam.daysLeft === 1
                              ? '⚠️ Tomorrow'
                              : `⏳ in ${exam.daysLeft} days`}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                        {exam.title}
                      </h4>

                      <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{exam.date}</span>
                          {exam.startTime && <span>• {exam.startTime}</span>}
                        </div>
                        {exam.room && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{exam.room}</span>
                          </div>
                        )}
                        {exam.description && (
                          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-2">
                            "{exam.description}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>By {exam.createdByName || 'CR'}</span>
                      {isCR && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteExam(exam.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
                          title="Delete Exam"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Resource Sections */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Questions Column */}
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-[#EBF1F8] dark:border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">Question Papers</h3>
              <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">({resources.questions.length})</span>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg shadow-xs transition-colors"
                title="Upload question paper for this course"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              All batches & years for <span className="font-semibold text-[#0A2147] dark:text-white">{course.code}</span>
            </p>
          </div>

          {availableYears.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-2">
              <button
                onClick={() => setSelectedYear('ALL')}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors shrink-0 ${
                  selectedYear === 'ALL'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                All Years ({resources.questions.length})
              </button>
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(String(yr))}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors shrink-0 ${
                    selectedYear === String(yr)
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3 flex-1">
            {filteredQuestions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400 italic">No question papers found.</p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="mt-2 text-xs text-[#2563EB] dark:text-blue-400 font-semibold hover:underline"
                >
                  + Upload the first question paper
                </button>
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedResource(q)}
                  className="p-3.5 bg-[#F8FAFD] dark:bg-slate-800/40 hover:bg-[#EFF5FF] dark:hover:bg-slate-800 rounded-xl border border-[#DCE5F0] dark:border-slate-700 hover:border-[#A3C0EE] hover:-translate-y-0.5 hover:shadow-xs cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 bg-[#EFF5FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 font-bold text-[10px] rounded uppercase border border-[#DBEAFE] dark:border-blue-900/50">
                          {q.examType || 'EXAM'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] rounded border border-slate-200 dark:border-slate-700">
                          {q.academicYear}
                        </span>
                        {(q.targetBatch || q.uploaderBatchName) && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold text-[10px] rounded border border-emerald-200 dark:border-emerald-800/60">
                            {q.targetBatch || q.uploaderBatchName}
                          </span>
                        )}
                      </div>
                      {user?.role === 'ADMIN' && (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteResource(q.id, e)}
                          title="Delete Question (Admin - Permanently from Supabase)"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-[#0A2147] dark:text-white mt-1 group-hover:text-[#2563EB] transition-colors leading-snug line-clamp-2">
                    {q.title}
                  </h4>
                  {q.facultyName && (
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{q.facultyName}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400 pt-1 border-t border-[#EBF1F8] dark:border-slate-700/60">
                    <span>by {q.uploaderName}</span>
                    <span className="text-[#2563EB] dark:text-blue-400 font-semibold">View Details →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lecture Notes Column (with Teacher Attached File by CR) */}
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EBF1F8] dark:border-slate-800 mb-4">
            <FileText className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">Lecture Notes & Teacher Files</h3>
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">({resources.notes.length})</span>
            {isCR && (
              <button
                type="button"
                onClick={() => setIsTeacherFileModalOpen(true)}
                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors shrink-0"
                title="Attach file provided by teacher (CR)"
              >
                <Plus className="w-3.5 h-3.5" /> Attach File (CR)
              </button>
            )}
          </div>

          <div className="space-y-3">
            {resources.notes.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-slate-400 italic">No notes uploaded yet.</p>
                {isCR && (
                  <button
                    type="button"
                    onClick={() => setIsTeacherFileModalOpen(true)}
                    className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Attach teacher's handout now
                  </button>
                )}
              </div>
            ) : (
              resources.notes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setSelectedResource(n)}
                  className="p-3.5 bg-[#F8FAFD] dark:bg-slate-800/40 hover:bg-[#EFF5FF] dark:hover:bg-slate-800 rounded-xl border border-[#DCE5F0] dark:border-slate-700 hover:border-[#A3C0EE] hover:-translate-y-0.5 hover:shadow-xs cursor-pointer transition-all duration-150 group"
                >
                  {n.facultyName && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-[9.5px] rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> Teacher Attached File
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {n.facultyName}
                      </span>
                    </div>
                  )}
                  <h4 className="text-xs font-bold text-[#0A2147] dark:text-white group-hover:text-[#2563EB] transition-colors leading-snug line-clamp-2">
                    {n.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400 pt-1 border-t border-[#EBF1F8] dark:border-slate-700/60">
                    <span>by {n.uploaderName}</span>
                    <span className="text-[#2563EB] dark:text-blue-400 font-semibold">View Details →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lab Materials Column */}
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EBF1F8] dark:border-slate-800 mb-4">
            <FolderGit2 className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">Lab Materials</h3>
            <span className="ml-auto text-xs font-bold text-[#64748B] dark:text-slate-400">({resources.labs.length})</span>
          </div>

          <div className="space-y-3">
            {resources.labs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No lab materials uploaded yet.</p>
            ) : (
              resources.labs.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedResource(l)}
                  className="p-3.5 bg-[#F8FAFD] dark:bg-slate-800/40 hover:bg-[#EFF5FF] dark:hover:bg-slate-800 rounded-xl border border-[#DCE5F0] dark:border-slate-700 hover:border-[#A3C0EE] hover:-translate-y-0.5 hover:shadow-xs cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-[#EFF5FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 font-bold text-[10px] rounded uppercase border border-[#DBEAFE] dark:border-blue-900/50">
                      {l.labCategory || 'LAB'}
                    </span>
                    <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-medium">
                      {l.fileSize || 'PDF'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#0A2147] dark:text-white mt-1.5 group-hover:text-[#2563EB] transition-colors leading-snug line-clamp-2">
                    {l.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400 pt-1 border-t border-[#EBF1F8] dark:border-slate-700/60">
                    <span>by {l.uploaderName}</span>
                    <span className="text-[#2563EB] dark:text-blue-400 font-semibold">View Details →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ResourceDetailModal
        isOpen={Boolean(selectedResource)}
        onClose={() => setSelectedResource(null)}
        resource={selectedResource}
        onDownload={handleDownload}
        onDelete={handleDeleteResource}
      />

      <UploadQuestionModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={fetchCourseDetails}
        initialCourseCode={course?.code}
        initialCourseTitle={course?.title}
      />

      {course && (
        <>
          <ScheduleCourseExamModal
            isOpen={isScheduleExamModalOpen}
            onClose={() => setIsScheduleExamModalOpen(false)}
            onSuccess={fetchCourseDetails}
            course={course}
          />

          <UploadTeacherFileModal
            isOpen={isTeacherFileModalOpen}
            onClose={() => setIsTeacherFileModalOpen(false)}
            onSuccess={fetchCourseDetails}
            course={course}
          />
        </>
      )}
    </div>
  );
};
