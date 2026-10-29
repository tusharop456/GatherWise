import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateProposal,
  generateBudgetReduction,
  generateIdeas,
  callGeminiRaw,
  cleanJsonText,
  verifiedOperations,
  resetVerifiedOperations,
} from '../server/gemini';
import {
  requestAIProposal,
  requestAIBudgetReduction,
  requestAIIdeas,
} from '../src/services/aiService';
import {
  validateAIProposalOutput,
  validateBudgetReductionOutput,
  validatePersonalizedIdeasOutput,
} from '../server/validator';
import { EventDetails, EventPlan, BudgetCategory } from '../src/types';
import { applyProposalToPlan } from '../src/utils/planMerge';

// Mock the GoogleGenAI client from @google/genai
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation((options?: any) => {
      return {
        models: {
          generateContent: (...args: any[]) => {
            if (options?.httpOptions?.signal?.aborted) {
              const err = new Error('This operation was aborted');
              (err as any).name = 'AbortError';
              return Promise.reject(err);
            }
            return mockGenerateContent(...args);
          },
        },
      };
    }),
    Type: {
      TYPE_UNSPECIFIED: 'TYPE_UNSPECIFIED',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      INTEGER: 'INTEGER',
      BOOLEAN: 'BOOLEAN',
      ARRAY: 'ARRAY',
      OBJECT: 'OBJECT',
      NULL: 'NULL',
    },
    FinishReason: {
      STOP: 'STOP',
      MAX_TOKENS: 'MAX_TOKENS',
      SAFETY: 'SAFETY',
    },
  };
});

