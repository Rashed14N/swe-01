import { getServerSupabase } from './supabaseSync';
import { db } from './db';

export const USAGE_STORE_AUDIT_ACTION = 'USER_USAGE_PROFILE_STORE';

export interface UserFeatureStat {
  featureKey: string;
  featureName: string;
  category: string;
  views: number;
  actions: number;
  durationSec: number;
  lastUsedAt: string;
}

export interface UserDailyStat {
  date: string; // YYYY-MM-DD
  durationSec: number;
  views: number;
  actions: number;
  sessions: number;
}

export interface UserActivityEvent {
  id: string;
  featureKey: string;
  featureName: string;
  category: string;
  path: string;
  actionType: 'VIEW' | 'ACTION' | 'HEARTBEAT';
  actionDetail: string;
  durationSec: number;
  deviceType: 'Mobile' | 'Desktop';
  browser?: string;
  os?: string;
  timestamp: string;
}

export interface StoredUserUsageProfile {
  userId: string;
  studentId?: string;
  userName: string;
  email?: string;
  userRole: string;
  batchId?: string;
  batchName?: string;
  totalDurationSec: number;
  totalSessions: number;
  totalViews: number;
  totalActions: number;
  mobileEvents: number;
  desktopEvents: number;
  firstSeenAt: string;
  lastActiveAt: string;
  lastSessionId?: string;
  lastPath: string;
  lastFeatureKey: string;
  lastFeatureName: string;
  lastDevice: 'Mobile' | 'Desktop';
  lastBrowser?: string;
  lastOs?: string;
  featureStats: Record<string, UserFeatureStat>;
  dailyStats: Record<string, UserDailyStat>;
  recentEvents: UserActivityEvent[];
  updatedAt: string;
}

export interface TrackUsageInput {
  userId: string;
  studentId?: string;
  userName: string;
  email?: string;
  userRole: string;
  batchId?: string;
  batchName?: string;
  featureKey: string;
  featureName: string;
  category: string;
  path: string;
  actionType: 'VIEW' | 'ACTION' | 'HEARTBEAT';
  actionDetail: string;
  durationSec: number;
  deviceType: 'Mobile' | 'Desktop';
  browser?: string;
  os?: string;
  sessionId?: string;
}

// Cache whether dedicated public.user_usage_profiles table exists
let hasDedicatedUsageTable: boolean | null = null;

// In-memory profile map & list cache
const profileCache = new Map<string, StoredUserUsageProfile>();
let allProfilesCache: { data: StoredUserUsageProfile[]; fetchedAt: number } | null = null;
const ALL_PROFILES_TTL_MS = 10_000;

// Session inactivity threshold: 15 minutes
const SESSION_GAP_MS = 15 * 60 * 1000;

