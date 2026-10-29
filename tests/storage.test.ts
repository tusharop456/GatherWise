import { describe, it, expect, beforeEach } from 'vitest';
import {
  savePlanToStorage,
  loadPlanFromStorage,
  clearPlanFromStorage,
  STORAGE_KEY,
} from '../src/utils/storage';
import { SAMPLE_WEDDING } from '../src/data/sampleEvents';

describe('LocalStorage Plan Persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and reloads a valid event plan successfully', () => {
    const saveRes = savePlanToStorage(SAMPLE_WEDDING);
    expect(saveRes.success).toBe(true);

    const loadRes = loadPlanFromStorage();
    expect(loadRes.error).toBeUndefined();
    expect(loadRes.plan).not.toBeNull();
    expect(loadRes.plan?.details.name).toBe(SAMPLE_WEDDING.details.name);
    expect(loadRes.plan?.budget).toHaveLength(SAMPLE_WEDDING.budget.length);
  });

  it('gracefully handles missing storage records', () => {
    const loadRes = loadPlanFromStorage();
    expect(loadRes.plan).toBeNull();
    expect(loadRes.error).toBeUndefined();
    expect(loadRes.isCorrupted).toBeFalsy();
  });

  it('detects corrupted JSON without throwing an unhandled exception', () => {
    window.localStorage.setItem(STORAGE_KEY, '{ invalid json syntax !!!');

    const loadRes = loadPlanFromStorage();
    expect(loadRes.plan).toBeNull();
    expect(loadRes.isCorrupted).toBe(true);
    expect(loadRes.error).toContain('corrupted');
  });

  it('rejects stored objects that do not conform to the GatherWise schema', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, randomField: 123 }));

    const loadRes = loadPlanFromStorage();
    expect(loadRes.plan).toBeNull();
    expect(loadRes.isCorrupted).toBe(true);
    expect(loadRes.error).toContain('schema');
  });

  it('clears stored plan successfully', () => {
    savePlanToStorage(SAMPLE_WEDDING);
    expect(loadPlanFromStorage().plan).not.toBeNull();

    const cleared = clearPlanFromStorage();
    expect(cleared).toBe(true);
    expect(loadPlanFromStorage().plan).toBeNull();
  });
});
