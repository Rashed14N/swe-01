import React, { useState, useEffect } from 'react';
import {
  Layers, Plus, Edit, Users, BookOpen, Calendar, ChevronRight,
  Eye, ArrowRight, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Clock, RefreshCw, X, Check,
  SlidersHorizontal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { Batch, User, Course, RoutineSlot, Exam, SemesterProgressionPreview } from '../../types';
import { BatchSemesterController } from '../../components/admin/BatchSemesterController';

export const AdminBatchesPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [controllerBatchId, setControllerBatchId] = useState<string>('batch-9');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editSyncStudents, setEditSyncStudents] = useState(true);

  // Progression Modal states
  const [isProgressionModalOpen, setIsProgressionModalOpen] = useState(false);
  const [progressionPreview, setProgressionPreview] = useState<SemesterProgressionPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [forceConfirmDouble, setForceConfirmDouble] = useState(false);
  const [progressionNotes, setProgressionNotes] = useState('');

  // Selected Batch Detail
  const [selectedBatchDetail, setSelectedBatchDetail] = useState<{
    batch: Batch;
    students: User[];
    crs: User[];
    courses: Course[];
    routines: RoutineSlot[];
    exams: Exam[];
  } | null>(null);

  // Create Form State
  const [addForm, setAddForm] = useState({
    name: 'SWE 13th Batch',
    admissionYear: 2027,
    currentSemester: 1,
    academicSession: '2027-2028',
    semesterMode: 'SEQUENCE' as 'SEQUENCE' | 'MANUAL',
    status: 'ACTIVE' as 'ACTIVE' | 'GRADUATED' | 'INACTIVE',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBatches = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/batches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || data.data || (Array.isArray(data) ? data : []));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchCourses();
  }, [token]);

  const handleBatchSemesterUpdated = (updatedBatch: Batch, semester: number) => {
    setBatches(prev => prev.map(b => b.id === updatedBatch.id ? { ...b, currentSemester: semester } : b));
    fetchBatches();
    fetchCourses();
  };

  const fetchProgressionPreview = async () => {
    if (!token) return;
    setIsLoadingPreview(true);
    try {
      const res = await fetch('/api/batches/progression-preview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProgressionPreview(data);
      } else {
        addToast('error', 'Failed to calculate progression preview');
      }
    } catch (e) {
      addToast('error', 'Network error fetching progression preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleOpenProgressionModal = () => {
    setForceConfirmDouble(false);
    setProgressionNotes('');
    setIsProgressionModalOpen(true);
    fetchProgressionPreview();
  };

  const handleExecuteProgression = async () => {
    if (!token) return;
    if (progressionPreview?.isRecent && !forceConfirmDouble) {
      addToast('error', 'Please check the double-progression confirmation box to proceed.');
      return;
    }

    setIsAdvancing(true);
    try {
      const res = await fetch('/api/batches/advance-sequence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          forceConfirm: forceConfirmDouble,
          notes: progressionNotes,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('success', data.message || 'Sequence batches advanced successfully!');
        setIsProgressionModalOpen(false);
        fetchBatches();
      } else {
        addToast('error', data.message || data.error || 'Failed to advance sequence batches');
      }
    } catch (e) {
      addToast('error', 'Server connection error during progression execution');
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(addForm),
      });

      if (res.ok) {
        const data = await res.json();
        const createdBatch = data.batch || data.data;
        addToast('success', `Batch "${addForm.name}" created successfully!`);
        setIsAddModalOpen(false);
        if (createdBatch) {
          setBatches(prev => [createdBatch, ...prev.filter(b => b.id !== createdBatch.id)]);
        }
        await fetchBatches();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to create batch');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/batches/${editingBatch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editingBatch.name,
          admissionYear: editingBatch.admissionYear,
          currentSemester: editingBatch.currentSemester,
          academicSession: editingBatch.academicSession,
          semesterMode: editingBatch.semesterMode,
          status: editingBatch.status,
          syncStudentsSemester: editSyncStudents,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedBatch = data.batch || data.data;
        addToast('success', `Batch "${editingBatch.name}" updated!`);
        setEditingBatch(null);
        if (updatedBatch) {
          setBatches(prev => prev.map(b => b.id === updatedBatch.id ? { ...b, ...updatedBatch } : b));
        }
        await fetchBatches();
      } else {
        const err = await res.json();
        addToast('error', err.error || 'Failed to update batch');
      }
    } catch (e) {
      addToast('error', 'Server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = async (batchId: string) => {
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedBatchDetail(data);
      }
    } catch (e) {
      addToast('error', 'Failed to load batch details');
    }
  };

  // Group batches for clean summary
  const sequenceBatches = batches.filter(b => (b.semesterMode || 'SEQUENCE') === 'SEQUENCE');
  const manualBatches = batches.filter(b => b.semesterMode === 'MANUAL');

  return (
    <div className="space-y-6">
      {/* Header with Hero Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" /> Academic Governance
          </div>
          <h1 className="text-2xl font-black text-slate-900">Academic Batches & Semester Control</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Control batch progression policies. <strong>Sequence batches</strong> advance on manual Admin trigger. <strong>Manual batches</strong> (5th, 6th, 7th) remain fixed unless individually edited.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            id="advance-sequence-batches-btn"
            onClick={handleOpenProgressionModal}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
            Advance Sequence Batches
          </button>

          <button
            id="create-new-batch-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Batch
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Sequence Batches</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{sequenceBatches.length}</p>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> Auto-advances together on Admin trigger
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            SEQ
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Manual Batches</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{manualBatches.length}</p>
            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" /> Excluded from cycle progressions (5th, 6th, 7th)
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            MAN
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Department Batches</span>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{batches.length}</p>
            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1 mt-1">
              Total active academic groups
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            {batches.length}
          </div>
        </div>
      </div>

      {/* DEDICATED BATCH SEMESTER CONTROLLER */}
      <BatchSemesterController
        batches={batches}
        courses={courses}
        activeBatchId={controllerBatchId}
        onSelectBatch={setControllerBatchId}
        onBatchSemesterUpdated={handleBatchSemesterUpdated}
      />

      {/* Batch Cards Grid Header */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-base font-extrabold text-slate-900">
          All Department Batches ({batches.length})
        </h3>
        <span className="text-xs text-slate-500">
          Click <strong>Semester</strong> on any batch to configure its active courses
        </span>
      </div>

      {/* Batch Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading academic batches...</span>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map(b => {
            const isSequence = (b.semesterMode || 'SEQUENCE') === 'SEQUENCE';
            const status = b.status || 'ACTIVE';

            return (
              <div
                key={b.id}
                className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-extrabold text-slate-900 text-lg block">{b.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">ID: {b.id}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          isSequence
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isSequence ? '⚡ SEQUENCE' : '🔒 MANUAL'}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${
                          status === 'ACTIVE'
                            ? 'bg-blue-100 text-blue-800'
                            : status === 'GRADUATED'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Current Semester</span>
                      <span className="font-black text-slate-900 text-sm">
                        {b.currentSemester > 8 ? `Graduated (${b.currentSemester}th)` : `Semester ${b.currentSemester}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Academic Session</span>
                      <span className="font-bold text-slate-800 text-xs">{b.academicSession}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Admission Year</span>
                      <span className="font-bold text-slate-800 text-xs">{b.admissionYear}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Last Progressed</span>
                      <span className="font-medium text-slate-600 text-[10px]">
                        {b.lastProgressedAt ? new Date(b.lastProgressedAt).toLocaleDateString() : 'Initial'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => {
                      setControllerBatchId(b.id);
                      const el = document.getElementById('batch-semester-controller');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    title="Control active semester and enrolled courses"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Semester
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingBatch(b);
                        setEditSyncStudents(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>

                    <button
                      onClick={() => handleOpenDetail(b.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADVANCE SEQUENCE BATCHES PROGESSION MODAL */}
      {isProgressionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-[#E2E8F0] p-6 space-y-6 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Advance Sequence Batches</h3>
                  <p className="text-xs text-slate-500">
                    Explicit Admin trigger to advance all active SEQUENCE batches to the next semester.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProgressionModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingPreview ? (
              <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                <span>Computing batch progression preview...</span>
              </div>
            ) : progressionPreview ? (
              <div className="space-y-5 text-xs">
                {/* Double Progression Alert Warning */}
                {progressionPreview.isRecent && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-amber-900 text-sm">Caution: Recent Progression Detected</h4>
                      <p className="text-amber-800 text-xs leading-relaxed">
                        A cycle progression was executed recently on{' '}
                        <strong>
                          {new Date(progressionPreview.lastProgressedAt!).toLocaleString()}
                        </strong>
                        . Advancing again will increment all sequence batches by another semester.
                      </p>
                      <label className="flex items-center gap-2 pt-1 font-bold text-amber-950 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={forceConfirmDouble}
                          onChange={e => setForceConfirmDouble(e.target.checked)}
                          className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                        />
                        I understand and explicitly confirm manual double progression.
                      </label>
                    </div>
                  </div>
                )}

                {/* Affected Sequence Batches Preview */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-slate-900 uppercase tracking-wider text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Sequence Batches to be Advanced ({progressionPreview.sequenceBatches.length})
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">Increment: +1 Semester</span>
                  </div>

                  <div className="space-y-2 border border-slate-200 rounded-2xl p-3 bg-slate-50 max-h-56 overflow-y-auto">
                    {progressionPreview.sequenceBatches.length === 0 ? (
                      <p className="p-3 text-slate-400 text-center">No active SEQUENCE batches found.</p>
                    ) : (
                      progressionPreview.sequenceBatches.map(item => (
                        <div
                          key={item.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">{item.name}</span>
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                                {item.studentsCount} Students
                              </span>
                            </div>
                            <span className="text-slate-400 text-[10px]">Session {item.academicSession}</span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 uppercase font-bold block">Current</span>
                              <span className="font-bold text-slate-600">Sem {item.currentSemester}</span>
                            </div>

                            <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />

                            <div className="text-left">
                              <span className="text-[10px] text-emerald-600 uppercase font-bold block">Next</span>
                              <span className="font-black text-emerald-700 text-sm">
                                {item.willGraduate ? `Sem ${item.nextSemester} (Graduate)` : `Sem ${item.nextSemester}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Excluded Manual Batches */}
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-xs mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Excluded Manual Batches ({progressionPreview.manualBatches.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {progressionPreview.manualBatches.map(m => (
                      <div
                        key={m.id}
                        className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 flex flex-col justify-between text-xs"
                      >
                        <span className="font-bold text-slate-800">{m.name}</span>
                        <span className="text-amber-700 text-[10px] font-semibold mt-1">
                          Fixed Sem {m.currentSemester} (Manual Mode)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Notes */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Audit Log Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. End of 2024 Fall Academic Semester Progression"
                    value={progressionNotes}
                    onChange={e => setProgressionNotes(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-slate-900 text-xs"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProgressionModalOpen(false)}
                    className="px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-progression-btn"
                    onClick={handleExecuteProgression}
                    disabled={isAdvancing || (progressionPreview.isRecent && !forceConfirmDouble)}
                    className={`px-5 py-2.5 font-black text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all ${
                      progressionPreview.isRecent && !forceConfirmDouble
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isAdvancing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Advancing Batches...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Confirm & Advance Sequence Batches
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* EDIT BATCH MODAL */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Batch Settings</h3>
              <button
                onClick={() => setEditingBatch(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  value={editingBatch.name}
                  onChange={e => setEditingBatch({ ...editingBatch, name: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admission Year *</label>
                  <input
                    type="number"
                    required
                    value={editingBatch.admissionYear}
                    onChange={e => setEditingBatch({ ...editingBatch, admissionYear: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Semester *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={editingBatch.currentSemester}
                    onChange={e => setEditingBatch({ ...editingBatch, currentSemester: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-black text-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Session *</label>
                <input
                  type="text"
                  required
                  value={editingBatch.academicSession}
                  onChange={e => setEditingBatch({ ...editingBatch, academicSession: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Progression Mode</label>
                  <select
                    value={editingBatch.semesterMode || 'SEQUENCE'}
                    onChange={e => setEditingBatch({ ...editingBatch, semesterMode: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="SEQUENCE">SEQUENCE (Auto-progress)</option>
                    <option value="MANUAL">MANUAL (Fixed/Excluded)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Batch Status</label>
                  <select
                    value={editingBatch.status || 'ACTIVE'}
                    onChange={e => setEditingBatch({ ...editingBatch, status: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="GRADUATED">GRADUATED</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-blue-900 text-xs">
                  <input
                    type="checkbox"
                    checked={editSyncStudents}
                    onChange={e => setEditSyncStudents(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-blue-300"
                  />
                  Sync all students in this batch to Semester {editingBatch.currentSemester}
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE BATCH MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Academic Batch</h3>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Batch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SWE 13th Batch"
                  value={addForm.name}
                  onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Admission Year *</label>
                  <input
                    type="number"
                    required
                    value={addForm.admissionYear}
                    onChange={e => setAddForm({ ...addForm, admissionYear: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Starting Semester *</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={addForm.currentSemester}
                    onChange={e => setAddForm({ ...addForm, currentSemester: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Session *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2027-2028"
                  value={addForm.academicSession}
                  onChange={e => setAddForm({ ...addForm, academicSession: e.target.value })}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Progression Mode</label>
                  <select
                    value={addForm.semesterMode}
                    onChange={e => setAddForm({ ...addForm, semesterMode: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="SEQUENCE">SEQUENCE (Auto-progresses with cycle)</option>
                    <option value="MANUAL">MANUAL (Fixed/Excluded)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={addForm.status}
                    onChange={e => setAddForm({ ...addForm, status: e.target.value as any })}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-slate-900 font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH DETAIL DRAWER / MODAL */}
      {selectedBatchDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                  Batch Detail Overview
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedBatchDetail.batch.name}</h3>
              </div>
              <button
                onClick={() => setSelectedBatchDetail(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="block font-bold text-slate-900 text-lg">{selectedBatchDetail.students.length}</span>
                <span className="text-slate-500 text-[10px]">Students</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="block font-bold text-amber-900 text-lg">{selectedBatchDetail.crs.length}</span>
                <span className="text-amber-700 text-[10px]">Assigned CRs</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="block font-bold text-blue-900 text-lg">{selectedBatchDetail.courses.length}</span>
                <span className="text-blue-700 text-[10px]">Courses</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="block font-bold text-emerald-900 text-lg">{selectedBatchDetail.exams.length}</span>
                <span className="text-emerald-700 text-[10px]">Scheduled Exams</span>
              </div>
            </div>

            {/* CR Roster */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Class Representatives (CRs)
              </h4>
              {selectedBatchDetail.crs.length === 0 ? (
                <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded">No CR assigned yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedBatchDetail.crs.map(cr => (
                    <div key={cr.id} className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900">{cr.name} ({cr.studentId})</span>
                      <span className="text-amber-700 text-[10px]">{cr.email || 'No email'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Students roster preview */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Student Roster Sample ({selectedBatchDetail.students.length})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedBatchDetail.students.slice(0, 10).map(st => (
                  <div key={st.id} className="p-2 bg-slate-50 rounded border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{st.name}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{st.studentId}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
