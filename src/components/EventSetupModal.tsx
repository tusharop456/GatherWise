import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  AlertCircle,
  Check,
} from 'lucide-react';
import { EventDetails, EventType } from '../types';
import { validateEventDetails, ValidationErrorMap } from '../utils/validation';
import { getTodayDateString } from '../utils/dates';

interface EventSetupModalProps {
  isOpen: boolean;
  initialDetails: EventDetails;
  onSave: (details: EventDetails) => void;
  onLoadSample: (type: EventType) => void;
  onClose: () => void;
}

const COMMON_DIETARY = [
  'Vegetarian',
  'Jain Options',
  'Nut-Free',
  'Gluten-Free',
  'Vegan',
  'Halal',
];

const COMMON_ACCESSIBILITY = [
  'Step-Free Ramps',
  'Wheelchair Restrooms',
  'Sensory Quiet Zone',
  'Sign Language Support',
  'Elder Buggy / Shuttle',
];

export const EventSetupModal: React.FC<EventSetupModalProps> = ({
  isOpen,
  initialDetails,
  onSave,
  onLoadSample,
  onClose,
}) => {
  const today = getTodayDateString();

  const [name, setName] = useState(initialDetails.name);
  const [type, setType] = useState<EventType>(initialDetails.type);
  const [date, setDate] = useState(initialDetails.date);
  const [location, setLocation] = useState(initialDetails.location);
  const [guestCount, setGuestCount] = useState<number | string>(initialDetails.guestCount);
  const [totalBudget, setTotalBudget] = useState<number | string>(initialDetails.totalBudget);
  const [currency, setCurrency] = useState(initialDetails.currency || 'INR');
  const [theme, setTheme] = useState(initialDetails.preferences.theme);
  const [atmosphere, setAtmosphere] = useState(initialDetails.preferences.atmosphere);
  const [dietary, setDietary] = useState<string[]>(initialDetails.preferences.dietary);
  const [accessibility, setAccessibility] = useState<string[]>(initialDetails.preferences.accessibility);
  const [cultural, setCultural] = useState(initialDetails.preferences.cultural);
  const [notes, setNotes] = useState(initialDetails.notes);

  const [errors, setErrors] = useState<ValidationErrorMap>({});

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap, focus restoration, and Escape dismissal
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        // Focus trap
        if (e.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  // Synchronize state when initialDetails change
  useEffect(() => {
    if (isOpen) {
      setName(initialDetails.name);
      setType(initialDetails.type);
      setDate(initialDetails.date);
      setLocation(initialDetails.location);
      setGuestCount(initialDetails.guestCount);
      setTotalBudget(initialDetails.totalBudget);
      setCurrency(initialDetails.currency || 'INR');
      setTheme(initialDetails.preferences.theme);
      setAtmosphere(initialDetails.preferences.atmosphere);
      setDietary(initialDetails.preferences.dietary);
      setAccessibility(initialDetails.preferences.accessibility);
      setCultural(initialDetails.preferences.cultural);
      setNotes(initialDetails.notes);
      setErrors({});
    }
  }, [isOpen, initialDetails]);

  if (!isOpen) return null;

  const toggleDietary = (item: string) => {
    setDietary(prev => (prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]));
  };

  const toggleAccessibility = (item: string) => {
    setAccessibility(prev => (prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const candidate: Partial<EventDetails> = {
      name,
      type,
      date,
      location,
      guestCount: Number(guestCount),
      totalBudget: Number(totalBudget),
      currency,
      preferences: {
        theme,
        atmosphere,
        dietary,
        accessibility,
        cultural,
      },
      notes,
    };

    const val = validateEventDetails(candidate, today);
    if (!val.isValid) {
      setErrors(val.errors);
      return;
    }

    const updated: EventDetails = {
      ...initialDetails,
      name: name.trim(),
      type,
      date,
      location: location.trim(),
      guestCount: Number(guestCount),
      totalBudget: Number(totalBudget),
      currency,
      preferences: {
        theme: theme.trim(),
        atmosphere: atmosphere.trim(),
        dietary,
        accessibility,
        cultural: cultural.trim(),
      },
      notes: notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-setup-title"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="modal-dialog"
        style={{
          maxWidth: '720px',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header - Visible title & close control */}
        <div className="modal-header">
          <div>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--forest-text)',
                display: 'block',
                marginBottom: '0.15rem',
              }}
            >
              Step 1: Event Specification
            </span>
            <h2 id="event-setup-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Event Details & Parameters
            </h2>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close event setup dialog"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Single Internally Scrolling Content Region */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
        >
          <div
            className="modal-body"
            style={{
              padding: 'var(--space-4)',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            {/* Quick Sample Event Loaders (Clean bar) */}
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Load template:
              </span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.8125rem', padding: '0.25rem 0.6rem', minHeight: '30px' }}
                  onClick={() => {
                    onLoadSample('wedding');
                    onClose();
                  }}
                >
                  Wedding
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.8125rem', padding: '0.25rem 0.6rem', minHeight: '30px' }}
                  onClick={() => {
                    onLoadSample('birthday');
                    onClose();
                  }}
                >
                  Birthday
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '0.8125rem', padding: '0.25rem 0.6rem', minHeight: '30px' }}
                  onClick={() => {
                    onLoadSample('community');
                    onClose();
                  }}
                >
                  Community
                </button>
              </div>
            </div>

            {/* Section 1: Event Basics */}
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                1. Event Basics
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* Full-width Event Name */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="evt-name">
                    Event Name <span style={{ color: 'var(--red-danger)' }}>*</span>
                  </label>
                  <input
                    id="evt-name"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Aanya & Kabir's Royal Eco-Heritage Wedding"
                    value={name}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'err-name' : undefined}
                    onChange={e => {
                      setName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                    }}
                    required
                  />
                  {errors.name && (
                    <span id="err-name" className="field-error">
                      <AlertCircle size={14} aria-hidden="true" /> {errors.name}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                  {/* Event Type */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="evt-type">
                      Event Type <span style={{ color: 'var(--red-danger)' }}>*</span>
                    </label>
                    <select
                      id="evt-type"
                      className="select-field"
                      value={type}
                      aria-invalid={Boolean(errors.type)}
                      aria-describedby={errors.type ? 'err-type' : undefined}
                      onChange={e => {
                        setType(e.target.value as EventType);
                        if (errors.type) setErrors(prev => ({ ...prev, type: undefined }));
                      }}
                    >
                      <option value="wedding">Wedding (Multi-day ceremonies & hospitality)</option>
                      <option value="birthday">Birthday Party (Milestone & entertainment)</option>
                      <option value="community">Community Event (Civic permits & gathering)</option>
                    </select>
                  </div>

                  {/* Event Date - No technical jargon */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="evt-date">
                      Event Date <span style={{ color: 'var(--red-danger)' }}>*</span>
                    </label>
                    <input
                      id="evt-date"
                      type="date"
                      className="input-field"
                      value={date}
                      min={today}
                      aria-invalid={Boolean(errors.date)}
                      aria-describedby={errors.date ? 'err-date' : undefined}
                      onChange={e => {
                        setDate(e.target.value);
                        if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
                      }}
                      required
                    />
                    {errors.date && (
                      <span id="err-date" className="field-error">
                        <AlertCircle size={14} aria-hidden="true" /> {errors.date}
                      </span>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="evt-location">
                    City / General Location <span style={{ color: 'var(--red-danger)' }}>*</span>
                  </label>
                  <input
                    id="evt-location"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Udaipur, Rajasthan or Central Park Pavilion"
                    value={location}
                    aria-invalid={Boolean(errors.location)}
                    aria-describedby={errors.location ? 'err-location' : undefined}
                    onChange={e => {
                      setLocation(e.target.value);
                      if (errors.location) setErrors(prev => ({ ...prev, location: undefined }));
                    }}
                    required
                  />
                  {errors.location && (
                    <span id="err-location" className="field-error">
                      <AlertCircle size={14} aria-hidden="true" /> {errors.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Budget & Scale */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                2. Budget & Attendance
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
                {/* Guest Count */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="evt-guests">
                    Expected Guests <span style={{ color: 'var(--red-danger)' }}>*</span>
                  </label>
                  <input
                    id="evt-guests"
                    type="number"
                    min="1"
                    max="100000"
                    className="input-field tabular-nums"
                    value={guestCount}
                    aria-invalid={Boolean(errors.guestCount)}
                    aria-describedby={errors.guestCount ? 'err-guests' : undefined}
                    onChange={e => {
                      setGuestCount(e.target.value);
                      if (errors.guestCount) setErrors(prev => ({ ...prev, guestCount: undefined }));
                    }}
                    required
                  />
                  {errors.guestCount && (
                    <span id="err-guests" className="field-error">
                      <AlertCircle size={14} aria-hidden="true" /> {errors.guestCount}
                    </span>
                  )}
                </div>

                {/* Total Budget Limit */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="evt-budget">
                    Total Budget Limit <span style={{ color: 'var(--red-danger)' }}>*</span>
                  </label>
                  <input
                    id="evt-budget"
                    type="number"
                    min="1"
                    step="1"
                    className="input-field tabular-nums"
                    value={totalBudget}
                    aria-invalid={Boolean(errors.totalBudget)}
                    aria-describedby={errors.totalBudget ? 'err-budget' : undefined}
                    onChange={e => {
                      setTotalBudget(e.target.value);
                      if (errors.totalBudget) setErrors(prev => ({ ...prev, totalBudget: undefined }));
                    }}
                    required
                  />
                  {errors.totalBudget && (
                    <span id="err-budget" className="field-error">
                      <AlertCircle size={14} aria-hidden="true" /> {errors.totalBudget}
                    </span>
                  )}
                </div>

                {/* Currency */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="evt-currency">Currency</label>
                  <select
                    id="evt-currency"
                    className="select-field"
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Preferences, Dietary & Accessibility */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                3. Preferences & Hospitality
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="evt-atmosphere">Atmosphere / Style</label>
                    <input
                      id="evt-atmosphere"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Royal heritage, celebratory, serene"
                      value={atmosphere}
                      onChange={e => setAtmosphere(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label htmlFor="evt-theme">Theme / Vision</label>
                    <input
                      id="evt-theme"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Sustainable Vintage Flora"
                      value={theme}
                      onChange={e => setTheme(e.target.value)}
                    />
                  </div>
                </div>

                {/* Full-width Cultural Traditions Field */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="evt-cultural">Cultural Traditions & Ceremonies</label>
                  <input
                    id="evt-cultural"
                    type="text"
                    className="input-field"
                    placeholder="e.g. Sangeet evening, Vedic phere, civic inauguration protocol"
                    value={cultural}
                    onChange={e => setCultural(e.target.value)}
                  />
                </div>

                {/* Dietary Checkboxes */}
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                    Dietary Requirements:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.4rem' }}>
                    {COMMON_DIETARY.map(item => {
                      const isChecked = dietary.includes(item);
                      return (
                        <label
                          key={item}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.35rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isChecked ? 'var(--forest-subtle)' : 'var(--bg-subtle)',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleDietary(item)}
                            style={{ width: '15px', height: '15px', accentColor: 'var(--forest-primary)' }}
                          />
                          <span style={{ color: isChecked ? 'var(--forest-text)' : 'var(--text-secondary)', fontWeight: isChecked ? 600 : 400 }}>
                            {item}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Accessibility Checkboxes */}
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.35rem' }}>
                    Accessibility Accommodations:
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.4rem' }}>
                    {COMMON_ACCESSIBILITY.map(item => {
                      const isChecked = accessibility.includes(item);
                      return (
                        <label
                          key={item}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.35rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isChecked ? 'var(--forest-subtle)' : 'var(--bg-subtle)',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleAccessibility(item)}
                            style={{ width: '15px', height: '15px', accentColor: 'var(--forest-primary)' }}
                          />
                          <span style={{ color: isChecked ? 'var(--forest-text)' : 'var(--text-secondary)', fontWeight: isChecked ? 600 : 400 }}>
                            {item}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="evt-notes">Additional Context & Logistics Notes</label>
                  <textarea
                    id="evt-notes"
                    className="textarea-field"
                    rows={3}
                    placeholder="Key constraints, timing notes, family preferences..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Visible Fixed Footer with Cancel and Save */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              <Check size={16} aria-hidden="true" />
              <span>Save Event Details</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
