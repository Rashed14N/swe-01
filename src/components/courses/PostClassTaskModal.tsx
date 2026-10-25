import React, { useState, useEffect } from 'react';
import { X, ClipboardList, Calendar, User, FileText, Link, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import type { Course, ClassTask, ClassTaskType } from '../../types';

interface PostClassTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskAdded?: (newTask: ClassTask) => void;
  courses: Course[];
  preselectedCourseId?: string;
}

export const PostClassTaskModal: React.FC<PostClassTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskAdded,
  courses,
  preselectedCourseId,
}) => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [courseId, setCourseId] = useState(preselectedCourseId || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ClassTaskType>('TASK');
  const [facultyName, setFacultyName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedCourseId) {
      setCourseId(preselectedCourseId);
      const c = courses.find((item) => item.id === preselectedCourseId || item.code === preselectedCourseId);
      if (c && c.assignedFacultyName) {
        setFacultyName(c.assignedFacultyName);
      }
    } else if (courses.length > 0 && !courseId) {
      setCourseId(courses[0].id);
      if (courses[0].assignedFacultyName) {
        setFacultyName(courses[0].assignedFacultyName);
      }
    }
  }, [preselectedCourseId, courses]);

  // Update faculty name when course changes
  const handleCourseChange = (selectedId: string) => {
    setCourseId(selectedId);
    const c = courses.find((item) => item.id === selectedId);
    if (c?.assignedFacultyName) {
      setFacultyName(c.assignedFacultyName);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !title.trim()) {
      addToast('error', 'Please select a course and enter the task title');
      return;
    }

    const selectedCourse = courses.find((c) => c.id === courseId || c.code === courseId);
    if (!selectedCourse) {
      addToast('error', 'Invalid course selected');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/class-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          courseCode: selectedCourse.code,
          courseTitle: selectedCourse.title,
          semester: selectedCourse.semester,
          batchId: user?.batchId || selectedCourse.batchIds?.[0] || 'batch-9',
          date,
          dueDate: dueDate.trim() || undefined,
          title: title.trim(),
          description: description.trim(),
          type,
          facultyName: facultyName.trim() || selectedCourse.assignedFacultyName || undefined,
          attachmentUrl: attachmentUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to post class task');
      }

      addToast('success', `Class task posted for ${selectedCourse.code} with date ${date}!`);
      if (onTaskAdded && data.task) {
        onTaskAdded(data.task);
      }
      onClose();
    } catch (err: any) {
      console.error('[PostClassTaskModal Error]:', err);
      addToast('error', err.message || 'Error posting class task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-[#0F172A] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0B2348] dark:text-white">
                Post Class Task (CR)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Post a course task, assignment, or class update with the date
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Course & Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Respective Course *
              </label>
              <select
                value={courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title} (Sem {c.semester})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Class / Update Date *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Task / Update Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Assignment 2: Exception Handling in Java, Bring lab report next class..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Task Type & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Post Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ClassTaskType)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="TASK">Class Task</option>
                <option value="ASSIGNMENT">Assignment</option>
                <option value="CLASS_UPDATE">Class Update</option>
                <option value="HOMEWORK">Homework</option>
                <option value="LAB_REPORT">Lab Report</option>
                <option value="PROJECT">Project Work</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Submission Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Task Description / Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Task Details & Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Provide exact instructions, required format, questions, or guidance given by the faculty..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 leading-relaxed font-normal resize-none"
            />
          </div>

          {/* Teacher Name & Link Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Course Teacher (Optional)
              </label>
              <input
                type="text"
                placeholder="Faculty name"
                value={facultyName}
                onChange={(e) => setFacultyName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Attachment / Reference Link (Optional)
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Posting...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Post Class Task</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
