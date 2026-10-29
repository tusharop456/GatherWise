import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '420px',
      }}
    >
      {toasts.map(toast => {
        let bg = 'var(--bg-card)';
        let border = 'var(--border-subtle)';
        let Icon = Info;
        let iconColor = 'var(--teal-primary)';

        if (toast.type === 'success') {
          bg = 'var(--emerald-subtle)';
          border = 'rgba(13, 122, 83, 0.3)';
          Icon = CheckCircle2;
          iconColor = 'var(--emerald-success)';
        } else if (toast.type === 'error') {
          bg = 'var(--rose-subtle)';
          border = 'rgba(185, 28, 28, 0.3)';
          Icon = AlertCircle;
          iconColor = 'var(--rose-danger)';
        }

        return (
          <div
            key={toast.id}
            role="status"
            style={{
              backgroundColor: bg,
              border: `1px solid ${border}`,
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem 1rem',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Icon size={18} color={iconColor} aria-hidden="true" style={{ flexShrink: 0 }} />
              <span>{toast.text}</span>
            </div>
            <button
              type="button"
              className="btn-icon"
              style={{ width: '28px', height: '28px', minHeight: 'unset' }}
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
