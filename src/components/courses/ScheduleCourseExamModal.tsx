import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Course, ExamType } from '../../types';

interface ScheduleCourseExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  course: Course;
}

const EXAM_TYPE_OPTIONS: { label: string; value: ExamType }[] = [
  { label: 'Class Test (CT)', value: 'CLASS_TEST' },
  { label: 'Quiz', value: 'QUIZ' },
  { label: 'Midterm Exam', value: 'MIDTERM' },
  { label: 'Final Exam', value: 'FINAL' },
  { label: 'Lab Exam', value: 'LAB_EXAM' },
  { label: 'Assignment Deadline', value: 'ASSIGNMENT' },
  { label: 'Project Presentation', value: 'PRESENTATION' },
  { label: 'Viva Voce', value: 'VIVA' },
];

export const ScheduleCourseExamModal: React.FC<ScheduleCourseExamModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  course,
}) => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [type, setType] = useState<ExamType>('CLASS_TEST');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [room, setRoom] = useState('Room 402');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!title.trim()) {
      addToast('error', 'Please provide an exam title');
      return;
    }
    if (!date) {
      addToast('error', 'Please choose the exam date');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchId: user?.batchId || course.batchIds?.[0] || 'batch-9',
          courseId: course.id,
          courseCode: course.code,
          courseTitle: course.title,
          type,
          title: title.trim(),
          date,
          startTime: startTime.trim(),
          room: room.trim(),
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule exam');
      }

      addToast('success', `Exam date for ${course.code} scheduled successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', err.message || 'Error scheduling exam');
    } finally {
      setIsSubmitting(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Set Coming Exam Date (CR Portal)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {course.code} • {course.title}
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
          {/* Exam Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Exam Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXAM_TYPE_OPTIONS.map((opt) => {
                const isSelected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all text-center truncate ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exam Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Exam Title / Name *
            </label>
            <input
              type="text"
              required
              placeholder={`e.g. ${type === 'CLASS_TEST' ? 'Class Test 2 (Unit 3 & 4)' : type === 'MIDTERM' ? 'Midterm Examination' : 'Final Assessment'}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Date, Time & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-500" /> Date *
              </label>
              <input
                type="date"
                required
                min={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" /> Start Time
              </label>
              <input
                type="text"
                placeholder="10:00 AM"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-500" /> Room
              </label>
              <input
                type="text"
                placeholder="Room 402 / Lab 3"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description / Syllabus */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-blue-500" /> Syllabus / Topics / Teacher Notice
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Chapter 3, 4 and slide 12-25. Non-programmable calculator allowed."
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Scheduling...' : 'Save & Publish Exam Date'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
