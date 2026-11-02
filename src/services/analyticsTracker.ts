import { User } from '../types';

export interface TrackEventParams {
  user?: User | null;
  token?: string | null;
  path: string;
  actionType?: 'VIEW' | 'ACTION';
  actionDetail?: string;
  durationSec?: number;
}

export function resolveFeatureFromPath(pathname: string): {
  featureKey: string;
  featureName: string;
  category: 'ACADEMIC' | 'ASSESSMENT' | 'COMMUNICATION' | 'RESOURCE' | 'PERSONAL' | 'MANAGEMENT';
} {
  const p = pathname.toLowerCase();
  if (p.startsWith('/routine') || p.includes('/admin/routine')) {
    return { featureKey: 'ROUTINE', featureName: 'Class Routine & Schedule', category: 'ACADEMIC' };
  }
  if (p.startsWith('/courses/') && p !== '/courses/') {
    return { featureKey: 'COURSE_DETAIL', featureName: 'Course Topics & Tasks', category: 'ACADEMIC' };
  }
  if (p.startsWith('/courses') || p.includes('/admin/courses')) {
    return { featureKey: 'COURSES', featureName: 'Courses & Curriculum', category: 'ACADEMIC' };
  }
  if (p.startsWith('/exams') || p.includes('/cr/exams')) {
    return { featureKey: 'EXAMS', featureName: 'Exams & Assessment Tracker', category: 'ASSESSMENT' };
  }
  if (p.startsWith('/question-bank')) {
    return { featureKey: 'QUESTION_BANK', featureName: 'Question Bank & Notes', category: 'RESOURCE' };
  }
  if (p.startsWith('/cgpa')) {
    return { featureKey: 'CGPA', featureName: 'CGPA & Grade Calculator', category: 'ASSESSMENT' };
  }
  if (p.startsWith('/announcements') || p.includes('/cr/announcements')) {
    return { featureKey: 'ANNOUNCEMENTS', featureName: 'Batch Announcements', category: 'COMMUNICATION' };
  }
  if (p.startsWith('/notices') || p.includes('/admin/notices')) {
    return { featureKey: 'NOTICES', featureName: 'Department Notices', category: 'COMMUNICATION' };
  }
  if (p.startsWith('/retakes') || p.includes('/cr/retakes')) {
    return { featureKey: 'RETAKES', featureName: 'Retake & Improvement Desk', category: 'ACADEMIC' };
  }
  if (p.startsWith('/faculty') || p.includes('/admin/faculty')) {
    return { featureKey: 'FACULTY', featureName: 'Faculty Directory', category: 'ACADEMIC' };
  }
  if (p.startsWith('/faq')) {
    return { featureKey: 'FAQ', featureName: 'Academic FAQ & Help', category: 'RESOURCE' };
  }
  if (p.startsWith('/profile')) {
    return { featureKey: 'PROFILE', featureName: 'Student Profile & Docs', category: 'PERSONAL' };
  }
  if (p.startsWith('/cr/')) {
    return { featureKey: 'CR_TOOLS', featureName: 'CR Management Desk', category: 'MANAGEMENT' };
  }
  return { featureKey: 'DASHBOARD', featureName: 'Student Dashboard', category: 'ACADEMIC' };
}

export function getDeviceType(): 'Mobile' | 'Desktop' {
  if (typeof window === 'undefined') return 'Desktop';
  return window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
}

export function trackFeatureUsage(params: TrackEventParams): void {
  try {
    const { user, token, path, actionType = 'VIEW', actionDetail, durationSec = 25 } = params;
    if (!user) return;
    // Skip tracking admin analytics page views so admin browsing doesn't skew student feature rankings
    if (path.startsWith('/admin/')) return;

    const meta = resolveFeatureFromPath(path);
    const payload = {
      userId: user.id,
      userName: user.name,
      studentId: user.studentId,
      userRole: user.role,
      batchId: user.batchId,
      batchName: user.batchName,
      featureKey: meta.featureKey,
      featureName: meta.featureName,
      category: meta.category,
      actionType,
      actionDetail: actionDetail || (actionType === 'VIEW' ? `Opened ${meta.featureName}` : `Interacted with ${meta.featureName}`),
      path,
      durationSec,
      deviceType: getDeviceType(),
    };

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Non-blocking
  }
}
