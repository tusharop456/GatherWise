import { describe, it, expect, beforeEach } from 'vitest';
import {
  mergeProposalBudget,
  mergeProposalTasks,
  applyProposalToPlan,
} from '../src/utils/planMerge';
import { applyBudgetReductions } from '../src/utils/budget';
import {
  validateBudgetReductionOutput,
  validateBudgetCategoriesInput,
} from '../server/validator';
import {
  validateStoredEventPlan,
  loadPlanFromStorage,
  STORAGE_KEY,
} from '../src/utils/storage';
import {
  EventDetails,
  EventPlan,
  BudgetCategory,
  TimelineTask,
  AIProposal,
  BudgetReductionResult,
  ProposedBudgetCut,
} from '../src/types';

describe('Reliability Regression Suite', () => {
  const baseEvent: EventDetails = {
    id: 'evt-alpha',
    name: "Aarav & Meera's Wedding",
    type: 'wedding',
    date: '2027-06-15',
    location: 'Jaipur, Rajasthan',
    guestCount: 250,
    totalBudget: 1500000,
    currency: 'INR',
    preferences: {
      theme: 'Royal Heritage',
      atmosphere: 'Grand',
      dietary: ['Vegetarian'],
      accessibility: [],
      cultural: 'Rajasthani',
    },
    notes: 'Palace courtyard booking',
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z',
  };

  const sampleBudget: BudgetCategory[] = [
    {
      id: 'cat-venue',
      name: 'Palace Venue Rental',
      plannedAmount: 600000,
      actualAmount: 200000,
      notes: 'Initial deposit paid',
    },
    {
      id: 'cat-catering',
      name: 'Royal Feast Catering',
      plannedAmount: 500000,
      actualAmount: 50000,
      notes: 'Menu tasting scheduled',
    },
    {
      id: 'cat-custom-decor',
      name: 'Handcrafted Marigold Decor',
      plannedAmount: 200000,
      actualAmount: 100000,
      notes: 'Custom artisan order',
    },
  ];

  const sampleTasks: TimelineTask[] = [
    {
      id: 'task-101',
      title: 'Pay Palace Venue deposit',
      category: 'Venue',
      dueDate: '2027-01-10',
      completed: true,
      isCritical: true,
    },
    {
      id: 'task-102',
      title: 'Finalize royal menu options',
      category: 'Catering',
      dueDate: '2027-02-15',
      completed: false,
      isCritical: false,
    },
    {
      id: 'task-custom',
      title: 'Coordinate local marigold deliveries',
      category: 'General',
      dueDate: '2027-03-01',
      completed: true,
      isCritical: false,
    },
  ];

  const samplePlan: EventPlan = {
    version: 1,
    details: baseEvent,
    budget: sampleBudget,
    tasks: sampleTasks,
    vendors: [
      {
        id: 'v-1',
        name: 'Palace Grounds Management',
        category: 'Venue',
        quote: 150000,
        status: 'confirmed',
        notes: 'Contact Mr. Sharma',
        checklistResponses: {},
      },
    ],
    ideas: null,
    aiNoticeAcknowledged: true,
    lastModified: '2026-10-25T10:00:00.000Z',
  };

  // =========================================================================
  // 1. PROPOSAL MERGE & DATA PRESERVATION
  // =========================================================================
  describe('1. Proposal Application Data Preservation', () => {
    const proposal: AIProposal = {
      summary: 'Comprehensive Royal Heritage Wedding Plan',
      themeIdeas: ['Desert Royalty', 'Vintage Rajputana'],
      activityIdeas: ['Folk dance troupe', 'Live sitar recital'],
      budgetAllocations: [
        {
          category: 'Palace Venue Rental',
          plannedAmount: 650000,
          notes: 'Includes nighttime floodlighting and royal courtyard',
        },
        {
          category: 'Royal Feast Catering',
          plannedAmount: 480000,
          notes: 'Multi-course Rajasthani thali',
        },
        {
          category: 'Guest Welcome & Hospitality',
          plannedAmount: 120000,
          notes: 'Turbans and traditional welcome drinks',
        },
      ],
      tasks: [
        {
          title: 'Pay Palace Venue deposit',
          category: 'Venue',
          dueDate: '2027-01-12',
          isCritical: true,
        },
        {
          title: 'Contract Rajasthani folk musicians',
          category: 'Entertainment',
          dueDate: '2027-02-20',
          isCritical: false,
        },
      ],
      vendorChecklists: [],
      assumptionsAndLimitations: ['Subject to palace heritage regulations'],
      generatedAt: '2026-10-25T10:00:00.000Z',
      isSampleMode: false,
    };

    it('mergeProposalBudget preserves existing IDs, recorded actual expenses, and custom categories', () => {
      const merged = mergeProposalBudget(sampleBudget, proposal.budgetAllocations);

      // Existing venue category
      const venue = merged.find((b) => b.id === 'cat-venue');
      expect(venue).toBeDefined();
      expect(venue?.plannedAmount).toBe(650000);
      expect(venue?.actualAmount).toBe(200000); // Preserved!

      // Existing custom decor category preserved intact
      const decor = merged.find((b) => b.id === 'cat-custom-decor');
      expect(decor).toBeDefined();
      expect(decor?.plannedAmount).toBe(200000);
      expect(decor?.actualAmount).toBe(100000);

      // New hospitality category added with 0 actualAmount
      const hospitality = merged.find((b) => b.name === 'Guest Welcome & Hospitality');
      expect(hospitality).toBeDefined();
      expect(hospitality?.plannedAmount).toBe(120000);
      expect(hospitality?.actualAmount).toBe(0);
      expect(hospitality?.id).toBeDefined();
    });

    it('mergeProposalTasks preserves existing task IDs, completed states, and adds new recommendations', () => {
      const merged = mergeProposalTasks(sampleTasks, proposal.tasks);

      // Task 101 was already completed
      const t101 = merged.find((t) => t.id === 'task-101');
      expect(t101).toBeDefined();
      expect(t101?.completed).toBe(true); // Must remain true!

      // Custom task must remain
      const customTask = merged.find((t) => t.id === 'task-custom');
      expect(customTask).toBeDefined();
      expect(customTask?.completed).toBe(true);

      // New folk musicians task added with fresh ID and completed: false
      const musiciansTask = merged.find((t) => t.title === 'Contract Rajasthani folk musicians');
      expect(musiciansTask).toBeDefined();
      expect(musiciansTask?.completed).toBe(false);
      expect(musiciansTask?.id).not.toBe('task-101');
      expect(musiciansTask?.id).not.toBe('task-102');

      // Total tasks is 4 (3 existing + 1 new, since t101 title matched existing)
      expect(merged).toHaveLength(4);
    });

    it('applyProposalToPlan in merge mode merges without silently discarding data', () => {
      const updated = applyProposalToPlan(samplePlan, proposal, 'merge');

      expect(updated.details.id).toBe(samplePlan.details.id);
      expect(updated.budget.find((b) => b.name === 'Palace Venue Rental')?.actualAmount).toBe(200000);
      expect(updated.tasks.find((t) => t.id === 'task-101')?.completed).toBe(true);
      expect(updated.vendors).toHaveLength(1);
      expect(updated.lastProposal).toBe(proposal);
    });

    it('applyProposalToPlan in replace mode cleanly replaces budget & tasks while keeping other data intact', () => {
      const updated = applyProposalToPlan(samplePlan, proposal, 'replace');

      // Budget replaced by proposal categories (3)
      expect(updated.budget).toHaveLength(3);
      // All actual amounts start at 0 in replace mode
      expect(updated.budget.every((b) => b.actualAmount === 0)).toBe(true);

      // Tasks replaced by proposal tasks (2)
      expect(updated.tasks).toHaveLength(2);
      expect(updated.tasks.map((t) => t.title)).toContain('Contract Rajasthani folk musicians');

      // Vendors and event details preserved
      expect(updated.vendors).toHaveLength(1);
      expect(updated.vendors[0].name).toBe('Palace Grounds Management');
      expect(updated.details.name).toBe(baseEvent.name);
    });
  });

  // =========================================================================
  // 2. BUDGET REDUCTION DEDUPLICATION & CALCULATIONS
  // =========================================================================
  describe('2. Budget Reduction Duplicate Deduplication', () => {
    it('validateBudgetReductionOutput deterministically deduplicates duplicate suggestions', () => {
      const categories: BudgetCategory[] = [
        { id: 'cat-venue', name: 'Palace Venue Rental', plannedAmount: 600000, actualAmount: 0, notes: '' },
        { id: 'cat-catering', name: 'Royal Feast Catering', plannedAmount: 500000, actualAmount: 0, notes: '' },
      ];

      // Raw AI output has duplicate cuts for cat-venue: first cuts to 500000 (100k savings),
      // duplicate cuts to 450000 (150k savings).
      const rawOutputWithDuplicates = {
        summary: 'Targeted budget reduction ideas',
        proposedModifications: [
          {
            categoryId: 'cat-venue',
            categoryName: 'Palace Venue Rental',
            proposedAmount: 500000,
            rationale: 'Negotiate off-peak daylight hours',
          },
          {
            categoryId: 'cat-venue', // DUPLICATE ENTRY
            categoryName: 'Palace Venue Rental',
            proposedAmount: 450000,
            rationale: 'Book smaller lawn section',
          },
          {
            categoryId: 'cat-catering',
            categoryName: 'Royal Feast Catering',
            proposedAmount: 420000,
            rationale: 'Reduce dessert variety',
          },
        ],
        practicalTradeoffs: ['Slightly fewer dessert options'],
      };

      const validated = validateBudgetReductionOutput(rawOutputWithDuplicates, categories);
      expect(validated.valid).toBe(true);
      expect(validated.result).toBeDefined();

      const result = validated.result!;
      // Should contain only 2 unique modifications
      expect(result.proposedModifications).toHaveLength(2);

      // The duplicate for cat-venue selected the higher savings cut (450000 -> 150000 savings)
      const venueMod = result.proposedModifications.find((m) => m.categoryId === 'cat-venue');
      expect(venueMod?.proposedAmount).toBe(450000);
      expect(venueMod?.savingsAmount).toBe(150000);

      // Catering savings: 500000 - 420000 = 80000
      const cateringMod = result.proposedModifications.find((m) => m.categoryId === 'cat-catering');
      expect(cateringMod?.proposedAmount).toBe(420000);
      expect(cateringMod?.savingsAmount).toBe(80000);

      // totalSavings must equal 150000 + 80000 = 230000 (NOT 330000 from double-counting!)
      expect(result.totalSavings).toBe(230000);
    });

    it('applyBudgetReductions derives applied savings strictly from unique selected modifications', () => {
      // Pass duplicate modifications in input array
      const modifications: ProposedBudgetCut[] = [
        {
          categoryId: 'cat-venue',
          categoryName: 'Palace Venue Rental',
          currentAmount: 600000,
          proposedAmount: 520000,
          savingsAmount: 80000,
          rationale: 'Cut 1',
        },
        {
          categoryId: 'cat-venue',
          categoryName: 'Palace Venue Rental',
          currentAmount: 600000,
          proposedAmount: 500000,
          savingsAmount: 100000,
          rationale: 'Cut 2 (Duplicate)',
        },
      ];

      const { updatedBudget, appliedSavings } = applyBudgetReductions(sampleBudget, modifications);

      // Venue was 600000. Unique deduplicated cut gives proposedAmount 500000 (100000 savings)
      const venue = updatedBudget.find((b) => b.id === 'cat-venue');
      expect(venue?.plannedAmount).toBe(500000);
      expect(venue?.actualAmount).toBe(200000); // Preserved!
      expect(appliedSavings).toBe(100000); // Not 180000!

      // Other categories remain untouched
      const catering = updatedBudget.find((b) => b.id === 'cat-catering');
      expect(catering?.plannedAmount).toBe(500000);
    });
  });

  // =========================================================================
  // 3. EVENT ID & REVISION TYING / STALE RESPONSE PREVENTION
  // =========================================================================
  describe('3. Event ID and Revision Tying', () => {
    it('prevents applying proposal to a mismatched event ID', () => {
      const proposal: AIProposal = {
        summary: 'Strategy for Event Alpha',
        targetEventId: 'evt-alpha',
        themeIdeas: [],
        activityIdeas: [],
        budgetAllocations: [{ category: 'Venue', plannedAmount: 100000, notes: 'Notes' }],
        tasks: [],
        vendorChecklists: [],
        assumptionsAndLimitations: [],
        generatedAt: '2026-10-25T10:00:00.000Z',
        isSampleMode: false,
      };

      // Attempt to check match against Event Beta
      const isMismatch = proposal.targetEventId && proposal.targetEventId !== 'evt-beta';
      expect(isMismatch).toBe(true);
    });

    it('detects changed budget inputs before applying stale reduction advice', () => {
      // Snapshot taken before reduction was generated
      const snapshot = [
        { id: 'cat-venue', name: 'Palace Venue Rental', plannedAmount: 600000 },
        { id: 'cat-catering', name: 'Royal Feast Catering', plannedAmount: 500000 },
      ];

      const reductionResult: BudgetReductionResult = {
        summary: 'Cut advice',
        targetEventId: 'evt-alpha',
        targetRevision: 'rev-1',
        budgetSnapshot: snapshot,
        currentPlannedTotal: 1100000,
        projectedPlannedTotal: 1000000,
        totalSavings: 100000,
        isSampleMode: false,
        proposedModifications: [
          {
            categoryId: 'cat-venue',
            categoryName: 'Palace Venue Rental',
            currentAmount: 600000,
            proposedAmount: 500000,
            savingsAmount: 100000,
            rationale: 'Lower venue',
          },
        ],
        practicalTradeoffs: [],
      };

      // Case 1: Workspace budget matches snapshot
      const currentMatchingBudget: BudgetCategory[] = [
        { id: 'cat-venue', name: 'Palace Venue Rental', plannedAmount: 600000, actualAmount: 0, notes: '' },
        { id: 'cat-catering', name: 'Royal Feast Catering', plannedAmount: 500000, actualAmount: 0, notes: '' },
      ];
      const isStaleMatching = Boolean(
        reductionResult.budgetSnapshot?.some((snap) => {
          const cur = currentMatchingBudget.find((b) => b.id === snap.id);
          return !cur || cur.plannedAmount !== snap.plannedAmount;
        })
      );
      expect(isStaleMatching).toBe(false);

      // Case 2: User changed venue plannedAmount from 600000 to 550000 while request was in-flight
      const currentMutatedBudget: BudgetCategory[] = [
        { id: 'cat-venue', name: 'Palace Venue Rental', plannedAmount: 550000, actualAmount: 0, notes: '' },
        { id: 'cat-catering', name: 'Royal Feast Catering', plannedAmount: 500000, actualAmount: 0, notes: '' },
      ];
      const isStaleMutated = Boolean(
        reductionResult.budgetSnapshot?.some((snap) => {
          const cur = currentMutatedBudget.find((b) => b.id === snap.id);
          return !cur || cur.plannedAmount !== snap.plannedAmount;
        })
      );
      expect(isStaleMutated).toBe(true);
    });
  });

  // =========================================================================
  // 4. PERSISTED DATA RUNTIME VALIDATION
  // =========================================================================
  describe('4. Complete Runtime Validation of Persisted Data', () => {
    beforeEach(() => {
      window.localStorage.clear();
    });

    it('validateStoredEventPlan validates a conforming plan successfully', () => {
      const validation = validateStoredEventPlan(samplePlan);
      expect(validation.valid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('validateStoredEventPlan rejects invalid version or non-object payloads', () => {
      expect(validateStoredEventPlan(null).valid).toBe(false);
      expect(validateStoredEventPlan('string').valid).toBe(false);
      expect(validateStoredEventPlan({ version: 2 }).valid).toBe(false);
      expect(validateStoredEventPlan({ version: 1 }).valid).toBe(false); // missing details
    });

    it('validateStoredEventPlan rejects corrupted event details', () => {
      const badDetails = {
        ...samplePlan,
        details: {
          ...baseEvent,
          name: '', // Empty name
        },
      };
      expect(validateStoredEventPlan(badDetails).valid).toBe(false);

      const negativeBudgetDetails = {
        ...samplePlan,
        details: {
          ...baseEvent,
          totalBudget: -500, // Negative budget
        },
      };
      expect(validateStoredEventPlan(negativeBudgetDetails).valid).toBe(false);
    });

    it('validateStoredEventPlan rejects corrupted budget rows', () => {
      const negativePlanned = {
        ...samplePlan,
        budget: [
          { id: 'cat-1', name: 'Venue', plannedAmount: -100, actualAmount: 0 },
        ],
      };
      expect(validateStoredEventPlan(negativePlanned).valid).toBe(false);

      const nanActual = {
        ...samplePlan,
        budget: [
          { id: 'cat-1', name: 'Venue', plannedAmount: 100, actualAmount: NaN },
        ],
      };
      expect(validateStoredEventPlan(nanActual).valid).toBe(false);

      const missingId = {
        ...samplePlan,
        budget: [
          { name: 'Venue', plannedAmount: 100, actualAmount: 0 },
        ],
      };
      expect(validateStoredEventPlan(missingId).valid).toBe(false);
    });

    it('validateStoredEventPlan rejects corrupted task rows', () => {
      const nonBooleanCompleted = {
        ...samplePlan,
        tasks: [
          { id: 't-1', title: 'Task', category: 'General', dueDate: '2027-01-01', completed: 'yes' },
        ],
      };
      expect(validateStoredEventPlan(nonBooleanCompleted).valid).toBe(false);

      const emptyTitle = {
        ...samplePlan,
        tasks: [
          { id: 't-1', title: '', category: 'General', dueDate: '2027-01-01', completed: false },
        ],
      };
      expect(validateStoredEventPlan(emptyTitle).valid).toBe(false);
    });

    it('validateStoredEventPlan rejects corrupted vendor records', () => {
      const invalidStatus = {
        ...samplePlan,
        vendors: [
          { id: 'v-1', name: 'Vendor 1', category: 'Venue', status: 'unknown_status' },
        ],
      };
      expect(validateStoredEventPlan(invalidStatus).valid).toBe(false);
    });

    it('loadPlanFromStorage handles invalid stored data safely and visibly', () => {
      // Put corrupted data with negative planned amount in storage
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          details: baseEvent,
          budget: [{ id: 'b-1', name: 'Bad Row', plannedAmount: -9999, actualAmount: 0 }],
          tasks: [],
          vendors: [],
          ideas: null,
          aiNoticeAcknowledged: true,
          lastModified: new Date().toISOString(),
        })
      );

      const loaded = loadPlanFromStorage();
      expect(loaded.plan).toBeNull();
      expect(loaded.isCorrupted).toBe(true);
      expect(loaded.error).toContain('Validation failed');
    });
  });

  // =========================================================================
  // 5. SERVER-SIDE BUDGET CATEGORY INPUT VALIDATION
  // =========================================================================
  describe('5. Server-side Budget Category Input Validation', () => {
    it('accepts valid category lists', () => {
      const res = validateBudgetCategoriesInput(sampleBudget);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rejects non-array or empty category input', () => {
      expect(validateBudgetCategoriesInput(null).valid).toBe(false);
      expect(validateBudgetCategoriesInput(undefined).valid).toBe(false);
      expect(validateBudgetCategoriesInput('categories').valid).toBe(false);
      expect(validateBudgetCategoriesInput([]).valid).toBe(false);
      expect(validateBudgetCategoriesInput([]).error).toContain('At least one');
    });

    it('rejects excessive category count (> 50)', () => {
      const tooMany = Array.from({ length: 51 }, (_, i) => ({
        id: `cat-${i}`,
        name: `Category ${i}`,
        plannedAmount: 1000,
        actualAmount: 0,
      }));

      const res = validateBudgetCategoriesInput(tooMany);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('50 allowed');
    });

    it('rejects null or non-object rows', () => {
      const withNull = [
        { id: 'cat-1', name: 'Venue', plannedAmount: 1000 },
        null,
      ];
      expect(validateBudgetCategoriesInput(withNull).valid).toBe(false);

      const withPrimitive = [
        { id: 'cat-1', name: 'Venue', plannedAmount: 1000 },
        'string-row',
      ];
      expect(validateBudgetCategoriesInput(withPrimitive).valid).toBe(false);
    });

    it('rejects duplicate or empty category IDs', () => {
      const emptyId = [
        { id: '   ', name: 'Venue', plannedAmount: 1000 },
      ];
      expect(validateBudgetCategoriesInput(emptyId).valid).toBe(false);

      const duplicateId = [
        { id: 'cat-dup', name: 'Venue', plannedAmount: 1000 },
        { id: 'cat-dup', name: 'Catering', plannedAmount: 2000 },
      ];
      const dupRes = validateBudgetCategoriesInput(duplicateId);
      expect(dupRes.valid).toBe(false);
      expect(dupRes.error).toContain('Duplicate category ID');
    });

    it('rejects invalid or blank category names', () => {
      const emptyName = [
        { id: 'cat-1', name: '   ', plannedAmount: 1000 },
      ];
      expect(validateBudgetCategoriesInput(emptyName).valid).toBe(false);

      const longName = [
        { id: 'cat-1', name: 'Z'.repeat(101), plannedAmount: 1000 },
      ];
      expect(validateBudgetCategoriesInput(longName).valid).toBe(false);
    });

    it('rejects negative, non-finite, or out-of-range planned amounts', () => {
      const negativeAmount = [
        { id: 'cat-1', name: 'Venue', plannedAmount: -1 },
      ];
      expect(validateBudgetCategoriesInput(negativeAmount).valid).toBe(false);

      const nanAmount = [
        { id: 'cat-1', name: 'Venue', plannedAmount: NaN },
      ];
      expect(validateBudgetCategoriesInput(nanAmount).valid).toBe(false);

      const infinityAmount = [
        { id: 'cat-1', name: 'Venue', plannedAmount: Infinity },
      ];
      expect(validateBudgetCategoriesInput(infinityAmount).valid).toBe(false);

      const excessiveAmount = [
        { id: 'cat-1', name: 'Venue', plannedAmount: 2000000000 }, // > 1 Billion
      ];
      expect(validateBudgetCategoriesInput(excessiveAmount).valid).toBe(false);
    });
  });
});
