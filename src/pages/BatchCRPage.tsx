import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, UserCheck, Mail, Phone, Clock,
  Calendar, CheckCircle2, Copy, Check, MessageSquare,
  Sparkles, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { PageHeader } from '../components/common/PageHeader';
import { getUserAvatarUrl } from '../data/avatars';
import { CRProfileData } from '../components/common/CRProfileModal';

export const BatchCRPage: React.FC = () => {
  const { token, user } = useAuth();
  const { addToast } = useNotifications();

  const [crs, setCrs] = useState<CRProfileData[]>([]);
  const [batchInfo, setBatchInfo] = useState<{ id: string; name: string; currentSemester: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchBatchCRs = async () => {
    if (!token) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/batches/my-cr', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load CR profile');
      }

      const data = await res.json();
      if (data.success) {
        setCrs(data.crs || []);
        setBatchInfo(data.batch || null);
      }
    } catch (err: any) {
      console.error('Error fetching CR profile:', err);
      addToast('error', err.message || 'Could not fetch CR profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatchCRs();
  }, [token]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    addToast('success', 'Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <PageHeader
        title="Class Representative (CR) Profile"
        description={`Official representative and academic student coordinator for ${batchInfo?.name || user?.batchName || 'your batch'}.`}
        breadcrumb={`${batchInfo?.name || 'My Batch'} • Leadership`}
      />

      {/* Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-[#0F172A] border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-[#0B2348] dark:text-white">
              Official Class Representative Information
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
              Your Class Representative coordinates with departmental faculties, publishes Class Test & Quiz dates, submits routine room adjustments, and supports students with academic notices.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span>Loading Class Representative profile...</span>
        </div>
      ) : crs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800">
          <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Class Representative Assigned Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Your department head or administrator will designate the Class Representative for this batch soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {crs.map((cr) => {
            const avatarUrl = getUserAvatarUrl({
              name: cr.name,
              studentId: cr.studentId,
              profileImage: cr.profileImage,
            });

            return (
              <div
                key={cr.id}
                className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Header Banner */}
                <div
                  className="p-6 text-white relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #071F42 0%, #0E3572 60%, #1D4ED8 100%)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold tracking-wide uppercase">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300" /> Active CR
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {cr.name}
                  </h3>
                  <p className="text-xs text-blue-100/90 mt-0.5">
                    {cr.batchName} • Semester {cr.currentSemester}
                  </p>
                </div>

                {/* Profile Card Body */}
                <div className="p-6 -mt-8 relative z-10 space-y-5">
                  <div className="flex items-end justify-between gap-3">
                    <div className="relative">
                      <img
                        src={avatarUrl}
                        alt={cr.name}
                        className="w-18 h-18 rounded-2xl border-4 border-white dark:border-[#0F172A] bg-blue-100 dark:bg-slate-800 object-cover shadow-md"
                      />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0F172A] flex items-center justify-center text-white">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    </div>

                    <a
                      href={`mailto:${cr.email}`}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email CR</span>
                    </a>
                  </div>

                  {/* Student Roll / ID */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                        Student ID / Roll
                      </span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white font-mono">
                        {cr.studentId}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900/40">
                      Dept of SWE
                    </span>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cr.bio}
                  </p>

                  {/* Contacts */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Direct Contact Channels
                    </h4>

                    {/* Email Row */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-semibold block">Official Email</span>
                        <a
                          href={`mailto:${cr.email}`}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline truncate block font-mono"
                        >
                          {cr.email}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(cr.email, `email-${cr.id}`)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                        title="Copy Email"
                      >
                        {copiedField === `email-${cr.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Phone Row */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 font-semibold block">Phone / WhatsApp</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block font-mono">
                          {cr.phone || '+880 1712-345678'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(cr.phone || '+880 1712-345678', `phone-${cr.id}`)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                        title="Copy Phone"
                      >
                        {copiedField === `phone-${cr.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Consultation Hours */}
                  {cr.officeHours && (
                    <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 mb-0.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Consultation & Campus Hours</span>
                      </div>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
                        {cr.officeHours}
                      </p>
                    </div>
                  )}

                  {/* Responsibilities list */}
                  {cr.responsibilities && (
                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Key Responsibilities
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                        {cr.responsibilities.map((resp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0">✓</span>
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
