import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  EventDetails,
  AIProposal,
  BudgetReductionResult,
  PersonalizedIdeasResult,
} from '../src/types';
import {
  SYSTEM_PROPOSAL_INSTRUCTIONS,
  SYSTEM_BUDGET_REDUCTION_INSTRUCTIONS,
  SYSTEM_IDEAS_INSTRUCTIONS,
  buildProposalPrompt,
  buildBudgetReductionPrompt,
  buildIdeasPrompt,
} from './prompts';
import {
  validateAIProposalOutput,
  validateBudgetReductionOutput,
  validatePersonalizedIdeasOutput,
} from './validator';
import {
  generateSampleProposal,
  generateSampleBudgetReduction,
  generateSampleIdeas,
} from './sampleData';
import { getTodayDateString } from '../src/utils/dates';

dotenv.config();

export const DEFAULT_API_TIMEOUT_MS = 45000;

export interface VerifiedOperationsState {
  proposal: boolean;
  budgetReduction: boolean;
  ideas: boolean;
}

export const verifiedOperations: VerifiedOperationsState = {
  proposal: false,
  budgetReduction: false,
  ideas: false,
};

export function resetVerifiedOperations(): void {
  verifiedOperations.proposal = false;
  verifiedOperations.budgetReduction = false;
  verifiedOperations.ideas = false;
}

export function isLiveAIConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(
    key &&
    key.trim().length > 0 &&
    key !== 'your_gemini_api_key_here' &&
    key !== 'your_api_key_here'
  );
}

export function getModelIdentifier(): string {
  return (process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim()) || 'gemini-3.5-flash';
}

export function cleanJsonText(rawText: string): string {
  let cleaned = rawText.trim();
  // Strip markdown code fences if model returned ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Structured output schemas for the Gemini API using @google/genai Type descriptors
 */
export const PROPOSAL_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    themeIdeas: { type: Type.ARRAY, items: { type: Type.STRING } },
    activityIdeas: { type: Type.ARRAY, items: { type: Type.STRING } },
    budgetAllocations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          plannedAmount: { type: Type.NUMBER },
          notes: { type: Type.STRING },
          isContingency: { type: Type.BOOLEAN },
        },
        required: ['category', 'plannedAmount'],
      },
    },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          dueDate: { type: Type.STRING },
          owner: { type: Type.STRING },
          isCritical: { type: Type.BOOLEAN },
        },
        required: ['title', 'category', 'dueDate'],
      },
    },
    vendorChecklists: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          items: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['category', 'items'],
      },
    },
    assumptionsAndLimitations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['summary', 'budgetAllocations', 'tasks'],
};

export const BUDGET_REDUCTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    proposedModifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          categoryId: { type: Type.STRING },
          categoryName: { type: Type.STRING },
          proposedAmount: { type: Type.NUMBER },
          rationale: { type: Type.STRING },
        },
        required: ['categoryId', 'categoryName', 'proposedAmount'],
      },
    },
    practicalTradeoffs: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['summary', 'proposedModifications'],
};

export const IDEAS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    themes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          decorNotes: { type: Type.STRING },
        },
        required: ['name', 'description'],
      },
    },
    activities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          audience: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ['title', 'audience', 'description'],
      },
    },
    dietaryConsiderations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    accessibilityHighlights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ['summary', 'themes', 'activities'],
};

/**
 * Executes a Gemini model generation call with structured JSON output,
 * active upstream request cancellation on timeout or abort, and truncation detection.
 */
