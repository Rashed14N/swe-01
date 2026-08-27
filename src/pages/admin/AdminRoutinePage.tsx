import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  FileCode,
  Download,
  Upload,
  Copy,
  Check,
  Code2,
  FileText,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { RoutineSlot, RoutineRequest, Batch } from '../../types';
import { VisualRoutineGrid } from '../../components/routine/VisualRoutineGrid';
import { ALL_ROOMS } from '../../constants/rooms';

const SAMPLE_ROUTINE_JSON = `[
  {
    "day": "SUNDAY",
    "startTime": "09:00 AM",
    "endTime": "10:30 AM",
    "courseCode": "SWE 305",
    "courseTitle": "Database Management Systems",
    "teacherName": "Dr. Tanvir Rahman",
    "room": "Room 502"
  },
  {
    "day": "SUNDAY",
    "startTime": "10:30 AM",
    "endTime": "12:00 PM",
    "courseCode": "SWE 307",
    "courseTitle": "Software Architecture",
    "teacherName": "Mr. Imran Hossain",
    "room": "Room 504"
  },
  {
    "day": "MONDAY",
    "startTime": "09:00 AM",
    "endTime": "10:30 AM",
    "courseCode": "SWE 301",
    "courseTitle": "Operating Systems",
    "teacherName": "Ms. Nusrat Jahan",
    "room": "Room 502"
  },
  {
    "day": "MONDAY",
    "startTime": "11:00 AM",
    "endTime": "01:00 PM",
    "courseCode": "SWE 306",
    "courseTitle": "Database Systems Lab",
    "teacherName": "Dr. Tanvir Rahman",
    "room": "Lab 502"
  },
  {
    "day": "TUESDAY",
    "startTime": "10:00 AM",
    "endTime": "11:30 AM",
    "courseCode": "SWE 309",
    "courseTitle": "Web Engineering",
    "teacherName": "Prof. Dr. Ahsan Habib",
    "room": "Room 504"
  },
  {
    "day": "WEDNESDAY",
    "startTime": "09:00 AM",
    "endTime": "10:30 AM",
    "courseCode": "SWE 305",
    "courseTitle": "Database Management Systems",
    "teacherName": "Dr. Tanvir Rahman",
    "room": "Room 502"
  },
  {
    "day": "THURSDAY",
    "startTime": "10:00 AM",
    "endTime": "11:30 AM",
    "courseCode": "SWE 307",
    "courseTitle": "Software Architecture",
    "teacherName": "Mr. Imran Hossain",
    "room": "Room 504"
  }
]`;

