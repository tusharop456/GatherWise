import React, { useState } from 'react';
import {
  X,
  Wallet,
  CheckSquare,
  AlertCircle,
  Check,
} from 'lucide-react';
import { AIProposal, EventPlan } from '../types';
import { formatCurrency } from '../utils/budget';
import { formatDisplayDate } from '../utils/dates';
import { ConfirmDialog } from './ConfirmDialog';

interface ProposalReviewModalProps {
  isOpen: boolean;
  proposal: AIProposal | null;
  currentPlan: EventPlan;
  onApplyProposal: (proposal: AIProposal) => void;
  onClose: () => void;
}

export const ProposalReviewModal: React.FC<ProposalReviewModalProps> = ({
  isOpen,
  proposal,
  currentPlan,
  onApplyProposal,
  onClose,
}) => {
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  if (!isOpen || !proposal) return null;

  const currency = currentPlan.details.currency;
  const existingBudgetCount = currentPlan.budget.length;
  const existingTasksCount = currentPlan.tasks.length;
  const hasExistingData = existingBudgetCount > 0 || existingTasksCount > 0;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-review-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" style={{ maxWidth: '780px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="badge badge-forest">Proposal Review</span>
              {proposal.isSampleMode ? (
                <span className="badge badge-neutral">Sample Engine</span>
              ) : proposal.isLiveVerified ? (
                <span className="badge badge-success">Verified Live Request ({proposal.modelIdentifier || 'Gemini'})</span>
              ) : (
                <span className="badge badge-warning">Live verification pending</span>
              )}
            </div>
            <h2 id="proposal-review-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
              AI Event Strategy & Master Plan
            </h2>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close proposal review"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Existing Data Replacement Notice if applicable */}
          {hasExistingData && (
            <div
              role="note"
              style={{
                backgroundColor: 'var(--amber-subtle)',
                border: '1px solid var(--amber-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
              }}
            >
              <AlertCircle size={18} color="var(--amber-warning)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--amber-text)', lineHeight: 1.4 }}>
                <strong>Notice before applying:</strong> Your workspace currently has {existingBudgetCount} budget categories and {existingTasksCount} tasks. Applying this proposal will update the budget categories and merge preparation tasks. Existing vendor records will be preserved.
              </div>
            </div>
          )}

          {/* Strategic Summary */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
              Executive Summary
            </span>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.5, backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)' }}>
              {proposal.summary}
            </p>
          </div>

          {/* Normalization Explanation if adjusted */}
          {proposal.normalizationNotice && (
            <div style={{ backgroundColor: 'var(--forest-subtle)', border: '1px solid var(--forest-border)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--forest-text)' }}>
              <strong>Deterministic Normalization:</strong> {proposal.normalizationNotice}
            </div>
          )}

          {/* Proposed Budget Allocations */}
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Wallet size={16} color="var(--forest-primary)" aria-hidden="true" />
              <span>Proposed Budget Allocations ({proposal.budgetAllocations.length} categories)</span>
            </h3>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <table className="data-table" style={{ fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Planned ({currency})</th>
                    <th>Planning Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.budgetAllocations.map((alloc, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>
                        {alloc.category}
                        {alloc.isContingency && (
                          <span className="badge badge-neutral" style={{ marginLeft: '0.4rem', fontSize: '0.6875rem' }}>
                            Reserve
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                        {formatCurrency(alloc.plannedAmount, currency)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                        {alloc.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Proposed Tasks */}
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <CheckSquare size={16} color="var(--forest-primary)" aria-hidden="true" />
              <span>Recommended Milestones ({proposal.tasks.length} items)</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto' }}>
              {proposal.tasks.map((task, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.45rem 0.75rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600 }}>{task.title}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.78rem' }}>
                      ({task.category})
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {task.isCritical && (
                      <span className="badge badge-warning" style={{ fontSize: '0.6875rem' }}>
                        Critical
                      </span>
                    )}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Due: {formatDisplayDate(task.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assumptions & Practical Limitations */}
          <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
              Planning Assumptions & Limitations:
            </strong>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: 1.4 }}>
              {proposal.assumptionsAndLimitations.map((item, idx) => (
                <li key={idx} style={{ marginBottom: '0.15rem' }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close & Review Later
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              if (hasExistingData) {
                setShowApplyConfirm(true);
              } else {
                onApplyProposal(proposal);
              }
            }}
          >
            <Check size={16} aria-hidden="true" />
            <span>Apply Proposal to Workspace</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog before overwriting */}
      <ConfirmDialog
        isOpen={showApplyConfirm}
        title="Apply Proposal to Active Plan?"
        message={`This proposal will update ${proposal.budgetAllocations.length} budget categories and add ${proposal.tasks.length} timeline milestones. Your vendor records will be preserved.`}
        confirmLabel="Yes, Apply Proposal"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowApplyConfirm(false);
          onApplyProposal(proposal);
        }}
        onCancel={() => setShowApplyConfirm(false)}
      />
    </div>
  );
};
