import React, { useState, useEffect } from 'react';
import { Shield, Search, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuditLog } from '../../types';

export const AdminActivityLogPage: React.FC = () => {
  const { token } = useAuth();

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.auditLogs || data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const filtered = auditLogs.filter(
    log =>
      (log.actorName && log.actorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.action && log.action.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.target && log.target.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" /> Central Admin Portal
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">System Activity Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all administrative operations, role assignments, exam schedule changes, and user creations.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-2xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-7 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search logs by actor, action, or details..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900"
        />
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-[#CBD8E8] shadow-md overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading audit log stream...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No audit logs match search criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#F1F5FA] border-b border-[#CBD8E8] text-[#3B4C63] font-extrabold uppercase text-[10px] font-sans">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E8F2] font-medium">
                {filtered.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 font-sans">{log.actorName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 font-bold rounded text-[10px] ${
                          log.action === 'SEMESTER_PROGRESSION_ADVANCED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : log.action.includes('CREATED')
                            ? 'bg-blue-100 text-blue-800'
                            : log.action.includes('DELETED')
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-sans">
                      <strong className="text-slate-900">{log.target}</strong>
                      {log.details && <span className="text-slate-400 text-[11px] block">{log.details}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
