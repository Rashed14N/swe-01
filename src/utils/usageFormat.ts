export interface UserFeatureUsageItem {
  featureKey: string;
  featureName: string;
  category: string;
  views: number;
  actions: number;
  count: number;
  durationSec: number;
  lastUsedAt: string;
  percent: number;
}

export interface UserDailyActivityItem {
  date: string;
  label: string;
  durationSec: number;
  views: number;
  actions: number;
  sessions: number;
}

export interface UserRecentActionItem {
  id: string;
  featureKey: string;
  featureName: string;
  path: string;
  actionType: 'VIEW' | 'ACTION' | 'HEARTBEAT';
  actionDetail: string;
  durationSec: number;
  deviceType: 'Mobile' | 'Desktop';
  browser?: string;
  os?: string;
  timestamp: string;
}

export interface UserUsageDossier {
  userId: string;
  userName: string;
  studentId: string;
  email: string;
  phone: string;
  userRole: string;
  batchId: string;
  batchName: string;
  currentSemester: number;
  accountStatus: string;
  profileImage: string;
  cgpa: number;
  registeredAt: string | null;

  isOnline: boolean;
  activityStatus: 'ONLINE' | 'TODAY' | 'THIS_WEEK' | 'INACTIVE' | 'NEVER';
  totalDurationSec: number;
  totalTimeMinutes: number;
  todayDurationSec: number;
  todayEvents: number;
  last7DaysDurationSec: number;
  last7DaysSessions: number;
  avgSessionDurationSec: number;
  totalSessions: number;
  totalViews: number;
  totalActions: number;
  totalEvents: number;
  firstSeenAt: string | null;
  lastActive: string | null;
  lastPath: string | null;
  lastFeatureKey: string | null;
  lastFeatureName: string | null;
  lastDevice: 'Mobile' | 'Desktop' | null;
  lastBrowser: string | null;
  lastOs: string | null;
  devicePreference: string;
  mobileEvents: number;
  desktopEvents: number;
  favoriteFeature: string;
  topFeatures: Array<{ name: string; count: number; durationSec: number; percent: number }>;
  featureUsage: UserFeatureUsageItem[];
  dailyActivity: UserDailyActivityItem[];
  recentActions: UserRecentActionItem[];
}

export function formatDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (total === 0) return '0s';
  if (total < 60) return `${total}s`;
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function formatRelativeTime(iso: string | null | undefined, isOnline?: boolean): string {
  if (isOnline) return 'Online now';
  if (!iso) return 'Never used';
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'Never used';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatExactDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Never';
  const datePart = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getActivityStatusMeta(status: UserUsageDossier['activityStatus']): {
  label: string;
  dotClass: string;
  badgeClass: string;
} {
  switch (status) {
    case 'ONLINE':
      return {
        label: 'Online',
        dotClass: 'bg-emerald-500 animate-pulse',
        badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      };
    case 'TODAY':
      return {
        label: 'Active Today',
        dotClass: 'bg-blue-500',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      };
    case 'THIS_WEEK':
      return {
        label: 'This Week',
        dotClass: 'bg-amber-500',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    case 'INACTIVE':
      return {
        label: 'Inactive',
        dotClass: 'bg-slate-400',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
    default:
      return {
        label: 'Never Used',
        dotClass: 'bg-slate-300 dark:bg-slate-600',
        badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200 dark:border-slate-700',
      };
  }
}