describe('Live AI Error Handling: Truncation, Timeouts, and Upstream Failures', () => {
  const originalEnv = process.env;

  const mockEvent: EventDetails = {
    id: 'evt-failure-test',
    name: 'Ananya & Rohan Eco-Reception',
    type: 'wedding',
    date: '2027-04-15',
    location: 'Bengaluru, Karnataka',
    guestCount: 150,
    totalBudget: 800000,
    currency: 'INR',
    preferences: {
      theme: 'Botanical Harmony',
      atmosphere: 'Intimate & elegant',
      dietary: ['Vegetarian', 'Nut-free'],
      accessibility: ['Wheelchair ramp'],
      cultural: 'Kannada-Tamil Fusion',
    },
    notes: 'Prioritize natural daylight and compostable service ware',
    createdAt: '2026-10-24T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
  };

  const mockCategories: BudgetCategory[] = [
    { id: 'cat-1', name: 'Open-Air Lawn Venue', plannedAmount: 300000, actualAmount: 0, notes: 'Includes power' },
    { id: 'cat-2', name: 'Artisan Catering', plannedAmount: 350000, actualAmount: 0, notes: 'Multi-course menu' },
    { id: 'cat-3', name: 'Botanical Decor', plannedAmount: 150000, actualAmount: 0, notes: 'Seasonal florals' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    resetVerifiedOperations();
    process.env = {
      ...originalEnv,
      GEMINI_API_KEY: 'test-valid-mock-key-12345',
      GEMINI_MODEL: 'gemini-2.5-flash',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ==========================================
  // 1. TRUNCATION & INCOMPLETE OUTPUT DETECTION
  // ==========================================
  describe('Incomplete and Truncated Response Detection', () => {
    it('cleanJsonText strips markdown code fences cleanly', () => {
      const wrapped = '```json\n{"summary": "Test Plan"}\n```';
      expect(cleanJsonText(wrapped)).toBe('{"summary": "Test Plan"}');

      const raw = '{"summary": "Plain JSON"}';
      expect(cleanJsonText(raw)).toBe('{"summary": "Plain JSON"}');
    });

    it('detects MAX_TOKENS finishReason and rejects truncated response safely', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '{"summary": "Partial response that ran out of tokens...',
        candidates: [{ finishReason: 'MAX_TOKENS' }],
      });

      await expect(generateProposal(mockEvent)).rejects.toThrow(
        /Gemini response was truncated due to reaching maxOutputTokens/i
      );
    });

    it('detects SAFETY or abnormal stop status and rejects incomplete response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '{"summary": "Filtered',
        candidates: [{ finishReason: 'SAFETY' }],
      });

      await expect(generateProposal(mockEvent)).rejects.toThrow(
        /Gemini response generation stopped unexpectedly with status "SAFETY"/i
      );
    });

    it('rejects truncated, unparseable JSON from model and does not return sample templates', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '```json\n{"summary": "Broken incomplete payload...',
        candidates: [{ finishReason: 'STOP' }],
      });

      await expect(generateProposal(mockEvent)).rejects.toThrow(
        /Gemini model returned malformed output \(invalid JSON\)/i
      );
    });

    it('rejects budget reduction when model produces malformed JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Not valid JSON at all',
        candidates: [{ finishReason: 'STOP' }],
      });

      await expect(generateBudgetReduction(mockEvent, mockCategories)).rejects.toThrow(
        /Gemini model returned malformed output \(invalid JSON\)/i
      );
    });

    it('rejects ideas generation when model produces malformed JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '{"themes": [broken array',
        candidates: [{ finishReason: 'STOP' }],
      });

      await expect(generateIdeas(mockEvent)).rejects.toThrow(
        /Gemini model returned malformed output \(invalid JSON\)/i
      );
    });

    it('validator rejects output that is missing required structure or has invalid types', () => {
      expect(validateAIProposalOutput(null, mockEvent).valid).toBe(false);
      expect(validateAIProposalOutput('string', mockEvent).valid).toBe(false);
      expect(validateBudgetReductionOutput(undefined, mockCategories).valid).toBe(false);
      expect(validatePersonalizedIdeasOutput(123).valid).toBe(false);
    });
  });

  // ==========================================
  // 2. TIMEOUT & ACTIVE CANCELLATION TESTS
  // ==========================================
  describe('Timeout and Upstream Request Cancellation', () => {
    it('cancels upstream request when timeout expires', async () => {
      // Simulate slow generation
      mockGenerateContent.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 500))
      );

      // Call with 50ms timeout threshold
      await expect(
        callGeminiRaw('system prompt', 'user prompt', undefined, 50)
      ).rejects.toThrow(/Gemini request timed out after 0.05s and upstream connection was cancelled/i);
    });

    it('cancels upstream request when external AbortSignal is triggered', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        callGeminiRaw('system prompt', 'user prompt', undefined, 30000, controller.signal)
      ).rejects.toThrow(/timed out.*and upstream connection was cancelled/i);
    });

    it('propagates AbortSignal across transport boundary and cancels in-flight fetch request', async () => {
      const controller = new AbortController();
      const fetchMock = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const proposalPromise = requestAIProposal(mockEvent, controller.signal);
      controller.abort();

      await expect(proposalPromise).rejects.toThrow(/abort/i);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ai/proposal',
        expect.objectContaining({ signal: controller.signal })
      );
    });

    it('cancels in-flight budget reduction fetch request at transport boundary', async () => {
      const controller = new AbortController();
      const fetchMock = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted.');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      });
      vi.stubGlobal('fetch', fetchMock);

      const reductionPromise = requestAIBudgetReduction(mockEvent, mockCategories, controller.signal);
      controller.abort();

      await expect(reductionPromise).rejects.toThrow(/abort/i);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ai/budget-reduction',
        expect.objectContaining({ signal: controller.signal })
      );
    });
  });

  // ==========================================
  // 3. UPSTREAM FAILURE TRANSLATION TESTS
  // ==========================================
  describe('Upstream Service Failures', () => {
    it('translates 401/403 invalid API key into actionable environment configuration guidance', async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new Error('[GoogleGenAI Error]: [403 Forbidden] API key not valid. Please pass a valid API key.')
      );

      await expect(
        callGeminiRaw('system prompt', 'user prompt')
      ).rejects.toThrow(/Gemini API authentication failed: Invalid or expired API key\. Please check GEMINI_API_KEY in your \.env file\./i);
    });

    it('translates 429 quota/resource exhaustion into actionable rate limit message', async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new Error('[GoogleGenAI Error]: [429 Too Many Requests] RESOURCE_EXHAUSTED: Quota exceeded.')
      );

      await expect(
        callGeminiRaw('system prompt', 'user prompt')
      ).rejects.toThrow(/Gemini API rate limit or quota exceeded\. Please wait a moment and try again\./i);
    });

    it('translates 503 service unavailable into clean actionable retry message', async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new Error('[GoogleGenAI Error]: [503 Service Unavailable] The model is overloaded. Please try again later.')
      );

      await expect(
        callGeminiRaw('system prompt', 'user prompt')
      ).rejects.toThrow(/Gemini service is temporarily unavailable\. Please retry shortly\./i);
    });

    it('client service requestAIProposal propagates upstream HTTP 502 with actionable details', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          json: () =>
            Promise.resolve({
              error: 'Failed to generate proposal.',
              details: 'Gemini API authentication failed: Invalid or expired API key. Please check GEMINI_API_KEY in your .env file.',
            }),
        })
      );

      await expect(requestAIProposal(mockEvent)).rejects.toThrow(
        /Gemini API authentication failed: Invalid or expired API key/i
      );
    });

    it('client service requestAIBudgetReduction propagates upstream error and never substitutes fake cuts', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          json: () =>
            Promise.resolve({
              error: 'Failed to generate budget reduction advice.',
              details: 'Gemini request timed out after 30s and upstream connection was cancelled.',
            }),
        })
      );

      await expect(requestAIBudgetReduction(mockEvent, mockCategories)).rejects.toThrow(
        /Gemini request timed out after 30s/i
      );
    });

    it('client service requestAIIdeas propagates upstream error without returning silent templates', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          json: () =>
            Promise.resolve({
              error: 'Failed to generate personalized ideas.',
              details: 'Gemini service is temporarily unavailable. Please retry shortly.',
            }),
        })
      );

      await expect(requestAIIdeas(mockEvent)).rejects.toThrow(
        /Gemini service is temporarily unavailable/i
      );
    });
  });

  // ==========================================
  // 4. PRESERVING EXISTING EDITS AND PROPOSAL MERGE STATE TRANSITIONS
  // ==========================================
  describe('Proposal Data Preservation and Workspace State Transitions', () => {
    it('preserves existing tasks, IDs, completion states, and recorded expenses by default (merge mode)', () => {
      const initialPlan: EventPlan = {
        version: 1,
        details: mockEvent,
        budget: [
          { id: 'cat-venue', name: 'Open-Air Lawn Venue', plannedAmount: 300000, actualAmount: 120000, notes: 'Advance paid' },
          { id: 'cat-custom', name: 'Handcrafted Invitations', plannedAmount: 50000, actualAmount: 25000, notes: 'Local artisan' },
        ],
        tasks: [
          { id: 'task-1', title: 'Confirm lawn dates', category: 'Venue', dueDate: '2027-01-15', completed: true, isCritical: true },
          { id: 'task-custom', title: 'Call calligraphy artist', category: 'General', dueDate: '2027-01-20', completed: false, isCritical: false },
        ],
        vendors: [{ id: 'v-1', name: 'Premier Florals', category: 'Decor', status: 'confirmed', notes: 'Deposit paid', quote: 50000, checklistResponses: {} }],
        ideas: null,
        aiNoticeAcknowledged: true,
        lastModified: '2026-10-24T12:00:00.000Z',
      };

      const proposal = {
        summary: 'Updated event strategy',
        themeIdeas: ['Theme 1'],
        activityIdeas: ['Activity 1'],
        budgetAllocations: [
          { category: 'Open-Air Lawn Venue', plannedAmount: 350000, notes: 'Updated venue allocation' },
          { category: 'Artisan Catering', plannedAmount: 200000, notes: 'New catering category' },
        ],
        tasks: [
          { title: 'Confirm lawn dates', category: 'Venue', dueDate: '2027-01-18', isCritical: true },
          { title: 'Tasting session with caterer', category: 'Catering', dueDate: '2027-02-01', isCritical: false },
        ],
        vendorChecklists: [],
        assumptionsAndLimitations: [],
        generatedAt: '2026-10-24T12:00:00.000Z',
        isSampleMode: false,
      };

      const mergedPlan = applyProposalToPlan(initialPlan, proposal, 'merge');

      // 1. Budget preservation:
      // Matched category updates plannedAmount but preserves existing ID and actualAmount
      const lawnCat = mergedPlan.budget.find((b) => b.name === 'Open-Air Lawn Venue');
      expect(lawnCat).toBeDefined();
      expect(lawnCat?.id).toBe('cat-venue');
      expect(lawnCat?.actualAmount).toBe(120000);
      expect(lawnCat?.plannedAmount).toBe(350000);

      // Custom category and its recorded spending preserved completely
      const customCat = mergedPlan.budget.find((b) => b.id === 'cat-custom');
      expect(customCat).toBeDefined();
      expect(customCat?.actualAmount).toBe(25000);
      expect(customCat?.plannedAmount).toBe(50000);

      // New proposal category added
      const cateringCat = mergedPlan.budget.find((b) => b.name === 'Artisan Catering');
      expect(cateringCat).toBeDefined();
      expect(cateringCat?.plannedAmount).toBe(200000);
      expect(cateringCat?.actualAmount).toBe(0);

      // 2. Task preservation:
      // Matched task keeps existing ID and completed state
      const matchedTask = mergedPlan.tasks.find((t) => t.id === 'task-1');
      expect(matchedTask).toBeDefined();
      expect(matchedTask?.completed).toBe(true);

      // Custom task kept intact
      const customTask = mergedPlan.tasks.find((t) => t.id === 'task-custom');
      expect(customTask).toBeDefined();
      expect(customTask?.completed).toBe(false);

      // New suggestion added with unique ID
      const newTask = mergedPlan.tasks.find((t) => t.title === 'Tasting session with caterer');
      expect(newTask).toBeDefined();
      expect(newTask?.id).toBeDefined();
      expect(newTask?.id).not.toBe('task-1');
      expect(newTask?.completed).toBe(false);

      // Total tasks is 3
      expect(mergedPlan.tasks).toHaveLength(3);

      // Vendors and metadata preserved
      expect(mergedPlan.vendors).toHaveLength(1);
      expect(mergedPlan.vendors[0].name).toBe('Premier Florals');
    });

    it('replaces categories and tasks when explicit replace mode is requested', () => {
      const initialPlan: EventPlan = {
        version: 1,
        details: mockEvent,
        budget: [
          { id: 'cat-old', name: 'Old Venue', plannedAmount: 100000, actualAmount: 50000, notes: 'Old' },
        ],
        tasks: [
          { id: 'task-old', title: 'Old Task', category: 'General', dueDate: '2027-01-01', completed: true, isCritical: false },
        ],
        vendors: [{ id: 'v-1', name: 'Decor Vendor', category: 'Decor', status: 'contacted', notes: 'Keep this', quote: 40000, checklistResponses: {} }],
        ideas: null,
        aiNoticeAcknowledged: true,
        lastModified: '2026-10-24T12:00:00.000Z',
      };

      const proposal = {
        summary: 'Brand new strategy',
        themeIdeas: [],
        activityIdeas: [],
        budgetAllocations: [
          { category: 'New Venue', plannedAmount: 250000, notes: 'Replaced' },
        ],
        tasks: [
          { title: 'New Task 1', category: 'Venue', dueDate: '2027-02-01', isCritical: true },
        ],
        vendorChecklists: [],
        assumptionsAndLimitations: [],
        generatedAt: '2026-10-24T12:00:00.000Z',
        isSampleMode: false,
      };

      const replacedPlan = applyProposalToPlan(initialPlan, proposal, 'replace');

      // Replaces categories cleanly
      expect(replacedPlan.budget).toHaveLength(1);
      expect(replacedPlan.budget[0].name).toBe('New Venue');
      expect(replacedPlan.budget[0].actualAmount).toBe(0);

      // Replaces tasks cleanly
      expect(replacedPlan.tasks).toHaveLength(1);
      expect(replacedPlan.tasks[0].title).toBe('New Task 1');

      // Preserves existing vendors
      expect(replacedPlan.vendors).toHaveLength(1);
      expect(replacedPlan.vendors[0].name).toBe('Decor Vendor');
    });

    it('ensures workspace state is never mutated when a generation failure occurs', async () => {
      const initialPlan: EventPlan = {
        version: 1,
        details: mockEvent,
        budget: [
          { id: 'custom-b-1', name: 'Custom Heritage Pavilion', plannedAmount: 420000, actualAmount: 150000, notes: 'Booked directly with owner' },
        ],
        tasks: [
          { id: 'custom-t-1', title: 'Collect handmade invites', category: 'General', dueDate: '2027-02-01', completed: true, isCritical: false },
        ],
        vendors: [],
        ideas: null,
        aiNoticeAcknowledged: true,
        lastModified: '2026-10-24T12:00:00.000Z',
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 502,
          json: () => Promise.resolve({ error: 'Upstream Gemini generation error' }),
        })
      );

      let caughtError: any;
      try {
        await requestAIProposal(initialPlan.details);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeDefined();
      // Workspace plan was not mutated
      expect(initialPlan.budget).toHaveLength(1);
      expect(initialPlan.budget[0].actualAmount).toBe(150000);
      expect(initialPlan.tasks[0].completed).toBe(true);
    });
  });

  // ==========================================
  // 5. LIVE VERIFICATION STATUS TRACKING
  // ==========================================
  describe('Live Verification Status State Tracking', () => {
    it('marks operation as verified only after a successful generation and schema validation', async () => {
      expect(verifiedOperations.proposal).toBe(false);

      const validProposalJson = JSON.stringify({
        summary: 'A refined botanical reception in Bengaluru.',
        themeIdeas: ['Botanical Harmony'],
        activityIdeas: ['Acoustic Garden Flute'],
        budgetAllocations: [
          { category: 'Venue', plannedAmount: 400000, notes: 'Lawn rental' },
          { category: 'Catering', plannedAmount: 360000, notes: 'Vegetarian menu' },
          { category: 'Reserve', plannedAmount: 40000, notes: 'Contingency', isContingency: true },
        ],
        tasks: [
          { title: 'Confirm lawn dates', category: 'Venue', dueDate: '2027-01-15', isCritical: true },
        ],
        vendorChecklists: [
          { category: 'Venue', items: ['Power backup checked'] },
        ],
        assumptionsAndLimitations: ['Directional estimate.'],
      });

      mockGenerateContent.mockResolvedValueOnce({
        text: validProposalJson,
        candidates: [{ finishReason: 'STOP' }],
      });

      const res = await generateProposal(mockEvent);

      expect(res.isSampleMode).toBe(false);
      expect(res.isLiveVerified).toBe(true);
      expect(res.proposal.isLiveVerified).toBe(true);
      expect(verifiedOperations.proposal).toBe(true);
    });
  });
});
