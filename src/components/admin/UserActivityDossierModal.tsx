import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  Activity,
  Smartphone,
  Monitor,
  Calendar,
  Mail,
  Phone,
  GraduationCap,
  Flame,
  Globe,
  Layers,
  RefreshCw,
  Compass,
  Timer,
  CheckCircle2,
  MousePointerClick,
  Eye,
} from 'lucide-react';
import {
  UserUsageDossier,
  formatDuration,
  formatRelativeTime,
  formatExactDateTime,
  formatShortDate,
  getActivityStatusMeta,
} from '../../utils/usageFormat';
import { formatStudentId } from '../../utils/studentId';

interface UserActivityDossierModalProps {
  user: UserUsageDossier | null;
  isLoading?: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const UserActivityDossierModal: React.FC<UserActivityDossierModalProps> = ({
  user,
  isLoading = false,
  onClose,
  onRefresh,
}) => {
  useEffect(() => {
    if (!user && !isLoading) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [user, isLoading, onClose]);

  if (!user && !isLoading) return null;

  const statusMeta = user ? getActivityStatusMeta(user.activityStatus) : null;
  const maxDailySec = Math.max(60, ...(user?.dailyActivity || []).map(d => d.durationSec));
  const initials = (user?.userName || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase())
    .join('');

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-start justify-between gap-3 shrink-0">
          {user ? (
            <div className="flex items-start gap-3 min-w-0">
              <div className="relative shrink-0">
                {user.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.userName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                    {initials}
                  </div>
                )}
                {statusMeta && (
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 absolute -bottom-1 -right-1 ${statusMeta.dotClass}`}
                    title={statusMeta.label}
                  />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                    {user.userName}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      user.userRole === 'ADMIN'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : user.userRole === 'CR'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {user.userRole}
                  </span>
                  {statusMeta && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statusMeta.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                      {statusMeta.label}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      user.accountStatus === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {user.accountStatus || 'ACTIVE'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {user.studentId && (
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                      ID: {formatStudentId(user.studentId)}
                    </span>
                  )}
                  <span>
                    {user.batchName || 'SWE Batch'}
                    {user.currentSemester ? ` · Sem ${user.currentSemester}` : ''}
                  </span>
                  {user.userRole !== 'ADMIN' && (
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded text-[11px]">
                      <GraduationCap className="w-3 h-3" />
                      CGPA: {user.cgpa > 0 ? user.cgpa.toFixed(2) : '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Loading User Activity Dossier...
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Refresh user data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {!user ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Fetching live activity profile...
            </div>
          ) : (
            <>
              {/* Contact & Account Metadata Strip */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-[11.5px] text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{user.email || 'No email'}</span>
                </span>
                {user.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{user.phone}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Registered: <strong className="text-slate-800 dark:text-slate-100">{formatShortDate(user.registeredAt)}</strong></span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>First Tracked: <strong className="text-slate-800 dark:text-slate-100">{formatExactDateTime(user.firstSeenAt)}</strong></span>
                </span>
              </div>

              {/* 4 Key Usage Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60">
                  <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300">
                    <span>Total Time Used</span>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                    {formatDuration(user.totalDurationSec)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {user.totalViews} views · {user.totalActions} actions
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    <span>Today&apos;s Usage</span>
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                    {formatDuration(user.todayDurationSec)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {user.todayEvents} hits recorded today
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/60">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-300">
                    <span>Last 7 Days</span>
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                    {formatDuration(user.last7DaysDurationSec)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {user.last7DaysSessions} sessions this week
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    <span>Sessions &amp; Avg</span>
                    <Timer className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1.5">
                    {user.totalSessions} <span className="text-xs font-semibold text-slate-500">sessions</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Avg {formatDuration(user.avgSessionDurationSec)} / session
                  </div>
                </div>
              </div>

              {/* Last Active, Last Page, Device/Browser/OS, Favorite Feature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" /> Last Used
                    </span>
                    <span className={`font-extrabold ${user.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatRelativeTime(user.lastActive, user.isOnline)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 text-right font-mono">
                    {formatExactDateTime(user.lastActive)}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-indigo-600" /> Last Visited Page
                    </span>
                    <div className="text-right min-w-0">
                      <span className="font-bold text-slate-900 dark:text-white block truncate">
                        {user.lastFeatureName || 'Not visited yet'}
                      </span>
                      {user.lastPath && (
                        <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                          {user.lastPath}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      {user.devicePreference === 'Mobile' ? (
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      Device &amp; Environment
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {user.lastDevice || user.devicePreference}
                      {user.lastBrowser ? ` · ${user.lastBrowser}` : ''}
                      {user.lastOs ? ` · ${user.lastOs}` : ''}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-end gap-3">
                    <span>Mobile hits: <strong>{user.mobileEvents}</strong></span>
                    <span>Desktop hits: <strong>{user.desktopEvents}</strong></span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-500" /> Most Used Feature
                    </span>
                    <span className="font-extrabold text-blue-700 dark:text-blue-400 truncate">
                      {user.favoriteFeature}
                    </span>
                  </div>
                </div>
              </div>

              {/* 7-Day Personal Usage Chart + Feature Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 7-Day Mini Chart */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      Last 7 Days Usage Time
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">
                      Total: {formatDuration(user.last7DaysDurationSec)}
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-2 pt-2 items-end h-36">
                    {(user.dailyActivity || []).map(day => {
                      const pct = day.durationSec > 0
                        ? Math.max(12, Math.round((day.durationSec / maxDailySec) * 100))
                        : 4;
                      return (
                        <div key={day.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 text-center leading-none">
                            {day.durationSec > 0 ? formatDuration(day.durationSec) : '0s'}
                          </span>
                          <div className="w-full max-w-[32px] h-20 bg-slate-100 dark:bg-slate-800 rounded-md flex items-end overflow-hidden">
                            <div
                              className={`w-full rounded-t-md transition-all ${
                                day.durationSec > 0
                                  ? 'bg-blue-600 dark:bg-blue-500'
                                  : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                              style={{ height: `${pct}%` }}
                              title={`${day.label}: ${formatDuration(day.durationSec)} (${day.views} views, ${day.actions} actions)`}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {day.label.split(',')[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-Feature Time Breakdown */}
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      Per-Feature Usage Breakdown
                    </h3>
                    <span className="text-[11px] font-bold text-slate-400">
                      {user.featureUsage.length} features
                    </span>
                  </div>

                  {user.featureUsage.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400">
                      No feature visits recorded yet for this user.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {user.featureUsage.map(f => (
                        <div key={f.featureKey} className="space-y-1">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {f.featureName}
                            </span>
                            <div className="flex items-center gap-2 shrink-0 text-[11px]">
                              <span className="font-extrabold text-blue-700 dark:text-blue-400">
                                {formatDuration(f.durationSec)}
                              </span>
                              <span className="text-slate-400">
                                ({f.count}x · {f.percent}%)
                              </span>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                              style={{ width: `${Math.max(4, f.percent)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>{f.views} views · {f.actions} actions</span>
                            <span>Last: {formatRelativeTime(f.lastUsedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-500" />
                    Recent Activity Timeline
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    {user.recentActions.length} recent events
                  </span>
                </div>

                {user.recentActions.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    This user has no recorded portal activity yet. Once they log in and browse, every page visit and active duration will appear here automatically.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                    {user.recentActions.map((ev, idx) => (
                      <div
                        key={ev.id || idx}
                        className="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 text-xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              ev.actionType === 'ACTION'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : ev.actionType === 'HEARTBEAT'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {ev.actionType === 'ACTION' ? (
                              <MousePointerClick className="w-3.5 h-3.5" />
                            ) : ev.actionType === 'HEARTBEAT' ? (
                              <Clock className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-100 break-words">
                              {ev.actionDetail}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{ev.featureName}</span>
                              <span>·</span>
                              <span className="font-mono text-blue-600 dark:text-blue-400">{ev.path}</span>
                              <span>·</span>
                              <span>
                                {ev.deviceType}
                                {ev.browser ? ` / ${ev.browser}` : ''}
                                {ev.os ? ` / ${ev.os}` : ''}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {ev.durationSec > 0 && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10.5px] font-bold text-slate-700 dark:text-slate-200 mb-0.5">
                              {formatDuration(ev.durationSec)}
                            </span>
                          )}
                          <div className="text-[10px] text-slate-400 whitespace-nowrap">
                            {formatExactDateTime(ev.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">
            Real-time active usage synced automatically every 30s
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
