import { EventPlan } from '../types';

/**
 * Exports the event plan as a clean, formatted JSON file.
 * Guaranteed not to contain secrets, keys, or internal prompt configurations.
 */
export function exportPlanAsJson(plan: EventPlan): void {
  // Deep copy and strip any sensitive or non-exportable fields
  const exportData = {
    gatherwiseExportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    event: {
      name: plan.details.name,
      type: plan.details.type,
      date: plan.details.date,
      location: plan.details.location,
      guestCount: plan.details.guestCount,
      totalBudget: plan.details.totalBudget,
      currency: plan.details.currency,
      preferences: plan.details.preferences,
      notes: plan.details.notes,
    },
    budget: plan.budget.map(b => ({
      category: b.name,
      plannedAmount: b.plannedAmount,
      actualAmount: b.actualAmount,
      notes: b.notes,
      isContingency: Boolean(b.isContingency),
    })),
    timelineTasks: plan.tasks.map(t => ({
      title: t.title,
      category: t.category,
      dueDate: t.dueDate,
      owner: t.owner || '',
      completed: t.completed,
      isCritical: Boolean(t.isCritical),
    })),
    vendors: plan.vendors.map(v => ({
      name: v.name,
      category: v.category,
      quote: v.quote,
      status: v.status,
      notes: v.notes,
      checklistResponses: v.checklistResponses,
    })),
    personalizedIdeas: plan.ideas
      ? {
          summary: plan.ideas.summary,
          themes: plan.ideas.themes,
          activities: plan.ideas.activities,
          dietaryConsiderations: plan.ideas.dietaryConsiderations,
          accessibilityHighlights: plan.ideas.accessibilityHighlights,
        }
      : null,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const safeEventName = plan.details.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const link = document.createElement('a');
  link.href = url;
  link.download = `GatherWise-${safeEventName || 'plan'}-${plan.details.date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function triggerPrintLayout(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