function getUsageRowId(userId: string): string {
  const safeId = String(userId || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `usage_profile_${safeId}`;
}

function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function getDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function pruneDailyStats(daily: Record<string, UserDailyStat>): Record<string, UserDailyStat> {
  const keys = Object.keys(daily).sort();
  if (keys.length <= 35) return daily;
  const trimmed: Record<string, UserDailyStat> = {};
  for (const k of keys.slice(-35)) {
    trimmed[k] = daily[k];
  }
  return trimmed;
}

function normalizeProfile(raw: any): StoredUserUsageProfile | null {
  if (!raw || typeof raw !== 'object' || !raw.userId) return null;
  const now = new Date().toISOString();
  return {
    userId: String(raw.userId),
    studentId: raw.studentId ? String(raw.studentId) : '',
    userName: String(raw.userName || 'Student'),
    email: raw.email ? String(raw.email) : undefined,
    userRole: String(raw.userRole || 'STUDENT'),
    batchId: raw.batchId ? String(raw.batchId) : undefined,
    batchName: raw.batchName ? String(raw.batchName) : undefined,
    totalDurationSec: Math.max(0, Number(raw.totalDurationSec) || 0),
    totalSessions: Math.max(0, Number(raw.totalSessions) || 0),
    totalViews: Math.max(0, Number(raw.totalViews) || 0),
    totalActions: Math.max(0, Number(raw.totalActions) || 0),
    mobileEvents: Math.max(0, Number(raw.mobileEvents) || 0),
    desktopEvents: Math.max(0, Number(raw.desktopEvents) || 0),
    firstSeenAt: typeof raw.firstSeenAt === 'string' && raw.firstSeenAt ? raw.firstSeenAt : now,
    lastActiveAt: typeof raw.lastActiveAt === 'string' && raw.lastActiveAt ? raw.lastActiveAt : now,
    lastSessionId: raw.lastSessionId ? String(raw.lastSessionId) : undefined,
    lastPath: typeof raw.lastPath === 'string' ? raw.lastPath : '/dashboard',
    lastFeatureKey: typeof raw.lastFeatureKey === 'string' ? raw.lastFeatureKey : 'DASHBOARD',
    lastFeatureName: typeof raw.lastFeatureName === 'string' ? raw.lastFeatureName : 'Student Dashboard',
    lastDevice: raw.lastDevice === 'Mobile' ? 'Mobile' : 'Desktop',
    lastBrowser: raw.lastBrowser ? String(raw.lastBrowser) : undefined,
    lastOs: raw.lastOs ? String(raw.lastOs) : undefined,
    featureStats: raw.featureStats && typeof raw.featureStats === 'object' ? raw.featureStats : {},
    dailyStats: raw.dailyStats && typeof raw.dailyStats === 'object' ? raw.dailyStats : {},
    recentEvents: Array.isArray(raw.recentEvents) ? raw.recentEvents.slice(0, 40) : [],
    updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : now,
  };
}

function getLocalProfilesStore(): Record<string, StoredUserUsageProfile> {
  const data = db.getData() as any;
  if (!data.userUsageProfiles || typeof data.userUsageProfiles !== 'object') {
    data.userUsageProfiles = {};
  }
  return data.userUsageProfiles;
}

function saveToLocalStore(profile: StoredUserUsageProfile): void {
  const store = getLocalProfilesStore();
  store[profile.userId] = profile;
  profileCache.set(profile.userId, profile);
  allProfilesCache = null;
  db.save();
}

async function readProfileFromSupabase(userId: string): Promise<StoredUserUsageProfile | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  // 1. Try dedicated table
  if (hasDedicatedUsageTable !== false) {
    try {
      const { data, error } = await supabase
        .from('user_usage_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error) {
        hasDedicatedUsageTable = true;
        if (!data) return null;
        return normalizeProfile({
          userId: data.user_id,
          studentId: data.student_id,
          userName: data.user_name,
          email: data.email,
          userRole: data.user_role,
          batchId: data.batch_id,
          batchName: data.batch_name,
          totalDurationSec: data.total_duration_sec,
          totalSessions: data.total_sessions,
          totalViews: data.total_views,
          totalActions: data.total_actions,
          mobileEvents: data.mobile_events,
          desktopEvents: data.desktop_events,
          firstSeenAt: data.first_seen_at,
          lastActiveAt: data.last_active_at,
          lastSessionId: data.last_session_id,
          lastPath: data.last_path,
          lastFeatureKey: data.last_feature_key,
          lastFeatureName: data.last_feature_name,
          lastDevice: data.last_device,
          lastBrowser: data.last_browser,
          lastOs: data.last_os,
          featureStats: data.feature_stats,
          dailyStats: data.daily_stats,
          recentEvents: data.recent_events,
          updatedAt: data.updated_at,
        });
      }
      if (isTableMissingError(error)) {
        hasDedicatedUsageTable = false;
      }
    } catch {
      // fall through
    }
  }

  // 2. Fallback to zero-migration audit_logs store
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('details')
      .eq('id', getUsageRowId(userId))
      .eq('action', USAGE_STORE_AUDIT_ACTION)
      .maybeSingle();

    if (error || !data?.details) return null;
    const parsed = JSON.parse(data.details);
    return normalizeProfile(parsed);
  } catch {
    return null;
  }
}

