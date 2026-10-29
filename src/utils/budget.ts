import { BudgetCategory, AIProposalAllocation } from '../types';

/**
 * Minor unit scaling factor (100 for cents/paise).
 * Protects against floating-point arithmetic errors.
 */
const SCALE = 100;

export function toMinorUnits(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * SCALE);
}

export function fromMinorUnits(minor: number): number {
  if (!Number.isFinite(minor)) return 0;
  return minor / SCALE;
}

export function calculatePlannedTotalMinor(categories: BudgetCategory[]): number {
  return categories.reduce((sum, cat) => sum + toMinorUnits(cat.plannedAmount), 0);
}

export function calculateActualTotalMinor(categories: BudgetCategory[]): number {
  return categories.reduce((sum, cat) => sum + toMinorUnits(cat.actualAmount), 0);
}

export function calculatePlannedTotal(categories: BudgetCategory[]): number {
  return fromMinorUnits(calculatePlannedTotalMinor(categories));
}

export function calculateActualTotal(categories: BudgetCategory[]): number {
  return fromMinorUnits(calculateActualTotalMinor(categories));
}

/**
 * Unallocated budget = budget limit - planned total.
 * May be negative if planned total exceeds budget limit.
 */
export function calculateUnallocated(totalBudget: number, plannedTotal: number): number {
  const budgetMinor = toMinorUnits(totalBudget);
  const plannedMinor = toMinorUnits(plannedTotal);
  return fromMinorUnits(budgetMinor - plannedMinor);
}

/**
 * Remaining against actual spending = budget limit - actual total.
 * May be negative if actual spending exceeds budget limit.
 */
export function calculateRemainingSpending(totalBudget: number, actualTotal: number): number {
  const budgetMinor = toMinorUnits(totalBudget);
  const actualMinor = toMinorUnits(actualTotal);
  return fromMinorUnits(budgetMinor - actualMinor);
}

export function isOverBudgetPlanned(totalBudget: number, plannedTotal: number): boolean {
  return toMinorUnits(plannedTotal) > toMinorUnits(totalBudget);
}

export function isOverBudgetActual(totalBudget: number, actualTotal: number): boolean {
  return toMinorUnits(actualTotal) > toMinorUnits(totalBudget);
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function getCurrencySymbol(currency = 'INR'): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  const validAmount = Number.isFinite(amount) ? amount : 0;
  const curr = currency.toUpperCase();

  try {
    const locale = curr === 'INR' ? 'en-IN' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(validAmount);
  } catch {
    // Fallback if currency string isn't recognized by Intl
    const symbol = getCurrencySymbol(curr);
    return `${symbol} ${Math.round(validAmount).toLocaleString()}`;
  }
}

export interface NormalizationResult {
  allocations: AIProposalAllocation[];
  adjusted: boolean;
  explanation: string;
}

/**
 * Deterministically normalizes AI-suggested budget allocations so that the sum
 * of all categories (including a visible contingency category) totals the budget limit EXACTLY.
 * Never trusts model arithmetic.
 */
export function normalizeProposedAllocations(
  rawAllocations: AIProposalAllocation[],
  totalBudget: number
): NormalizationResult {
  if (!totalBudget || totalBudget <= 0) {
    return {
      allocations: [],
      adjusted: false,
      explanation: 'Total budget must be a positive number to allocate.',
    };
  }

  const targetBudgetMinor = toMinorUnits(totalBudget);

  // Filter out invalid items
  let items = rawAllocations
    .filter(item => item && typeof item.category === 'string' && item.category.trim() !== '')
    .map(item => ({
      category: item.category.trim(),
      plannedAmount: Math.max(0, Number(item.plannedAmount) || 0),
      notes: item.notes || 'Planning estimate',
      isContingency: Boolean(item.isContingency),
    }));

  if (items.length === 0) {
    // Fallback baseline if empty
    const contingencyAmount = fromMinorUnits(Math.round(targetBudgetMinor * 0.1));
    const mainAmount = totalBudget - contingencyAmount;
    return {
      allocations: [
        { category: 'Main Program & Essentials', plannedAmount: mainAmount, notes: 'Planning estimate' },
        { category: 'Contingency & Buffer (10%)', plannedAmount: contingencyAmount, notes: 'Emergency safety reserve', isContingency: true },
      ],
      adjusted: true,
      explanation: 'Allocations defaulted to primary essentials and 10% contingency.',
    };
  }

  // Ensure a visible contingency category exists
  const hasContingency = items.some(
    item => item.isContingency || /contingency|emergency|buffer/i.test(item.category)
  );

  if (!hasContingency) {
    // Reserve ~5% for contingency
    const defaultContingencyMinor = Math.max(SCALE, Math.round(targetBudgetMinor * 0.05));
    items.push({
      category: 'Contingency & Emergency Buffer (5%)',
      plannedAmount: fromMinorUnits(defaultContingencyMinor),
      notes: 'Unforeseen expenses and last-minute price fluctuations',
      isContingency: true,
    });
  } else {
    // Mark the existing contingency item
    items = items.map(item => ({
      ...item,
      isContingency: item.isContingency || /contingency|emergency|buffer/i.test(item.category),
    }));
  }

  const rawSumMinor = items.reduce((sum, item) => sum + toMinorUnits(item.plannedAmount), 0);

  if (rawSumMinor === targetBudgetMinor) {
    return {
      allocations: items.map(item => ({
        ...item,
        plannedAmount: fromMinorUnits(toMinorUnits(item.plannedAmount)),
      })),
      adjusted: false,
      explanation: 'Proposed allocations matched the total budget limit exactly.',
    };
  }

  // Pro-rate each item to hit targetBudgetMinor exactly
  const ratio = rawSumMinor > 0 ? targetBudgetMinor / rawSumMinor : 1 / items.length;

  let allocatedMinorSoFar = 0;
  const normalized = items.map((item, idx) => {
    // Last item absorbs any rounding remainder
    if (idx === items.length - 1) {
      const remainderMinor = targetBudgetMinor - allocatedMinorSoFar;
      return {
        ...item,
        plannedAmount: fromMinorUnits(Math.max(0, remainderMinor)),
      };
    }
    const proportionalMinor = Math.round(toMinorUnits(item.plannedAmount) * ratio);
    allocatedMinorSoFar += proportionalMinor;
    return {
      ...item,
      plannedAmount: fromMinorUnits(proportionalMinor),
    };
  });

  const diffMinor = rawSumMinor - targetBudgetMinor;
  const diffDisplay = formatCurrency(Math.abs(fromMinorUnits(diffMinor)));
  const adjustmentDirection = diffMinor > 0 ? 'scaled down' : 'scaled up';

  return {
    allocations: normalized,
    adjusted: true,
    explanation: `Raw AI allocations totaled ${formatCurrency(fromMinorUnits(rawSumMinor))}. Deterministically ${adjustmentDirection} by ${diffDisplay} so categories + contingency equal your total budget of ${formatCurrency(totalBudget)} exactly.`,
  };
}
