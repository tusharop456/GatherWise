import {
  EventDetails,
  EventType,
  AIProposal,
  AIProposalAllocation,
  AIProposalTask,
  VendorChecklistDef,
  BudgetReductionResult,
  ProposedBudgetCut,
  PersonalizedIdeasResult,
} from '../src/types';
import { isValidDateString, isPastDate, clampTaskDueDate, getTodayDateString } from '../src/utils/dates';
import { normalizeProposedAllocations, toMinorUnits, fromMinorUnits } from '../src/utils/budget';

const ALLOWED_EVENT_TYPES: EventType[] = ['wedding', 'birthday', 'community'];

export function validateEventPayload(body: unknown): { valid: boolean; error?: string; data?: EventDetails } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 80) {
    return { valid: false, error: 'Event name must be between 2 and 80 characters.' };
  }

  if (typeof b.type !== 'string' || !ALLOWED_EVENT_TYPES.includes(b.type as EventType)) {
    return { valid: false, error: 'Event type must be one of: wedding, birthday, community.' };
  }

  if (typeof b.date !== 'string' || !isValidDateString(b.date)) {
    return { valid: false, error: 'Event date must be a valid YYYY-MM-DD date.' };
  }

  if (isPastDate(b.date)) {
    return { valid: false, error: 'Event date cannot be in the past. Please update before planning.' };
  }

  if (typeof b.location !== 'string' || b.location.trim().length < 2 || b.location.trim().length > 100) {
    return { valid: false, error: 'Location must be between 2 and 100 characters.' };
  }

  const guests = Number(b.guestCount);
  if (!Number.isInteger(guests) || guests <= 0 || guests > 100000) {
    return { valid: false, error: 'Guest count must be an integer between 1 and 100,000.' };
  }

  const budget = Number(b.totalBudget);
  if (!Number.isFinite(budget) || budget <= 0 || budget > 1000000000) {
    return { valid: false, error: 'Total budget must be a positive number up to 1,000,000,000.' };
  }

  const currency = typeof b.currency === 'string' && b.currency.trim().length > 0 ? b.currency.trim().toUpperCase() : 'INR';

  const notes = typeof b.notes === 'string' ? b.notes.slice(0, 500) : '';

  const prefObj = (typeof b.preferences === 'object' && b.preferences !== null)
    ? (b.preferences as Record<string, unknown>)
    : {};

  const preferences = {
    theme: typeof prefObj.theme === 'string' ? prefObj.theme.slice(0, 150) : '',
    atmosphere: typeof prefObj.atmosphere === 'string' ? prefObj.atmosphere.slice(0, 150) : '',
    dietary: Array.isArray(prefObj.dietary) ? prefObj.dietary.map(d => String(d).slice(0, 50)) : [],
    accessibility: Array.isArray(prefObj.accessibility) ? prefObj.accessibility.map(a => String(a).slice(0, 50)) : [],
    cultural: typeof prefObj.cultural === 'string' ? prefObj.cultural.slice(0, 150) : '',
  };

  const data: EventDetails = {
    id: typeof b.id === 'string' && b.id ? b.id : `evt-${Date.now()}`,
    name: b.name.trim(),
    type: b.type as EventType,
    date: b.date.trim(),
    location: b.location.trim(),
    guestCount: guests,
    totalBudget: budget,
    currency,
    preferences,
    notes,
    createdAt: typeof b.createdAt === 'string' ? b.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { valid: true, data };
}

