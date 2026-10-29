import React from 'react';
import { ShieldCheck, Lock, Eye, AlertCircle } from 'lucide-react';

interface PrivacyNoticeModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export const PrivacyNoticeModal: React.FC<PrivacyNoticeModalProps> = ({
  isOpen,
  onAccept,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-notice-title"
    >
      <div className="modal-dialog" style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'var(--teal-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--teal-primary)',
            }}
          >
            <ShieldCheck size={24} aria-hidden="true" />
          </div>
          <div>
            <h2 id="privacy-notice-title" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
              AI Transparency & Data Notice
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              GatherWise Privacy Safeguards
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Lock size={20} color="var(--teal-primary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>What information is transmitted:</strong>
              <p>Only the general planning parameters you provide: event type, general city location, guest count, total budget, stated theme, and dietary/accessibility preferences.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Eye size={20} color="var(--teal-primary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>What is NEVER transmitted:</strong>
              <p>No street addresses, phone numbers, email addresses, personal identification, or payment details. GatherWise does not collect or store personal PII.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <AlertCircle size={20} color="var(--plum-primary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>Model Security Boundary:</strong>
              <p>Event notes are strictly treated as untrusted data and isolated from system directives. The AI model is strictly text-based and given no arbitrary tool execution or web browsing capability.</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onAccept}>
            I Understand & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