export async function callGeminiRaw(
  systemPrompt: string,
  userPrompt: string,
  schema?: Record<string, unknown>,
  timeoutMs = DEFAULT_API_TIMEOUT_MS,
  externalSignal?: AbortSignal
): Promise<{ text: string; finishReason?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !isLiveAIConfigured()) {
    throw new Error('GEMINI_API_KEY is not configured in server environment. Please configure it in your .env file.');
  }

  const modelName = getModelIdentifier();
  const abortController = new AbortController();

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortController.abort();
    } else {
      externalSignal.addEventListener('abort', () => abortController.abort(), { once: true });
    }
  }

  let timeoutId: NodeJS.Timeout | undefined;
  timeoutId = setTimeout(() => {
    // Actively cancel upstream HTTP socket connection
    abortController.abort();
  }, timeoutMs);

  try {
    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      return fetch(input, {
        ...init,
        signal: abortController.signal,
      });
    };

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        timeout: timeoutMs,
        fetch: customFetch as any,
      },
    });

    const config: any = {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 8192,
    };

    if (schema) {
      config.responseSchema = schema;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: userPrompt,
      config,
    });

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;

    // Detect incomplete / truncated responses
    if (finishReason === 'MAX_TOKENS') {
      throw new Error(
        'Gemini response was truncated due to reaching maxOutputTokens. Output is incomplete and rejected safely.'
      );
    }

    if (finishReason && finishReason !== 'STOP' && finishReason !== 'FINISH_REASON_UNSPECIFIED') {
      throw new Error(
        `Gemini response generation stopped unexpectedly with status "${finishReason}". Incomplete output rejected.`
      );
    }

    const text = response.text || '';
    if (!text.trim()) {
      throw new Error('Gemini returned an empty response.');
    }

    return { text: cleanJsonText(text), finishReason };
  } catch (err: any) {
    if (abortController.signal.aborted) {
      throw new Error(
        `Gemini request timed out after ${timeoutMs / 1000}s and upstream connection was cancelled. Please check network connectivity and try again.`
      );
    }
    const msg = err?.message || String(err);
    if (msg.includes('timed out') || msg.includes('timeout')) {
      throw new Error(
        `Gemini request timed out after ${timeoutMs / 1000}s and upstream connection was cancelled.`
      );
    }
    if (
      msg.includes('API_KEY_INVALID') ||
      msg.includes('API key not valid') ||
      msg.includes('403') ||
      msg.includes('401') ||
      msg.includes('UNAUTHENTICATED')
    ) {
      throw new Error('Gemini API authentication failed: Invalid or expired API key. Please check GEMINI_API_KEY in your .env file.');
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      throw new Error('Gemini API rate limit or quota exceeded. Please wait a moment and try again.');
    }
    if (msg.includes('503') || msg.includes('Overloaded') || msg.includes('Service Unavailable')) {
      throw new Error('Gemini service is temporarily unavailable. Please retry shortly.');
    }
    throw new Error(`Gemini live request failed: ${msg}`);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function generateProposal(
  event: EventDetails,
  signal?: AbortSignal
): Promise<{ proposal: AIProposal; isSampleMode: boolean; isLiveVerified: boolean; modelIdentifier?: string }> {
  if (!isLiveAIConfigured()) {
    // Curated Sample Mode with explicit labeling
    const proposal = generateSampleProposal(event);
    return {
      proposal,
      isSampleMode: true,
      isLiveVerified: false,
      modelIdentifier: 'GatherWise Deterministic Sample Engine (No API Key)',
    };
  }

  const today = getTodayDateString();
  const prompt = buildProposalPrompt(event, today);

  const raw = await callGeminiRaw(
    SYSTEM_PROPOSAL_INSTRUCTIONS,
    prompt,
    PROPOSAL_RESPONSE_SCHEMA,
    DEFAULT_API_TIMEOUT_MS,
    signal
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.text);
  } catch {
    throw new Error('Gemini model returned malformed output (invalid JSON). Live proposal could not be parsed.');
  }

  const validation = validateAIProposalOutput(parsed, event, false);
  if (!validation.valid || !validation.proposal) {
    throw new Error(validation.error || 'Gemini proposal output failed schema validation.');
  }

  validation.proposal.modelIdentifier = getModelIdentifier();
  validation.proposal.isLiveVerified = true;
  verifiedOperations.proposal = true;

  return {
    proposal: validation.proposal,
    isSampleMode: false,
    isLiveVerified: true,
    modelIdentifier: getModelIdentifier(),
  };
}

export async function generateBudgetReduction(
  event: EventDetails,
  categories: Array<{ id: string; name: string; plannedAmount: number }>,
  signal?: AbortSignal
): Promise<{ result: BudgetReductionResult; isSampleMode: boolean; isLiveVerified: boolean }> {
  if (!isLiveAIConfigured()) {
    const result = generateSampleBudgetReduction(event, categories);
    return { result, isSampleMode: true, isLiveVerified: false };
  }

  const prompt = buildBudgetReductionPrompt(event, categories);
  const raw = await callGeminiRaw(
    SYSTEM_BUDGET_REDUCTION_INSTRUCTIONS,
    prompt,
    BUDGET_REDUCTION_RESPONSE_SCHEMA,
    DEFAULT_API_TIMEOUT_MS,
    signal
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.text);
  } catch {
    throw new Error('Gemini model returned malformed output (invalid JSON). Budget reduction could not be parsed.');
  }

  const validation = validateBudgetReductionOutput(parsed, categories, false);
  if (!validation.valid || !validation.result) {
    throw new Error(validation.error || 'Gemini budget reduction output failed schema validation.');
  }

  validation.result.isLiveVerified = true;
  verifiedOperations.budgetReduction = true;

  return { result: validation.result, isSampleMode: false, isLiveVerified: true };
}

export async function generateIdeas(
  event: EventDetails,
  signal?: AbortSignal
): Promise<{ result: PersonalizedIdeasResult; isSampleMode: boolean; isLiveVerified: boolean }> {
  if (!isLiveAIConfigured()) {
    const result = generateSampleIdeas(event);
    return { result, isSampleMode: true, isLiveVerified: false };
  }

  const prompt = buildIdeasPrompt(event);
  const raw = await callGeminiRaw(
    SYSTEM_IDEAS_INSTRUCTIONS,
    prompt,
    IDEAS_RESPONSE_SCHEMA,
    DEFAULT_API_TIMEOUT_MS,
    signal
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.text);
  } catch {
    throw new Error('Gemini model returned malformed output (invalid JSON). Ideas could not be parsed.');
  }

  const validation = validatePersonalizedIdeasOutput(parsed, false);
  if (!validation.valid || !validation.result) {
    throw new Error(validation.error || 'Gemini ideas output failed schema validation.');
  }

  validation.result.isLiveVerified = true;
  verifiedOperations.ideas = true;

  return { result: validation.result, isSampleMode: false, isLiveVerified: true };
}
