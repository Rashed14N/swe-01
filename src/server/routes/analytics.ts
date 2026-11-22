import { Router, Response } from 'express';
import { db } from '../db';
import { verifyAuthToken, AuthenticatedRequest } from '../auth';
import { requireRole } from '../middleware';
import { fetchAllUsers } from '../supabaseData';
import { fetchAllStudentCGPAsFromSupabase } from '../cgpaStore';
import {
  recordUserUsageEvent,
  listAllUsageProfiles,
  getUserUsageProfile,
  StoredUserUsageProfile,
} from '../analyticsStore';
import type { User } from '../../types';

const router = Router();

export const PORTAL_FEATURES: Array<{
  key: string;
  name: string;
  category: 'ACADEMIC' | 'ASSESSMENT' | 'COMMUNICATION' | 'RESOURCE' | 'PERSONAL' | 'MANAGEMENT';
  defaultPath: string;
}> = [
  { key: 'DASHBOARD', name: 'Student Dashboard', category: 'ACADEMIC', defaultPath: '/dashboard' },
  { key: 'ROUTINE', name: 'Class Routine & Schedule', category: 'ACADEMIC', defaultPath: '/routine' },
  { key: 'COURSES', name: 'Courses & Curriculum', category: 'ACADEMIC', defaultPath: '/courses' },
  { key: 'COURSE_DETAIL', name: 'Course Topics & Tasks', category: 'ACADEMIC', defaultPath: '/courses/:id' },
  { key: 'EXAMS', name: 'Exams & Assessment Tracker', category: 'ASSESSMENT', defaultPath: '/exams' },
  { key: 'QUESTION_BANK', name: 'Question Bank & Notes', category: 'RESOURCE', defaultPath: '/resources/questions' },
  { key: 'CGPA', name: 'CGPA & Grade Calculator', category: 'ASSESSMENT', defaultPath: '/cgpa' },
  { key: 'ANNOUNCEMENTS', name: 'Batch Announcements', category: 'COMMUNICATION', defaultPath: '/announcements' },
  { key: 'NOTICES', name: 'Department Notices', category: 'COMMUNICATION', defaultPath: '/notices' },
  { key: 'RETAKES', name: 'Retake & Improvement Desk', category: 'ACADEMIC', defaultPath: '/retake-courses' },
  { key: 'FACULTY', name: 'Faculty Directory', category: 'ACADEMIC', defaultPath: '/faculty' },
  { key: 'FAQ', name: 'Academic FAQ & Help', category: 'RESOURCE', defaultPath: '/faq' },
  { key: 'PROFILE', name: 'Student Profile & Docs', category: 'PERSONAL', defaultPath: '/profile' },
  { key: 'CR_TOOLS', name: 'CR Management Desk', category: 'MANAGEMENT', defaultPath: '/cr/dashboard' },
  { key: 'ADMIN_PANEL', name: 'Admin Management Panel', category: 'MANAGEMENT', defaultPath: '/admin/dashboard' },
];

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // Active in last 5 minutes = Online Now
const DAY_MS = 24 * 60 * 60 * 1000;

function getLast7DateKeys(nowMs: number): Array<{ date: string; label: string }> {
  const days: Array<{ date: string; label: string }> = [];
  for (let d = 6; d >= 0; d--) {
    const dt = new Date(nowMs - d * DAY_MS);
    days.push({
      date: dt.toISOString().slice(0, 10),
      label: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    });
  }
  return days;
}

