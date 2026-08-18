import React, { useState, useEffect } from 'react';
import { User, Upload, CheckCircle2, Clock, XCircle, FileText, Award, ShieldCheck, HelpCircle, FolderGit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Resource, ResourceType } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [myContributions, setMyContributions] = useState<Resource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('QUESTION');
  const [courseCode, setCourseCode] = useState('SWE 305');
  const [courseTitle, setCourseTitle] = useState('Database Systems');
  const [semester, setSemester] = useState(user?.currentSemester || 5);
  const [academicYear, setAcademicYear] = useState(2026);
  const [examType, setExamType] = useState('FINAL');
  const [labCategory, setLabCategory] = useState('LAB_MANUAL');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');

  const fetchMyContributions = () => {
    if (!token) return;
    setIsLoading(true);
    fetch('/api/resources/my-uploads', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setMyContributions(data.resources || []))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchMyContributions();
  }, [token]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !courseCode || !courseTitle) {
      addToast('error', 'Please fill in title and course details');
      return;
    }

    setIsUploading(true);
    try {
      const res = await fetch('/api/resources/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          type,
          courseCode,
          courseTitle,
          semester: Number(semester),
          academicYear: Number(academicYear),
          examType,
          labCategory,
          description,
          fileUrl: fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileName: `${type.toLowerCase()}_${courseCode.replace(' ', '')}.pdf`,
          fileSize: '1.4 MB',
        }),
      });

      if (res.ok) {
        addToast('success', 'Resource submitted for CR / Admin verification!');
        setTitle('');
        setDescription('');
        setFileUrl('');
        fetchMyContributions();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Upload failed');
      }
    } catch (e) {
      addToast('error', 'Server error during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved & Public
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Verification Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Verification
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-md">
            {user?.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                {user?.batchName}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Student ID: {user?.studentId} • {user?.email}
            </p>
            <span className="text-[11px] font-semibold text-slate-600 mt-1 block">
              Role: <strong className="text-blue-600">{user?.role}</strong> • Semester {user?.currentSemester}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center gap-3">
          <Award className="w-6 h-6 text-amber-500" />
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Contributions</span>
            <span className="text-base font-extrabold text-slate-900">{myContributions.length} Files</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upload Form (Left Column) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Upload className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Contribute Resource</h3>
              <p className="text-[10px] text-slate-500">Share study materials with your department</p>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Resource Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as ResourceType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
              >
                <option value="QUESTION">Question Paper</option>
                <option value="NOTE">Lecture Notes</option>
                <option value="LAB">Lab Resource / Code</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Resource Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Database Systems Midterm 2025 Solved"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  value={courseCode}
                  onChange={e => setCourseCode(e.target.value)}
                  placeholder="SWE 305"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Semester</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={8}
                  value={semester}
                  onChange={e => setSemester(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Course Title</label>
              <input
                type="text"
                required
                value={courseTitle}
                onChange={e => setCourseTitle(e.target.value)}
                placeholder="Database Systems"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            {type === 'QUESTION' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Exam Type</label>
                  <select
                    value={examType}
                    onChange={e => setExamType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="FINAL">Final</option>
                    <option value="MIDTERM">Midterm</option>
                    <option value="QUIZ">Quiz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    value={academicYear}
                    onChange={e => setAcademicYear(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>
            )}

            {type === 'LAB' && (
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Lab Category</label>
                <select
                  value={labCategory}
                  onChange={e => setLabCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                >
                  <option value="LAB_MANUAL">Lab Manual</option>
                  <option value="SOURCE_CODE">Source Code</option>
                  <option value="VIVA_QUESTIONS">Viva Questions</option>
                  <option value="LAB_REPORT">Sample Report</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">File URL / Attachment</label>
              <input
                type="url"
                value={fileUrl}
                onChange={e => setFileUrl(e.target.value)}
                placeholder="https://drive.google.com/... or direct PDF link"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Leave blank to attach standard PDF preview document.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Description / Notes</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Short description of this material..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>
        </div>

        {/* My Submissions List (Right 2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">My Uploaded Contributions</h3>
              <span className="text-xs text-slate-500">Verification Status Queue</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading your contributions...</div>
            ) : myContributions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                You haven't contributed any resources yet. Use the upload form on the left to contribute question papers, notes, or lab files!
              </div>
            ) : (
              <div className="space-y-3">
                {myContributions.map(res => (
                  <div
                    key={res.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{res.title}</span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold font-mono rounded">
                          {res.courseCode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Type: {res.type} • Semester {res.semester} • Date: {res.createdAt?.split('T')[0]}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(res.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
