import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
import { BookOpen, Plus, Search, Edit2, Trash2, Users, Check, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Course, Faculty, Batch } from '../../types';

export const AdminCoursesPage: React.FC = () => {
  const { token } = useAuth();
=======
import { BookOpen, Plus, Search, Edit2, Trash2, Check, RefreshCw } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { adminApiClient } from '../../services/adminApiClient';
import type { Course, Faculty, Batch } from '../../types';

export const AdminCoursesPage: React.FC = () => {
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
  const { addToast } = useNotifications();

  const [courses, setCourses] = useState<Course[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [batchesList, setBatchesList] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    code: '',
    title: '',
    shortName: '',
    credits: 3,
    type: 'THEORY' as 'THEORY' | 'LAB' | 'PROJECT',
    semester: 5,
    assignedFacultyId: '',
    batchIds: [] as string[],
  });

  const fetchData = async () => {
<<<<<<< HEAD
    if (!token) return;
    setIsLoading(true);
    try {
      const [resCourses, resFaculty, resBatches] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/faculty'),
        fetch('/api/admin/batches', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (resCourses.ok) {
        const data = await resCourses.json();
        setCourses(data.courses || []);
      }
      if (resFaculty.ok) {
        const data = await resFaculty.json();
        setFacultyList(data.faculty || []);
      }
      if (resBatches.ok) {
        const data = await resBatches.json();
        setBatchesList(data.batches || []);
      }
    } catch (e) {
      console.error(e);
=======
    setIsLoading(true);
    try {
      const [coursesData, facultyData, batchesData] = await Promise.all([
        adminApiClient.getCourses(),
        adminApiClient.getFaculty(),
        adminApiClient.getBatches(),
      ]);

      setCourses(coursesData);
      setFacultyList(facultyData);
      setBatchesList(batchesData);
    } catch (e: any) {
      console.error(e);
      addToast('error', e.message || 'Failed to load course offerings');
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
<<<<<<< HEAD
  }, [token]);
=======
  }, []);
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)

  const handleOpenAddModal = () => {
    setEditingCourse(null);
    setForm({
      code: '',
      title: '',
      shortName: '',
      credits: 3,
      type: 'THEORY',
      semester: 5,
      assignedFacultyId: facultyList[0]?.id || '',
<<<<<<< HEAD
      batchIds: batchesList.map(b => b.id), // default assign to all or select
=======
      batchIds: batchesList.map(b => b.id),
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setEditingCourse(course);
    setForm({
      code: course.code,
      title: course.title,
      shortName: course.shortName || '',
      credits: course.credits,
      type: course.type,
      semester: course.semester,
      assignedFacultyId: course.assignedFacultyId || '',
      batchIds: course.batchIds || [],
    });
    setIsModalOpen(true);
  };

  const handleToggleBatch = (batchId: string) => {
    setForm(prev => {
      const exists = prev.batchIds.includes(batchId);
      if (exists) {
        return { ...prev, batchIds: prev.batchIds.filter(id => id !== batchId) };
      } else {
        return { ...prev, batchIds: [...prev.batchIds, batchId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.code.trim() || !form.title.trim()) {
      addToast('error', 'Course code and title are required');
      return;
    }

    setIsSubmitting(true);
    try {
<<<<<<< HEAD
      const url = editingCourse ? `/api/courses/${editingCourse.id}` : '/api/courses';
      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        addToast('success', editingCourse ? 'Course updated successfully!' : 'New course added successfully!');
        setIsModalOpen(false);
        fetchData();
      } else {
        addToast('error', data?.error || `Failed to save course (HTTP ${res.status})`);
      }
    } catch (e: any) {
      console.error('[AdminCoursesPage] Submit error:', e);
      addToast('error', e?.message || 'Server error');
=======
      if (editingCourse) {
        await adminApiClient.updateCourse(editingCourse.id, form);
        addToast('success', `Course "${form.code}" updated successfully in Supabase!`);
      } else {
        await adminApiClient.createCourse(form);
        addToast('success', `New course "${form.code}" created successfully in Supabase!`);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      console.error('[AdminCoursesPage] Submit error:', e);
      addToast('error', e?.message || 'Server error saving course');
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseCode: string) => {
    if (!window.confirm(`Are you sure you want to delete course ${courseCode}?`)) return;

    try {
<<<<<<< HEAD
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        addToast('success', `Course ${courseCode} deleted.`);
        fetchData();
      } else {
        addToast('error', data?.error || 'Failed to delete course');
      }
    } catch (e: any) {
      console.error('[AdminCoursesPage] Delete error:', e);
      addToast('error', e?.message || 'Server error');
=======
      await adminApiClient.deleteCourse(courseId);
      addToast('success', `Course ${courseCode} deleted from Supabase.`);
      fetchData();
    } catch (e: any) {
      console.error('[AdminCoursesPage] Delete error:', e);
      addToast('error', e?.message || 'Failed to delete course');
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
    }
  };

  const filtered = courses.filter(
    c =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Course Offerings & Batch Assignment</h1>
          <p className="text-xs text-slate-500 mt-1">
<<<<<<< HEAD
            Add new courses, assign faculty instructors, edit existing offerings, and map courses to specific academic batches.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Course
        </button>
=======
            Manage course syllabus, assign faculty instructors, and map course subjects to student academic cohorts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Refresh courses"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add New Course
          </button>
        </div>
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
      </div>

      {/* Search */}
      <div className="relative bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-7 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search course by title or code..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900"
        />
      </div>

      {/* Courses Table */}
      <div className="bg-white rounded-xl border border-[#CBD8E8] shadow-md overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading course catalog...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F1F5FA] border-b border-[#CBD8E8] text-[#3B4C63] font-extrabold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Course Code</th>
                  <th className="px-4 py-3">Course Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Semester</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Assigned Faculty</th>
                  <th className="px-4 py-3">Assigned Batches</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E8F2] font-medium">
<<<<<<< HEAD
                {filtered.map(c => {
                  const assignedBatchNames = batchesList
                    .filter(b => c.batchIds.includes(b.id))
                    .map(b => b.name);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-blue-700">{c.code}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {c.title}
                        {c.shortName && (
                          <span className="ml-2 px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[10px] rounded">
                            {c.shortName}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            c.type === 'THEORY'
                              ? 'bg-blue-100 text-blue-800'
                              : c.type === 'LAB'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {c.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.semester}th Semester</td>
                      <td className="px-4 py-3 text-slate-700">{c.credits} Credits</td>
                      <td className="px-4 py-3 text-slate-800 font-bold">
                        {c.assignedFacultyName || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">
                        {assignedBatchNames.length === 0 ? (
                          <span className="text-slate-400 text-[10px]">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {assignedBatchNames.map((name, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded border border-slate-200"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c.id, c.code)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
=======
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No courses found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => {
                    const assignedBatchNames = batchesList
                      .filter(b => c.batchIds?.includes(b.id))
                      .map(b => b.name);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{c.code}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {c.title}
                          {c.shortName && (
                            <span className="ml-2 px-1.5 py-0.5 bg-slate-900 text-amber-300 font-extrabold text-[10px] rounded">
                              {c.shortName}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              c.type === 'THEORY'
                                ? 'bg-blue-100 text-blue-800'
                                : c.type === 'LAB'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {c.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{c.semester}th Semester</td>
                        <td className="px-4 py-3 text-slate-700">{c.credits} Credits</td>
                        <td className="px-4 py-3 text-slate-800 font-bold">
                          {c.assignedFacultyName || 'Not Assigned'}
                        </td>
                        <td className="px-4 py-3">
                          {assignedBatchNames.length === 0 ? (
                            <span className="text-slate-400 text-[10px]">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {assignedBatchNames.map((name, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded border border-slate-200"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(c.id, c.code)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT COURSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingCourse ? `Edit Course: ${editingCourse.code}` : 'Add New Course'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SWE 305"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Type *</label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="THEORY">THEORY</option>
                    <option value="LAB">LAB</option>
                    <option value="PROJECT">PROJECT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Database Systems"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Routine Short Name</label>
                  <input
                    type="text"
                    placeholder="e.g. DBMS"
                    value={form.shortName}
                    onChange={e => setForm({ ...form, shortName: e.target.value })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credit Hours *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="6"
                    required
                    value={form.credits}
                    onChange={e => setForm({ ...form, credits: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester Designation *</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={form.semester}
                    onChange={e => setForm({ ...form, semester: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              {/* Faculty Selector Dropdown */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign Instructing Faculty</label>
                <select
                  value={form.assignedFacultyId}
                  onChange={e => setForm({ ...form, assignedFacultyId: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-medium"
                >
                  <option value="">-- No Faculty Assigned --</option>
                  {facultyList.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.designation})
                    </option>
                  ))}
                </select>
              </div>

              {/* Batches Selector Checkboxes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assign to Academic Batches</label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {batchesList.map(b => {
                    const isSelected = form.batchIds.includes(b.id);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => handleToggleBatch(b.id)}
                        className={`p-2 rounded-lg text-left text-xs font-bold transition-all flex items-center justify-between border ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span>{b.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
<<<<<<< HEAD
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
=======
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs disabled:opacity-50"
>>>>>>> ae955ef (Update question bank, exam types and added FAQ)
                >
                  {isSubmitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