function buildUserDossier(
  user: Partial<User> & { id: string; name: string },
  profile: StoredUserUsageProfile | undefined,
  cgpaValue: number,
  nowMs: number,
  last7Days: Array<{ date: string; label: string }>
) {
  const todayKey = new Date(nowMs).toISOString().slice(0, 10);
  const lastActiveIso = profile?.lastActiveAt || null;
  const lastActiveMs = lastActiveIso ? new Date(lastActiveIso).getTime() : 0;
  const isOnline = Boolean(lastActiveMs && nowMs - lastActiveMs <= ONLINE_THRESHOLD_MS);

  let activityStatus: 'ONLINE' | 'TODAY' | 'THIS_WEEK' | 'INACTIVE' | 'NEVER' = 'NEVER';
  if (isOnline) {
    activityStatus = 'ONLINE';
  } else if (lastActiveIso && lastActiveIso.slice(0, 10) === todayKey) {
    activityStatus = 'TODAY';
  } else if (lastActiveMs && nowMs - lastActiveMs <= 7 * DAY_MS) {
    activityStatus = 'THIS_WEEK';
  } else if (lastActiveMs > 0) {
    activityStatus = 'INACTIVE';
  }

  const totalDurationSec = profile?.totalDurationSec || 0;
  const totalSessions = profile?.totalSessions || 0;
  const totalViews = profile?.totalViews || 0;
  const totalActions = profile?.totalActions || 0;
  const totalEvents = totalViews + totalActions;
  const avgSessionDurationSec =
    totalSessions > 0 ? Math.round(totalDurationSec / totalSessions) : 0;

  const todayStats = profile?.dailyStats?.[todayKey];
  const todayDurationSec = todayStats?.durationSec || 0;
  const todayEvents = (todayStats?.views || 0) + (todayStats?.actions || 0);

  let last7DaysDurationSec = 0;
  let last7DaysSessions = 0;
  const dailyActivity = last7Days.map(day => {
    const stat = profile?.dailyStats?.[day.date];
    const dur = stat?.durationSec || 0;
    const sess = stat?.sessions || 0;
    last7DaysDurationSec += dur;
    last7DaysSessions += sess;
    return {
      date: day.date,
      label: day.label,
      durationSec: dur,
      views: stat?.views || 0,
      actions: stat?.actions || 0,
      sessions: sess,
    };
  });

  const featureUsage = Object.values(profile?.featureStats || {})
    .map(f => {
      const count = (f.views || 0) + (f.actions || 0);
      return {
        featureKey: f.featureKey,
        featureName: f.featureName,
        category: f.category,
        views: f.views || 0,
        actions: f.actions || 0,
        count,
        durationSec: f.durationSec || 0,
        lastUsedAt: f.lastUsedAt,
        percent:
          totalDurationSec > 0
            ? Math.round(((f.durationSec || 0) / totalDurationSec) * 100)
            : totalEvents > 0
            ? Math.round((count / totalEvents) * 100)
            : 0,
      };
    })
    .sort((a, b) => b.durationSec - a.durationSec || b.count - a.count);

  const favoriteFeature = featureUsage[0]?.featureName || (profile ? profile.lastFeatureName : 'Not Used Yet');
  const topFeatures = featureUsage.slice(0, 5).map(f => ({
    name: f.featureName,
    count: f.count,
    durationSec: f.durationSec,
    percent: f.percent,
  }));

  const mobileEvents = profile?.mobileEvents || 0;
  const desktopEvents = profile?.desktopEvents || 0;
  const devicePreference =
    mobileEvents === 0 && desktopEvents === 0
      ? profile?.lastDevice || 'Unknown'
      : mobileEvents >= desktopEvents
      ? 'Mobile'
      : 'Desktop';

  return {
    userId: user.id,
    userName: user.name || profile?.userName || 'Student',
    studentId: user.studentId || profile?.studentId || '',
    email: user.email || profile?.email || '',
    phone: user.phone || '',
    userRole: user.role || profile?.userRole || 'STUDENT',
    batchId: user.batchId || profile?.batchId || '',
    batchName: user.batchName || profile?.batchName || 'SWE Batch',
    currentSemester: user.currentSemester ?? 0,
    accountStatus: user.status || 'ACTIVE',
    profileImage: user.profileImage || '',
    cgpa: Number(cgpaValue || 0),
    registeredAt: user.createdAt || null,

    // Live activity & time metrics
    isOnline,
    activityStatus,
    totalDurationSec,
    totalTimeMinutes: totalDurationSec > 0 ? Math.max(1, Math.round(totalDurationSec / 60)) : 0,
    todayDurationSec,
    todayEvents,
    last7DaysDurationSec,
    last7DaysSessions,
    avgSessionDurationSec,
    totalSessions,
    totalViews,
    totalActions,
    totalEvents,
    firstSeenAt: profile?.firstSeenAt || null,
    lastActive: lastActiveIso,
    lastPath: profile?.lastPath || null,
    lastFeatureKey: profile?.lastFeatureKey || null,
    lastFeatureName: profile?.lastFeatureName || null,
    lastDevice: profile?.lastDevice || null,
    lastBrowser: profile?.lastBrowser || null,
    lastOs: profile?.lastOs || null,
    devicePreference,
    mobileEvents,
    desktopEvents,
    favoriteFeature,
    topFeatures,
    featureUsage,
    dailyActivity,
    recentActions: (profile?.recentEvents || []).slice(0, 40),
  };
}

/**
 * POST /api/analytics/track
 * Authenticated real-time tracking endpoint for page views, interactive actions, and active-time heartbeats.
 */
