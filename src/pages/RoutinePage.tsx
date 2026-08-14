import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User, LayoutGrid, ListFilter, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { RoutineSlot } from '../types';
import { VisualRoutineGrid } from '../components/routine/VisualRoutineGrid';

export const RoutinePage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();

  const [routines, setRoutines] = useState<RoutineSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal for CR/Admin editing routine class slots
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RoutineSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [slotForm, setSlotForm] = useState({
    batchId: user?.batchId || 'batch-9',
    day: 'SUNDAY' as 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    courseCode: 'SWE 305',
    courseTitle: 'Database Systems',
    courseShortName: 'DBMS',
    teacherName: 'Dr. Tanvir Rahman',
    teacherShortName: 'TR',
    room: '502 Lab',
  });

  const canEdit = user?.role === 'ADMIN' || user?.role === 'CR';

  const fetchRoutines = () => {
    if (!token) return;
    setIsLoading(true);
    fetch(`/api/routines?batchId=${user?.batchId || 'batch-9'}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setRoutines(data.routines || []);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchRoutines();
  }, [token, user]);

  const handleOpenAddModal = (day?: string) => {
    setEditingSlot(null);
    setSlotForm({
      batchId: user?.batchId || 'batch-9',
      day: (day as any) || 'SUNDAY',
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      courseCode: 'SWE 305',
      courseTitle: 'Database Systems',
      courseShortName: 'DBMS',
      teacherName: 'Dr. Tanvir Rahman',
      teacherShortName: 'TR',
      room: '502 Lab',
    });
    setIsSlotModalOpen(true);
  };

  const handleOpenEditModal = (slot: RoutineSlot) => {
    setEditingSlot(slot);
    setSlotForm({
      batchId: slot.batchId,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      courseCode: slot.courseCode,
      courseTitle: slot.courseTitle,
      courseShortName: slot.courseShortName || '',
      teacherName: slot.teacherName,
      teacherShortName: slot.teacherShortName || '',
      room: slot.room,
    });
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingSlot ? `/api/routines/${editingSlot.id}` : '/api/routines';
      const method = editingSlot ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(slotForm),
      });

      if (res.ok) {
        addToast('success', editingSlot ? 'Class slot updated!' : 'New class slot added!');
        setIsSlotModalOpen(false);
        fetchRoutines();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to save routine slot');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Are you sure you want to delete this routine slot?')) return;

    try {
      const res = await fetch(`/api/routines/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        addToast('success', 'Routine slot deleted.');
        fetchRoutines();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to delete slot');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
              {user?.batchName || 'SWE Batch'}
            </span>
            <span className="text-xs text-slate-500">• Semester {user?.currentSemester} Timetable</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Class Timetable & Visual Routine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive visual timetable and schedule slots. {canEdit && 'You have class edit access for this batch.'}
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Class Slot
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading routine grid...</div>
      ) : (
        <VisualRoutineGrid
          routines={routines}
          canEdit={canEdit}
          onAddSlot={handleOpenAddModal}
          onEditSlot={handleOpenEditModal}
          onDeleteSlot={handleDeleteSlot}
        />
      )}

      {/* SLOT EDIT MODAL FOR CR AND ADMIN */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingSlot ? 'Edit Routine Class Slot' : 'Add Routine Class Slot'}
            </h3>

            <form onSubmit={handleSaveSlot} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Day of Week *</label>
                <select
                  value={slotForm.day}
                  onChange={e => setSlotForm({ ...slotForm, day: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
                >
                  <option value="SUNDAY">Sunday</option>
                  <option value="MONDAY">Monday</option>
                  <option value="TUESDAY">Tuesday</option>
                  <option value="WEDNESDAY">Wednesday</option>
                  <option value="THURSDAY">Thursday</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="10:00 AM"
                    value={slotForm.startTime}
                    onChange={e => setSlotForm({ ...slotForm, startTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="11:30 AM"
                    value={slotForm.endTime}
                    onChange={e => setSlotForm({ ...slotForm, endTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="SWE 305"
                    value={slotForm.courseCode}
                    onChange={e => setSlotForm({ ...slotForm, courseCode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="502 Lab"
                    value={slotForm.room}
                    onChange={e => setSlotForm({ ...slotForm, room: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="Database Systems"
                    value={slotForm.courseTitle}
                    onChange={e => setSlotForm({ ...slotForm, courseTitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Course Short Name</label>
                  <input
                    type="text"
                    placeholder="DBMS"
                    value={slotForm.courseShortName}
                    onChange={e => setSlotForm({ ...slotForm, courseShortName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teacher / Instructor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Dr. Tanvir Rahman"
                    value={slotForm.teacherName}
                    onChange={e => setSlotForm({ ...slotForm, teacherName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teacher Short Code</label>
                  <input
                    type="text"
                    placeholder="TR"
                    value={slotForm.teacherShortName}
                    onChange={e => setSlotForm({ ...slotForm, teacherShortName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold uppercase"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : editingSlot ? 'Update Class Slot' : 'Add Class Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
