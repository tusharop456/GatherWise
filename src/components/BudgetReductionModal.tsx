import React, { useState } from 'react';
import {
  X,
  Check,
  ArrowRight,
} from 'lucide-react';
import { BudgetReductionResult, ProposedBudgetCut } from '../types';
import { formatCurrency, toMinorUnits, fromMinorUnits } from '../utils/budget';

interface BudgetReductionModalProps {
  isOpen: boolean;
  reductionResult: BudgetReductionResult | null;
  currency: string;
  onApplyReductions: (selectedModifications: ProposedBudgetCut[]) => void;
  onClose: () => void;
}

export const BudgetReductionModal: React.FC<BudgetReductionModalProps> = ({
  isOpen,
  reductionResult,
  currency,
  onApplyReductions,
  onClose,
}) => {
  // Deduplicate proposed modifications by categoryId deterministically
  const uniqueModifications = React.useMemo(() => {
    if (!reductionResult?.proposedModifications) return [];
    const seen = new Set<string>();
    const unique: ProposedBudgetCut[] = [];
    for (const m of reductionResult.proposedModifications) {
      if (!seen.has(m.categoryId)) {
        seen.add(m.categoryId);
        unique.push(m);
      }
    }
    return unique;
  }, [reductionResult]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (uniqueModifications.length > 0) {
      setSelectedIds(new Set(uniqueModifications.map(m => m.categoryId)));
    }
  }, [uniqueModifications]);

  if (!isOpen || !reductionResult) return null;

  const toggleSelect = (categoryId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const selectedModifications = uniqueModifications.filter(m =>
    selectedIds.has(m.categoryId)
  );

  const selectedSavingsMinor = selectedModifications.reduce(
    (sum, m) => sum + toMinorUnits(m.savingsAmount),
    0
  );
  const selectedSavings = fromMinorUnits(selectedSavingsMinor);

  const currentPlannedTotal = reductionResult.currentPlannedTotal;
  const newProjectedPlanned = currentPlannedTotal - selectedSavings;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-reduction-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" style={{ maxWidth: '720px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-forest">AI Cost Optimization</span>
              {reductionResult.isSampleMode ? (
                <span className="badge badge-neutral">Sample Engine</span>
              ) : reductionResult.isLiveVerified ? (
                <span className="badge badge-success">Verified Live Request</span>
              ) : (
                <span className="badge badge-warning">Live verification pending</span>
              )}
            </div>
            <h2 id="budget-reduction-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              Actionable Spending Reduction Plan
            </h2>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close budget reduction advisor"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Strategy Summary */}
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {reductionResult.summary}
          </p>

          {/* Financial Impact Comparison Card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-3)',
              backgroundColor: 'var(--bg-subtle)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Current Planned Total</span>
              <div className="tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatCurrency(currentPlannedTotal, currency)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Projected Total</span>
              <div className="tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--forest-primary)' }}>
                {formatCurrency(newProjectedPlanned, currency)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--green-text)', fontWeight: 600, display: 'block' }}>
                Calculated Savings
              </span>
              <div className="tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--green-text)' }}>
                -{formatCurrency(selectedSavings, currency)}
              </div>
            </div>
          </div>

          {/* Proposed Modifications List */}
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
              Select Reductions to Apply ({selectedModifications.length} of {uniqueModifications.length} selected):
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {uniqueModifications.map(mod => {
                const isSelected = selectedIds.has(mod.categoryId);
                return (
                  <div
                    key={mod.categoryId}
                    onClick={() => toggleSelect(mod.categoryId)}
                    style={{
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--forest-primary)' : 'var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--bg-surface)' : 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      transition: 'border-color 0.12s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent div
                      aria-label={`Select reduction for ${mod.categoryName}`}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--forest-primary)', marginTop: '3px' }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                          {mod.categoryName}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }} className="tabular-nums">
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>
                            {formatCurrency(mod.currentAmount, currency)}
                          </span>
                          <ArrowRight size={13} color="var(--text-muted)" aria-hidden="true" />
                          <span style={{ fontWeight: 700, color: 'var(--forest-primary)' }}>
                            {formatCurrency(mod.proposedAmount, currency)}
                          </span>
                          <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>
                            Save {formatCurrency(mod.savingsAmount, currency)}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {mod.rationale}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tradeoffs Card */}
          {reductionResult.practicalTradeoffs.length > 0 && (
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                Practical Tradeoffs & Operational Notes:
              </strong>
              <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.4 }}>
                {reductionResult.practicalTradeoffs.map((tradeoff, idx) => (
                  <li key={idx} style={{ marginBottom: '0.15rem' }}>{tradeoff}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={selectedModifications.length === 0}
            onClick={() => onApplyReductions(selectedModifications)}
          >
            <Check size={16} aria-hidden="true" />
            <span>Apply Selected Reductions (Save {formatCurrency(selectedSavings, currency)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