router.post('/track', verifyAuthToken, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const {
      featureKey,
      featureName,
      category,
      actionType = 'VIEW',
      actionDetail,
      path = '/dashboard',
      durationSec = 0,
      deviceType = 'Desktop',
      browser,
      os,
      sessionId,
    } = req.body || {};

    const cleanPath = String(path || '/dashboard').slice(0, 200);
    const meta = PORTAL_FEATURES.find(f => f.key === featureKey) || {
      key: String(featureKey || 'DASHBOARD').slice(0, 40),
      name: String(featureName || 'Portal Page').slice(0, 80),
      category: (category as any) || 'ACADEMIC',
      defaultPath: cleanPath,
    };

    const normalizedActionType: 'VIEW' | 'ACTION' | 'HEARTBEAT' =
      actionType === 'ACTION'
        ? 'ACTION'
        : actionType === 'HEARTBEAT'
        ? 'HEARTBEAT'
        : 'VIEW';

    const profile = await recordUserUsageEvent({
      userId: req.user.id,
      studentId: req.user.studentId,
      userName: req.user.name,
      email: req.user.email,
      userRole: req.user.role,
      batchId: req.user.batchId,
      batchName: req.user.batchName,
      featureKey: meta.key,
      featureName: String(featureName || meta.name).slice(0, 80),
      category: meta.category,
      path: cleanPath,
      actionType: normalizedActionType,
      actionDetail: String(actionDetail || `Visited ${meta.name}`).slice(0, 160),
      durationSec: Math.min(600, Math.max(0, Math.round(Number(durationSec) || 0))),
      deviceType: deviceType === 'Mobile' ? 'Mobile' : 'Desktop',
      browser: browser ? String(browser).slice(0, 40) : undefined,
      os: os ? String(os).slice(0, 40) : undefined,
      sessionId: sessionId ? String(sessionId).slice(0, 80) : undefined,
    });

    return res.json({
      success: true,
      totalDurationSec: profile.totalDurationSec,
      lastActiveAt: profile.lastActiveAt,
    });
  } catch (err: any) {
    console.error('[Analytics Track Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to record usage event' });
  }
});

/**
 * GET /api/analytics/overview
 * Complete real-time user activity, usage duration, last active timestamps, and feature analytics for Admin.
 */
