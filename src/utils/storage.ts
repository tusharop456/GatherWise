import { EventPlan, EventDetails, BudgetCategory, TimelineTask, VendorRecord, EventType, VendorStatus } from '../types';
import { isValidDateString } from './dates';

export const STORAGE_KEY = 'gatherwise_event_plan_v1';

export interface StorageLoadResult {
  plan: EventPlan | null;
  error?: string;
  isCorrupted?: boolean;
}

const VALID_EVENT_TYPES: EventType[] = ['wedding', 'birthday', 'community'];
const VALID_VENDOR_STATUSES: VendorStatus[] = ['researching', 'contacted', 'shortlisted', 'confirmed'];

/**
 * Performs complete runtime validation of stored EventPlan data.
 * Validates root properties, event details, budget rows, timeline tasks,
 * vendor records, and optional AI structures.
 */
export function validateStoredEventPlan(obj: unknown): { valid: boolean; plan?: EventPlan; error?: string } {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { valid: false, error: 'Stored plan payload must be a JSON object.' };
  }

  const p = obj as Record<string, unknown>;

  if (p.version !== 1) {
    return { valid: false, error: `Unsupported schema version: expected version 1, received ${p.version}.` };
  }

  // 1. Validate Event Details
  if (!p.details || typeof p.details !== 'object' || Array.isArray(p.details)) {
    return { valid: false, error: 'Stored plan details are missing or malformed.' };
  }
  const d = p.details as Record<string, unknown>;

  if (typeof d.id !== 'string' || d.id.trim().length === 0) {
    return { valid: false, error: 'Event details id is missing or invalid.' };
  }

  if (typeof d.name !== 'string' || d.name.trim().length === 0) {
    return { valid: false, error: 'Event details name is missing or empty.' };
  }

  if (typeof d.type !== 'string' || !VALID_EVENT_TYPES.includes(d.type as EventType)) {
    return { valid: false, error: `Invalid event type "${d.type}". Must be wedding, birthday, or community.` };
  }

  if (typeof d.date !== 'string' || !isValidDateString(d.date)) {
    return { valid: false, error: `Invalid event date "${d.date}". Expected valid YYYY-MM-DD.` };
  }

  if (typeof d.location !== 'string') {
    return { valid: false, error: 'Event location must be a string.' };
  }

  const guestCount = Number(d.guestCount);
  if (!Number.isInteger(guestCount) || guestCount <= 0) {
    return { valid: false, error: 'Event guestCount must be a positive integer.' };
  }

  const totalBudget = Number(d.totalBudget);
  if (!Number.isFinite(totalBudget) || totalBudget < 0) {
    return { valid: false, error: 'Event totalBudget must be a finite non-negative number.' };
  }

  if (typeof d.currency !== 'string' || d.currency.trim().length === 0) {
    return { valid: false, error: 'Event currency must be a valid non-empty string.' };
  }

  if (!d.preferences || typeof d.preferences !== 'object' || Array.isArray(d.preferences)) {
    return { valid: false, error: 'Event preferences must be an object.' };
  }
  const pref = d.preferences as Record<string, unknown>;
  if (!Array.isArray(pref.dietary) || !Array.isArray(pref.accessibility)) {
    return { valid: false, error: 'Event dietary and accessibility preferences must be arrays.' };
  }

  const validatedDetails: EventDetails = {
    id: d.id.trim(),
    name: d.name.trim(),
    type: d.type as EventType,
    date: d.date.trim(),
    location: (d.location || '').trim(),
    guestCount,
    totalBudget,
    currency: d.currency.trim().toUpperCase(),
    preferences: {
      theme: typeof pref.theme === 'string' ? pref.theme : '',
      atmosphere: typeof pref.atmosphere === 'string' ? pref.atmosphere : '',
      dietary: pref.dietary.map(item => String(item)),
      accessibility: pref.accessibility.map(item => String(item)),
      cultural: typeof pref.cultural === 'string' ? pref.cultural : '',
    },
    notes: typeof d.notes === 'string' ? d.notes : '',
    createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
    updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : new Date().toISOString(),
  };

  // 2. Validate Budget Rows
  if (!Array.isArray(p.budget)) {
    return { valid: false, error: 'Stored budget categories must be an array.' };
  }
  const validatedBudget: BudgetCategory[] = [];
  const seenBudgetCats = new Set<string>();

  for (let i = 0; i < p.budget.length; i++) {
    const row = p.budget[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { valid: false, error: `Budget row at index ${i} is not a valid object.` };
    }
    const b = row as Record<string, unknown>;

    if (typeof b.id !== 'string' || b.id.trim().length === 0) {
      return { valid: false, error: `Budget row at index ${i} has an empty or invalid id.` };
    }
    const catId = b.id.trim();
    if (seenBudgetCats.has(catId)) {
      return { valid: false, error: `Duplicate budget category id detected: "${catId}".` };
    }
    seenBudgetCats.add(catId);

    if (typeof b.name !== 'string' || b.name.trim().length === 0) {
      return { valid: false, error: `Budget row "${catId}" is missing a valid name.` };
    }

    const planned = Number(b.plannedAmount);
    if (!Number.isFinite(planned) || planned < 0) {
      return { valid: false, error: `Budget row "${catId}" plannedAmount must be a finite non-negative number.` };
    }

    const actual = Number(b.actualAmount);
    if (!Number.isFinite(actual) || actual < 0) {
      return { valid: false, error: `Budget row "${catId}" actualAmount must be a finite non-negative number.` };
    }

    validatedBudget.push({
      id: catId,
      name: b.name.trim(),
      plannedAmount: planned,
      actualAmount: actual,
      notes: typeof b.notes === 'string' ? b.notes : '',
      isContingency: Boolean(b.isContingency),
    });
  }

  // 3. Validate Timeline Tasks
  if (!Array.isArray(p.tasks)) {
    return { valid: false, error: 'Stored tasks must be an array.' };
  }
  const validatedTasks: TimelineTask[] = [];
  for (let i = 0; i < p.tasks.length; i++) {
    const row = p.tasks[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { valid: false, error: `Task at index ${i} is not a valid object.` };
    }
    const t = row as Record<string, unknown>;

    if (typeof t.id !== 'string' || t.id.trim().length === 0) {
      return { valid: false, error: `Task at index ${i} has an empty or invalid id.` };
    }
    if (typeof t.title !== 'string' || t.title.trim().length === 0) {
      return { valid: false, error: `Task "${t.id}" is missing a valid title.` };
    }
    if (typeof t.category !== 'string') {
      return { valid: false, error: `Task "${t.id}" category must be a string.` };
    }
    if (typeof t.dueDate !== 'string' || !isValidDateString(t.dueDate)) {
      return { valid: false, error: `Task "${t.id}" has an invalid dueDate "${t.dueDate}".` };
    }
    if (typeof t.completed !== 'boolean') {
      return { valid: false, error: `Task "${t.id}" completed flag must be a boolean.` };
    }

    validatedTasks.push({
      id: t.id.trim(),
      title: t.title.trim(),
      category: t.category.trim(),
      dueDate: t.dueDate.trim(),
      completed: t.completed,
      owner: typeof t.owner === 'string' ? t.owner : undefined,
      isCritical: typeof t.isCritical === 'boolean' ? t.isCritical : undefined,
      notes: typeof t.notes === 'string' ? t.notes : undefined,
    });
  }

  // 4. Validate Vendors
  if (!Array.isArray(p.vendors)) {
    return { valid: false, error: 'Stored vendors must be an array.' };
  }
  const validatedVendors: VendorRecord[] = [];
  for (let i = 0; i < p.vendors.length; i++) {
    const row = p.vendors[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { valid: false, error: `Vendor at index ${i} is not a valid object.` };
    }
    const v = row as Record<string, unknown>;

    if (typeof v.id !== 'string' || v.id.trim().length === 0) {
      return { valid: false, error: `Vendor at index ${i} has an empty or invalid id.` };
    }
    if (typeof v.name !== 'string' || v.name.trim().length === 0) {
      return { valid: false, error: `Vendor "${v.id}" is missing a valid name.` };
    }
    if (typeof v.category !== 'string') {
      return { valid: false, error: `Vendor "${v.id}" category must be a string.` };
    }
    const quote = v.quote !== undefined ? Number(v.quote) : 0;
    if (!Number.isFinite(quote) || quote < 0) {
      return { valid: false, error: `Vendor "${v.id}" quote must be a finite non-negative number.` };
    }
    if (typeof v.status !== 'string' || !VALID_VENDOR_STATUSES.includes(v.status as VendorStatus)) {
      return { valid: false, error: `Vendor "${v.id}" has an invalid status "${v.status}".` };
    }
    if (v.checklistResponses && typeof v.checklistResponses !== 'object') {
      return { valid: false, error: `Vendor "${v.id}" checklistResponses must be an object.` };
    }

    validatedVendors.push({
      id: v.id.trim(),
      name: v.name.trim(),
      category: v.category.trim(),
      quote,
      status: v.status as VendorStatus,
      notes: typeof v.notes === 'string' ? v.notes : '',
      checklistResponses: (v.checklistResponses && typeof v.checklistResponses === 'object' && !Array.isArray(v.checklistResponses))
        ? (v.checklistResponses as Record<string, boolean>)
        : {},
    });
  }

  // 5. Validate Optional Ideas
  let validatedIdeas: any = null;
  if (p.ideas && typeof p.ideas === 'object' && !Array.isArray(p.ideas)) {
    const ideas = p.ideas as Record<string, unknown>;
    if (typeof ideas.summary !== 'string' || !Array.isArray(ideas.themes) || !Array.isArray(ideas.activities)) {
      return { valid: false, error: 'Stored ideas structure is malformed.' };
    }
    validatedIdeas = p.ideas;
  }

  // 6. Validate Optional Last Proposal
  let validatedProposal: any = null;
  if (p.lastProposal && typeof p.lastProposal === 'object' && !Array.isArray(p.lastProposal)) {
    const prop = p.lastProposal as Record<string, unknown>;
    if (typeof prop.summary !== 'string' || !Array.isArray(prop.budgetAllocations) || !Array.isArray(prop.tasks)) {
      return { valid: false, error: 'Stored lastProposal structure is malformed.' };
    }
    validatedProposal = p.lastProposal;
  }

  const cleanPlan: EventPlan = {
    version: 1,
    details: validatedDetails,
    budget: validatedBudget,
    tasks: validatedTasks,
    vendors: validatedVendors,
    ideas: validatedIdeas,
    lastProposal: validatedProposal,
    aiNoticeAcknowledged: Boolean(p.aiNoticeAcknowledged),
    lastModified: typeof p.lastModified === 'string' ? p.lastModified : new Date().toISOString(),
  };

  return { valid: true, plan: cleanPlan };
}

