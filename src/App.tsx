import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
import { EventOverview } from './components/EventOverview';
import { BudgetPlanner } from './components/BudgetPlanner';
import { TimelineManager } from './components/TimelineManager';
import { VendorTracker } from './components/VendorTracker';
import { IdeasBoard } from './components/IdeasBoard';
import { EventSetupModal } from './components/EventSetupModal';
import { ProposalReviewModal } from './components/ProposalReviewModal';
import { BudgetReductionModal } from './components/BudgetReductionModal';
import { PrivacyNoticeModal } from './components/PrivacyNoticeModal';
import { Toast, ToastMessage } from './components/Toast';
import { EventPlan, EventType, EventDetails, BudgetCategory, AIProposal, ProposedBudgetCut, BudgetReductionResult } from './types';
import { SAMPLE_EVENTS, SAMPLE_WEDDING } from './data/sampleEvents';
import { savePlanToStorage, loadPlanFromStorage, clearPlanFromStorage } from './utils/storage';
import { checkServerHealth, requestAIProposal, requestAIBudgetReduction, requestAIIdeas, HealthStatus } from './services/aiService';
import { calculatePlannedTotal, isOverBudgetPlanned, applyBudgetReductions, formatCurrency } from './utils/budget';
import { getTaskTimeStatus, getTodayDateString } from './utils/dates';
import { applyProposalToPlan, ProposalApplicationMode } from './utils/planMerge';

function computeEventRevision(details: EventDetails): string {
  return `${details.id}:${details.name}:${details.date}:${details.totalBudget}:${details.guestCount}:${details.updatedAt}`;
}

function computeBudgetRevision(budget: BudgetCategory[]): string {
  return budget.map(b => `${b.id}:${b.plannedAmount}`).join('|');
}

interface ActiveRequestContext {
  requestId: string;
  type: 'proposal' | 'reduction' | 'ideas';
  eventId: string;
  eventRevision: string;
  budgetRevision?: string;
}

