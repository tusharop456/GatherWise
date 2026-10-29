import { EventDetails, EventType } from '../types';
import { isValidDateString, isPastDate, getTodayDateString } from './dates';

export interface ValidationErrorMap {
  name?: string;
  type?: string;
  date?: string;
  location?: string;
  guestCount?: string;
  totalBudget?: string;
  currency?: string;
  notes?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorMap;
}

const ALLOWED_EVENT_TYPES: EventType[] = ['wedding', 'birthday', 'community'];
const MAX_NOTES_LENGTH = 500;
const MAX_GUESTS = 100000;
const MAX_BUDGET = 1000000000; // 1 Billion

export function validateEventDetails(
  details: Partial<EventDetails>,
  todayStr = getTodayDateString()
): ValidationResult {
  const errors: ValidationErrorMap = {};

  // Event Name
  if (!details.name || details.name.trim().length === 0) {
    errors.name = 'Event name is required.';
  } else if (details.name.trim().length < 2) {
    errors.name = 'Event name must be at least 2 characters.';
  } else if (details.name.trim().length > 80) {
    errors.name = 'Event name cannot exceed 80 characters.';
  }

  // Event Type
  if (!details.type || !ALLOWED_EVENT_TYPES.includes(details.type)) {
    errors.type = 'Please select a valid event type (wedding, birthday, or community event).';
  }

  // Event Date
  if (!details.date || details.date.trim().length === 0) {
    errors.date = 'Event date is required.';
  } else if (!isValidDateString(details.date)) {
    errors.date = 'Please provide a valid calendar date in YYYY-MM-DD format.';
  } else if (isPastDate(details.date, todayStr)) {
    errors.date = 'Event date cannot be in the past. Please choose today or a future date.';
  }

  // Location
  if (!details.location || details.location.trim().length === 0) {
    errors.location = 'City or general location is required.';
  } else if (details.location.trim().length < 2) {
    errors.location = 'Location must be at least 2 characters.';
  } else if (details.location.trim().length > 100) {
    errors.location = 'Location cannot exceed 100 characters.';
  }

  // Guest Count
  if (details.guestCount === undefined || details.guestCount === null || isNaN(details.guestCount)) {
    errors.guestCount = 'Guest count is required.';
  } else if (!Number.isInteger(details.guestCount) || details.guestCount <= 0) {
    errors.guestCount = 'Guest count must be a positive whole number (at least 1).';
  } else if (details.guestCount > MAX_GUESTS) {
    errors.guestCount = `Guest count cannot exceed ${MAX_GUESTS.toLocaleString()}.`;
  }

  // Total Budget
  if (details.totalBudget === undefined || details.totalBudget === null || isNaN(details.totalBudget)) {
    errors.totalBudget = 'Total budget is required.';
  } else if (details.totalBudget <= 0) {
    errors.totalBudget = 'Total budget must be a positive amount greater than zero.';
  } else if (details.totalBudget > MAX_BUDGET) {
    errors.totalBudget = `Total budget exceeds the allowed limit of ${MAX_BUDGET.toLocaleString()}.`;
  }

  // Currency
  if (!details.currency || details.currency.trim().length === 0) {
    errors.currency = 'Currency selection is required.';
  }

  // Notes
  if (details.notes && details.notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `Notes cannot exceed ${MAX_NOTES_LENGTH} characters (${details.notes.length}/${MAX_NOTES_LENGTH}).`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateBudgetRow(
  name: string,
  plannedAmount: number,
  actualAmount: number
): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Category name is required.' };
  }
  if (!Number.isFinite(plannedAmount) || plannedAmount < 0) {
    return { isValid: false, error: 'Planned amount cannot be negative.' };
  }
  if (!Number.isFinite(actualAmount) || actualAmount < 0) {
    return { isValid: false, error: 'Actual amount cannot be negative.' };
  }
  return { isValid: true };
}

export function validateTaskRow(
  title: string,
  dueDate: string,
  eventDate?: string,
  todayStr = getTodayDateString()
): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: 'Task title is required.' };
  }
  if (!dueDate || !isValidDateString(dueDate)) {
    return { isValid: false, error: 'Valid due date is required.' };
  }
  if (isPastDate(dueDate, todayStr)) {
    return { isValid: false, error: 'Task due date cannot be in the past.' };
  }
  if (eventDate && isValidDateString(eventDate) && dueDate > eventDate) {
    return { isValid: false, error: 'Task due date cannot be after the event date.' };
  }
  return { isValid: true };
}
