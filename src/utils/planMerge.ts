import {
  BudgetCategory,
  TimelineTask,
  AIProposalAllocation,
  AIProposalTask,
  AIProposal,
  EventPlan,
} from '../types';

export type ProposalApplicationMode = 'merge' | 'replace';

/**
 * Merges or replaces budget categories when applying an AI proposal.
 * In 'merge' mode (default):
 * - Preserves existing category IDs and recorded actual spending (actualAmount).
 * - Updates planned amounts for matching categories (case-insensitive name match).
 * - Preserves existing custom categories not present in the proposal.
 * - Adds new proposal categories without overwriting existing expenses.
 *
 * In 'replace' mode:
 * - Overwrites categories with the proposal recommendations, but preserves
 *   existing actualAmount if a category name matches an existing recorded expense.
 */
export function mergeProposalBudget(
  currentBudget: BudgetCategory[],
  proposalAllocations: AIProposalAllocation[],
  mode: ProposalApplicationMode = 'merge'
): BudgetCategory[] {
  const existingByName = new Map<string, BudgetCategory>();
  for (const cat of currentBudget) {
    existingByName.set(cat.name.trim().toLowerCase(), cat);
  }

  if (mode === 'replace') {
    return proposalAllocations.map((alloc, idx) => ({
      id: `cat-prop-${Date.now()}-${idx}`,
      name: alloc.category,
      plannedAmount: alloc.plannedAmount,
      actualAmount: 0,
      notes: alloc.notes,
      isContingency: alloc.isContingency,
    }));
  }

  // Merge Mode (Default)
  const matchedExistingIds = new Set<string>();

  const updatedFromProposal: BudgetCategory[] = proposalAllocations.map((alloc, idx) => {
    const existing = existingByName.get(alloc.category.trim().toLowerCase());
    if (existing) {
      matchedExistingIds.add(existing.id);
      return {
        ...existing,
        plannedAmount: alloc.plannedAmount,
        // Strictly preserve existing actual spending and ID
        actualAmount: existing.actualAmount,
        notes: alloc.notes || existing.notes,
        isContingency: alloc.isContingency,
      };
    }

    return {
      id: `cat-prop-${Date.now()}-${idx}`,
      name: alloc.category,
      plannedAmount: alloc.plannedAmount,
      actualAmount: 0,
      notes: alloc.notes,
      isContingency: alloc.isContingency,
    };
  });

  // Preserve any existing categories that were not mentioned in the proposal
  const unmappedExisting = currentBudget.filter(cat => !matchedExistingIds.has(cat.id));

  return [...updatedFromProposal, ...unmappedExisting];
}

/**
 * Merges or replaces timeline tasks when applying an AI proposal.
 * In 'merge' mode (default):
 * - Preserves ALL existing tasks, IDs, completion states, due dates, and owners.
 * - Adds new proposal tasks that do not already exist in the timeline (by normalized title).
 *
 * In 'replace' mode:
 * - Replaces timeline tasks with the proposal's recommended tasks.
 */
export function mergeProposalTasks(
  currentTasks: TimelineTask[],
  proposalTasks: AIProposalTask[],
  mode: ProposalApplicationMode = 'merge'
): TimelineTask[] {
  if (mode === 'replace') {
    return proposalTasks.map((task, idx) => ({
      id: `task-prop-${Date.now()}-${idx}`,
      title: task.title,
      category: task.category,
      dueDate: task.dueDate,
      owner: task.owner,
      completed: false,
      isCritical: task.isCritical,
    }));
  }

  // Merge Mode (Default)
  const existingTitles = new Set(
    currentTasks.map(t => t.title.trim().toLowerCase())
  );

  const newSuggestedTasks: TimelineTask[] = [];
  for (let idx = 0; idx < proposalTasks.length; idx++) {
    const pTask = proposalTasks[idx];
    const normalizedTitle = pTask.title.trim().toLowerCase();
    if (!existingTitles.has(normalizedTitle)) {
      existingTitles.add(normalizedTitle);
      newSuggestedTasks.push({
        id: `task-prop-${Date.now()}-${idx}`,
        title: pTask.title,
        category: pTask.category,
        dueDate: pTask.dueDate,
        owner: pTask.owner,
        completed: false,
        isCritical: pTask.isCritical,
      });
    }
  }

  return [...currentTasks, ...newSuggestedTasks];
}

/**
 * Pure function to apply an AI proposal to an existing plan according to the selected mode.
 */
export function applyProposalToPlan(
  plan: EventPlan,
  proposal: AIProposal,
  mode: ProposalApplicationMode = 'merge'
): EventPlan {
  const newBudget = mergeProposalBudget(plan.budget, proposal.budgetAllocations, mode);
  const newTasks = mergeProposalTasks(plan.tasks, proposal.tasks, mode);

  return {
    ...plan,
    budget: newBudget,
    tasks: newTasks,
    lastProposal: proposal,
    lastModified: new Date().toISOString(),
  };
}
