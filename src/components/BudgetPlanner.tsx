import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  TrendingDown,
  AlertTriangle,
  Edit2,
  X,
  Check,
  Wallet,
} from 'lucide-react';
import { BudgetCategory } from '../types';
import {
  calculatePlannedTotal,
  calculateActualTotal,
  calculateUnallocated,
  calculateRemainingSpending,
  isOverBudgetPlanned,
  isOverBudgetActual,
  formatCurrency,
} from '../utils/budget';
import { validateBudgetRow } from '../utils/validation';

interface BudgetPlannerProps {
  categories: BudgetCategory[];
  totalBudget: number;
  currency: string;
  onUpdateCategories: (categories: BudgetCategory[]) => void;
  onRequestBudgetReduction: () => void;
  isGeneratingAI: boolean;
}

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  categories,
  totalBudget,
  currency,
  onUpdateCategories,
  onRequestBudgetReduction,
  isGeneratingAI,
}) => {
  // Drawer / Dialog state for editing or creating a category
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);

  // Form state inside drawer
  const [formName, setFormName] = useState('');
  const [formPlanned, setFormPlanned] = useState('');
  const [formActual, setFormActual] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsContingency, setFormIsContingency] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const plannedTotal = calculatePlannedTotal(categories);
  const actualTotal = calculateActualTotal(categories);
  const unallocated = calculateUnallocated(totalBudget, plannedTotal);
  const remainingActual = calculateRemainingSpending(totalBudget, actualTotal);

  const isOverPlanned = isOverBudgetPlanned(totalBudget, plannedTotal);
  const isOverActual = isOverBudgetActual(totalBudget, actualTotal);

  // Open drawer for adding a new category
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName('');
    setFormPlanned('');
    setFormActual('0');
    setFormNotes('');
    setFormIsContingency(false);
    setFormError(null);
    setDrawerOpen(true);
  };

  // Open drawer for editing an existing category
  const handleOpenEdit = (cat: BudgetCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormPlanned(String(cat.plannedAmount));
    setFormActual(String(cat.actualAmount));
    setFormNotes(cat.notes || '');
    setFormIsContingency(Boolean(cat.isContingency));
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingCategory(null);
    setFormError(null);
  };

  // Focus trap / auto-focus input on open
  useEffect(() => {
    if (drawerOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCloseDrawer();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [drawerOpen]);

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const plannedNum = Number(formPlanned) || 0;
    const actualNum = Number(formActual) || 0;

    const val = validateBudgetRow(formName, plannedNum, actualNum);
    if (!val.isValid) {
      setFormError(val.error || 'Please fill in a valid category name and positive amounts.');
      return;
    }

    if (editingCategory) {
      // Update existing
      const updated = categories.map(c =>
        c.id === editingCategory.id
          ? {
              ...c,
              name: formName.trim(),
              plannedAmount: plannedNum,
              actualAmount: actualNum,
              notes: formNotes.trim() || 'Custom item',
              isContingency: formIsContingency,
            }
          : c
      );
      onUpdateCategories(updated);
    } else {
      // Add new
      const newCat: BudgetCategory = {
        id: `cat-${Date.now()}`,
        name: formName.trim(),
        plannedAmount: plannedNum,
        actualAmount: actualNum,
        notes: formNotes.trim() || 'Custom item',
        isContingency: formIsContingency,
      };
      onUpdateCategories([...categories, newCat]);
    }

    handleCloseDrawer();
  };

  const handleDeleteRow = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    onUpdateCategories(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 'var(--space-3)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-sage)',
              border: '1px solid var(--forest-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <Wallet size={19} color="var(--forest-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Budget Planner & Allocations
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Manage category line-items, track planned versus actual expenditure, and optimize costs.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenAdd}
            style={{ fontSize: '0.875rem' }}
          >
            <Plus size={16} aria-hidden="true" />
            <span>Add Category</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={onRequestBudgetReduction}
            disabled={isGeneratingAI || categories.length === 0}
            title="Analyze budget and suggest cost reductions"
            style={{ fontSize: '0.875rem' }}
          >
            <TrendingDown size={15} color="var(--forest-primary)" aria-hidden="true" />
            <span>{isGeneratingAI ? 'Analyzing...' : 'AI Budget Advice'}</span>
          </button>
        </div>
      </div>

      {/* Meaningful Over-Budget Warning Banner */}
      {(isOverPlanned || isOverActual) && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--red-subtle)',
            border: '1px solid var(--red-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
          }}
        >
          <AlertTriangle size={20} color="var(--red-danger)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ fontSize: '0.9375rem', color: 'var(--red-text)' }}>
              WARNING: OVER BUDGET LIMIT
            </strong>
            <p style={{ fontSize: '0.875rem', color: 'var(--red-text)', marginTop: '0.15rem', lineHeight: 1.4 }}>
              {isOverPlanned && (
                <span>Planned allocations exceed budget limit by <strong>{formatCurrency(Math.abs(unallocated), currency)}</strong>. </span>
              )}
              {isOverActual && (
                <span>Actual spending has exceeded the budget limit by <strong>{formatCurrency(Math.abs(remainingActual), currency)}</strong>. </span>
              )}
              Adjust line items below or click AI Budget Advice to rebalance spending.
            </p>
          </div>
        </div>
      )}

      {/* Financial Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Budget Limit
          </span>
          <div className="tabular-nums" style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0.2rem 0' }}>
            {formatCurrency(totalBudget, currency)}
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Planned
          </span>
          <div className="tabular-nums" style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0.2rem 0', color: 'var(--forest-primary)' }}>
            {formatCurrency(plannedTotal, currency)}
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--space-3) var(--space-4)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Actual
          </span>
          <div className="tabular-nums" style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0.2rem 0' }}>
            {formatCurrency(actualTotal, currency)}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: isOverPlanned ? 'var(--red-subtle)' : 'var(--bg-surface)',
            borderColor: isOverPlanned ? 'var(--red-border)' : 'var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isOverPlanned ? 'var(--red-danger)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
            {isOverPlanned ? 'Over Budget' : 'Unallocated'}
          </span>
          <div
            className="tabular-nums"
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              margin: '0.2rem 0',
              color: isOverPlanned ? 'var(--red-danger)' : 'var(--forest-text)',
            }}
          >
            {isOverPlanned
              ? `-${formatCurrency(Math.abs(unallocated), currency)}`
              : formatCurrency(unallocated, currency)}
          </div>
        </div>
      </div>

      {/* Main Budget Table (Desktop) / Labeled Rows (Mobile) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Desktop Table View */}
        <div style={{ overflowX: 'auto' }} className="hide-mobile">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Category</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Planned ({currency})</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Actual ({currency})</th>
                <th style={{ width: '24%' }}>Notes & Allocation Details</th>
                <th style={{ width: '12%', textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                    No budget categories defined yet. Click "Add Category" or generate a plan.
                  </td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</span>
                        {cat.isContingency && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                            Reserve
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                      {formatCurrency(cat.plannedAmount, currency)}
                    </td>
                    <td style={{ textAlign: 'right' }} className="tabular-nums">
                      {formatCurrency(cat.actualAmount, currency)}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {cat.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '0.75rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleOpenEdit(cat)}
                          title={`Edit category ${cat.name}`}
                          aria-label={`Edit category ${cat.name}`}
                        >
                          <Edit2 size={15} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleDeleteRow(cat.id)}
                          title={`Delete category ${cat.name}`}
                          aria-label={`Delete category ${cat.name}`}
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {categories.length > 0 && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
                  <td style={{ fontWeight: 700 }}>Total Calculated</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--forest-primary)' }} className="tabular-nums">
                    {formatCurrency(plannedTotal, currency)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">
                    {formatCurrency(actualTotal, currency)}
                  </td>
                  <td colSpan={2} style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {categories.length} active categories
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Responsive Labeled-Row Layout (Mobile) */}
        <div className="show-mobile" style={{ display: 'none', flexDirection: 'column' }}>
          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--text-muted)' }}>
              No categories defined yet.
            </div>
          ) : (
            categories.map(cat => (
              <div
                key={cat.id}
                style={{
                  padding: 'var(--space-3)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleOpenEdit(cat)}
                      aria-label={`Edit category ${cat.name}`}
                    >
                      <Edit2 size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => handleDeleteRow(cat.id)}
                      aria-label={`Delete category ${cat.name}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Planned:</span>
                  <strong className="tabular-nums">{formatCurrency(cat.plannedAmount, currency)}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Actual:</span>
                  <span className="tabular-nums">{formatCurrency(cat.actualAmount, currency)}</span>
                </div>

                {cat.notes && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    {cat.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Accessible Category Edit / Add Drawer Dialog */}
      {drawerOpen && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="category-drawer-title"
          onClick={e => {
            if (e.target === e.currentTarget) handleCloseDrawer();
          }}
        >
          <div className="drawer-dialog" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 id="category-drawer-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                {editingCategory ? `Edit: ${editingCategory.name}` : 'Add Budget Category'}
              </h2>
              <button
                type="button"
                className="btn-icon"
                onClick={handleCloseDrawer}
                aria-label="Close dialog"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {formError && (
                  <div role="alert" className="field-error" style={{ fontSize: '0.875rem' }}>
                    <AlertTriangle size={15} aria-hidden="true" /> {formError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="cat-edit-name">Category Name *</label>
                  <input
                    ref={nameInputRef}
                    id="cat-edit-name"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Venue & Lighting"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    aria-label={`Category name for ${formName || 'new category'}`}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label htmlFor="cat-edit-planned">Planned ({currency}) *</label>
                    <input
                      id="cat-edit-planned"
                      type="number"
                      min="0"
                      step="1"
                      className="input-field tabular-nums"
                      value={formPlanned}
                      onChange={e => setFormPlanned(e.target.value)}
                      aria-label={`Planned amount for ${formName || 'category'}`}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="cat-edit-actual">Actual ({currency})</label>
                    <input
                      id="cat-edit-actual"
                      type="number"
                      min="0"
                      step="1"
                      className="input-field tabular-nums"
                      value={formActual}
                      onChange={e => setFormActual(e.target.value)}
                      aria-label={`Actual amount for ${formName || 'category'}`}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="cat-edit-notes">Notes & Breakdown</label>
                  <textarea
                    id="cat-edit-notes"
                    className="textarea-field"
                    rows={3}
                    placeholder="Specific items, vendor quotes, or payment terms..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    aria-label={`Notes for ${formName || 'category'}`}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    id="cat-edit-contingency"
                    type="checkbox"
                    checked={formIsContingency}
                    onChange={e => setFormIsContingency(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--forest-primary)' }}
                  />
                  <label htmlFor="cat-edit-contingency" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    Contingency / buffer reserve (flagged as non-discretionary safety margin)
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseDrawer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  <Check size={16} aria-hidden="true" />
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