router.get('/overview', verifyAuthToken, requireRole('ADMIN', 'CR'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';
    const [allUsers, usageProfiles, supabaseCgpaMap] = await Promise.all([
      fetchAllUsers().catch(() => db.getUsers()),
      listAllUsageProfiles(forceRefresh),
      fetchAllStudentCGPAsFromSupabase().catch(() => ({} as Record<string, number>)),
    ]);

    const nowMs = Date.now();
    const last7Days = getLast7DateKeys(nowMs);
    const recent3Keys = new Set(last7Days.slice(-3).map(d => d.date));
    const older4Keys = new Set(last7Days.slice(0, 4).map(d => d.date));

    // Index usage profiles by userId and studentId
    const profileByUserId = new Map<string, StoredUserUsageProfile>();
    const profileByStudentId = new Map<string, StoredUserUsageProfile>();
    for (const p of usageProfiles) {
      profileByUserId.set(p.userId, p);
      if (p.studentId) profileByStudentId.set(p.studentId, p);
    }

    // Merge all registered users with persisted usage profiles
    const seenUserIds = new Set<string>();
    const userBreakdown: ReturnType<typeof buildUserDossier>[] = [];

    for (const u of allUsers) {
      seenUserIds.add(u.id);
      const prof = profileByUserId.get(u.id) || (u.studentId ? profileByStudentId.get(u.studentId) : undefined);
      const cgpaVal =
        supabaseCgpaMap[u.id] ??
        (u.studentId ? supabaseCgpaMap[u.studentId] : undefined) ??
        db.getStudentCGPA(u.id, u.studentId) ??
        0;
      userBreakdown.push(buildUserDossier(u, prof, cgpaVal, nowMs, last7Days));
    }

    // Include any tracked profile not yet in allUsers list (e.g. demo or newly synced account)
    for (const p of usageProfiles) {
      if (seenUserIds.has(p.userId)) continue;
      const cgpaVal =
        supabaseCgpaMap[p.userId] ??
        (p.studentId ? supabaseCgpaMap[p.studentId] : undefined) ??
        0;
      userBreakdown.push(
        buildUserDossier(
          {
            id: p.userId,
            name: p.userName,
            studentId: p.studentId,
            email: p.email,
            role: (p.userRole as any) || 'STUDENT',
            batchId: p.batchId,
            batchName: p.batchName,
          },
          p,
          cgpaVal,
          nowMs,
          last7Days
        )
      );
    }

    // Default sort: Online first, then most recently active, then total time spent
    userBreakdown.sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      if (a.lastActive && b.lastActive) return b.lastActive.localeCompare(a.lastActive);
      if (a.lastActive) return -1;
      if (b.lastActive) return 1;
      return b.totalDurationSec - a.totalDurationSec;
    });

    // Aggregate Feature Breakdown from real usage profiles
    const featureMap = new Map<
      string,
      {
        featureKey: string;
        featureName: string;
        category: string;
        totalEvents: number;
        totalViews: number;
        totalActions: number;
        totalDurationSec: number;
        uniqueUserIds: Set<string>;
        topUsers: Array<{ userId: string; name: string; count: number; durationSec: number; batchName: string }>;
      }
    >();

    for (const f of PORTAL_FEATURES) {
      featureMap.set(f.key, {
        featureKey: f.key,
        featureName: f.name,
        category: f.category,
        totalEvents: 0,
        totalViews: 0,
        totalActions: 0,
        totalDurationSec: 0,
        uniqueUserIds: new Set(),
        topUsers: [],
      });
    }

    let totalEventsAll = 0;
    let totalDurationAll = 0;
    let totalSessionsAll = 0;
    let mobileEventsAll = 0;
    let desktopEventsAll = 0;
    let onlineNowCount = 0;
    let activeTodayCount = 0;
    let activeThisWeekCount = 0;
    let neverUsedCount = 0;
    let trackedUsersCount = 0;

    // Daily trend map
    const dailyAgg: Record<string, { views: number; actions: number; durationSec: number; users: Set<string> }> = {};
    for (const d of last7Days) {
      dailyAgg[d.date] = { views: 0, actions: 0, durationSec: 0, users: new Set() };
    }

    // Batch aggregation
    const batchMap = new Map<
      string,
      {
        batchName: string;
        totalUsers: number;
        activeUsers: number;
        onlineUsers: number;
        totalEvents: number;
        totalDurationSec: number;
        featureCounts: Record<string, number>;
      }
    >();

    const recentStream: Array<any> = [];

    for (const u of userBreakdown) {
      if (u.isOnline) onlineNowCount++;
      if (u.activityStatus === 'ONLINE' || u.activityStatus === 'TODAY') activeTodayCount++;
      if (u.activityStatus === 'ONLINE' || u.activityStatus === 'TODAY' || u.activityStatus === 'THIS_WEEK') {
        activeThisWeekCount++;
      }
      if (u.activityStatus === 'NEVER') neverUsedCount++;
      else trackedUsersCount++;

      totalEventsAll += u.totalEvents;
      totalDurationAll += u.totalDurationSec;
      totalSessionsAll += u.totalSessions;
      mobileEventsAll += u.mobileEvents;
      desktopEventsAll += u.desktopEvents;

      // Batch stats
      const bName = u.batchName || 'Unassigned Batch';
      let bStat = batchMap.get(bName);
      if (!bStat) {
        bStat = {
          batchName: bName,
          totalUsers: 0,
          activeUsers: 0,
          onlineUsers: 0,
          totalEvents: 0,
          totalDurationSec: 0,
          featureCounts: {},
        };
        batchMap.set(bName, bStat);
      }
      bStat.totalUsers += 1;
      if (u.activityStatus !== 'NEVER') bStat.activeUsers += 1;
      if (u.isOnline) bStat.onlineUsers += 1;
      bStat.totalEvents += u.totalEvents;
      bStat.totalDurationSec += u.totalDurationSec;

      for (const f of u.featureUsage) {
        bStat.featureCounts[f.featureName] = (bStat.featureCounts[f.featureName] || 0) + f.count;
        let fStat = featureMap.get(f.featureKey);
        if (!fStat) {
          fStat = {
            featureKey: f.featureKey,
            featureName: f.featureName,
            category: f.category || 'ACADEMIC',
            totalEvents: 0,
            totalViews: 0,
            totalActions: 0,
            totalDurationSec: 0,
            uniqueUserIds: new Set(),
            topUsers: [],
          };
          featureMap.set(f.featureKey, fStat);
        }
        fStat.totalEvents += f.count;
        fStat.totalViews += f.views;
        fStat.totalActions += f.actions;
        fStat.totalDurationSec += f.durationSec;
        fStat.uniqueUserIds.add(u.userId);
        fStat.topUsers.push({
          userId: u.userId,
          name: u.userName,
          count: f.count,
          durationSec: f.durationSec,
          batchName: u.batchName,
        });
      }

      for (const d of u.dailyActivity) {
        const agg = dailyAgg[d.date];
        if (!agg) continue;
        agg.views += d.views;
        agg.actions += d.actions;
        agg.durationSec += d.durationSec;
        if (d.views > 0 || d.actions > 0 || d.durationSec > 0) {
          agg.users.add(u.userId);
        }
      }

      for (const ev of u.recentActions.slice(0, 10)) {
        recentStream.push({
          ...ev,
          userId: u.userId,
          userName: u.userName,
          studentId: u.studentId,
          userRole: u.userRole,
          batchName: u.batchName,
        });
      }
    }

    recentStream.sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));

    const totalRegisteredStudents = Math.max(1, allUsers.filter(u => u.role !== 'ADMIN').length);
    const safeTotalEvents = Math.max(1, totalEventsAll);

    const featureBreakdown = Array.from(featureMap.values())
      .map(f => {
        const uniqueUsers = f.uniqueUserIds.size;
        const avgDurationSec = f.totalEvents > 0 ? Math.round(f.totalDurationSec / f.totalEvents) : 0;
        const adoptionRatePercent = Math.min(100, Math.round((uniqueUsers / totalRegisteredStudents) * 100));
        const sharePercent = totalEventsAll > 0 ? Math.round((f.totalEvents / safeTotalEvents) * 100) : 0;
        const topUsers = f.topUsers
          .sort((a, b) => b.durationSec - a.durationSec || b.count - a.count)
          .slice(0, 3);

        return {
          featureKey: f.featureKey,
          featureName: f.featureName,
          category: f.category,
          totalEvents: f.totalEvents,
          totalViews: f.totalViews,
          totalActions: f.totalActions,
          totalDurationSec: f.totalDurationSec,
          uniqueUsers,
          avgDurationSec,
          adoptionRatePercent,
          sharePercent,
          trendPercent: 0,
          topUsers,
        };
      })
      .sort((a, b) => b.totalDurationSec - a.totalDurationSec || b.totalEvents - a.totalEvents);

    const batchComparison = Array.from(batchMap.values())
      .map(b => {
        const topF =
          Object.entries(b.featureCounts).sort((a, b2) => b2[1] - a[1])[0]?.[0] || 'No Activity Yet';
        return {
          batchName: b.batchName,
          totalUsers: b.totalUsers,
          activeUsers: b.activeUsers,
          onlineUsers: b.onlineUsers,
          totalEvents: b.totalEvents,
          totalDurationSec: b.totalDurationSec,
          topFeature: topF,
        };
      })
      .sort((a, b) => b.totalDurationSec - a.totalDurationSec || b.activeUsers - a.activeUsers);

    const dailyTrends = last7Days.map(d => {
      const agg = dailyAgg[d.date];
      return {
        date: d.date,
        label: d.label,
        views: agg.views,
        actions: agg.actions,
        durationSec: agg.durationSec,
        uniqueUsers: agg.users.size,
      };
    });

    const totalDeviceHits = mobileEventsAll + desktopEventsAll;
    const mobileUsagePercent =
      totalDeviceHits > 0 ? Math.round((mobileEventsAll / totalDeviceHits) * 100) : 0;
    const desktopUsagePercent = totalDeviceHits > 0 ? 100 - mobileUsagePercent : 0;

    // Recent trend comparison (last 3 days vs previous 4 days)
    let recentDuration = 0;
    let olderDuration = 0;
    for (const d of dailyTrends) {
      if (recent3Keys.has(d.date)) recentDuration += d.durationSec;
      else if (older4Keys.has(d.date)) olderDuration += d.durationSec;
    }

    const mostUsed = featureBreakdown.find(f => f.totalEvents > 0);
    const leastUsed = featureBreakdown
      .filter(f => f.featureKey !== 'CR_TOOLS' && f.featureKey !== 'ADMIN_PANEL')
      .slice(-2);

    const recommendations = [
      {
        id: 'rec-engagement',
        priority: 'HIGH',
        title: `${activeTodayCount} Users Active Today (${onlineNowCount} Online Now)`,
        finding: `${trackedUsersCount} out of ${userBreakdown.length} registered accounts have recorded real usage sessions so far. ${neverUsedCount} users have not used the portal yet.`,
        action: 'Share quick-access portal links in batch WhatsApp groups to bring inactive students onto daily routine and exam schedules.',
        metric: `${Math.round((trackedUsersCount / Math.max(1, userBreakdown.length)) * 100)}% Adoption`,
      },
      {
        id: 'rec-device',
        priority: 'MEDIUM',
        title:
          totalDeviceHits > 0
            ? `${mobileUsagePercent}% Mobile vs ${desktopUsagePercent}% Desktop Traffic`
            : 'Real-Time Device Tracking Active',
        finding: mostUsed
          ? `Students spend the most time on "${mostUsed.featureName}" (${Math.round(mostUsed.totalDurationSec / 60)}m total tracked across ${mostUsed.uniqueUsers} users).`
          : 'Live tracking is now recording exact time spent and device preferences as users navigate the portal.',
        action: 'Keep top actions (Today Routine, Exam Countdown, CGPA Editor) fast and thumb-friendly on mobile screens.',
        metric: totalDeviceHits > 0 ? `${mobileUsagePercent}% Mobile` : 'Live',
      },
      {
        id: 'rec-trend',
        priority: 'OPPORTUNITY',
        title:
          recentDuration >= olderDuration
            ? 'Steady Portal Usage Momentum Over Last 3 Days'
            : `Boost Discovery of "${leastUsed[0]?.featureName || 'Academic FAQ'}"`,
        finding: `Total tracked active time across all users is ${Math.round(totalDurationAll / 60)} minutes over ${totalSessionsAll} sessions.`,
        action: 'Use the User Activity tab to inspect individual student engagement, last seen time, and favorite modules.',
        metric: `${totalSessionsAll} Sessions`,
      },
    ];

    return res.json({
      summary: {
        totalEvents: totalEventsAll,
        totalSessions: totalSessionsAll,
        totalTrackedDurationSec: totalDurationAll,
        activeUsersCount: trackedUsersCount,
        onlineNowCount,
        activeTodayCount,
        activeThisWeekCount,
        neverUsedCount,
        totalRegisteredUsers: userBreakdown.length,
        totalRegisteredStudents,
        avgSessionDurationSec:
          totalSessionsAll > 0 ? Math.round(totalDurationAll / totalSessionsAll) : 0,
        mobileUsagePercent,
        desktopUsagePercent,
        mostUsedFeature: mostUsed?.featureName || 'No Activity Yet',
        leastUsedFeature: leastUsed[0]?.featureName || 'Academic FAQ & Help',
      },
      featureBreakdown,
      userBreakdown,
      batchComparison,
      dailyTrends,
      recommendations,
      recentStream: recentStream.slice(0, 80),
    });
  } catch (err: any) {
    console.error('[Analytics Overview Error]:', err);
    return res.status(500).json({ error: 'Failed to load feature analytics' });
  }
});

