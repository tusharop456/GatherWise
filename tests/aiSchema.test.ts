import { describe, it, expect } from 'vitest';
import {
  validateAIProposalOutput,
  validateBudgetReductionOutput,
  validateEventPayload,
} from '../server/validator';
import { EventDetails } from '../src/types';
import { toMinorUnits } from '../src/utils/budget';

describe('Server AI Boundary & Schema Enforcement', () => {
  const mockEvent: EventDetails = {
    id: 'evt-test-1',
    name: 'Harish 50th Jubilee',
    type: 'birthday',
    date: '2026-12-20',
    location: 'Chennai, Tamil Nadu',
    guestCount: 80,
    totalBudget: 200000,
    currency: 'INR',
    preferences: {
      theme: 'Golden Elegance',
      atmosphere: 'Warm',
      dietary: ['Vegetarian'],
      accessibility: ['Step-free'],
      cultural: 'South Indian',
    },
    notes: 'Include classical fusion music',
    createdAt: '2026-10-22T00:00:00.000Z',
    updatedAt: '2026-10-22T00:00:00.000Z',
  };

  it('rejects completely malformed or non-object AI responses', () => {
    expect(validateAIProposalOutput(null, mockEvent).valid).toBe(false);
    expect(validateAIProposalOutput('string response', mockEvent).valid).toBe(false);
    expect(validateAIProposalOutput(12345, mockEvent).valid).toBe(false);
  });

  it('safely processes raw AI output and enforces exact budget normalization', () => {
    const rawAiOutput = {
      summary: 'A golden milestone celebration.',
      themeIdeas: ['Golden Elegance', 'Carnatic Acoustic Twilight'],
      activityIdeas: ['Sitar fusion welcome', 'Retrospective video montage'],
      budgetAllocations: [
        { category: 'Venue', plannedAmount: 80000, notes: 'Estimate' },
        { category: 'Catering', plannedAmount: 90000, notes: 'Estimate' },
        { category: 'Decor', plannedAmount: 40000, notes: 'Estimate' },
      ],
      tasks: [
        { title: 'Book hall', category: 'Venue', dueDate: '2026-11-01', isCritical: true },
        { title: 'Past task that should be clamped', category: 'Venue', dueDate: '2026-09-01' },
      ],
      vendorChecklists: [
        { category: 'Catering', items: ['Vegetarian line check', 'Coffee station'] },
      ],
      assumptionsAndLimitations: ['Directional planning estimate.'],
    };

    const result = validateAIProposalOutput(rawAiOutput, mockEvent);
    expect(result.valid).toBe(true);
    expect(result.proposal).toBeDefined();

    // Verify budget sum equals target total budget (200,000) exactly
    const sum = result.proposal!.budgetAllocations.reduce(
      (acc, item) => acc + toMinorUnits(item.plannedAmount),
      0
    );
    expect(sum).toBe(toMinorUnits(mockEvent.totalBudget));

    // Verify past task date was clamped to today or later
    const clampedTask = result.proposal!.tasks.find(t => t.title.includes('Past task'));
    expect(clampedTask).toBeDefined();
    expect(clampedTask!.dueDate >= '2026-10-22').toBe(true);
  });

  it('validates budget reduction output and computes exact savings', () => {
    const currentCategories = [
      { id: 'cat-1', name: 'Venue Rental', plannedAmount: 80000 },
      { id: 'cat-2', name: 'Floral Decor', plannedAmount: 40000 },
    ];

    const rawAiReduction = {
      summary: 'Switch to local flora and morning slot.',
      proposedModifications: [
        { categoryId: 'cat-2', categoryName: 'Floral Decor', proposedAmount: 30000, rationale: 'Use local flowers' },
      ],
      practicalTradeoffs: ['Less imported lilies.'],
    };

    const res = validateBudgetReductionOutput(rawAiReduction, currentCategories);
    expect(res.valid).toBe(true);
    expect(res.result?.totalSavings).toBe(10000); // 40000 - 30000
    expect(res.result?.projectedPlannedTotal).toBe(110000); // 120000 - 10000
  });

  it('validates incoming event payloads against boundary limits', () => {
    const valid = validateEventPayload(mockEvent);
    expect(valid.valid).toBe(true);

    const pastDateEvent = { ...mockEvent, date: '2025-01-01' };
    expect(validateEventPayload(pastDateEvent).valid).toBe(false);

    const negativeBudgetEvent = { ...mockEvent, totalBudget: -500 };
    expect(validateEventPayload(negativeBudgetEvent).valid).toBe(false);
  });
});
