import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, User, Award, HelpCircle, FileText, FolderGit2,
  Download, ArrowLeft, ExternalLink, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Course, Faculty, Resource } from '../types';
import { FilePreviewModal } from '../components/common/FilePreviewModal';

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

  const [selectedPreview, setSelectedPreview] = useState<Resource | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    setIsLoading(true);

    fetch(`/api/courses/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
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
    return <div className="py-20 text-center text-xs text-slate-400">Loading course details...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Back */}
      <button
        onClick={() => navigate('/courses')}
        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> Back to All Courses
      </button>

      {/* Course Banner */}
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
          </div>
        </div>
      </div>

      {/* Resource Sections */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Questions Column */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Question Papers</h3>
            <span className="ml-auto text-xs font-bold text-slate-400">({resources.questions.length})</span>
          </div>

          <div className="space-y-3">
            {resources.questions.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No questions uploaded yet.</p>
            ) : (
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
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lecture Notes Column */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Lecture Notes</h3>
            <span className="ml-auto text-xs font-bold text-slate-400">({resources.notes.length})</span>
          </div>

          <div className="space-y-3">
            {resources.notes.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No notes uploaded yet.</p>
            ) : (
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
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lab Files Column */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <FolderGit2 className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">Lab Materials</h3>
            <span className="ml-auto text-xs font-bold text-slate-400">({resources.labs.length})</span>
          </div>

          <div className="space-y-3">
            {resources.labs.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No lab materials uploaded yet.</p>
            ) : (
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
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <FilePreviewModal
        isOpen={Boolean(selectedPreview)}
        onClose={() => setSelectedPreview(null)}
        resource={selectedPreview}
        onDownload={handleDownload}
      />
    </div>
  );
};