/**
 * GET /api/analytics/user/:userId
 * Returns complete activity & usage dossier for a specific user (Admin only).
 */
router.get('/user/:userId', verifyAuthToken, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUserId = String(req.params.userId || '').trim();
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const [allUsers, profile, supabaseCgpaMap] = await Promise.all([
      fetchAllUsers().catch(() => db.getUsers()),
      getUserUsageProfile(targetUserId),
      fetchAllStudentCGPAsFromSupabase().catch(() => ({} as Record<string, number>)),
    ]);

    const user = allUsers.find(u => u.id === targetUserId || u.studentId === targetUserId);
    if (!user && !profile) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const nowMs = Date.now();
    const last7Days = getLast7DateKeys(nowMs);
    const resolvedId = user?.id || profile!.userId;
    const resolvedRoll = user?.studentId || profile?.studentId || '';
    const cgpaVal =
      supabaseCgpaMap[resolvedId] ??
      (resolvedRoll ? supabaseCgpaMap[resolvedRoll] : undefined) ??
      db.getStudentCGPA(resolvedId, resolvedRoll) ??
      0;

    const dossier = buildUserDossier(
      user || {
        id: profile!.userId,
        name: profile!.userName,
        studentId: profile!.studentId,
        email: profile!.email,
        role: (profile!.userRole as any) || 'STUDENT',
        batchId: profile!.batchId,
        batchName: profile!.batchName,
      },
      profile || undefined,
      cgpaVal,
      nowMs,
      last7Days
    );

    return res.json({ success: true, data: dossier });
  } catch (err: any) {
    console.error('[Analytics User Detail Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to load user activity details' });
  }
});

export default router;
