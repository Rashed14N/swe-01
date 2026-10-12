import React, { useState } from 'react';
import { X, FileUp, GraduationCap, FileText, CheckCircle2, Paperclip, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Course } from '../../types';

interface UploadTeacherFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  course: Course;
}

export const UploadTeacherFileModal: React.FC<UploadTeacherFileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  course,
}) => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'NOTE' | 'LAB'>('NOTE');
  const [facultyName, setFacultyName] = useState(course.assignedFacultyName || 'Department Faculty');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fileSize, setFileSize] = useState('2.5 MB');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSimulatedFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        addToast('error', `File size exceeds 1 MB limit (selected: ${(file.size / (1024 * 1024)).toFixed(2)} MB). Maximum allowed size is 1 MB.`);
        e.target.value = '';
        return;
      }
      setFileName(file.name);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
      }
      const sizeKB = (file.size / 1024).toFixed(0);
      setFileSize(`${sizeKB} KB`);
      setFileUrl(`https://storage.mu-swe-portal.edu/materials/${encodeURIComponent(file.name)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!title.trim()) {
      addToast('error', 'Please enter a title for the teacher file');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalFileName = fileName.trim() || `${title.trim().replace(/\s+/g, '_')}.pdf`;
      const finalFileUrl = fileUrl.trim() || `https://storage.mu-swe-portal.edu/materials/${encodeURIComponent(finalFileName)}`;

      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          type: category,
          courseId: course.id,
          courseCode: course.code,
          courseTitle: course.title,
          semester: course.semester,
          academicYear: new Date().getFullYear(),
          facultyName: facultyName.trim(),
          targetBatch: user?.batchName || 'SWE Batch',
          description: description.trim() || `Teacher attached file provided by ${facultyName.trim()} via Class Representative (CR).`,
          fileUrl: finalFileUrl,
          fileName: finalFileName,
          fileSize: fileSize || '2.0 MB',
          fileType: 'application/pdf',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload teacher file');
      }

      addToast('success', `Teacher file "${title}" attached and approved!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'Error uploading teacher file');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Attach Teacher File / Handout (CR)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official slides & materials for {course.code} ({course.title})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* File Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Material Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chapter 4 - Tree & Graphs Slides (Prof. Lukman)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Category & Teacher Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCategory('NOTE')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    category === 'NOTE'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Lecture Notes / Slides
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('LAB')}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                    category === 'LAB'
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Lab Manual / Task
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-emerald-500" /> Course Teacher *
              </label>
              <input
                type="text"
                required
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                placeholder="Faculty Name (e.g. Lukman Hussain Nakib)"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* File Selector & Attachment Info */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Paperclip className="w-3 h-3 text-blue-500" /> Attached File (PDF, Slide, PPTX, Doc) *
            </label>
            <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-800/40 text-center">
              <input
                type="file"
                id="teacher-file-input"
                onChange={handleSimulatedFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.txt"
              />
              <label
                htmlFor="teacher-file-input"
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <FileUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Select File from Device</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-1">
                Supports PDF, PPT, PPTX, DOC, ZIP (Maximum allowed file size: 1 MB)
              </p>
              {fileName && (
                <div className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 py-1 px-2 rounded-lg border border-emerald-200 dark:border-emerald-800 inline-block">
                  Selected: {fileName} ({fileSize})
                </div>
              )}
            </div>
          </div>

          {/* Optional File URL override */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <LinkIcon className="w-3 h-3 text-slate-400" /> Or Direct Link / Google Drive / URL
            </label>
            <input
              type="url"
              placeholder="https://drive.google.com/file/... or direct file link"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description / Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-blue-500" /> Teacher's Notes / Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Teacher asked to complete the exercise problems on slide 22 before next Monday."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Uploading...' : 'Publish Teacher File'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
