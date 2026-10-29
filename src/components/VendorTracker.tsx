import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Info,
  X,
  ArrowRight,
  Users,
} from 'lucide-react';
import { VendorRecord, VendorStatus } from '../types';
import { formatCurrency } from '../utils/budget';
import { ConfirmDialog } from './ConfirmDialog';

interface VendorTrackerProps {
  vendors: VendorRecord[];
  currency: string;
  onUpdateVendors: (vendors: VendorRecord[]) => void;
  onApplyQuoteToBudget: (categoryName: string, quoteAmount: number) => void;
}

const CATEGORY_CHECKLISTS: Record<string, Array<{ key: string; label: string }>> = {
  Venue: [
    { key: 'capacity-verified', label: 'Capacity certified for expected guest count' },
    { key: 'step-free-access', label: 'Step-free access & accessible restrooms verified' },
    { key: 'curfew-cleared', label: 'Sound curfew & late-night hours confirmed' },
    { key: 'backup-generator', label: 'Dedicated power backup / generator included' },
    { key: 'catering-policy', label: 'Outside catering allowed without penalty' },
  ],
  Catering: [
    { key: 'dietary-accommodated', label: 'Vegetarian, Jain & allergy protocols isolated' },
    { key: 'tasting-completed', label: 'Menu tasting session scheduled/completed' },
    { key: 'linens-included', label: 'Tableware, cutlery & cloth linens included in quote' },
    { key: 'staffing-ratio', label: 'Serving staff ratio confirmed (min 1:15)' },
  ],
  Decor: [
    { key: 'setup-window-adequate', label: 'At least 5 hours setup/teardown window provided' },
    { key: 'fire-safety-compliant', label: 'Complies with venue flame & candle regulations' },
    { key: 'reusable-materials', label: 'Uses sustainable, non-thermocol floral elements' },
  ],
  Entertainment: [
    { key: 'equipment-provided', label: 'Brings own microphones, amplifiers & mixing console' },
    { key: 'power-requirements', label: 'Verified electrical phase & wattage needs with venue' },
    { key: 'repertoire-aligned', label: 'Playlist / performance sequence pre-approved' },
  ],
  Photography: [
    { key: 'shot-list-reviewed', label: 'Must-have family shot list and ceremony timeline reviewed' },
    { key: 'turnaround-contracted', label: 'Teaser within 7 days, full gallery turnaround agreed' },
    { key: 'raw-rights-included', label: 'High-resolution digital rights & print permissions' },
  ],
  Equipment: [
    { key: 'weatherproofing-rated', label: 'Canopies / structures rated for wind & rain' },
    { key: 'logistics-cleared', label: 'Delivery, rigging & teardown crew covered in quote' },
  ],
};

const DEFAULT_CHECKLIST = [
  { key: 'written-contract', label: 'Written quotation & cancellation terms provided' },
  { key: 'insurance-liability', label: 'Public liability & insurance coverage verified' },
  { key: 'payment-milestones', label: 'Advance deposit & milestone schedule agreed' },
];