export const App: React.FC = () => {
  // Plan state initialized from LocalStorage or default sample
  const [plan, setPlan] = useState<EventPlan>(() => {
    const loaded = loadPlanFromStorage();
    if (loaded.plan) return loaded.plan;
    return SAMPLE_WEDDING;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [serverHealth, setServerHealth] = useState<HealthStatus | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals & workflows
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<AIProposal | null>(null);

  const [budgetReductionModalOpen, setBudgetReductionModalOpen] = useState(false);
  const [pendingBudgetReduction, setPendingBudgetReduction] = useState<BudgetReductionResult | null>(null);

  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [queuedAIAction, setQueuedAIAction] = useState<(() => void) | null>(null);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // In-flight request tracking and AbortController to prevent stale responses and race conditions
  const activeAbortController = useRef<AbortController | null>(null);
  const activeRequestRef = useRef<ActiveRequestContext | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Reset scroll position on activeTab switch
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    try {
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo(0, 0);
      }
    } catch {
      // jsdom environment fallback
    }
  }, [activeTab]);

  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Active AI cancellation helper
  const cancelActiveAI = useCallback((_reason?: string) => {
    if (activeAbortController.current) {
      activeAbortController.current.abort();
      activeAbortController.current = null;
    }
    activeRequestRef.current = null;
    setIsGeneratingAI(false);
  }, []);

  // Check server health on mount & visibly report any corrupted stored plan
  useEffect(() => {
    checkServerHealth().then(status => {
      setServerHealth(status);
    });

    const loaded = loadPlanFromStorage();
    if (loaded.isCorrupted && loaded.error) {
      addToast(
        `Stored plan was invalid or corrupted (${loaded.error}). Loaded default sample wedding safely.`,
        'error'
      );
    }
  }, [addToast]);

  // Clean up in-flight requests on unmount
  useEffect(() => {
    return () => {
      if (activeAbortController.current) {
        activeAbortController.current.abort();
      }
    };
  }, []);

  // Save plan to localStorage on updates
  useEffect(() => {
    savePlanToStorage(plan);
  }, [plan]);

  // Gate AI actions behind transparency notice if not yet acknowledged
  const executeWithAIGate = useCallback((action: () => void) => {
    if (!plan.aiNoticeAcknowledged) {
      setQueuedAIAction(() => action);
      setPrivacyModalOpen(true);
    } else {
      action();
    }
  }, [plan.aiNoticeAcknowledged]);

  const handleAcceptPrivacyNotice = () => {
    setPlan(prev => ({ ...prev, aiNoticeAcknowledged: true }));
    setPrivacyModalOpen(false);
    if (queuedAIAction) {
      queuedAIAction();
      setQueuedAIAction(null);
    }
  };

  // 1. Initial / Regenerate AI Proposal
  const handleRequestProposal = () => {
    executeWithAIGate(async () => {
      if (isGeneratingAI) return;
      setIsGeneratingAI(true);
      addToast('GatherWise AI is synthesizing your event proposal...', 'info');

      const requestId = `req-prop-${Date.now()}`;
      const eventId = plan.details.id;
      const eventRevision = computeEventRevision(plan.details);

      activeAbortController.current?.abort();
      const controller = new AbortController();
      activeAbortController.current = controller;
      activeRequestRef.current = {
        requestId,
        type: 'proposal',
        eventId,
        eventRevision,
      };

      try {
        const { proposal, isSampleMode, isLiveVerified } = await requestAIProposal(
          plan.details,
          controller.signal
        );

        // Discard stale response if event changed, sample switched, or another request started
        if (
          !activeRequestRef.current ||
          activeRequestRef.current.requestId !== requestId ||
          activeRequestRef.current.eventId !== plan.details.id ||
          activeRequestRef.current.eventRevision !== computeEventRevision(plan.details)
        ) {
          return;
        }

        const proposalWithMetadata: AIProposal = {
          ...proposal,
          targetEventId: eventId,
          targetRevision: eventRevision,
        };

        setPendingProposal(proposalWithMetadata);
        setProposalModalOpen(true);

        if (isSampleMode) {
          addToast('Generated curated sample proposal (Sample Engine active).', 'info');
        } else if (isLiveVerified) {
          addToast('Successfully generated and verified live AI proposal with Gemini.', 'success');
          checkServerHealth().then(setServerHealth);
        } else {
          addToast('Generated AI proposal (live verification pending).', 'info');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError' && !controller.signal.aborted) {
          addToast(`Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
      } finally {
        if (activeRequestRef.current?.requestId === requestId) {
          setIsGeneratingAI(false);
          activeAbortController.current = null;
          activeRequestRef.current = null;
        }
      }
    });
  };

  // Apply proposal to plan with explicit merge/replace mode
  const handleApplyProposal = (proposal: AIProposal, mode: ProposalApplicationMode = 'merge') => {
    // Prevent an old proposal from being applied to a different event
    if (proposal.targetEventId && proposal.targetEventId !== plan.details.id) {
      addToast('Cannot apply proposal: It was generated for a different event.', 'error');
      setProposalModalOpen(false);
      setPendingProposal(null);
      return;
    }

    setPlan(prev => applyProposalToPlan(prev, proposal, mode));

    setProposalModalOpen(false);
    setPendingProposal(null);
    addToast(
      mode === 'merge'
        ? 'AI Proposal merged into your workspace!'
        : 'AI Proposal applied to your workspace (replaced)!',
      'success'
    );
  };

  // 2. Budget Reduction Advice
  const handleRequestBudgetReduction = () => {
    executeWithAIGate(async () => {
      if (isGeneratingAI || plan.budget.length === 0) return;
      setIsGeneratingAI(true);
      addToast('Analyzing line items for smart cost reductions...', 'info');

      const requestId = `req-red-${Date.now()}`;
      const eventId = plan.details.id;
      const eventRevision = computeEventRevision(plan.details);
      const budgetRevision = computeBudgetRevision(plan.budget);
      const budgetSnapshot = plan.budget.map(b => ({
        id: b.id,
        name: b.name,
        plannedAmount: b.plannedAmount,
      }));

      activeAbortController.current?.abort();
      const controller = new AbortController();
      activeAbortController.current = controller;
      activeRequestRef.current = {
        requestId,
        type: 'reduction',
        eventId,
        eventRevision,
        budgetRevision,
      };

      try {
        const { result, isSampleMode, isLiveVerified } = await requestAIBudgetReduction(
          plan.details,
          plan.budget,
          controller.signal
        );

        // Discard stale response if event or budget changed in the meantime
        if (
          !activeRequestRef.current ||
          activeRequestRef.current.requestId !== requestId ||
          activeRequestRef.current.eventId !== plan.details.id ||
          activeRequestRef.current.budgetRevision !== computeBudgetRevision(plan.budget)
        ) {
          return;
        }

        const resultWithMetadata: BudgetReductionResult = {
          ...result,
          targetEventId: eventId,
          targetRevision: eventRevision,
          budgetSnapshot,
        };

        setPendingBudgetReduction(resultWithMetadata);
        setBudgetReductionModalOpen(true);

        if (isSampleMode) {
          addToast('Loaded cost-optimization recommendations.', 'info');
        } else if (isLiveVerified) {
          addToast('Gemini analyzed your spending and generated reduction advice (Live Verified).', 'success');
          checkServerHealth().then(setServerHealth);
        } else {
          addToast('Generated reduction advice (live verification pending).', 'info');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError' && !controller.signal.aborted) {
          addToast(`Optimization failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
      } finally {
        if (activeRequestRef.current?.requestId === requestId) {
          setIsGeneratingAI(false);
          activeAbortController.current = null;
          activeRequestRef.current = null;
        }
      }
    });
  };

  // Apply selected budget reductions with input modification detection
  const handleApplyBudgetReductions = (selectedCuts: ProposedBudgetCut[]) => {
    if (!pendingBudgetReduction) return;

    // Validate event ID
    if (pendingBudgetReduction.targetEventId && pendingBudgetReduction.targetEventId !== plan.details.id) {
      addToast('Cannot apply reduction advice: Event has changed.', 'error');
      setBudgetReductionModalOpen(false);
      setPendingBudgetReduction(null);
      return;
    }

    // Detect changed budget inputs before applying old reduction advice
    if (pendingBudgetReduction.budgetSnapshot) {
      const currentCategoryMap = new Map(plan.budget.map(c => [c.id, c.plannedAmount]));
      const isBudgetModified =
        plan.budget.length !== pendingBudgetReduction.budgetSnapshot.length ||
        pendingBudgetReduction.budgetSnapshot.some(
          (snap: any) => currentCategoryMap.get(snap.id) !== snap.plannedAmount
        );

      if (isBudgetModified) {
        addToast(
          'Budget line items were modified since this advice was generated. Please regenerate reduction advice.',
          'error'
        );
        return;
      }
    }

    const { updatedBudget, appliedSavings, appliedCount } = applyBudgetReductions(
      plan.budget,
      selectedCuts
    );

    setPlan(prev => ({
      ...prev,
      budget: updatedBudget,
      lastModified: new Date().toISOString(),
    }));

    setBudgetReductionModalOpen(false);
    setPendingBudgetReduction(null);
    addToast(
      `Applied budget reductions across ${appliedCount} categories (saved ${formatCurrency(appliedSavings, plan.details.currency)})!`,
      'success'
    );
  };

  // 3. Personalized Theme & Activity Ideas
  const handleRequestIdeas = () => {
    executeWithAIGate(async () => {
      if (isGeneratingAI) return;
      setIsGeneratingAI(true);
      addToast('Brainstorming personalized themes and activities...', 'info');

      const requestId = `req-ideas-${Date.now()}`;
      const eventId = plan.details.id;
      const eventRevision = computeEventRevision(plan.details);

      activeAbortController.current?.abort();
      const controller = new AbortController();
      activeAbortController.current = controller;
      activeRequestRef.current = {
        requestId,
        type: 'ideas',
        eventId,
        eventRevision,
      };

      try {
        const { result, isSampleMode, isLiveVerified } = await requestAIIdeas(
          plan.details,
          controller.signal
        );

        if (
          !activeRequestRef.current ||
          activeRequestRef.current.requestId !== requestId ||
          activeRequestRef.current.eventId !== plan.details.id ||
          activeRequestRef.current.eventRevision !== computeEventRevision(plan.details)
        ) {
          return;
        }

        setPlan(prev => ({
          ...prev,
          ideas: result,
          lastModified: new Date().toISOString(),
        }));

        setActiveTab('ideas');

        if (isSampleMode) {
          addToast('Curated experience ideas loaded.', 'info');
        } else if (isLiveVerified) {
          addToast('Generated bespoke creative concepts with Gemini (Live Verified).', 'success');
          checkServerHealth().then(setServerHealth);
        } else {
          addToast('Generated creative concepts (live verification pending).', 'info');
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError' && !controller.signal.aborted) {
          addToast(`Ideas generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
      } finally {
        if (activeRequestRef.current?.requestId === requestId) {
          setIsGeneratingAI(false);
          activeAbortController.current = null;
          activeRequestRef.current = null;
        }
      }
    });
  };

  // Sync Vendor Quote to Budget Category
  const handleApplyQuoteToBudget = (categoryName: string, quoteAmount: number) => {
    let matched = false;
    const updated = plan.budget.map(cat => {
      if (cat.name.toLowerCase().trim() === categoryName.toLowerCase().trim()) {
        matched = true;
        return {
          ...cat,
          plannedAmount: quoteAmount,
          notes: `${cat.notes ? cat.notes + ' | ' : ''}Updated from vendor quote`,
        };
      }
      return cat;
    });

    if (!matched) {
      updated.push({
        id: `cat-${Date.now()}`,
        name: categoryName,
        plannedAmount: quoteAmount,
        actualAmount: 0,
        notes: 'Created from vendor quote',
      });
    }

    setPlan(prev => ({ ...prev, budget: updated }));
    addToast(`Updated "${categoryName}" budget planned amount to ${quoteAmount}`, 'success');
  };

  // Switch to one of the rich sample events
  const handleLoadSample = (sampleType: EventType) => {
    cancelActiveAI('Switched sample event');
    setProposalModalOpen(false);
    setPendingProposal(null);
    setBudgetReductionModalOpen(false);
    setPendingBudgetReduction(null);

    const sample = SAMPLE_EVENTS[sampleType];
    if (sample) {
      setPlan(sample);
      addToast(`Loaded sample ${sampleType} plan: "${sample.details.name}"`, 'success');
    }
  };

  // Clear all data and reset to fresh clean slate
  const handleClearPlan = () => {
    cancelActiveAI('Cleared plan');
    setProposalModalOpen(false);
    setPendingProposal(null);
    setBudgetReductionModalOpen(false);
    setPendingBudgetReduction(null);
    clearPlanFromStorage();
    const cleanDetails: EventDetails = {
      id: `evt-${Date.now()}`,
      name: 'New Celebration',
      type: 'wedding',
      date: '2027-01-01',
      location: 'Mumbai',
      guestCount: 100,
      totalBudget: 500000,
      currency: 'INR',
      preferences: {
        theme: '',
        atmosphere: 'Warm and memorable',
        dietary: ['Vegetarian'],
        accessibility: ['Step-free'],
        cultural: '',
      },
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPlan({
      version: 1,
      details: cleanDetails,
      budget: [],
      tasks: [],
      vendors: [],
      ideas: null,
      aiNoticeAcknowledged: false,
      lastModified: new Date().toISOString(),
    });

    setSetupModalOpen(true);
    addToast('Plan cleared. Enter your new event details to begin.', 'info');
  };

  // Derived indicator states
  const today = getTodayDateString();
  const overdueCount = plan.tasks.filter(
    t => !t.completed && getTaskTimeStatus(t.dueDate, false, today) === 'overdue'
  ).length;

  const plannedTotal = calculatePlannedTotal(plan.budget);
  const isOverBudget = isOverBudgetPlanned(plan.details.totalBudget, plannedTotal);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-canvas)' }}>
      {/* Top Application Header */}
      <Header
        plan={plan}
        isLiveAI={Boolean(serverHealth?.liveAIConfigured)}
        serverHealth={serverHealth}
        onEditEvent={() => setSetupModalOpen(true)}
        onLoadSample={handleLoadSample}
        onClearPlan={handleClearPlan}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      {/* Main Workspace Layout (Sidebar + Content Pane) */}
      <div style={{ display: 'flex', flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {/* Navigation Sidebar (~220px desktop width) */}
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          overdueCount={overdueCount}
          isOverBudget={isOverBudget}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Pane (Generous 32–48px desktop padding, available width) */}
        <main
          ref={mainRef}
          style={{
            flex: 1,
            padding: 'var(--space-5) clamp(1.5rem, 3.5vw, 3rem)',
            maxWidth: '100%',
            overflowX: 'hidden',
          }}
        >
          {activeTab === 'overview' && (
            <EventOverview
              plan={plan}
              onNavigate={setActiveTab}
              onRequestProposal={handleRequestProposal}
              onRequestBudgetReduction={handleRequestBudgetReduction}
              isGeneratingAI={isGeneratingAI}
            />
          )}

          {activeTab === 'budget' && (
            <BudgetPlanner
              categories={plan.budget}
              totalBudget={plan.details.totalBudget}
              currency={plan.details.currency}
              onUpdateCategories={updated => setPlan(prev => ({ ...prev, budget: updated }))}
              onRequestBudgetReduction={handleRequestBudgetReduction}
              isGeneratingAI={isGeneratingAI}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineManager
              tasks={plan.tasks}
              eventDate={plan.details.date}
              eventType={plan.details.type}
              onUpdateTasks={updated => setPlan(prev => ({ ...prev, tasks: updated }))}
            />
          )}

          {activeTab === 'vendors' && (
            <VendorTracker
              vendors={plan.vendors}
              currency={plan.details.currency}
              onUpdateVendors={updated => setPlan(prev => ({ ...prev, vendors: updated }))}
              onApplyQuoteToBudget={handleApplyQuoteToBudget}
            />
          )}

          {activeTab === 'ideas' && (
            <IdeasBoard
              ideas={plan.ideas}
              eventDetails={plan.details}
              onRequestIdeas={handleRequestIdeas}
              isGeneratingAI={isGeneratingAI}
            />
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <EventSetupModal
        isOpen={setupModalOpen}
        initialDetails={plan.details}
        onSave={updatedDetails => {
          if (
            updatedDetails.id !== plan.details.id ||
            updatedDetails.name !== plan.details.name ||
            updatedDetails.date !== plan.details.date ||
            updatedDetails.totalBudget !== plan.details.totalBudget
          ) {
            cancelActiveAI('Event details modified');
            setProposalModalOpen(false);
            setPendingProposal(null);
            setBudgetReductionModalOpen(false);
            setPendingBudgetReduction(null);
          }
          setPlan(prev => ({ ...prev, details: updatedDetails, lastModified: new Date().toISOString() }));
        }}
        onLoadSample={handleLoadSample}
        onClose={() => setSetupModalOpen(false)}
      />

      <ProposalReviewModal
        isOpen={proposalModalOpen}
        proposal={pendingProposal}
        currentPlan={plan}
        onApplyProposal={handleApplyProposal}
        onClose={() => {
          setProposalModalOpen(false);
          setPendingProposal(null);
        }}
      />

      <BudgetReductionModal
        isOpen={budgetReductionModalOpen}
        reductionResult={pendingBudgetReduction}
        currency={plan.details.currency}
        onApplyReductions={handleApplyBudgetReductions}
        onClose={() => {
          setBudgetReductionModalOpen(false);
          setPendingBudgetReduction(null);
        }}
      />

      <PrivacyNoticeModal
        isOpen={privacyModalOpen}
        onAccept={handleAcceptPrivacyNotice}
        onCancel={() => {
          setPrivacyModalOpen(false);
          setQueuedAIAction(null);
        }}
      />

      {/* Announcements Toast */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
