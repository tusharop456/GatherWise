/**
 * Date utility functions adhering strictly to date-only calendar semantics.
 * Never interprets YYYY-MM-DD as UTC ISO-8601 strings to prevent timezone shifts.
 */

export function parseDateOnly(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Validate days in specific month (accounting for leap years)
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return null;

  return { year, month, day };
}

export function isValidDateString(dateStr: string): boolean {
  return parseDateOnly(dateStr) !== null;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function compareDateOnly(dateStrA: string, dateStrB: string): number {
  const a = parseDateOnly(dateStrA);
  const b = parseDateOnly(dateStrB);
  if (!a || !b) return 0;

  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function isPastDate(dateStr: string, todayStr = getTodayDateString()): boolean {
  return compareDateOnly(dateStr, todayStr) < 0;
}

export function isFutureDate(dateStr: string, todayStr = getTodayDateString()): boolean {
  return compareDateOnly(dateStr, todayStr) > 0;
}

export function isSameDay(dateStrA: string, dateStrB: string): boolean {
  return compareDateOnly(dateStrA, dateStrB) === 0;
}

export function isDateAfter(dateStr: string, referenceDateStr: string): boolean {
  return compareDateOnly(dateStr, referenceDateStr) > 0;
}

export function isDateBefore(dateStr: string, referenceDateStr: string): boolean {
  return compareDateOnly(dateStr, referenceDateStr) < 0;
}

/**
 * Calculates calendar days between two dates (toDate - fromDate).
 */
export function daysBetween(fromDateStr: string, toDateStr: string): number {
  const from = parseDateOnly(fromDateStr);
  const to = parseDateOnly(toDateStr);
  if (!from || !to) return 0;

  const fromDate = new Date(from.year, from.month - 1, from.day);
  const toDate = new Date(to.year, to.month - 1, to.day);
  const diffMs = toDate.getTime() - fromDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Adds or subtracts days from a date string, returning a new YYYY-MM-DD.
 */
export function addDays(dateStr: string, daysToAdd: number): string {
  const parsed = parseDateOnly(dateStr);
  if (!parsed) return dateStr;

  const d = new Date(parsed.year, parsed.month - 1, parsed.day);
  d.setDate(d.getDate() + daysToAdd);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr: string): string {
  const parsed = parseDateOnly(dateStr);
  if (!parsed) return dateStr;

  const d = new Date(parsed.year, parsed.month - 1, parsed.day);
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export type TaskTimeStatus = 'completed' | 'overdue' | 'due-today' | 'upcoming';

export function getTaskTimeStatus(
  dueDateStr: string,
  completed: boolean,
  todayStr = getTodayDateString()
): TaskTimeStatus {
  if (completed) return 'completed';
  if (!isValidDateString(dueDateStr)) return 'upcoming';

  const cmp = compareDateOnly(dueDateStr, todayStr);
  if (cmp < 0) return 'overdue';
  if (cmp === 0) return 'due-today';
  return 'upcoming';
}

export interface CompressedTimelineInfo {
  isCompressed: boolean;
  daysRemaining: number;
  thresholdDays: number;
  recommendation: string;
}

/**
 * Checks if the remaining planning window is compressed based on event type.
 * Weddings: < 60 days is compressed (ideal: 6+ months).
 * Birthday / Community: < 21 days is compressed.
 */
export function evaluateTimelineCompression(
  eventDateStr: string,
  eventType: string,
  todayStr = getTodayDateString()
): CompressedTimelineInfo {
  const daysRemaining = daysBetween(todayStr, eventDateStr);
  const thresholdDays = eventType === 'wedding' ? 60 : 21;
  const isCompressed = daysRemaining >= 0 && daysRemaining <= thresholdDays;

  let recommendation = '';
  if (daysRemaining < 0) {
    recommendation = 'Event date is in the past. Update to a future date to generate a viable timeline.';
  } else if (isCompressed) {
    recommendation = `Only ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining. Planning timeline is compressed. Focusing strictly on high-priority essentials and immediate vendor bookings.`;
  } else {
    recommendation = `Standard ${daysRemaining}-day planning runway. Ample time for phased milestone execution.`;
  }

  return {
    isCompressed,
    daysRemaining,
    thresholdDays,
    recommendation,
  };
}

/**
 * Clamps task due dates so they fall strictly between today (or startDate) and the event date.
 * Guarantees no tasks are placed in the past or after the event.
 */
export function clampTaskDueDate(
  targetDueDateStr: string,
  minDateStr: string,
  maxDateStr: string
): string {
  if (compareDateOnly(targetDueDateStr, minDateStr) < 0) {
    return minDateStr;
  }
  if (compareDateOnly(targetDueDateStr, maxDateStr) > 0) {
    return maxDateStr;
  }
  return targetDueDateStr;
}
