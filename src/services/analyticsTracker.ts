import { User } from '../types';
import { getSupabase } from '../lib/supabase';

export interface TrackEventParams {
  user?: User | null;
  token?: string | null;
  path: string;
  actionType?: 'VIEW' | 'ACTION' | 'HEARTBEAT';
  actionDetail?: string;
  durationSec?: number;
}

export function resolveFeatureFromPath(pathname: string): {
  featureKey: string;
  featureName: string;
  category: 'ACADEMIC' | 'ASSESSMENT' | 'COMMUNICATION' | 'RESOURCE' | 'PERSONAL' | 'MANAGEMENT';
} {
  const p = (pathname || '/dashboard').toLowerCase();
  if (p.startsWith('/admin')) {
    return { featureKey: 'ADMIN_PANEL', featureName: 'Admin Management Panel', category: 'MANAGEMENT' };
  }
  if (p.startsWith('/routine')) {
    return { featureKey: 'ROUTINE', featureName: 'Class Routine & Schedule', category: 'ACADEMIC' };
  }
  if (p.startsWith('/courses/') && p !== '/courses/') {
    return { featureKey: 'COURSE_DETAIL', featureName: 'Course Topics & Tasks', category: 'ACADEMIC' };
  }
  if (p.startsWith('/courses')) {
    return { featureKey: 'COURSES', featureName: 'Courses & Curriculum', category: 'ACADEMIC' };
  }
  if (p.startsWith('/exams') || p.startsWith('/cr/exams')) {
    return { featureKey: 'EXAMS', featureName: 'Exams & Assessment Tracker', category: 'ASSESSMENT' };
  }
  if (p.startsWith('/resources') || p.startsWith('/question-bank') || p.startsWith('/questions')) {
    return { featureKey: 'QUESTION_BANK', featureName: 'Question Bank & Notes', category: 'RESOURCE' };
  }
  if (p.startsWith('/cgpa') || p.startsWith('/my-cgpa')) {
    return { featureKey: 'CGPA', featureName: 'CGPA & Grade Calculator', category: 'ASSESSMENT' };
  }
  if (p.startsWith('/announcements') || p.startsWith('/cr/announcements')) {
    return { featureKey: 'ANNOUNCEMENTS', featureName: 'Batch Announcements', category: 'COMMUNICATION' };
  }
  if (p.startsWith('/notices')) {
    return { featureKey: 'NOTICES', featureName: 'Department Notices', category: 'COMMUNICATION' };
  }
  if (p.startsWith('/retake') || p.startsWith('/cr/retakes')) {
    return { featureKey: 'RETAKES', featureName: 'Retake & Improvement Desk', category: 'ACADEMIC' };
  }
  if (p.startsWith('/faculty')) {
    return { featureKey: 'FACULTY', featureName: 'Faculty Directory', category: 'ACADEMIC' };
  }
  if (p.startsWith('/faq')) {
    return { featureKey: 'FAQ', featureName: 'Academic FAQ & Help', category: 'RESOURCE' };
  }
  if (p.startsWith('/profile')) {
    return { featureKey: 'PROFILE', featureName: 'Student Profile & Docs', category: 'PERSONAL' };
  }
  if (p.startsWith('/cr')) {
    return { featureKey: 'CR_TOOLS', featureName: 'CR Management Desk', category: 'MANAGEMENT' };
  }
  return { featureKey: 'DASHBOARD', featureName: 'Student Dashboard', category: 'ACADEMIC' };
}

export function getDeviceType(): 'Mobile' | 'Desktop' {
  if (typeof window === 'undefined') return 'Desktop';
  return window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? 'Mobile'
    : 'Desktop';
}

export function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Chrome/') && !ua.includes('Edg/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
  return 'Other';
}

export function detectOS(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

export function getPortalSessionId(): string {
  if (typeof window === 'undefined') return 'srv-session';
  try {
    const key = 'swe_portal_usage_session_id';
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `sess_${Date.now()}`;
  }
}

async function resolveFreshToken(fallbackToken?: string | null): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return data.session.access_token;
    }
  } catch {
    // ignore
  }
  return fallbackToken || null;
}

export function trackFeatureUsage(params: TrackEventParams): void {
  try {
    const { user, token, path, actionType = 'VIEW', actionDetail, durationSec = 0 } = params;
    if (!user) return;

    const meta = resolveFeatureFromPath(path);
    const payload = {
      featureKey: meta.featureKey,
      featureName: meta.featureName,
      category: meta.category,
      actionType,
      actionDetail:
        actionDetail ||
        (actionType === 'HEARTBEAT'
          ? `Active on ${meta.featureName}`
          : actionType === 'VIEW'
          ? `Opened ${meta.featureName}`
          : `Interacted with ${meta.featureName}`),
      path,
      durationSec: Math.max(0, Math.round(durationSec)),
      deviceType: getDeviceType(),
      browser: detectBrowser(),
      os: detectOS(),
      sessionId: getPortalSessionId(),
    };

    // For page unload/visibility hide heartbeats, dispatch synchronously using current token + keepalive
    if (actionType === 'HEARTBEAT' && token) {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
      return;
    }

    resolveFreshToken(token)
      .then((activeToken) => {
        if (!activeToken) return;
        return fetch('/api/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeToken}`,
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      })
      .catch(() => {});
  } catch {
    // Non-blocking
  }
}
