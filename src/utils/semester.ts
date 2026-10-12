import { User } from '../types';

/**
 * Returns the effective academic semester number for a student or CR.
 * For 9th Batch: strictly returns 5 (unless updated to higher in official records).
 * For Admin: returns 0 (administrators do not have an academic student semester).
 */
export function getEffectiveSemester(user: User | null | undefined): number {
  if (!user) return 5;
  if (user.role === 'ADMIN') return 0;

  const is9thBatch = user.batchId === 'batch-9' || user.batchName?.toLowerCase().includes('9th');
  if (is9thBatch) {
    if (!user.currentSemester || user.currentSemester < 5) {
      return 5;
    }
    return user.currentSemester;
  }

  if (user.batchId === 'batch-10' || user.batchName?.toLowerCase().includes('10th')) {
    return user.currentSemester || 3;
  }
  if (user.batchId === 'batch-11' || user.batchName?.toLowerCase().includes('11th')) {
    return user.currentSemester || 2;
  }
  if (user.batchId === 'batch-12' || user.batchName?.toLowerCase().includes('12th')) {
    return user.currentSemester || 1;
  }
  if (user.batchId === 'batch-8' || user.batchName?.toLowerCase().includes('8th')) {
    return user.currentSemester || 6;
  }

  return user.currentSemester && user.currentSemester >= 1 ? user.currentSemester : 5;
}

/**
 * Returns a clean, consistent semester display string.
 * Example styles:
 * - 'full': "Semester 5"
 * - 'short': "Sem 5"
 * - 'ordinal': "5th Semester"
 * Returns empty string for ADMIN role.
 */
export function formatSemesterLabel(
  user: User | null | undefined,
  style: 'full' | 'short' | 'ordinal' = 'full'
): string {
  if (!user || user.role === 'ADMIN') return '';
  const sem = getEffectiveSemester(user);
  if (!sem) return '';

  if (style === 'short') {
    return `Sem ${sem}`;
  }
  if (style === 'ordinal') {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = sem % 100;
    const ord = sem + (s[(v - 20) % 10] || s[v] || s[0]);
    return `${ord} Semester`;
  }
  return `Semester ${sem}`;
}