async function writeProfileToSupabase(profile: StoredUserUsageProfile): Promise<boolean> {
  const supabase = getServerSupabase();
  if (!supabase) return false;

  // 1. Dedicated table if available
  if (hasDedicatedUsageTable !== false) {
    try {
      const { error } = await supabase.from('user_usage_profiles').upsert(
        {
          user_id: profile.userId,
          student_id: profile.studentId || null,
          user_name: profile.userName,
          email: profile.email || null,
          user_role: profile.userRole,
          batch_id: profile.batchId || null,
          batch_name: profile.batchName || null,
          total_duration_sec: profile.totalDurationSec,
          total_sessions: profile.totalSessions,
          total_views: profile.totalViews,
          total_actions: profile.totalActions,
          mobile_events: profile.mobileEvents,
          desktop_events: profile.desktopEvents,
          first_seen_at: profile.firstSeenAt,
          last_active_at: profile.lastActiveAt,
          last_session_id: profile.lastSessionId || null,
          last_path: profile.lastPath,
          last_feature_key: profile.lastFeatureKey,
          last_feature_name: profile.lastFeatureName,
          last_device: profile.lastDevice,
          last_browser: profile.lastBrowser || null,
          last_os: profile.lastOs || null,
          feature_stats: profile.featureStats,
          daily_stats: profile.dailyStats,
          recent_events: profile.recentEvents,
          updated_at: profile.updatedAt,
        },
        { onConflict: 'user_id' }
      );
      if (!error) {
        hasDedicatedUsageTable = true;
        return true;
      }
      if (isTableMissingError(error)) {
        hasDedicatedUsageTable = false;
      }
    } catch {
      // fall through
    }
  }

  // 2. Zero-migration deterministic upsert into audit_logs
  try {
    const { error } = await supabase.from('audit_logs').upsert(
      {
        id: getUsageRowId(profile.userId),
        actor_id: profile.userId,
        actor_name: profile.userName,
        action: USAGE_STORE_AUDIT_ACTION,
        target: profile.studentId || profile.userId,
        details: JSON.stringify(profile),
        timestamp: profile.lastActiveAt,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('[Analytics Store] Supabase write error:', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Analytics Store] Supabase write exception:', err?.message || err);
    return false;
  }
}

/**
 * Loads a single user's usage profile (from cache -> Supabase -> local DB).
 */
export async function getUserUsageProfile(userId: string): Promise<StoredUserUsageProfile | null> {
  const cached = profileCache.get(userId);
  if (cached) return cached;

  const remote = await readProfileFromSupabase(userId);
  if (remote) {
    profileCache.set(userId, remote);
    return remote;
  }

  const localStore = getLocalProfilesStore();
  const local = normalizeProfile(localStore[userId]);
  if (local) {
    profileCache.set(userId, local);
  }
  return local;
}

/**
 * Records a verified user page view, interactive action, or active-time heartbeat.
 */
export async function recordUserUsageEvent(input: TrackUsageInput): Promise<StoredUserUsageProfile> {
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const todayKey = getDateKey(nowIso);

  let existing = await getUserUsageProfile(input.userId);
  const safeDuration = Math.min(600, Math.max(0, Math.round(Number(input.durationSec) || 0)));

  let isNewSession = false;
  if (!existing) {
    isNewSession = true;
    existing = {
      userId: input.userId,
      studentId: input.studentId || '',
      userName: input.userName || 'Student',
      email: input.email,
      userRole: input.userRole || 'STUDENT',
      batchId: input.batchId,
      batchName: input.batchName,
      totalDurationSec: 0,
      totalSessions: 0,
      totalViews: 0,
      totalActions: 0,
      mobileEvents: 0,
      desktopEvents: 0,
      firstSeenAt: nowIso,
      lastActiveAt: nowIso,
      lastSessionId: input.sessionId,
      lastPath: input.path,
      lastFeatureKey: input.featureKey,
      lastFeatureName: input.featureName,
      lastDevice: input.deviceType,
      lastBrowser: input.browser,
      lastOs: input.os,
      featureStats: {},
      dailyStats: {},
      recentEvents: [],
      updatedAt: nowIso,
    };
  } else {
    const lastActiveMs = new Date(existing.lastActiveAt).getTime();
    const gapExceeded = !Number.isFinite(lastActiveMs) || nowMs - lastActiveMs > SESSION_GAP_MS;
    const sessionChanged = Boolean(
      input.sessionId && existing.lastSessionId && input.sessionId !== existing.lastSessionId && nowMs - lastActiveMs > 60_000
    );
    if (gapExceeded || sessionChanged) {
      isNewSession = true;
    }
  }

  // Update latest identity/context
  existing.userName = input.userName || existing.userName;
  if (input.studentId) existing.studentId = input.studentId;
  if (input.email) existing.email = input.email;
  if (input.userRole) existing.userRole = input.userRole;
  if (input.batchId) existing.batchId = input.batchId;
  if (input.batchName) existing.batchName = input.batchName;

  if (isNewSession) {
    existing.totalSessions += 1;
  }
  if (input.sessionId) {
    existing.lastSessionId = input.sessionId;
  }

  existing.totalDurationSec += safeDuration;
  existing.lastActiveAt = nowIso;
  existing.updatedAt = nowIso;
  existing.lastPath = input.path || existing.lastPath;
  existing.lastFeatureKey = input.featureKey || existing.lastFeatureKey;
  existing.lastFeatureName = input.featureName || existing.lastFeatureName;
  existing.lastDevice = input.deviceType;
  if (input.browser) existing.lastBrowser = input.browser;
  if (input.os) existing.lastOs = input.os;

  if (input.actionType === 'VIEW') {
    existing.totalViews += 1;
    if (input.deviceType === 'Mobile') existing.mobileEvents += 1;
    else existing.desktopEvents += 1;
  } else if (input.actionType === 'ACTION') {
    existing.totalActions += 1;
    if (input.deviceType === 'Mobile') existing.mobileEvents += 1;
    else existing.desktopEvents += 1;
  }

  // Update per-feature stats
  const fKey = input.featureKey || 'DASHBOARD';
  const prevFeat = existing.featureStats[fKey] || {
    featureKey: fKey,
    featureName: input.featureName || fKey,
    category: input.category || 'ACADEMIC',
    views: 0,
    actions: 0,
    durationSec: 0,
    lastUsedAt: nowIso,
  };
  prevFeat.featureName = input.featureName || prevFeat.featureName;
  prevFeat.category = input.category || prevFeat.category;
  if (input.actionType === 'VIEW') prevFeat.views += 1;
  if (input.actionType === 'ACTION') prevFeat.actions += 1;
  prevFeat.durationSec += safeDuration;
  prevFeat.lastUsedAt = nowIso;
  existing.featureStats[fKey] = prevFeat;

  // Update daily stats
  const prevDay = existing.dailyStats[todayKey] || {
    date: todayKey,
    durationSec: 0,
    views: 0,
    actions: 0,
    sessions: 0,
  };
  prevDay.durationSec += safeDuration;
  if (input.actionType === 'VIEW') prevDay.views += 1;
  if (input.actionType === 'ACTION') prevDay.actions += 1;
  if (isNewSession) prevDay.sessions += 1;
  existing.dailyStats[todayKey] = prevDay;
  existing.dailyStats = pruneDailyStats(existing.dailyStats);

  // Record in recentEvents:
  // If this is a HEARTBEAT on the same path as the latest event within 5 minutes, accumulate duration cleanly instead of spamming feed
  const latestEvent = existing.recentEvents[0];
  const canMergeHeartbeat =
    input.actionType === 'HEARTBEAT' &&
    latestEvent &&
    latestEvent.path === input.path &&
    nowMs - new Date(latestEvent.timestamp).getTime() < 5 * 60 * 1000;

  if (canMergeHeartbeat) {
    latestEvent.durationSec += safeDuration;
    latestEvent.timestamp = nowIso;
  } else if (input.actionType !== 'HEARTBEAT' || safeDuration > 0) {
    const newEvt: UserActivityEvent = {
      id: `evt-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
      featureKey: fKey,
      featureName: input.featureName,
      category: input.category,
      path: input.path,
      actionType: input.actionType,
      actionDetail: input.actionDetail,
      durationSec: safeDuration,
      deviceType: input.deviceType,
      browser: input.browser,
      os: input.os,
      timestamp: nowIso,
    };
    existing.recentEvents.unshift(newEvt);
    if (existing.recentEvents.length > 40) {
      existing.recentEvents = existing.recentEvents.slice(0, 40);
    }
  }

  saveToLocalStore(existing);
  await writeProfileToSupabase(existing);
  return existing;
}

/**
 * Fetches all persisted user usage profiles from Supabase (merged with local cache).
 */
export async function listAllUsageProfiles(forceRefresh = false): Promise<StoredUserUsageProfile[]> {
  if (!forceRefresh && allProfilesCache && Date.now() - allProfilesCache.fetchedAt < ALL_PROFILES_TTL_MS) {
    return allProfilesCache.data;
  }

  const mergedMap = new Map<string, StoredUserUsageProfile>();

  // Load local first
  const localStore = getLocalProfilesStore();
  for (const val of Object.values(localStore)) {
    const norm = normalizeProfile(val);
    if (norm) mergedMap.set(norm.userId, norm);
  }

  const supabase = getServerSupabase();
  if (supabase) {
    let loadedDedicated = false;
    if (hasDedicatedUsageTable !== false) {
      try {
        const { data, error } = await supabase
          .from('user_usage_profiles')
          .select('*')
          .order('last_active_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          hasDedicatedUsageTable = true;
          loadedDedicated = true;
          for (const row of data) {
            const norm = normalizeProfile({
              userId: row.user_id,
              studentId: row.student_id,
              userName: row.user_name,
              email: row.email,
              userRole: row.user_role,
              batchId: row.batch_id,
              batchName: row.batch_name,
              totalDurationSec: row.total_duration_sec,
              totalSessions: row.total_sessions,
              totalViews: row.total_views,
              totalActions: row.total_actions,
              mobileEvents: row.mobile_events,
              desktopEvents: row.desktop_events,
              firstSeenAt: row.first_seen_at,
              lastActiveAt: row.last_active_at,
              lastSessionId: row.last_session_id,
              lastPath: row.last_path,
              lastFeatureKey: row.last_feature_key,
              lastFeatureName: row.last_feature_name,
              lastDevice: row.last_device,
              lastBrowser: row.last_browser,
              lastOs: row.last_os,
              featureStats: row.feature_stats,
              dailyStats: row.daily_stats,
              recentEvents: row.recent_events,
              updatedAt: row.updated_at,
            });
            if (norm) {
              mergedMap.set(norm.userId, norm);
              profileCache.set(norm.userId, norm);
            }
          }
        } else if (isTableMissingError(error)) {
          hasDedicatedUsageTable = false;
        }
      } catch {
        // fall through
      }
    }

    if (!loadedDedicated) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('details')
          .eq('action', USAGE_STORE_AUDIT_ACTION)
          .order('timestamp', { ascending: false })
          .limit(500);

        if (!error && Array.isArray(data)) {
          for (const row of data) {
            if (!row?.details) continue;
            try {
              const parsed = JSON.parse(row.details);
              const norm = normalizeProfile(parsed);
              if (norm) {
                const existing = mergedMap.get(norm.userId);
                if (!existing || norm.lastActiveAt >= existing.lastActiveAt) {
                  mergedMap.set(norm.userId, norm);
                  profileCache.set(norm.userId, norm);
                }
              }
            } catch {
              // ignore malformed JSON
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const list = Array.from(mergedMap.values()).sort((a, b) =>
    b.lastActiveAt.localeCompare(a.lastActiveAt)
  );
  allProfilesCache = { data: list, fetchedAt: Date.now() };
  return list;
}
