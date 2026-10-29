import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Printer,
  Trash2,
  Calendar,
  Info,
  ChevronDown,
  X,
  ShieldCheck,
} from 'lucide-react';
import { EventPlan, EventType } from '../types';
import { exportPlanAsJson, triggerPrintLayout } from '../utils/export';
import { formatDisplayDate } from '../utils/dates';
import { ConfirmDialog } from './ConfirmDialog';
import { HealthStatus } from '../services/aiService';

interface HeaderProps {
  plan: EventPlan;
  isLiveAI: boolean;
  serverHealth: HealthStatus | null;
  onEditEvent: () => void;
  onLoadSample: (type: EventType) => void;
  onClearPlan: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  plan,
  isLiveAI: _isLiveAI,
  serverHealth,
  onEditEvent,
  onLoadSample,
  onClearPlan,
  onOpenMobileMenu,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const eventTypeLabel = {
    wedding: 'Wedding',
    birthday: 'Birthday Party',
    community: 'Community Event',
  }[plan.details.type] || 'Event';

  const isLiveVerified = serverHealth?.mode === 'live_verified';
  const isConfiguredUnverified = serverHealth?.mode === 'configured_unverified';

  // Close actions menu on outside click or escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActionsMenuOpen(false);
        setShowModeInfo(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };

    if (actionsMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionsMenuOpen]);

  return (
    <header
      className="no-print"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        height: '56px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1440px',
          height: '100%',
          margin: '0 auto',
          padding: '0 var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
        }}
      >
        {/* Left: Brand & Event Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          {/* Mobile hamburger toggle */}
          {onOpenMobileMenu && (
            <button
              type="button"
              className="btn-icon hide-desktop"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              style={{ minHeight: '36px', minWidth: '36px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}

          {/* Compact Brand Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--forest-primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8125rem',
                letterSpacing: '-0.3px',
              }}
            >
              GW
            </div>
            <h1
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.2px',
                margin: 0,
              }}
            >
              GatherWise
            </h1>
          </div>

          <div
            style={{
              height: '20px',
              width: '1px',
              backgroundColor: 'var(--border-subtle)',
              flexShrink: 0,
            }}
            className="hide-mobile"
          />

          {/* Event Selector - Handles long names gracefully */}
          <button
            type="button"
            className="btn-secondary"
            onClick={onEditEvent}
            title="Click to edit event details"
            style={{
              padding: '0.3rem 0.65rem',
              fontSize: '0.875rem',
              minHeight: '34px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              maxWidth: '380px',
              overflow: 'hidden',
              textAlign: 'left',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Calendar size={14} color="var(--forest-primary)" aria-hidden="true" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: 'var(--text-primary)',
              }}
            >
              {plan.details.name}
            </span>
            <span
              className="badge badge-neutral hide-mobile"
              style={{ fontSize: '0.6875rem', padding: '0.1rem 0.35rem', flexShrink: 0 }}
            >
              {eventTypeLabel}
            </span>
            <span
              className="hide-mobile"
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}
            >
              {formatDisplayDate(plan.details.date)}
            </span>
          </button>
        </div>

        {/* Right: Quiet AI Status & Event Actions Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
          {/* Quiet, Accurate AI Status Indicator */}
          <button
            type="button"
            onClick={() => setShowModeInfo(true)}
            className={`badge ${isLiveVerified ? 'badge-success' : 'badge-warning'}`}
            style={{
              cursor: 'pointer',
              padding: '0.25rem 0.55rem',
              fontSize: '0.75rem',
              minHeight: '30px',
              fontWeight: 500,
            }}
            title="Click to view AI mode details"
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isLiveVerified ? 'var(--green-success)' : 'var(--amber-warning)',
                display: 'inline-block',
                marginRight: '2px',
              }}
              aria-hidden="true"
            />
            <span>{isLiveVerified ? 'Live Gemini Verified' : isConfiguredUnverified ? 'AI configured (unverified)' : 'Sample Mode Active'}</span>
            <Info size={11} aria-hidden="true" style={{ opacity: 0.7 }} />
          </button>

          {/* Event Actions Menu */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setActionsMenuOpen(prev => !prev)}
              aria-expanded={actionsMenuOpen}
              aria-haspopup="true"
              style={{
                fontSize: '0.875rem',
                padding: '0.35rem 0.75rem',
                minHeight: '34px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>Event actions</span>
              <ChevronDown size={14} aria-hidden="true" style={{ transform: actionsMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {actionsMenuOpen && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  width: '230px',
                  padding: 'var(--space-1) 0',
                  zIndex: 60,
                }}
              >
                {/* Export & Print */}
                <div style={{ padding: '0 var(--space-1)' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      exportPlanAsJson(plan);
                      setActionsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      border: 'none',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      minHeight: '36px',
                    }}
                  >
                    <Download size={15} color="var(--text-secondary)" aria-hidden="true" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      triggerPrintLayout();
                      setActionsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      border: 'none',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      minHeight: '36px',
                    }}
                  >
                    <Printer size={15} color="var(--text-secondary)" aria-hidden="true" />
                    <span>Print View</span>
                  </button>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: 'var(--space-1) 0' }} />

                {/* Sample Events Section */}
                <div style={{ padding: '0.25rem 0.75rem 0.15rem' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                    Load Sample Event
                  </span>
                </div>
                <div style={{ padding: '0 var(--space-1)' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      onLoadSample('wedding');
                      setActionsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      border: 'none',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      minHeight: '34px',
                    }}
                  >
                    Wedding
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      onLoadSample('birthday');
                      setActionsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      border: 'none',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      minHeight: '34px',
                    }}
                  >
                    Birthday
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      onLoadSample('community');
                      setActionsMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      border: 'none',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      minHeight: '34px',
                    }}
                  >
                    Community
                  </button>
                </div>

                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: 'var(--space-1) 0' }} />

                {/* Clearly Separated Destructive Action */}
                <div style={{ padding: '0 var(--space-1)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      setShowClearConfirm(true);
                    }}
                    style={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      border: 'none',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--red-danger)',
                      backgroundColor: 'transparent',
                      minHeight: '36px',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--red-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Trash2 size={15} color="var(--red-danger)" aria-hidden="true" />
                    <span>Clear stored data</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mode & Security Info Modal */}
      {showModeInfo && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-mode-info-title"
          onClick={e => {
            if (e.target === e.currentTarget) setShowModeInfo(false);
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} color="var(--forest-primary)" aria-hidden="true" />
                <h2 id="ai-mode-info-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
                  AI System Status & Privacy
                </h2>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowModeInfo(false)}
                aria-label="Close dialog"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: '0.9375rem' }}>
              <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
                  Current Status: {isLiveVerified ? 'Live Gemini Verified' : isConfiguredUnverified ? 'AI Configured — Unverified' : 'Sample Mode Active'}
                </strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {serverHealth?.notice ||
                    'GatherWise operates with deterministic, curated domain models until an API key is configured.'}
                </p>
              </div>

              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Model in use:</strong> {serverHealth?.model || 'Deterministic Sample Engine'}
                </p>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Local isolation:</strong> Event data and notes are stored strictly in your browser (LocalStorage).
                </p>
                <p>
                  <strong>Security boundary:</strong> Untrusted user input is isolated from system instructions, and external tool execution is restricted.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowModeInfo(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Stored Data Confirmation */}
      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Stored Event Data"
        message="This action will permanently delete the current event plan and all custom categories, tasks, and vendor records from this browser profile. You will start with a fresh event specification."
        confirmLabel="Yes, Clear All Data"
        cancelLabel="Keep Current Plan"
        isDestructive={true}
        onConfirm={() => {
          setShowClearConfirm(false);
          onClearPlan();
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </header>
  );
};
