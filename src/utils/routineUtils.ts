import { RoutineSlot } from '../types';

/**
 * Converts a standard timetable time string (e.g. "09:00 AM", "12:00 PM", "01:30 PM")
 * into total minutes from midnight for accurate chronological comparisons.
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Normalizes course code for matching (e.g. "SWE-224" -> "swe224")
 */
export function normalizeCourseCode(val?: string): string {
  return (val || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * Sorts routine slots chronologically by start time.
 * Fixes alphabetical sort bugs where "01:30 PM" came before "09:00 AM".
 */
export function sortRoutineSlots(slots: RoutineSlot[]): RoutineSlot[] {
  return [...slots].sort((a, b) => {
    const diff = parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return parseTimeToMinutes(a.endTime) - parseTimeToMinutes(b.endTime);
  });
}

/**
 * Deduplicates and merges routine slots for all days:
 * 1. Merges adjacent continuous slots for the same course on the same day (e.g. 3-hour labs split into 09:00-10:30 & 10:30-12:00)
 * 2. Removes accidental identical duplicate slots
 * 3. Sorts all slots chronologically
 */
export function deduplicateAndMergeRoutineSlots(slots: RoutineSlot[]): RoutineSlot[] {
  if (!Array.isArray(slots) || slots.length === 0) return [];

  // Group by batchId and day to ensure isolation
  const grouped: Record<string, RoutineSlot[]> = {};
  slots.forEach((s) => {
    if (!s || !s.day) return;
    const key = `${s.batchId || 'default'}_${s.day.toUpperCase()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  const finalResult: RoutineSlot[] = [];

  for (const daySlots of Object.values(grouped)) {
    // Sort day slots chronologically by startTime
    const sorted = sortRoutineSlots(daySlots);

    const mergedForDay: RoutineSlot[] = [];
    for (const slot of sorted) {
      if (mergedForDay.length === 0) {
        mergedForDay.push({ ...slot });
        continue;
      }

      const prev = mergedForDay[mergedForDay.length - 1];
      const prevCode = normalizeCourseCode(prev.courseCode || prev.courseTitle);
      const currCode = normalizeCourseCode(slot.courseCode || slot.courseTitle);

      const isSameCourse = Boolean(
        (prevCode && currCode && prevCode === currCode) ||
        (prev.courseId && slot.courseId && prev.courseId === slot.courseId)
      );

      const prevStartMin = parseTimeToMinutes(prev.startTime);
      const prevEndMin = parseTimeToMinutes(prev.endTime);
      const currStartMin = parseTimeToMinutes(slot.startTime);
      const currEndMin = parseTimeToMinutes(slot.endTime);

      // Exact duplicate check
      const isExactDuplicate = isSameCourse && prevStartMin === currStartMin;

      // Consecutive / adjacent period check (e.g., Slot 1 ends at 10:30 AM and Slot 2 starts at 10:30 AM)
      const isAdjacent = isSameCourse && Math.abs(prevEndMin - currStartMin) <= 15;

      if (isExactDuplicate) {
        // Skip exact duplicate; take any richer metadata
        if (!prev.room && slot.room) prev.room = slot.room;
        if (!prev.teacherName && slot.teacherName) prev.teacherName = slot.teacherName;
        if (!prev.courseShortName && slot.courseShortName) prev.courseShortName = slot.courseShortName;
      } else if (isAdjacent) {
        // Merge into single continuous slot with extended endTime
        if (currEndMin > prevEndMin) {
          prev.endTime = slot.endTime;
        }
        if (!prev.room && slot.room) prev.room = slot.room;
        if (!prev.teacherName && slot.teacherName) prev.teacherName = slot.teacherName;
        if (!prev.teacherShortName && slot.teacherShortName) prev.teacherShortName = slot.teacherShortName;
        if (!prev.courseShortName && slot.courseShortName) prev.courseShortName = slot.courseShortName;
        if (!prev.courseTitle && slot.courseTitle) prev.courseTitle = slot.courseTitle;
      } else {
        mergedForDay.push({ ...slot });
      }
    }

    finalResult.push(...mergedForDay);
  }

  return sortRoutineSlots(finalResult);
}