export function validateAIProposalOutput(
  rawJson: unknown,
  event: EventDetails,
  isSampleMode = false
): { valid: boolean; proposal?: AIProposal; error?: string } {
  if (!rawJson || typeof rawJson !== 'object') {
    return { valid: false, error: 'Model output is not a valid JSON object.' };
  }

  const o = rawJson as Record<string, unknown>;

  const summary = typeof o.summary === 'string' && o.summary.trim() ? o.summary.trim().slice(0, 500) : `${event.name} Planning Strategy`;

  const themeIdeas = Array.isArray(o.themeIdeas)
    ? o.themeIdeas.filter(t => typeof t === 'string' && t.trim()).map(t => String(t).slice(0, 150)).slice(0, 5)
    : [];

  const activityIdeas = Array.isArray(o.activityIdeas)
    ? o.activityIdeas.filter(a => typeof a === 'string' && a.trim()).map(a => String(a).slice(0, 200)).slice(0, 8)
    : [];

  // Parse raw allocations
  const rawAllocations: AIProposalAllocation[] = [];
  if (Array.isArray(o.budgetAllocations)) {
    for (const alloc of o.budgetAllocations) {
      if (alloc && typeof alloc === 'object') {
        const item = alloc as Record<string, unknown>;
        const category = typeof item.category === 'string' ? item.category.trim() : '';
        const amount = Number(item.plannedAmount);
        const notes = typeof item.notes === 'string' ? item.notes.trim() : 'Planning estimate';
        const isContingency = Boolean(item.isContingency);
        if (category && Number.isFinite(amount) && amount >= 0) {
          rawAllocations.push({
            category,
            plannedAmount: amount,
            notes,
            isContingency,
          });
        }
      }
    }
  }

  // Deterministically normalize allocations to match event total budget exactly
  const normResult = normalizeProposedAllocations(rawAllocations, event.totalBudget);

  // Validate tasks and clamp dates strictly between today and event date
  const today = getTodayDateString();
  const tasks: AIProposalTask[] = [];
  if (Array.isArray(o.tasks)) {
    for (const t of o.tasks) {
      if (t && typeof t === 'object') {
        const item = t as Record<string, unknown>;
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        const category = typeof item.category === 'string' ? item.category.trim() : 'General';
        const rawDueDate = typeof item.dueDate === 'string' ? item.dueDate.trim() : event.date;
        const owner = typeof item.owner === 'string' ? item.owner.trim() : undefined;
        const isCritical = Boolean(item.isCritical);

        if (title) {
          const clampedDate = clampTaskDueDate(
            isValidDateString(rawDueDate) ? rawDueDate : event.date,
            today,
            event.date
          );

          tasks.push({
            title: title.slice(0, 120),
            category: category.slice(0, 40),
            dueDate: clampedDate,
            owner: owner?.slice(0, 40),
            isCritical,
          });
        }
      }
    }
  }

  // Vendor checklists
  const vendorChecklists: VendorChecklistDef[] = [];
  if (Array.isArray(o.vendorChecklists)) {
    for (const vc of o.vendorChecklists) {
      if (vc && typeof vc === 'object') {
        const item = vc as Record<string, unknown>;
        const category = typeof item.category === 'string' ? item.category.trim() : '';
        const items = Array.isArray(item.items)
          ? item.items.filter(i => typeof i === 'string' && i.trim()).map(i => String(i).slice(0, 100))
          : [];
        if (category && items.length > 0) {
          vendorChecklists.push({ category, items });
        }
      }
    }
  }

  const assumptionsAndLimitations = Array.isArray(o.assumptionsAndLimitations)
    ? o.assumptionsAndLimitations.filter(a => typeof a === 'string' && a.trim()).map(a => String(a).slice(0, 200))
    : [
        'Budget figures are directional planning estimates, not guaranteed vendor quotes.',
        'Venue availability, peak season surcharges, and local municipal regulations must be independently verified.',
      ];

  const proposal: AIProposal = {
    summary,
    themeIdeas,
    activityIdeas,
    budgetAllocations: normResult.allocations,
    tasks,
    vendorChecklists,
    assumptionsAndLimitations,
    generatedAt: new Date().toISOString(),
    isSampleMode,
    normalizationNotice: normResult.adjusted ? normResult.explanation : undefined,
  };

  return { valid: true, proposal };
}

