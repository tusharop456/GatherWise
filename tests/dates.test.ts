import { describe, it, expect } from 'vitest';
import {
  parseDateOnly,
  isValidDateString,
  compareDateOnly,
  isPastDate,
  isFutureDate,
  daysBetween,
  addDays,
  formatDisplayDate,
  getTaskTimeStatus,
  evaluateTimelineCompression,
  clampTaskDueDate,
} from '../src/utils/dates';

describe('Date Utilities & Calendar Semantics', () => {
  it('parses valid dates correctly', () => {
    expect(parseDateOnly('2027-04-18')).toEqual({ year: 2027, month: 4, day: 18 });
    expect(parseDateOnly('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 }); // Leap year
    expect(parseDateOnly('2023-02-29')).toBeNull(); // Not a leap year
    expect(parseDateOnly('invalid-date')).toBeNull();
    expect(parseDateOnly('2025-13-01')).toBeNull(); // Month > 12
    expect(parseDateOnly('2025-04-31')).toBeNull(); // April only has 30 days
  });

  it('validates date strings correctly', () => {
    expect(isValidDateString('2026-12-31')).toBe(true);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  it('compares dates accurately across month and year boundaries', () => {
    expect(compareDateOnly('2026-12-31', '2027-01-01')).toBeLessThan(0);
    expect(compareDateOnly('2027-01-01', '2026-12-31')).toBeGreaterThan(0);
    expect(compareDateOnly('2026-05-15', '2026-05-15')).toBe(0);
  });

  it('determines past and future status correctly relative to a fixed reference date', () => {
    const today = '2026-10-22';
    expect(isPastDate('2026-10-21', today)).toBe(true);
    expect(isPastDate('2026-10-22', today)).toBe(false);
    expect(isFutureDate('2026-10-23', today)).toBe(true);
  });

  it('calculates days between dates across month boundaries', () => {
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30);
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-30', 2)).toBe('2027-01-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29'); // Leap year
  });

  it('formats display dates in human-readable style', () => {
    const formatted = formatDisplayDate('2027-04-18');
    expect(formatted).toContain('2027');
    expect(formatted).toMatch(/Apr|April/i);
    expect(formatted).toContain('18');
  });

  it('calculates task status from due date and completion state', () => {
    const today = '2026-10-22';
    expect(getTaskTimeStatus('2026-10-20', false, today)).toBe('overdue');
    expect(getTaskTimeStatus('2026-10-22', false, today)).toBe('due-today');
    expect(getTaskTimeStatus('2026-10-25', false, today)).toBe('upcoming');
    expect(getTaskTimeStatus('2026-10-20', true, today)).toBe('completed');
  });

  it('evaluates timeline compression for near-term events', () => {
    const today = '2026-10-22';

    // Wedding with only 20 days remaining should be flagged compressed (< 60 days threshold)
    const weddingCompressed = evaluateTimelineCompression('2026-11-11', 'wedding', today);
    expect(weddingCompressed.isCompressed).toBe(true);
    expect(weddingCompressed.daysRemaining).toBe(20);
    expect(weddingCompressed.recommendation).toContain('compressed');

    // Wedding with 120 days remaining should be standard
    const weddingStandard = evaluateTimelineCompression('2027-02-19', 'wedding', today);
    expect(weddingStandard.isCompressed).toBe(false);
    expect(weddingStandard.daysRemaining).toBe(120);

    // Birthday with 10 days remaining should be compressed (< 21 days threshold)
    const bdayCompressed = evaluateTimelineCompression('2026-11-01', 'birthday', today);
    expect(bdayCompressed.isCompressed).toBe(true);
  });

  it('clamps task due dates so they never fall before today or after event date', () => {
    const minDate = '2026-10-22';
    const maxDate = '2026-11-30';

    expect(clampTaskDueDate('2026-10-15', minDate, maxDate)).toBe(minDate); // Clamped from past
    expect(clampTaskDueDate('2026-12-05', minDate, maxDate)).toBe(maxDate); // Clamped from future
    expect(clampTaskDueDate('2026-11-15', minDate, maxDate)).toBe('2026-11-15'); // Untouched
  });
});
