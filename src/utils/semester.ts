import { User } from '../types';

/**
 * Maps known SWE batches to their active academic semester.
 * SWE 13th Batch -> 1st Semester
 * SWE 12th Batch -> 2nd Semester
 * SWE 11th Batch -> 3rd Semester
 * SWE 10th Batch -> 4th Semester
 * SWE 9th Batch  -> 5th Semester
 * SWE 8th Batch  -> 6th Semester
 * SWE 7th Batch  -> 7th Semester
 * SWE 6th Batch  -> 8th Semester
 * SWE 5th Batch  -> 8th Semester
 */
export function getBatchSemester(batchId?: string, batchName?: string): number | null {
  const bId = (batchId || '').trim().toLowerCase();
  const bName = (batchName || '').trim().toLowerCase();

  if (bId === 'batch-1788450159710' || bId === 'batch-13' || bName.includes('13th') || bName === '13') return 1;
  if (bId === 'batch-1788449554669' || bId === 'batch-12' || bName.includes('12th') || bName === '12') return 2;
  if (bId === 'batch-1792923073984' || bId === 'batch-11' || bName.includes('11th') || bName === '11') return 3;
  if (bId === 'batch-10' || bName.includes('10th') || bName === '10') return 4;
  if (bId === 'batch-9' || bName.includes('9th') || bName === '9') return 5;
  if (bId === 'batch-8' || bName.includes('8th') || bName === '8') return 6;
  if (bId === 'batch-7' || bName.includes('7th') || bName === '7') return 7;
  if (bId === 'batch-6' || bName.includes('6th') || bName === '6') return 8;
  if (bId === 'batch-5' || bName.includes('5th') || bName === '5') return 8;

  return null;
}

/**
 * Returns the effective academic semester number for a student or CR.
 * Automatically synchronizes with the user's batch current semester.
 * For Admin: returns 0 (administrators do not have an academic student semester).
 */
export function getEffectiveSemester(user: User | null | undefined): number {
  if (!user) return 5;
  if (user.role === 'ADMIN') return 0;

  const batchSem = getBatchSemester(user.batchId, user.batchName);
  if (batchSem !== null) {
    return batchSem;
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