export function validateBudgetReductionOutput(
  rawJson: unknown,
  currentCategories: Array<{ id: string; name: string; plannedAmount: number }>,
  isSampleMode = false
): { valid: boolean; result?: BudgetReductionResult; error?: string } {
  if (!rawJson || typeof rawJson !== 'object') {
    return { valid: false, error: 'Model output is not a valid JSON object.' };
  }

  const o = rawJson as Record<string, unknown>;
  const summary = typeof o.summary === 'string' && o.summary.trim() ? o.summary.trim() : 'Budget Reduction Plan';

  const categoryMap = new Map(currentCategories.map(c => [c.id, c]));
  const categoryNameMap = new Map(currentCategories.map(c => [c.name.toLowerCase().trim(), c]));

  const proposedModifications: ProposedBudgetCut[] = [];
  let totalSavingsMinor = 0;

  if (Array.isArray(o.proposedModifications)) {
    for (const mod of o.proposedModifications) {
      if (mod && typeof mod === 'object') {
        const m = mod as Record<string, unknown>;
        const rawId = typeof m.categoryId === 'string' ? m.categoryId : '';
        const rawName = typeof m.categoryName === 'string' ? m.categoryName : '';

        // Match category by ID or name
        const matched = categoryMap.get(rawId) || categoryNameMap.get(rawName.toLowerCase().trim());
        if (matched) {
          const currentMinor = toMinorUnits(matched.plannedAmount);
          const rawProposed = Number(m.proposedAmount);
          const proposedMinor = Number.isFinite(rawProposed) ? Math.max(0, toMinorUnits(rawProposed)) : currentMinor;

          if (proposedMinor < currentMinor) {
            const savingsMinor = currentMinor - proposedMinor;
            totalSavingsMinor += savingsMinor;

            proposedModifications.push({
              categoryId: matched.id,
              categoryName: matched.name,
              currentAmount: matched.plannedAmount,
              proposedAmount: fromMinorUnits(proposedMinor),
              savingsAmount: fromMinorUnits(savingsMinor),
              rationale: typeof m.rationale === 'string' ? m.rationale.slice(0, 250) : 'Streamlined cost alternative.',
            });
          }
        }
      }
    }
  }

  const practicalTradeoffs = Array.isArray(o.practicalTradeoffs)
    ? o.practicalTradeoffs.filter(t => typeof t === 'string' && t.trim()).map(t => String(t).slice(0, 200))
    : ['Reduced allocation may require substituting premium materials or opting for off-peak booking slots.'];

  const currentPlannedTotalMinor = currentCategories.reduce((sum, c) => sum + toMinorUnits(c.plannedAmount), 0);
  const projectedPlannedTotalMinor = currentPlannedTotalMinor - totalSavingsMinor;

  const result: BudgetReductionResult = {
    summary,
    currentPlannedTotal: fromMinorUnits(currentPlannedTotalMinor),
    projectedPlannedTotal: fromMinorUnits(projectedPlannedTotalMinor),
    totalSavings: fromMinorUnits(totalSavingsMinor),
    proposedModifications,
    practicalTradeoffs,
    isSampleMode,
  };

  return { valid: true, result };
}

export function validatePersonalizedIdeasOutput(
  rawJson: unknown,
  isSampleMode = false
): { valid: boolean; result?: PersonalizedIdeasResult; error?: string } {
  if (!rawJson || typeof rawJson !== 'object') {
    return { valid: false, error: 'Model output is not a valid JSON object.' };
  }

  const o = rawJson as Record<string, unknown>;
  const summary = typeof o.summary === 'string' ? o.summary : 'Curated event experiences and themes';

  const themes: Array<{ name: string; description: string; decorNotes: string }> = [];
  if (Array.isArray(o.themes)) {
    for (const t of o.themes) {
      if (t && typeof t === 'object') {
        const item = t as Record<string, unknown>;
        const name = typeof item.name === 'string' ? item.name.slice(0, 80) : '';
        const description = typeof item.description === 'string' ? item.description.slice(0, 300) : '';
        const decorNotes = typeof item.decorNotes === 'string' ? item.decorNotes.slice(0, 300) : '';
        if (name) {
          themes.push({ name, description, decorNotes });
        }
      }
    }
  }

  const activities: Array<{ title: string; audience: string; description: string }> = [];
  if (Array.isArray(o.activities)) {
    for (const a of o.activities) {
      if (a && typeof a === 'object') {
        const item = a as Record<string, unknown>;
        const title = typeof item.title === 'string' ? item.title.slice(0, 80) : '';
        const audience = typeof item.audience === 'string' ? item.audience.slice(0, 50) : 'All Guests';
        const description = typeof item.description === 'string' ? item.description.slice(0, 300) : '';
        if (title) {
          activities.push({ title, audience, description });
        }
      }
    }
  }

  const dietaryConsiderations = Array.isArray(o.dietaryConsiderations)
    ? o.dietaryConsiderations.filter(d => typeof d === 'string' && d.trim()).map(d => String(d).slice(0, 150))
    : [];

  const accessibilityHighlights = Array.isArray(o.accessibilityHighlights)
    ? o.accessibilityHighlights.filter(a => typeof a === 'string' && a.trim()).map(a => String(a).slice(0, 150))
    : [];

  return {
    valid: true,
    result: {
      summary,
      themes,
      activities,
      dietaryConsiderations,
      accessibilityHighlights,
      isSampleMode,
    },
  };
}
