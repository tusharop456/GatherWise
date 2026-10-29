export type EventType = 'wedding' | 'birthday' | 'community';

export interface EventPreferences {
  theme: string;
  atmosphere: string;
  dietary: string[];
  accessibility: string[];
  cultural: string;
}

export interface EventDetails {
  id: string;
  name: string;
  type: EventType;
  date: string; // YYYY-MM-DD strictly
  location: string;
  guestCount: number;
  totalBudget: number; // e.g. 500000 (INR)
  currency: string;    // 'INR' | 'USD' | 'EUR' | 'GBP'
  preferences: EventPreferences;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  plannedAmount: number;
  actualAmount: number;
  notes: string;
  isContingency?: boolean;
}

export type TaskStatus = 'pending' | 'completed' | 'overdue';

export interface TimelineTask {
  id: string;
  title: string;
  category: string;
  dueDate: string; // YYYY-MM-DD
  owner?: string;
  completed: boolean;
  notes?: string;
  isCritical?: boolean;
}

export type VendorStatus = 'researching' | 'contacted' | 'shortlisted' | 'confirmed';

export interface VendorRecord {
  id: string;
  name: string;
  category: string;
  quote: number;
  status: VendorStatus;
  notes: string;
  checklistResponses: Record<string, boolean>;
}

export interface VendorChecklistDef {
  category: string;
  items: string[];
}

export interface AIProposalAllocation {
  category: string;
  plannedAmount: number;
  notes: string;
  isContingency?: boolean;
}

export interface AIProposalTask {
  title: string;
  category: string;
  dueDate: string;
  owner?: string;
  isCritical?: boolean;
}

export interface AIProposal {
  summary: string;
  themeIdeas: string[];
  activityIdeas: string[];
  budgetAllocations: AIProposalAllocation[];
  tasks: AIProposalTask[];
  vendorChecklists: VendorChecklistDef[];
  assumptionsAndLimitations: string[];
  generatedAt: string;
  isSampleMode: boolean;
  isLiveVerified?: boolean;
  modelIdentifier?: string;
  normalizationNotice?: string;
  targetEventId?: string;
  targetRevision?: string;
}

export interface ProposedBudgetCut {
  categoryId: string;
  categoryName: string;
  currentAmount: number;
  proposedAmount: number;
  savingsAmount: number;
  rationale: string;
}

export interface BudgetReductionResult {
  summary: string;
  currentPlannedTotal: number;
  projectedPlannedTotal: number;
  totalSavings: number;
  proposedModifications: ProposedBudgetCut[];
  practicalTradeoffs: string[];
  isSampleMode: boolean;
  isLiveVerified?: boolean;
  targetEventId?: string;
  targetRevision?: string;
  budgetSnapshot?: Array<{ id: string; name: string; plannedAmount: number }>;
}

export interface PersonalizedIdeasResult {
  summary: string;
  themes: Array<{
    name: string;
    description: string;
    decorNotes: string;
  }>;
  activities: Array<{
    title: string;
    audience: string;
    description: string;
  }>;
  dietaryConsiderations: string[];
  accessibilityHighlights: string[];
  isSampleMode: boolean;
  isLiveVerified?: boolean;
}

export interface EventPlan {
  version: 1;
  details: EventDetails;
  budget: BudgetCategory[];
  tasks: TimelineTask[];
  vendors: VendorRecord[];
  ideas: PersonalizedIdeasResult | null;
  lastProposal?: AIProposal | null;
  aiNoticeAcknowledged: boolean;
  lastModified: string;
}