export const VendorTracker: React.FC<VendorTrackerProps> = ({
  vendors,
  currency,
  onUpdateVendors,
  onApplyQuoteToBudget,
}) => {
  // New vendor form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Venue');
  const [quote, setQuote] = useState('');
  const [status, setStatus] = useState<VendorStatus>('researching');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Detail drawer state for a selected vendor
  const [activeVendorDetail, setActiveVendorDetail] = useState<VendorRecord | null>(null);

  // Quote apply confirmation modal
  const [selectedVendorForBudget, setSelectedVendorForBudget] = useState<VendorRecord | null>(null);

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Vendor name is required.');
      return;
    }

    const newVendor: VendorRecord = {
      id: `v-${Date.now()}`,
      name: name.trim(),
      category: category.trim(),
      quote: Math.max(0, Number(quote) || 0),
      status,
      notes: notes.trim(),
      checklistResponses: {},
    };

    onUpdateVendors([...vendors, newVendor]);
    setName('');
    setQuote('');
    setStatus('researching');
    setNotes('');
    setFormError(null);
  };

  const handleDeleteVendor = (id: string) => {
    onUpdateVendors(vendors.filter(v => v.id !== id));
    if (activeVendorDetail?.id === id) {
      setActiveVendorDetail(null);
    }
  };

  const handleStatusChange = (id: string, newStatus: VendorStatus) => {
    const updated = vendors.map(v => (v.id === id ? { ...v, status: newStatus } : v));
    onUpdateVendors(updated);
    if (activeVendorDetail?.id === id) {
      setActiveVendorDetail(prev => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const handleToggleChecklist = (vendorId: string, itemKey: string) => {
    const updated = vendors.map(v => {
      if (v.id !== vendorId) return v;
      const current = Boolean(v.checklistResponses[itemKey]);
      return {
        ...v,
        checklistResponses: {
          ...v.checklistResponses,
          [itemKey]: !current,
        },
      };
    });
    onUpdateVendors(updated);
    if (activeVendorDetail?.id === vendorId) {
      const current = Boolean(activeVendorDetail.checklistResponses[itemKey]);
      setActiveVendorDetail({
        ...activeVendorDetail,
        checklistResponses: {
          ...activeVendorDetail.checklistResponses,
          [itemKey]: !current,
        },
      });
    }
  };

  // Known sample vendors to clearly label as fictional
  const isSampleVendor = (v: VendorRecord) => {
    return (
      v.id.startsWith('v-royal') ||
      v.id.startsWith('v-space') ||
      v.id.startsWith('v-eco') ||
      v.name.includes('Fort Palace') ||
      v.name.includes('Royal Khansama') ||
      v.name.includes('Planetarium') ||
      v.name.includes('Green Canopy')
    );
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
            <Users size={19} color="var(--forest-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Vendor Tracker & Comparison Checklists
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Record quotes, vet contracts, track negotiation statuses, and evaluate operational criteria.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge badge-success">
            {vendors.filter(v => v.status === 'confirmed').length} Confirmed
          </span>
          <span className="badge badge-neutral">
            {vendors.filter(v => v.status === 'shortlisted').length} Shortlisted
          </span>
        </div>
      </div>

      {/* Short Calm Warning Notice */}
      <div
        role="note"
        style={{
          backgroundColor: 'var(--bg-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={16} color="var(--forest-primary)" aria-hidden="true" style={{ flexShrink: 0 }} />
        <span>Quotes affect your budget only when you apply them.</span>
      </div>

      {/* Main Vendor Rows Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '28%' }}>Vendor Name</th>
                <th style={{ width: '16%' }}>Category</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Quote ({currency})</th>
                <th style={{ width: '16%' }}>Status</th>
                <th style={{ width: '12%' }}>Checklist</th>
                <th style={{ width: '10%', textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
                    No vendor records added yet. Record a quote below.
                  </td>
                </tr>
              ) : (
                vendors.map(vendor => {
                  const checklistItems = CATEGORY_CHECKLISTS[vendor.category] || DEFAULT_CHECKLIST;
                  const checkedCount = checklistItems.filter(item => vendor.checklistResponses[item.key]).length;

                  return (
                    <tr key={vendor.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{vendor.name}</span>
                          {isSampleVendor(vendor) && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.6875rem', padding: '0.05rem 0.35rem' }}>
                              Sample vendor
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {vendor.category}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                        {formatCurrency(vendor.quote, currency)}
                      </td>
                      <td>
                        <select
                          className="select-field"
                          style={{
                            padding: '0.2rem 0.45rem',
                            fontSize: '0.8125rem',
                            minHeight: '30px',
                            width: 'auto',
                            borderColor: vendor.status === 'confirmed' ? 'var(--green-border)' : 'var(--border-subtle)',
                            backgroundColor: vendor.status === 'confirmed' ? 'var(--green-subtle)' : 'var(--bg-surface)',
                            fontWeight: vendor.status === 'confirmed' ? 600 : 400,
                          }}
                          value={vendor.status}
                          onChange={e => handleStatusChange(vendor.id, e.target.value as VendorStatus)}
                          aria-label={`Status for ${vendor.name}`}
                        >
                          <option value="researching">Researching</option>
                          <option value="contacted">Contacted</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="declined">Declined</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '4px',
                              backgroundColor: 'var(--bg-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                            aria-hidden="true"
                          >
                            <div
                              style={{
                                width: `${checklistItems.length > 0 ? (checkedCount / checklistItems.length) * 100 : 0}%`,
                                height: '100%',
                                backgroundColor: 'var(--forest-primary)',
                                transition: 'width 0.2s ease',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {checkedCount}/{checklistItems.length}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '0.75rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setActiveVendorDetail(vendor)}
                            style={{ fontSize: '0.8125rem', padding: '0.2rem 0.55rem', minHeight: '30px' }}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleDeleteVendor(vendor.id)}
                            aria-label={`Delete vendor ${vendor.name}`}
                            title="Delete vendor"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record New Vendor Form */}
      <div className="card">
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          Record Vendor Quote
        </h2>

        {formError && (
          <div role="alert" className="field-error" style={{ marginBottom: '0.75rem' }}>
            {formError}
          </div>
        )}

        <form onSubmit={handleAddVendor} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="vendor-name-input">Vendor Name *</label>
            <input
              id="vendor-name-input"
              type="text"
              className="input-field"
              placeholder="e.g. Royal Palace Banquets"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="vendor-cat-select">Category</label>
            <select
              id="vendor-cat-select"
              className="select-field"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="Venue">Venue</option>
              <option value="Catering">Catering</option>
              <option value="Decor">Decor</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Photography">Photography</option>
              <option value="Equipment">Equipment</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="vendor-quote-input">Quote ({currency}) *</label>
            <input
              id="vendor-quote-input"
              type="number"
              min="0"
              step="1"
              className="input-field tabular-nums"
              placeholder="0"
              value={quote}
              onChange={e => setQuote(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="vendor-status-select">Status</label>
            <select
              id="vendor-status-select"
              className="select-field"
              value={status}
              onChange={e => setStatus(e.target.value as VendorStatus)}
            >
              <option value="researching">Researching</option>
              <option value="contacted">Contacted</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="submit" className="btn-primary" style={{ minHeight: '40px' }}>
              <Plus size={16} aria-hidden="true" />
              <span>Record Vendor</span>
            </button>
          </div>
        </form>
      </div>

      {/* Vendor Detail Drawer */}
      {activeVendorDetail && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendor-drawer-title"
          onClick={e => {
            if (e.target === e.currentTarget) setActiveVendorDetail(null);
          }}
        >
          <div className="drawer-dialog" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                    {activeVendorDetail.category}
                  </span>
                  {isSampleVendor(activeVendorDetail) && (
                    <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                      Sample vendor
                    </span>
                  )}
                </div>
                <h2 id="vendor-drawer-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {activeVendorDetail.name}
                </h2>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setActiveVendorDetail(null)}
                aria-label="Close details"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Financial & Status Summary */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Quoted Price:</span>
                  <strong className="tabular-nums" style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                    {formatCurrency(activeVendorDetail.quote, currency)}
                  </strong>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setSelectedVendorForBudget(activeVendorDetail)}
                  style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}
                >
                  <ArrowRight size={14} aria-hidden="true" />
                  <span>Apply Quote to Budget</span>
                </button>
              </div>

              {/* Vetting Checklist */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Category Vetting Criteria ({activeVendorDetail.category})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(CATEGORY_CHECKLISTS[activeVendorDetail.category] || DEFAULT_CHECKLIST).map(item => {
                    const isChecked = Boolean(activeVendorDetail.checklistResponses[item.key]);

                    return (
                      <label
                        key={item.key}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.65rem',
                          padding: '0.5rem 0.65rem',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isChecked ? 'var(--forest-subtle)' : 'var(--bg-subtle)',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          lineHeight: 1.4,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleChecklist(activeVendorDetail.id, item.key)}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--forest-primary)', marginTop: '2px' }}
                        />
                        <span style={{ color: isChecked ? 'var(--forest-text)' : 'var(--text-secondary)', fontWeight: isChecked ? 500 : 400 }}>
                          {item.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Full Notes Area */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Negotiation & Contract Notes
                </h3>
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    color: activeVendorDetail.notes ? 'var(--text-secondary)' : 'var(--text-muted)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {activeVendorDetail.notes || 'No specific notes recorded for this vendor.'}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveVendorDetail(null)}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Application Safeguard Confirmation Dialog */}
      {selectedVendorForBudget && (
        <ConfirmDialog
          isOpen={true}
          title="Apply Vendor Quote to Budget"
          message={`Are you sure you want to apply ${selectedVendorForBudget.name}'s quotation of ${formatCurrency(selectedVendorForBudget.quote, currency)} to your "${selectedVendorForBudget.category}" budget planned amount? This updates your planned allocations.`}
          confirmLabel="Apply Quote to Budget"
          cancelLabel="Cancel"
          onConfirm={() => {
            onApplyQuoteToBudget(selectedVendorForBudget.category, selectedVendorForBudget.quote);
            setSelectedVendorForBudget(null);
          }}
          onCancel={() => setSelectedVendorForBudget(null)}
        />
      )}
    </div>
  );
};
