import React, { useState, useMemo } from 'react';
import {
  ClipboardList, Plus, Search, ExternalLink, Trash2,
  Calendar, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import type { Course, ClassTask } from '../../types';

interface ClassTasksSectionProps {
  tasks: ClassTask[];
  courses: Course[];
  onAddTaskClick?: () => void;
  onTaskDeleted?: (taskId: string) => void;
  filterCourseId?: string;
}

// Parse date into structured day, month, and human-friendly flags
const parseTaskDate = (dateStr?: string) => {
  if (!dateStr) return { day: '--', month: '---', isToday: false, isYesterday: false, formatted: '' };
  try {
    const parts = dateStr.split('-');
    let d: Date;
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) {
      return { day: '--', month: dateStr.slice(0, 3).toUpperCase(), isToday: false, isYesterday: false, formatted: dateStr };
    }
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { day, month, isToday, isYesterday, formatted };
  } catch {
    return { day: '--', month: '---', isToday: false, isYesterday: false, formatted: dateStr };
  }
};

// Due date calculation & styling
const formatDueDate = (dueStr?: string) => {
  if (!dueStr) return null;
  try {
    const parts = dueStr.split('-');
    let d: Date;
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dueStr);
    }
    if (isNaN(d.getTime())) return { label: `Due: ${dueStr}`, isUrgent: false, isOverdue: false };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const formatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (diffDays === 0) return { label: 'Due Today', isUrgent: true, isOverdue: false };
    if (diffDays === 1) return { label: 'Due Tomorrow', isUrgent: true, isOverdue: false };
    if (diffDays < 0) return { label: `Overdue (${formatted})`, isUrgent: true, isOverdue: true };
    if (diffDays <= 3) return { label: `Due in ${diffDays}d (${formatted})`, isUrgent: true, isOverdue: false };
    return { label: `Due: ${formatted}`, isUrgent: false, isOverdue: false };
  } catch {
    return { label: `Due: ${dueStr}`, isUrgent: false, isOverdue: false };
  }
};

