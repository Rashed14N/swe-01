import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
<<<<<<< HEAD
  BookOpen, User, Award, HelpCircle, FileText, FolderGit2,
  Download, ArrowLeft, ExternalLink, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Course, Faculty, Resource } from '../types';
import { FilePreviewModal } from '../components/common/FilePreviewModal';
=======
  BookOpen,
  Award,
  HelpCircle,
  FileText,
  FolderGit2,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Course, Faculty, Resource } from '../types';
import { ResourceDetailModal } from '../components/common/ResourceDetailModal';
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

export const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [resources, setResources] = useState<{
    questions: Resource[];
    notes: Resource[];
    labs: Resource[];
  }>({ questions: [], notes: [], labs: [] });

<<<<<<< HEAD
  const [selectedPreview, setSelectedPreview] = useState<Resource | null>(null);
=======
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    setIsLoading(true);

    fetch(`/api/courses/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
<<<<<<< HEAD
      .then(res => res.json())
      .then(data => {
=======
      .then((res) => res.json())
      .then((data) => {
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
        setCourse(data.course);
        setFaculty(data.faculty);
        setResources(data.resources || { questions: [], notes: [], labs: [] });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [token, id]);

  const handleDownload = (resourceId: string) => {
    fetch(`/api/resources/${resourceId}/download`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(console.error);
  };

  if (isLoading || !course) {
<<<<<<< HEAD
    return <div className="py-20 text-center text-xs text-slate-400">Loading course details...</div>;
=======
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading course details...
      </div>
    );
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Back */}
      <button
<<<<<<< HEAD
        onClick={() => navigate('/courses')}
        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline"
=======
        type="button"
        onClick={() => navigate('/courses')}
        className="text-xs font-bold text-[#0A2147] dark:text-slate-300 hover:text-[#2563EB] flex items-center gap-1.5 transition-colors cursor-pointer"
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      >
        <ArrowLeft className="w-4 h-4" /> Back to All Courses
      </button>

      {/* Course Banner */}
<<<<<<< HEAD
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 font-mono font-bold text-xs rounded-lg">
              {course.code}
            </span>
            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full">
              {course.type} • Semester {course.semester}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{course.title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Faculty: <span className="font-semibold text-slate-800">{course.assignedFacultyName || 'Dept Faculty'}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <Award className="w-6 h-6 text-amber-500" />
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Course Weight</span>
            <span className="text-sm font-extrabold text-slate-900">{course.credits} Credits</span>
=======
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
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
          </div>
        </div>
      </div>

      {/* Resource Sections */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Questions Column */}
<<<<<<< HEAD
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Question Papers</h3>
            <span className="ml-auto text-xs font-bold text-slate-400">({resources.questions.length})</span>
=======
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EBF1F8] dark:border-slate-800 mb-4">
            <HelpCircle className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">Question Papers</h3>
            <span className="ml-auto text-xs font-bold text-[#64748B] dark:text-slate-400">({resources.questions.length})</span>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
          </div>

          <div className="space-y-3">
            {resources.questions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No questions uploaded yet.</p>
            ) : (
<<<<<<< HEAD
              resources.questions.map(q => (
                <div
                  key={q.id}
                  onClick={() => setSelectedPreview(q)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                >
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{q.title}</h4>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{q.examType} {q.academicYear}</span>
                    <span className="text-blue-600 font-semibold">Preview & Download</span>
=======
              resources.questions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setSelectedResource(q)}
                  className="p-3.5 bg-[#F8FAFD] dark:bg-slate-800/40 hover:bg-[#EFF5FF] dark:hover:bg-slate-800 rounded-xl border border-[#DCE5F0] dark:border-slate-700 hover:border-[#A3C0EE] hover:-translate-y-0.5 hover:shadow-xs cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-[#EFF5FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 font-bold text-[10px] rounded uppercase border border-[#DBEAFE] dark:border-blue-900/50">
                      {q.examType || 'EXAM'}
                    </span>
                    <span className="text-[10px] text-[#64748B] dark:text-slate-400 font-medium">
                      {q.academicYear}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#0A2147] dark:text-white mt-1.5 group-hover:text-[#2563EB] transition-colors leading-snug line-clamp-2">
                    {q.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400 pt-1 border-t border-[#EBF1F8] dark:border-slate-700/60">
                    <span>by {q.uploaderName}</span>
                    <span className="text-[#2563EB] dark:text-blue-400 font-semibold">View Details →</span>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lecture Notes Column */}
<<<<<<< HEAD
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Lecture Notes</h3>
            <span className="ml-auto text-xs font-bold text-slate-400">({resources.notes.length})</span>
=======
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EBF1F8] dark:border-slate-800 mb-4">
            <FileText className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">Lecture Notes</h3>
            <span className="ml-auto text-xs font-bold text-[#64748B] dark:text-slate-400">({resources.notes.length})</span>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
          </div>

          <div className="space-y-3">
            {resources.notes.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No notes uploaded yet.</p>
            ) : (
<<<<<<< HEAD
              resources.notes.map(n => (
                <div
                  key={n.id}
                  onClick={() => setSelectedPreview(n)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                >
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{n.title}</h4>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>By: {n.uploaderName}</span>
                    <span className="text-emerald-600 font-semibold">Preview & Download</span>
=======
              resources.notes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setSelectedResource(n)}
                  className="p-3.5 bg-[#F8FAFD] dark:bg-slate-800/40 hover:bg-[#EFF5FF] dark:hover:bg-slate-800 rounded-xl border border-[#DCE5F0] dark:border-slate-700 hover:border-[#A3C0EE] hover:-translate-y-0.5 hover:shadow-xs cursor-pointer transition-all duration-150 group"
                >
                  <h4 className="text-xs font-bold text-[#0A2147] dark:text-white group-hover:text-[#2563EB] transition-colors leading-snug line-clamp-2">
                    {n.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400 pt-1 border-t border-[#EBF1F8] dark:border-slate-700/60">
                    <span>by {n.uploaderName}</span>
                    <span className="text-[#2563EB] dark:text-blue-400 font-semibold">View Details →</span>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

<<<<<<< HEAD
        {/* Lab Files Column */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <FolderGit2 className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Lab Materials</h3>
            <span className="ml-auto text-xs font-bold text-slate-400">({resources.labs.length})</span>
=======
        {/* Lab Materials Column */}
        <div className="bg-white dark:bg-[#0F172A] rounded-xl border border-[#D8E2EE] dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-[#EBF1F8] dark:border-slate-800 mb-4">
            <FolderGit2 className="w-5 h-5 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0A2147] dark:text-white">Lab Materials</h3>
            <span className="ml-auto text-xs font-bold text-[#64748B] dark:text-slate-400">({resources.labs.length})</span>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
          </div>

          <div className="space-y-3">
            {resources.labs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No lab materials uploaded yet.</p>
            ) : (
<<<<<<< HEAD
              resources.labs.map(l => (
                <div
                  key={l.id}
                  onClick={() => setSelectedPreview(l)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-colors"
                >
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">{l.title}</h4>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                    <span>{l.labCategory}</span>
                    <span className="text-purple-600 font-semibold">Preview & Download</span>
=======
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
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <FilePreviewModal
        isOpen={Boolean(selectedPreview)}
        onClose={() => setSelectedPreview(null)}
        resource={selectedPreview}
=======
      <ResourceDetailModal
        isOpen={Boolean(selectedResource)}
        onClose={() => setSelectedResource(null)}
        resource={selectedResource}
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
        onDownload={handleDownload}
      />
    </div>
  );
};