export const AdminRoutinePage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('batch-9');
  const [routines, setRoutines] = useState<RoutineSlot[]>([]);
  const [requests, setRequests] = useState<RoutineRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'ROUTINE' | 'REQUESTS'>('ROUTINE');
  const [isLoading, setIsLoading] = useState(true);

  // Single Slot modal
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RoutineSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [slotForm, setSlotForm] = useState({
    batchId: selectedBatchId,
    day: 'SUNDAY' as 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY',
    startTime: '10:00 AM',
    endTime: '11:30 AM',
    courseCode: 'SWE 305',
    courseTitle: 'Database Systems',
    teacherName: 'Dr. Tanvir Rahman',
    room: 'Room 502',
  });

  // JSON Import & Export Modal State
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonImportBatchId, setJsonImportBatchId] = useState(selectedBatchId);
  const [jsonImportMode, setJsonImportMode] = useState<'REPLACE' | 'APPEND'>('REPLACE');
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);
  const [parsedSlotsPreview, setParsedSlotsPreview] = useState<any[]>([]);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reject modal
  const [rejectReqId, setRejectReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const authHeader = { Authorization: `Bearer ${token || 'admin-token'}` };
      const [btRes, routRes, reqRes] = await Promise.all([
        fetch('/api/admin/batches', { headers: authHeader }),
        fetch(`/api/routines?batchId=${selectedBatchId}`, { headers: authHeader }),
        fetch('/api/routines/requests', { headers: authHeader }),
      ]);

      if (btRes.ok) {
        const data = await btRes.json();
        setBatches(data.batches || []);
      }

      if (routRes.ok) {
        const data = await routRes.json();
        setRoutines(data.routines || []);
      }

      if (reqRes.ok) {
        const data = await reqRes.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, selectedBatchId]);

  const handleOpenAddModal = (day?: string) => {
    setEditingSlot(null);
    setSlotForm({
      batchId: selectedBatchId,
      day: (day as any) || 'SUNDAY',
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      courseCode: 'SWE 305',
      courseTitle: 'Database Systems',
      teacherName: 'Dr. Tanvir Rahman',
      room: 'Room 502',
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
      teacherName: slot.teacherName,
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
          Authorization: `Bearer ${token || 'admin-token'}`,
        },
        body: JSON.stringify({ ...slotForm, batchId: selectedBatchId }),
      });

      if (res.ok) {
        addToast('success', editingSlot ? 'Class slot updated!' : 'New class slot added!');
        setIsSlotModalOpen(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        addToast('error', err.error || 'Failed to save routine slot');
      }
    } catch (e) {
      addToast('error', 'Server error saving slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!window.confirm('Are you sure you want to delete this routine slot?')) return;

    try {
      const res = await fetch(`/api/routines/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || 'admin-token'}` },
      });

      if (res.ok) {
        addToast('success', 'Routine slot deleted.');
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        addToast('error', err.error || 'Failed to delete slot');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  // JSON Management Handlers
  const handleOpenJsonModal = () => {
    setJsonImportBatchId(selectedBatchId);
    setJsonImportMode('REPLACE');
    if (!jsonText) {
      setJsonText(SAMPLE_ROUTINE_JSON);
      validateAndParseJson(SAMPLE_ROUTINE_JSON);
    } else {
      validateAndParseJson(jsonText);
    }
    setIsJsonModalOpen(true);
  };

  const validateAndParseJson = (raw: string) => {
    if (!raw.trim()) {
      setJsonParseError(null);
      setParsedSlotsPreview([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : (parsed.slots || parsed.routine || []);
      if (!Array.isArray(items)) {
        setJsonParseError('JSON must be an array of slot objects: [ { ... }, { ... } ]');
        setParsedSlotsPreview([]);
        return;
      }
      setJsonParseError(null);
      setParsedSlotsPreview(items);
    } catch (err: any) {
      setJsonParseError(`JSON Syntax Error: ${err?.message || 'Invalid JSON format'}`);
      setParsedSlotsPreview([]);
    }
  };

  const handleJsonTextChange = (val: string) => {
    setJsonText(val);
    validateAndParseJson(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setJsonText(content);
      validateAndParseJson(content);
      addToast('info', `Loaded JSON from ${file.name}`);
    };
    reader.onerror = () => {
      addToast('error', 'Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleExportCurrentRoutine = () => {
    const cleanExport = routines.map(r => ({
      day: r.day,
      startTime: r.startTime,
      endTime: r.endTime,
      courseCode: r.courseCode,
      courseTitle: r.courseTitle,
      teacherName: r.teacherName,
      room: r.room,
    }));

    const jsonString = JSON.stringify(cleanExport, null, 2);
    setJsonText(jsonString);
    validateAndParseJson(jsonString);
    setJsonImportBatchId(selectedBatchId);
    setIsJsonModalOpen(true);

    navigator.clipboard?.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2500);
    addToast('success', `Copied ${routines.length} slots from current batch to JSON editor!`);
  };

  const handleDownloadRoutineJson = () => {
    const cleanExport = routines.map(r => ({
      day: r.day,
      startTime: r.startTime,
      endTime: r.endTime,
      courseCode: r.courseCode,
      courseTitle: r.courseTitle,
      teacherName: r.teacherName,
      room: r.room,
    }));

    const blob = new Blob([JSON.stringify(cleanExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `routine_${selectedBatchId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Routine JSON downloaded successfully!');
  };

  const handleImportJsonSubmit = async () => {
    if (jsonParseError || parsedSlotsPreview.length === 0) {
      addToast('error', 'Please provide valid JSON containing at least one class slot');
      return;
    }

    setIsImportingJson(true);
    try {
      const res = await fetch('/api/routines/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || 'admin-token'}`,
        },
        body: JSON.stringify({
          batchId: jsonImportBatchId,
          mode: jsonImportMode,
          slots: parsedSlotsPreview,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        addToast('success', data.message || `Successfully imported ${data.count || parsedSlotsPreview.length} routine slots!`);
        setIsJsonModalOpen(false);
        setSelectedBatchId(jsonImportBatchId);
        fetchData();
      } else {
        addToast('error', data.error || 'Failed to import routine JSON');
      }
    } catch (e: any) {
      console.error(e);
      addToast('error', e?.message || 'Server error importing routine JSON');
    } finally {
      setIsImportingJson(false);
    }
  };

  const handleReviewRequest = async (reqId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/routines/requests/${reqId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || 'admin-token'}`,
        },
        body: JSON.stringify({
          status,
          rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        }),
      });

      if (res.ok) {
        addToast('success', `Routine request ${status.toLowerCase()} successfully!`);
        setRejectReqId(null);
        setRejectionReason('');
        fetchData();
      } else {
        addToast('error', 'Review action failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const selectedBatchObj = batches.find(b => b.id === selectedBatchId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Department Routine & CR Requests</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage official class routines per batch, import/export via JSON format, edit class slots, and review schedule modification requests.
          </p>
        </div>

        {activeTab === 'ROUTINE' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCurrentRoutine}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
              title="Copy current batch routine in JSON format"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
            <button
              onClick={handleOpenJsonModal}
              className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <FileCode className="w-4 h-4 text-indigo-600" /> JSON Import / Bulk
            </button>
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Class Slot
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs & Batch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('ROUTINE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'ROUTINE' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Official Routine Grid ({routines.length} Slots)
          </button>
          <button
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'REQUESTS' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" /> CR Routine Requests ({pendingRequests.length} Pending)
          </button>
        </div>

        {activeTab === 'ROUTINE' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Target Batch:</span>
            <select
              value={selectedBatchId}
              onChange={e => setSelectedBatchId(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Routine Grid View */}
      {activeTab === 'ROUTINE' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading routine for {selectedBatchObj?.name || 'batch'}...</div>
          ) : (
            <VisualRoutineGrid
              routines={routines}
              canEdit={true}
              onAddSlot={handleOpenAddModal}
              onEditSlot={handleOpenEditModal}
              onDeleteSlot={handleDeleteSlot}
            />
          )}
        </div>
      )}

      {/* CR Routine Requests View */}
      {activeTab === 'REQUESTS' && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            CR Submitted Routine Modification Requests
          </h3>

          {requests.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
              No routine requests submitted.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{req.courseTitle}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded">
                        {req.batchName}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          req.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="text-slate-600">
                      <strong>Submitted by CR:</strong> {req.crName} • <strong>Current:</strong> {req.currentSchedule} → <strong>Requested:</strong> {req.requestedSchedule}
                    </p>

                    <p className="text-slate-500 italic">Reason: "{req.reason}"</p>
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReviewRequest(req.id, 'APPROVED')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => setRejectReqId(req.id)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* JSON IMPORT & EXPORT MODAL */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    JSON Routine Import & Bulk Manager
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add or replace entire batch schedules instantly using standard JSON format.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsJsonModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            {/* Target Batch & Import Mode Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Academic Batch *</label>
                <select
                  value={jsonImportBatchId}
                  onChange={e => setJsonImportBatchId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Import Mode *</label>
                <div className="flex items-center gap-2 mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800">
                    <input
                      type="radio"
                      name="importMode"
                      value="REPLACE"
                      checked={jsonImportMode === 'REPLACE'}
                      onChange={() => setJsonImportMode('REPLACE')}
                      className="text-blue-600"
                    />
                    <span>Replace Entire Routine (Recommended)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 ml-2">
                    <input
                      type="radio"
                      name="importMode"
                      value="APPEND"
                      checked={jsonImportMode === 'APPEND'}
                      onChange={() => setJsonImportMode('APPEND')}
                      className="text-blue-600"
                    />
                    <span>Append to Existing</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Toolbar Buttons for JSON Actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJsonText(SAMPLE_ROUTINE_JSON);
                    validateAndParseJson(SAMPLE_ROUTINE_JSON);
                    addToast('info', 'Loaded sample routine template');
                  }}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Load Sample JSON Template
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200 flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload .JSON File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadRoutineJson}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200 flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(jsonText);
                    setCopiedJson(true);
                    setTimeout(() => setCopiedJson(false), 2000);
                    addToast('success', 'JSON copied to clipboard');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-200 flex items-center gap-1"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
            </div>

            {/* JSON Code Area */}
            <div className="space-y-1.5 flex-1 min-h-[180px]">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>// Edit or paste routine JSON format below:</span>
                <span className={parsedSlotsPreview.length > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                  {parsedSlotsPreview.length} slots detected
                </span>
              </div>
              <textarea
                value={jsonText}
                onChange={e => handleJsonTextChange(e.target.value)}
                rows={8}
                placeholder="Paste JSON array here..."
                className="w-full bg-[#0F172A] text-[#38BDF8] font-mono text-xs p-3.5 rounded-xl border border-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed shadow-inner"
                spellCheck={false}
              />
            </div>

            {/* Parsing Validation Feedback */}
            {jsonParseError ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Invalid JSON Syntax:</strong>
                  <span className="font-mono text-[11px]">{jsonParseError}</span>
                </div>
              </div>
            ) : parsedSlotsPreview.length > 0 ? (
              <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Parsed Schedule Preview ({parsedSlotsPreview.length} Classes)
                  </span>
                  <span className="text-[11px] text-slate-500">Target: {batches.find(b => b.id === jsonImportBatchId)?.name}</span>
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                      <tr>
                        <th className="p-1.5">Day</th>
                        <th className="p-1.5">Time</th>
                        <th className="p-1.5">Course Code</th>
                        <th className="p-1.5">Course Title</th>
                        <th className="p-1.5">Teacher</th>
                        <th className="p-1.5">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedSlotsPreview.map((slot, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-1.5 font-bold text-blue-600">{slot.day || 'N/A'}</td>
                          <td className="p-1.5 font-mono text-slate-600">{slot.startTime} - {slot.endTime}</td>
                          <td className="p-1.5 font-bold text-slate-900">{slot.courseCode || '-'}</td>
                          <td className="p-1.5 text-slate-700 truncate max-w-[150px]">{slot.courseTitle || '-'}</td>
                          <td className="p-1.5 text-slate-600">{slot.teacherName || '-'}</td>
                          <td className="p-1.5 font-bold text-slate-800">{slot.room || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
              <span className="text-[11px] text-slate-400">
                JSON format requires: <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">day</code>, <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">startTime</code>, <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">endTime</code>, <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">courseTitle</code>, <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">room</code>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsJsonModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isImportingJson || !!jsonParseError || parsedSlotsPreview.length === 0}
                  onClick={handleImportJsonSubmit}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                >
                  {isImportingJson ? 'Importing...' : `Import ${parsedSlotsPreview.length || ''} Slots into Routine`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SLOT EDIT MODAL */}
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
                  <option value="FRIDAY">Friday</option>
                  <option value="SATURDAY">Saturday</option>
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
                    list="admin-rooms-list"
                    placeholder="e.g. Room 502, XL 1, Exten-2"
                    value={slotForm.room}
                    onChange={e => setSlotForm({ ...slotForm, room: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold"
                  />
                  <datalist id="admin-rooms-list">
                    {ALL_ROOMS.map(r => (
                      <option key={r} value={r} />
                    ))}
                  </datalist>
                </div>
              </div>

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

      {/* REJECT REASON MODAL */}
      {rejectReqId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-[#E2E8F0] p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Routine Change Request</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rejection Feedback / Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Schedule conflict in Room 504 on Tuesday afternoon."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setRejectReqId(null)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReviewRequest(rejectReqId, 'REJECTED')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-xs"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