// Task type visual tags
const getTypeConfig = (type?: string) => {
  switch (type) {
    case 'ASSIGNMENT':
      return {
        label: 'Assignment',
        className: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800',
      };
    case 'HOMEWORK':
      return {
        label: 'Homework',
        className: 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200/80 dark:border-purple-800',
      };
    case 'LAB_REPORT':
      return {
        label: 'Lab Report',
        className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800',
      };
    case 'CLASS_UPDATE':
      return {
        label: 'Class Update',
        className: 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200/80 dark:border-sky-800',
      };
    case 'PROJECT':
      return {
        label: 'Project',
        className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
      };
    default:
      return {
        label: 'Class Task',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
  }
};

export const ClassTasksSection: React.FC<ClassTasksSectionProps> = ({
  tasks,
  courses,
  onAddTaskClick,
  onTaskDeleted,
  filterCourseId,
}) => {
  const { user, token } = useAuth();
  const { addToast } = useNotifications();

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(filterCourseId || 'ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');

  // Completed tasks persistent tracker in browser
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem('swe_completed_class_tasks');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const isCRorAdmin = user?.role === 'ADMIN' || user?.role === 'CR' || (user as any)?.isCR;

  // Toggle student task completed
  const handleToggleCompleted = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedTaskIds((prev) => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      try {
        localStorage.setItem('swe_completed_class_tasks', JSON.stringify(next));
      } catch (err) {
        console.warn('Could not save task state:', err);
      }
      return next;
    });
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Course scope filter
    if (filterCourseId) {
      const codeClean = filterCourseId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      result = result.filter(
        (t) =>
          t.courseId === filterCourseId ||
          (courses.length > 0 && courses.some((c) => c.id === t.courseId)) ||
          t.courseCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === codeClean
      );
    } else if (selectedCourseFilter !== 'ALL') {
      const codeClean = selectedCourseFilter.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      result = result.filter(
        (t) =>
          t.courseId === selectedCourseFilter ||
          t.courseCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === codeClean
      );
    }

    // Status filter
    if (statusFilter === 'PENDING') {
      result = result.filter((t) => !completedTaskIds[t.id]);
    } else if (statusFilter === 'COMPLETED') {
      result = result.filter((t) => completedTaskIds[t.id]);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.courseCode.toLowerCase().includes(q) ||
          t.courseTitle.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.facultyName && t.facultyName.toLowerCase().includes(q)) ||
          (t.type && t.type.toLowerCase().includes(q))
      );
    }

    return result;
  }, [tasks, filterCourseId, courses, selectedCourseFilter, statusFilter, searchQuery, completedTaskIds]);

  const completedCount = useMemo(() => {
    return filteredTasks.filter((t) => completedTaskIds[t.id]).length;
  }, [filteredTasks, completedTaskIds]);

  const handleDelete = async (taskId: string, taskTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete the class task "${taskTitle}"?`)) return;

    try {
      const res = await fetch(`/api/class-tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete class task');
      }

      addToast('success', 'Class task deleted');
      if (onTaskDeleted) {
        onTaskDeleted(taskId);
      }
    } catch (err: any) {
      console.error('[Delete ClassTask Error]:', err);
      addToast('error', err.message || 'Could not delete task');
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-[#D8E2EE] dark:border-slate-800 shadow-2xs overflow-hidden transition-all">
      {/* 1. Header Toolbar */}
      <div className="p-3.5 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 bg-gradient-to-r from-blue-50/50 via-slate-50/40 to-white dark:from-slate-900/60 dark:via-[#0F172A] dark:to-blue-950/20">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm sm:text-base font-extrabold text-[#0B2348] dark:text-white tracking-tight">
            {filterCourseId ? `Class Tasks & Updates (${filterCourseId})` : 'Class Tasks & Updates'}
          </h3>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'}
          </span>
          {completedCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              {completedCount} Done
            </span>
          )}
        </div>

        {/* Action Button: Post Class Task for CR/Admin */}
        {isCRorAdmin && onAddTaskClick && (
          <button
            onClick={onAddTaskClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Post Class Task</span>
          </button>
        )}
      </div>

      {/* 2. Filters & Search Row (Only when multiple courses are present) */}
      {!filterCourseId && (
        <div className="p-3 sm:px-5 sm:py-3 border-b border-slate-100 dark:border-slate-800 bg-[#FAFBFD] dark:bg-slate-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Course Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
            <button
              onClick={() => setSelectedCourseFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCourseFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              All Courses ({tasks.length})
            </button>

            {courses.map((c) => {
              const count = tasks.filter(
                (t) =>
                  t.courseId === c.id ||
                  t.courseCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() ===
                    c.code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
              ).length;

              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCourseFilter(c.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    selectedCourseFilter === c.code
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{c.code}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        selectedCourseFilter === c.code
                          ? 'bg-blue-700 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Status Tabs & Search Box */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Status Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'PENDING'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Done
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topic or assignment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Tasks List Cards */}
      <div className="p-4 sm:p-5">
        {filteredTasks.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-slate-50/60 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 mx-auto flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {searchQuery || selectedCourseFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No class tasks matching your filters'
                  : 'No class tasks posted yet'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
                {isCRorAdmin
                  ? 'Click "Post Class Task" above to publish assignments, homework, or class updates for this course with the date!'
                  : 'Class Representatives (CR) will post tasks and updates here with the respective date.'}
              </p>
            </div>
            {isCRorAdmin && onAddTaskClick && (
              <button
                onClick={onAddTaskClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Post First Task</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredTasks.map((item) => {
              const isCompleted = Boolean(completedTaskIds[item.id]);
              const dateInfo = parseTaskDate(item.date);
              const typeConfig = getTypeConfig(item.type);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 relative group ${
                    isCompleted
                      ? 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/60 opacity-75'
                      : 'bg-white dark:bg-[#0F172A] border-slate-200/90 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  {/* Top Meta Line: Course Badge + Title + Type */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Course Code */}
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {item.courseCode}
                      </span>

                      {/* Course Full Title */}
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[220px] sm:max-w-none">
                        {item.courseTitle}
                      </span>

                      {/* Task Type Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${typeConfig.className}`}>
                        {typeConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Title Row with Completion Checkbox - Full Card Width */}
                  <div className="flex items-start gap-2.5 w-full">
                    <button
                      onClick={(e) => handleToggleCompleted(item.id, e)}
                      title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
                      className={`mt-0.5 w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-white dark:slate-800'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <h4
                      className={`text-base sm:text-lg font-bold text-[#0B2348] dark:text-white leading-snug break-words flex-1 ${
                        isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                      }`}
                    >
                      {item.title}
                    </h4>
                  </div>

                  {/* Description Box - Full Card Width with light padding on both sides */}
                  {item.description && (
                    <div className="mt-3 w-full text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50/80 dark:bg-slate-800/40 px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-xl border border-slate-100 dark:border-slate-800/70">
                      {item.description}
                    </div>
                  )}

                  {/* Bottom Footer Metadata - Date with Delete Button beside it, and Attachment on right */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 w-full">
                    <div className="flex items-center gap-2.5 font-medium flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Date: <strong className="text-slate-700 dark:text-slate-200">{dateInfo.formatted || item.date}</strong></span>
                      </div>

                      {/* Delete Button for CR/Admin - placed right next to Date */}
                      {isCRorAdmin && (
                        <button
                          onClick={(e) => handleDelete(item.id, item.title, e)}
                          title="Delete class task"
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-md transition-colors cursor-pointer text-[11px] font-semibold border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>

                    {/* Attachment Link */}
                    {item.attachmentUrl && (
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-100 dark:hover:bg-blue-900 font-bold transition-colors text-xs ml-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{item.attachmentName || 'View Attachment'}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
