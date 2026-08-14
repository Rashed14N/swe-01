import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Plus, Trash2, Users, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { User, Batch } from '../../types';

export const AdminCRManagementPage: React.FC = () => {
  const { token } = useAuth();
  const { addToast } = useNotifications();

  const [students, setStudents] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [stRes, btRes] = await Promise.all([
        fetch('/api/admin/students', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/batches', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (stRes.ok) {
        const data = await stRes.json();
        setStudents(data.students || []);
      }

      if (btRes.ok) {
        const data = await btRes.json();
        setBatches(data.batches || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleToggleCR = async (student: User) => {
    const newRole = student.role === 'CR' ? 'STUDENT' : 'CR';
    try {
      const res = await fetch(`/api/admin/users/${student.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        addToast(
          'success',
          `${student.name} ${newRole === 'CR' ? 'assigned as Class Representative (CR)' : 'removed from CR role'}`
        );
        fetchData();
      } else {
        addToast('error', 'Role update failed');
      }
    } catch (e) {
      addToast('error', 'Server error');
    }
  };

  const currentCRs = students.filter(s => s.role === 'CR');

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBatch = !batchFilter || s.batchId === batchFilter;
    return matchesSearch && matchesBatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Class Representative (CR) Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign or revoke Class Representative permissions for students per batch.
          </p>
        </div>
      </div>

      {/* Current Active CRs Overview */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-600" /> Active Class Representatives ({currentCRs.length})
        </h3>

        {currentCRs.length === 0 ? (
          <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl text-center">No CRs currently assigned.</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {currentCRs.map(cr => (
              <div key={cr.id} className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-amber-950 text-xs block">{cr.name}</span>
                  <span className="text-[10px] text-amber-800 block font-mono">{cr.studentId} • {cr.batchName}</span>
                </div>
                <button
                  onClick={() => handleToggleCR(cr)}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded transition-colors"
                >
                  Remove CR
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student Roster to Assign CR */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            All Students Roster (Select to Assign CR)
          </h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900"
              />
            </div>

            <select
              value={batchFilter}
              onChange={e => setBatchFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-xs text-slate-900"
            >
              <option value="">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
          {filteredStudents.map(st => (
            <div key={st.id} className="p-3 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors">
              <div>
                <span className="font-bold text-slate-900">{st.name}</span>
                <span className="text-slate-400 font-mono text-[11px] ml-2">({st.studentId})</span>
                <span className="text-slate-500 text-[11px] block">{st.batchName}</span>
              </div>

              <div>
                {st.role === 'CR' ? (
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                    CR Assigned
                  </span>
                ) : (
                  <button
                    onClick={() => handleToggleCR(st)}
                    className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors"
                  >
                    + Assign CR
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
