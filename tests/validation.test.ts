import { describe, it, expect } from 'vitest';
import {
  validateEventDetails,
  validateBudgetRow,
  validateTaskRow,
} from '../src/utils/validation';

describe('Event Setup Validation', () => {
  const validBase = {
    name: "Rohan & Priya's Wedding",
    type: 'wedding' as const,
    date: '2027-02-15',
    location: 'Mumbai, Maharashtra',
    guestCount: 200,
    totalBudget: 1200000,
    currency: 'INR',
    notes: 'Vegetarian catering required.',
  };

  it('accepts valid event details', () => {
    const result = validateEventDetails(validBase, '2026-10-22');
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('rejects empty or excessively short/long event names', () => {
    expect(validateEventDetails({ ...validBase, name: '' }).errors.name).toBeDefined();
    expect(validateEventDetails({ ...validBase, name: 'A' }).errors.name).toBeDefined();
    expect(validateEventDetails({ ...validBase, name: 'X'.repeat(81) }).errors.name).toBeDefined();
  });

  it('rejects invalid event types', () => {
    const res = validateEventDetails({ ...validBase, type: 'corporate-retreat' as any });
    expect(res.isValid).toBe(false);
    expect(res.errors.type).toBeDefined();
  });

  it('rejects invalid or past event dates', () => {
    const today = '2026-10-22';
    const pastRes = validateEventDetails({ ...validBase, date: '2026-10-20' }, today);
    expect(pastRes.isValid).toBe(false);
    expect(pastRes.errors.date).toContain('past');

    const invalidDateRes = validateEventDetails({ ...validBase, date: '2026-02-30' }, today);
    expect(invalidDateRes.isValid).toBe(false);
    expect(invalidDateRes.errors.date).toBeDefined();
  });

  it('rejects non-positive, zero, or fractional guest counts', () => {
    expect(validateEventDetails({ ...validBase, guestCount: 0 }).errors.guestCount).toBeDefined();
    expect(validateEventDetails({ ...validBase, guestCount: -10 }).errors.guestCount).toBeDefined();
    expect(validateEventDetails({ ...validBase, guestCount: 15.5 }).errors.guestCount).toBeDefined();
    expect(validateEventDetails({ ...validBase, guestCount: 150000 }).errors.guestCount).toBeDefined();
  });

  it('rejects zero or negative budgets', () => {
    expect(validateEventDetails({ ...validBase, totalBudget: 0 }).errors.totalBudget).toBeDefined();
    expect(validateEventDetails({ ...validBase, totalBudget: -5000 }).errors.totalBudget).toBeDefined();
    expect(validateEventDetails({ ...validBase, totalBudget: 2000000000 }).errors.totalBudget).toBeDefined(); // > 1 Billion
  });

  it('enforces notes character limit (max 500 chars)', () => {
    const longNotes = 'A'.repeat(501);
    const res = validateEventDetails({ ...validBase, notes: longNotes });
    expect(res.isValid).toBe(false);
    expect(res.errors.notes).toContain('500');
  });
});

describe('Budget Row Validation', () => {
  it('accepts valid budget rows', () => {
    expect(validateBudgetRow('Venue', 50000, 45000).isValid).toBe(true);
  });

  it('rejects empty category names', () => {
    expect(validateBudgetRow('', 50000, 45000).isValid).toBe(false);
  });

  it('rejects negative planned or actual amounts', () => {
    expect(validateBudgetRow('Catering', -100, 0).isValid).toBe(false);
    expect(validateBudgetRow('Decor', 1000, -50).isValid).toBe(false);
  });
});

describe('Task Row Validation', () => {
  const today = '2026-10-22';
  const eventDate = '2026-11-30';

  it('accepts valid task details within the active planning window', () => {
    expect(validateTaskRow('Book DJ', '2026-11-10', eventDate, today).isValid).toBe(true);
  });

  it('rejects task due dates in the past', () => {
    const res = validateTaskRow('Book DJ', '2026-10-15', eventDate, today);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('past');
  });

  it('rejects task due dates scheduled after the event date', () => {
    const res = validateTaskRow('Book DJ', '2026-12-05', eventDate, today);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('after the event date');
  });
});
