import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  Users,
  Lightbulb,
  Database,
  ChevronRight,
} from 'lucide-react';

export type ActiveTab = 'overview' | 'budget' | 'timeline' | 'vendors' | 'ideas';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  overdueCount?: number;
  isOverBudget?: boolean;
  mobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  overdueCount = 0,
  isOverBudget = false,
  mobileMenuOpen = false,
  onCloseMobileMenu,
}) => {
  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'budget' as ActiveTab,
      label: 'Budget Planner',
      icon: Wallet,
      badge: isOverBudget ? 'Over Budget' : null,
      badgeType: 'danger',
    },
    {
      id: 'timeline' as ActiveTab,
      label: 'Timeline & Tasks',
      icon: CheckSquare,
      badge: overdueCount > 0 ? `${overdueCount} Overdue` : null,
      badgeType: 'warning',
    },
    {
      id: 'vendors' as ActiveTab,
      label: 'Vendor Tracker',
      icon: Users,
      badge: null,
    },
    {
      id: 'ideas' as ActiveTab,
      label: 'Ideas',
      icon: Lightbulb,
      badge: null,
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    onTabChange(tab);
    if (onCloseMobileMenu) {
      onCloseMobileMenu();
    }
  };

  return (
    <>
      {/* Desktop Sidebar (roughly 220px, calm editorial workspace) */}
      <nav
        id="sidebar-nav"
        className="hide-mobile no-print"
        aria-label="Planning navigation"
        style={{
          width: '220px',
          flexShrink: 0,
          backgroundColor: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          padding: 'var(--space-4) var(--space-2)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 'calc(100vh - 56px)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div
            style={{
              padding: '0 var(--space-3) var(--space-2)',
              fontSize: '0.6875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
            }}
          >
            Workspace
          </div>

          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isActive ? 'var(--bg-sage)' : 'transparent',
                  color: isActive ? 'var(--forest-primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9375rem',
                  border: 'none',
                  textAlign: 'left',
                  minHeight: '40px',
                  borderLeft: isActive ? '3px solid var(--forest-primary)' : '3px solid transparent',
                  transition: 'background-color 0.12s ease, color 0.12s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Icon
                    size={17}
                    color={isActive ? 'var(--forest-primary)' : 'var(--text-muted)'}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`badge ${item.badgeType === 'danger' ? 'badge-danger' : 'badge-warning'}`}
                    style={{ fontSize: '0.6875rem', padding: '0.1rem 0.35rem' }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Browser Storage Notice (Expandable Details) */}
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 'var(--space-3)',
            marginTop: 'var(--space-4)',
          }}
        >
          <details
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              lineHeight: 1.4,
            }}
          >
            <summary
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                padding: '0.25rem 0',
                outline: 'none',
                listStyle: 'none',
              }}
            >
              <Database size={13} color="var(--forest-primary)" aria-hidden="true" />
              <span>Saved locally in browser</span>
              <ChevronRight size={11} aria-hidden="true" style={{ marginLeft: 'auto', opacity: 0.7 }} />
            </summary>
            <div style={{ padding: '0.5rem 0 0.25rem', color: 'var(--text-muted)', fontSize: '0.7188rem' }}>
              Your event plan is stored exclusively in this browser profile (LocalStorage). No plan data is sent to external cloud databases without explicit request.
            </div>
          </details>
        </div>
      </nav>

      {/* Mobile Drawer / Slide-Over Navigation */}
      {mobileMenuOpen && (
        <div
          className="hide-desktop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 90,
            display: 'flex',
          }}
          onClick={onCloseMobileMenu}
        >
          <div
            style={{
              width: '260px',
              backgroundColor: 'var(--bg-surface)',
              height: '100%',
              padding: 'var(--space-4) var(--space-3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 'var(--space-3)',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                  Navigation
                </span>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={onCloseMobileMenu}
                  aria-label="Close navigation"
                >
                  &times;
                </button>
              </div>

              {navItems.map(item => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isActive ? 'var(--bg-sage)' : 'transparent',
                      color: isActive ? 'var(--forest-primary)' : 'var(--text-secondary)',
                      fontWeight: isActive ? 600 : 500,
                      fontSize: '0.9375rem',
                      borderLeft: isActive ? '3px solid var(--forest-primary)' : '3px solid transparent',
                      minHeight: '44px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <Icon
                        size={18}
                        color={isActive ? 'var(--forest-primary)' : 'var(--text-muted)'}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`badge ${item.badgeType === 'danger' ? 'badge-danger' : 'badge-warning'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
              Saved locally in browser (LocalStorage)
            </div>
          </div>
        </div>
      )}
    </>
  );
};
