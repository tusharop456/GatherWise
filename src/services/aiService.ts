import {
  EventDetails,
  BudgetCategory,
  AIProposal,
  BudgetReductionResult,
  PersonalizedIdeasResult,
} from '../types';

export interface HealthStatus {
  status: string;
  liveAIConfigured: boolean;
  mode: 'live_verified' | 'configured_unverified' | 'sample';
  statusLabel: string;
  model: string;
  notice: string;
  verifiedOperations: {
    proposal: boolean;
    budgetReduction: boolean;
    ideas: boolean;
  };
}

export async function checkServerHealth(): Promise<HealthStatus> {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return {
      status: 'offline',
      liveAIConfigured: false,
      mode: 'sample',
      statusLabel: 'Sample Mode Active',
      model: 'GatherWise Sample Engine (Server Offline)',
      notice: 'API server is currently unreachable. Launch server with "npm run server" to enable live AI.',
      verifiedOperations: {
        proposal: false,
        budgetReduction: false,
        ideas: false,
      },
    };
  }
}

export async function requestAIProposal(
  event: EventDetails,
  signal?: AbortSignal
): Promise<{ proposal: AIProposal; isSampleMode: boolean; isLiveVerified?: boolean; modelIdentifier?: string }> {
  const res = await fetch('/api/ai/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    signal,
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const message = errJson.details || errJson.error || `Server responded with status ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  return {
    proposal: data.proposal,
    isSampleMode: Boolean(data.isSampleMode),
    isLiveVerified: Boolean(data.isLiveVerified),
    modelIdentifier: data.modelIdentifier,
  };
}

export async function requestAIBudgetReduction(
  event: EventDetails,
  categories: BudgetCategory[],
  signal?: AbortSignal
): Promise<{ result: BudgetReductionResult; isSampleMode: boolean; isLiveVerified?: boolean }> {
  const res = await fetch('/api/ai/budget-reduction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, categories }),
    signal,
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const message = errJson.details || errJson.error || `Server responded with status ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  return {
    result: data.result,
    isSampleMode: Boolean(data.isSampleMode),
    isLiveVerified: Boolean(data.isLiveVerified),
  };
}

export async function requestAIIdeas(
  event: EventDetails,
  signal?: AbortSignal
): Promise<{ result: PersonalizedIdeasResult; isSampleMode: boolean; isLiveVerified?: boolean }> {
  const res = await fetch('/api/ai/ideas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
    signal,
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const message = errJson.details || errJson.error || `Server responded with status ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  return {
    result: data.result,
    isSampleMode: Boolean(data.isSampleMode),
    isLiveVerified: Boolean(data.isLiveVerified),
  };
}