export function savePlanToStorage(plan: EventPlan): { success: boolean; error?: string } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { success: false, error: 'LocalStorage is unavailable in this environment.' };
    }

    const payload = JSON.stringify({
      ...plan,
      lastModified: new Date().toISOString(),
    });

    window.localStorage.setItem(STORAGE_KEY, payload);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown storage error';
    if (message.includes('QuotaExceededError') || message.includes('quota')) {
      return {
        success: false,
        error: 'Browser storage quota exceeded. Consider clearing previous plans or browser cache.',
      };
    }
    return { success: false, error: `Failed to save plan: ${message}` };
  }
}

export function loadPlanFromStorage(): StorageLoadResult {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { plan: null, error: 'LocalStorage is unavailable.' };
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { plan: null };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        plan: null,
        isCorrupted: true,
        error: 'Stored event data was corrupted or had invalid JSON syntax.',
      };
    }

    const validation = validateStoredEventPlan(parsed);
    if (!validation.valid || !validation.plan) {
      return {
        plan: null,
        isCorrupted: true,
        error: `Validation failed: ${validation.error || 'Stored plan did not match the expected GatherWise v1 schema.'}`,
      };
    }

    return { plan: validation.plan };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown read error';
    return { plan: null, error: `Failed to read storage: ${message}` };
  }
}

export function clearPlanFromStorage(): boolean {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
