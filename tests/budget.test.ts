import { describe, it, expect } from 'vitest';
import {
  toMinorUnits,
  fromMinorUnits,
  calculatePlannedTotal,
  calculateActualTotal,
  calculateUnallocated,
  calculateRemainingSpending,
  isOverBudgetPlanned,
  isOverBudgetActual,
  normalizeProposedAllocations,
  formatCurrency,
} from '../src/utils/budget';
import { BudgetCategory, AIProposalAllocation } from '../src/types';

describe('Budget Calculations & Integer Minor Units', () => {
  it('converts to and from minor units without floating point loss', () => {
    expect(toMinorUnits(100.55)).toBe(10055);
    expect(fromMinorUnits(10055)).toBe(100.55);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30); // Float precision immune
    expect(fromMinorUnits(30)).toBe(0.3);
  });

  it('calculates planned and actual totals accurately', () => {
    const categories: BudgetCategory[] = [
      { id: '1', name: 'Venue', plannedAmount: 50000, actualAmount: 48000, notes: '' },
      { id: '2', name: 'Catering', plannedAmount: 30000.5, actualAmount: 32000.75, notes: '' },
      { id: '3', name: 'Decor', plannedAmount: 15000, actualAmount: 14000, notes: '' },
    ];

    expect(calculatePlannedTotal(categories)).toBe(95000.5);
    expect(calculateActualTotal(categories)).toBe(94000.75);
  });

  it('calculates unallocated budget and detects over-budget conditions', () => {
    const totalBudget = 100000;
    const plannedTotal = 95000;
    const actualTotal = 105000;

    expect(calculateUnallocated(totalBudget, plannedTotal)).toBe(5000);
    expect(calculateRemainingSpending(totalBudget, actualTotal)).toBe(-5000);

    expect(isOverBudgetPlanned(totalBudget, plannedTotal)).toBe(false);
    expect(isOverBudgetPlanned(totalBudget, 110000)).toBe(true);
    expect(isOverBudgetActual(totalBudget, actualTotal)).toBe(true);
    expect(isOverBudgetActual(totalBudget, 90000)).toBe(false);
  });

  it('handles zero, negative, and extreme budget values safely', () => {
    expect(toMinorUnits(0)).toBe(0);
    expect(fromMinorUnits(0)).toBe(0);
    expect(calculateUnallocated(0, 0)).toBe(0);
    expect(calculateUnallocated(1000, 1500)).toBe(-500); // Prominent negative balance
    expect(toMinorUnits(NaN)).toBe(0);
    expect(toMinorUnits(Infinity)).toBe(0);
  });

  it('formats currency with locale awareness', () => {
    const inrFormatted = formatCurrency(150000, 'INR');
    expect(inrFormatted).toContain('1,50,000');
    expect(inrFormatted).toContain('₹');

    const usdFormatted = formatCurrency(5000, 'USD');
    expect(usdFormatted).toContain('5,000');
  });
});

describe('Deterministic AI Allocation Normalization', () => {
  it('normalizes raw allocations so total matches event total budget EXACTLY', () => {
    const targetBudget = 500000;
    const rawAllocations: AIProposalAllocation[] = [
      { category: 'Venue', plannedAmount: 200000, notes: '' },
      { category: 'Catering', plannedAmount: 150000, notes: '' },
      { category: 'Decor', plannedAmount: 100000, notes: '' },
    ];

    const result = normalizeProposedAllocations(rawAllocations, targetBudget);
    expect(result.allocations.length).toBeGreaterThan(0);

    // Sum of normalized planned amounts must equal targetBudget exactly
    const sum = result.allocations.reduce((acc, a) => acc + toMinorUnits(a.plannedAmount), 0);
    expect(sum).toBe(toMinorUnits(targetBudget));
    expect(result.adjusted).toBe(true);
  });

  it('automatically introduces a visible contingency category if AI omitted one', () => {
    const targetBudget = 100000;
    const rawAllocations: AIProposalAllocation[] = [
      { category: 'Catering', plannedAmount: 60000, notes: '' },
      { category: 'Music', plannedAmount: 40000, notes: '' },
    ];

    const result = normalizeProposedAllocations(rawAllocations, targetBudget);
    const contingencyItem = result.allocations.find(a => a.isContingency || /contingency|emergency|buffer/i.test(a.category));

    expect(contingencyItem).toBeDefined();
    expect(contingencyItem?.plannedAmount).toBeGreaterThan(0);

    const sum = result.allocations.reduce((acc, a) => acc + toMinorUnits(a.plannedAmount), 0);
    expect(sum).toBe(toMinorUnits(targetBudget));
  });

  it('handles empty or zero budget edge cases safely without throwing', () => {
    const resultZero = normalizeProposedAllocations([], 0);
    expect(resultZero.allocations).toEqual([]);
    expect(resultZero.adjusted).toBe(false);

    const resultNegative = normalizeProposedAllocations([], -500);
    expect(resultNegative.allocations).toEqual([]);

    const resultEmptyAllocations = normalizeProposedAllocations([], 200000);
    const sum = resultEmptyAllocations.allocations.reduce((acc, a) => acc + toMinorUnits(a.plannedAmount), 0);
    expect(sum).toBe(toMinorUnits(200000));
  });
});
