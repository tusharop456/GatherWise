import { EventPlan } from '../types';

export const STORAGE_KEY = 'gatherwise_event_plan_v1';

export interface StorageLoadResult {
  plan: EventPlan | null;
  error?: string;
  isCorrupted?: boolean;
}

/**
 * Validates that an unknown object conforms to the minimal EventPlan structure.
 */
function isValidEventPlan(obj: unknown): obj is EventPlan {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;

  if (p.version !== 1) return false;
  if (!p.details || typeof p.details !== 'object') return false;

  const d = p.details as Record<string, unknown>;
  if (typeof d.name !== 'string' || typeof d.type !== 'string' || typeof d.date !== 'string') {
    return false;
  }
  if (!Array.isArray(p.budget)) return false;
  if (!Array.isArray(p.tasks)) return false;
  if (!Array.isArray(p.vendors)) return false;

  return true;
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

    if (!isValidEventPlan(parsed)) {
      return {
        plan: null,
        isCorrupted: true,
        error: 'Stored plan did not match the expected GatherWise v1 schema.',
      };
    }

    return { plan: parsed };
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
