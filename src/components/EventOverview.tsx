import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Calendar,
  MapPin,
  Users as UsersIcon,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import { EventPlan } from '../types';
import {
  calculatePlannedTotal,
  calculateActualTotal,
  calculateUnallocated,
  calculateRemainingSpending,
  isOverBudgetPlanned,
  isOverBudgetActual,
  formatCurrency,
} from '../utils/budget';
import {
  formatDisplayDate,
  evaluateTimelineCompression,
  getTaskTimeStatus,
  compareDateOnly,
  getTodayDateString,
} from '../utils/dates';
import { ActiveTab } from './Navigation';

interface EventOverviewProps {
  plan: EventPlan;
  onNavigate: (tab: ActiveTab) => void;
  onRequestProposal: () => void;
  onRequestBudgetReduction: () => void;
  isGeneratingAI: boolean;
}

export const EventOverview: React.FC<EventOverviewProps> = ({
  plan,
  onNavigate,
  onRequestProposal,
  onRequestBudgetReduction,
  isGeneratingAI,
}) => {
  const currency = plan.details.currency;
  const totalBudget = plan.details.totalBudget;

  const plannedTotal = calculatePlannedTotal(plan.budget);
  const actualTotal = calculateActualTotal(plan.budget);
  const unallocated = calculateUnallocated(totalBudget, plannedTotal);
  const remainingActual = calculateRemainingSpending(totalBudget, actualTotal);

  const isOverPlanned = isOverBudgetPlanned(totalBudget, plannedTotal);
  const isOverActual = isOverBudgetActual(totalBudget, actualTotal);

  // Task metrics
  const completedTasks = plan.tasks.filter(t => t.completed).length;
  const totalTasks = plan.tasks.length;
  const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const today = getTodayDateString();
  const sortedUpcomingTasks = [...plan.tasks]
    .filter(t => !t.completed)
    .sort((a, b) => compareDateOnly(a.dueDate, b.dueDate))
    .slice(0, 6);

  // Timeline runway compression check
  const compression = evaluateTimelineCompression(plan.details.date, plan.details.type, today);

  const hasGeneratedPlan = plan.budget.length > 0 || plan.tasks.length > 0;
  const planActionLabel = hasGeneratedPlan ? 'Update plan' : 'Generate plan';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Event Summary Banner (Forest Green with Cream Action & Decorative Botanical Detail) */}
      <div
        className="overview-banner"
        style={{
          backgroundColor: 'var(--forest-primary)',
          color: '#FFFFFF',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4) var(--space-5)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Restrained decorative botanical/geometric detail confined to banner away from text */}
        <div
          style={{
            position: 'absolute',
            right: '-15px',
            top: '-20px',
            width: '240px',
            height: '180px',
            opacity: 0.22,
            pointerEvents: 'none',
            zIndex: 0,
          }}
          aria-hidden="true"
        >
          <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            {/* Geometric Botanical Foliage Motif */}
            <circle cx="150" cy="70" r="55" stroke="var(--gold-detail)" strokeWidth="1.5" />
            <circle cx="150" cy="70" r="38" stroke="var(--gold-detail)" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M150 15 C125 40, 125 100, 150 125 C175 100, 175 40, 150 15 Z" stroke="var(--gold-detail)" strokeWidth="1.5" />
            <path d="M95 70 C120 45, 180 45, 205 70 C180 95, 120 95, 95 70 Z" stroke="var(--gold-detail)" strokeWidth="1.5" />
            <path d="M110 30 C130 50, 170 90, 190 110" stroke="var(--gold-detail)" strokeWidth="1" />
            <path d="M110 110 C130 90, 170 50, 190 30" stroke="var(--gold-detail)" strokeWidth="1" />
            <circle cx="150" cy="70" r="6" fill="var(--gold-detail)" />
            <circle cx="150" cy="15" r="3" fill="var(--gold-detail)" />
            <circle cx="150" cy="125" r="3" fill="var(--gold-detail)" />
            <circle cx="95" cy="70" r="3" fill="var(--gold-detail)" />
            {/* Subtle botanical leaves */}
            <path d="M130 40 C120 20, 140 25, 145 35" stroke="var(--bg-sage)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M170 40 C180 20, 160 25, 155 35" stroke="var(--bg-sage)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M130 100 C120 120, 140 115, 145 105" stroke="var(--bg-sage)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M170 100 C180 120, 160 115, 155 105" stroke="var(--bg-sage)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Event Identity: Prominent Name, Date, Location, Guest Count */}
        <div style={{ maxWidth: '720px', position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: '#FFFFFF',
              letterSpacing: '-0.3px',
              marginBottom: '0.45rem',
              lineHeight: 1.25,
            }}
          >
            {plan.details.name}
          </h1>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 'var(--space-3)',
              fontSize: '0.9375rem',
              color: 'var(--bg-sage)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={15} color="#E8EFE7" aria-hidden="true" />
              <span>{formatDisplayDate(plan.details.date)}</span>
            </span>
            <span style={{ opacity: 0.6 }}>&bull;</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={15} color="#E8EFE7" aria-hidden="true" />
              <span>{plan.details.location}</span>
            </span>
            <span style={{ opacity: 0.6 }}>&bull;</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <UsersIcon size={15} color="#E8EFE7" aria-hidden="true" />
              <span>{plan.details.guestCount} guests</span>
            </span>
          </div>
        </div>

        {/* Primary and Secondary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <button
            type="button"
            className="btn-cream"
            onClick={onRequestProposal}
            disabled={isGeneratingAI}
            aria-label={hasGeneratedPlan ? 'Update plan (Generate AI proposal)' : 'Generate plan'}
            style={{ minHeight: '42px', padding: '0.55rem 1.25rem' }}
          >
            <span>{isGeneratingAI ? 'Generating plan...' : planActionLabel}</span>
          </button>

          <button
            type="button"
            className="btn-banner-outline"
            onClick={() => onNavigate('ideas')}
            style={{ minHeight: '42px', padding: '0.55rem 1rem' }}
          >
            <span>Explore ideas</span>
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Compressed Runway Notice (Meaningful warning) */}
      {compression.isCompressed && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--amber-subtle)',
            border: '1px solid var(--amber-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
          }}
        >
          <ShieldAlert size={20} color="var(--amber-warning)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--amber-text)', marginBottom: '0.15rem' }}>
              Compressed Preparation Runway ({compression.daysRemaining} days remaining)
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--amber-text)', lineHeight: 1.4 }}>
              {compression.recommendation} Prioritize non-negotiable vendor bookings and critical preparation tasks.
            </p>
          </div>
        </div>
      )}

      {/* Over-Budget Warning Notice (Meaningful warning) */}
      {(isOverPlanned || isOverActual) && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--red-subtle)',
            border: '1px solid var(--red-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-3) var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <AlertTriangle size={22} color="var(--red-danger)" aria-hidden="true" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ fontSize: '0.9375rem', color: 'var(--red-text)' }}>
                WARNING: OVER BUDGET LIMIT
              </strong>
              <p style={{ fontSize: '0.875rem', color: 'var(--red-text)', marginTop: '0.15rem' }}>
                {isOverPlanned && (
                  <span>Planned spending exceeds your budget limit by <strong>{formatCurrency(Math.abs(unallocated), currency)}</strong>. </span>
                )}
                {isOverActual && (
                  <span>Actual spending exceeds the budget limit by <strong>{formatCurrency(Math.abs(remainingActual), currency)}</strong>.</span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-danger"
            onClick={onRequestBudgetReduction}
            disabled={isGeneratingAI}
            style={{ fontSize: '0.875rem', padding: '0.4rem 0.85rem' }}
          >
            <TrendingDown size={15} aria-hidden="true" />
            <span>AI Budget Reduction Advice</span>
          </button>
        </div>
      )}

      {/* Four Readable Summaries: Budget (Sage), Planned (Neutral), Actual (Neutral), Task Progress (Neutral) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {/* Metric 1: Total Budget (Key Summary Panel with Sage Background) */}
        <div
          className="card card-sage"
          style={{
            padding: 'var(--space-4)',
          }}
        >
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--forest-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Budget Limit
          </span>
          <div className="tabular-nums" style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--forest-primary)', margin: '0.25rem 0' }}>
            {formatCurrency(totalBudget, currency)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: isOverPlanned ? 'var(--red-danger)' : 'var(--forest-text)', fontWeight: 500 }}>
            {isOverPlanned
              ? `Over planned by ${formatCurrency(Math.abs(unallocated), currency)}`
              : `${formatCurrency(unallocated, currency)} unallocated`}
          </div>
        </div>

        {/* Metric 2: Planned Spending */}
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Planned Spending
          </span>
          <div className="tabular-nums" style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
            {formatCurrency(plannedTotal, currency)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {totalBudget > 0 ? `${Math.round((plannedTotal / totalBudget) * 100)}% of limit allocated` : 'No budget set'}
          </div>
        </div>

        {/* Metric 3: Actual Spending */}
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Actual Spending
          </span>
          <div className="tabular-nums" style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
            {formatCurrency(actualTotal, currency)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: isOverActual ? 'var(--red-danger)' : 'var(--text-secondary)' }}>
            {isOverActual
              ? `Over limit by ${formatCurrency(Math.abs(remainingActual), currency)}`
              : `${formatCurrency(remainingActual, currency)} remaining`}
          </div>
        </div>

        {/* Metric 4: Task Progress / Completion */}
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Task Completion
          </span>
          <div className="tabular-nums" style={{ fontSize: '1.625rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>
            {completedTasks} of {totalTasks}{' '}
            <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              ({taskPercent}%)
            </span>
          </div>
          {/* Proportional clean progress bar */}
          <div
            role="progressbar"
            aria-valuenow={taskPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Task completion progress"
            style={{
              height: '5px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              overflow: 'hidden',
              marginTop: '0.5rem',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${taskPercent}%`,
                backgroundColor: 'var(--forest-primary)',
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Sections: Natural heights, no forced equal-height boxes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 'var(--space-4)',
          alignItems: 'start',
        }}
      >
        {/* Upcoming Tasks Section (Given generous readable space) */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-3)',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: 'var(--space-2)',
            }}
          >
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Upcoming Tasks
            </h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('timeline')}
              style={{ fontSize: '0.8125rem', padding: '0.25rem 0.6rem', minHeight: '30px' }}
            >
              View all ({totalTasks})
            </button>
          </div>

          {sortedUpcomingTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-5) var(--space-3)', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} color="var(--forest-primary)" aria-hidden="true" style={{ margin: '0 auto 0.5rem', opacity: 0.8 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                All caught up
              </p>
              <p style={{ fontSize: '0.875rem' }}>
                There are no pending upcoming tasks. Add a milestone or generate an updated plan.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sortedUpcomingTasks.map(task => {
                const timeStatus = getTaskTimeStatus(task.dueDate, task.completed, today);
                const isOverdue = timeStatus === 'overdue';

                return (
                  <div
                    key={task.id}
                    style={{
                      padding: '0.75rem 0',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: '0.9375rem',
                          color: 'var(--text-primary)',
                          marginBottom: '0.15rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {task.title}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                        <span>{task.category}</span>
                        {task.owner && <span>&bull; {task.owner}</span>}
                      </div>
                    </div>

                    <span
                      className={`badge ${isOverdue ? 'badge-danger' : 'badge-neutral'}`}
                      style={{ flexShrink: 0, fontSize: '0.75rem' }}
                    >
                      {isOverdue ? `Overdue (${formatDisplayDate(task.dueDate)})` : formatDisplayDate(task.dueDate)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Budget Allocation Aligned List with Proportional Bars */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-3)',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: 'var(--space-2)',
            }}
          >
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Budget Allocation
            </h2>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onNavigate('budget')}
              style={{ fontSize: '0.8125rem', padding: '0.25rem 0.6rem', minHeight: '30px' }}
            >
              Open budget ({plan.budget.length})
            </button>
          </div>

          {plan.budget.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-5) var(--space-3)', color: 'var(--text-muted)' }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                No budget categories defined
              </p>
              <p style={{ fontSize: '0.875rem' }}>
                Click "Generate plan" or add categories in the Budget Planner to track allocations.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {plan.budget.slice(0, 6).map(cat => {
                const pct = totalBudget > 0 ? Math.min(100, Math.round((cat.plannedAmount / totalBudget) * 100)) : 0;

                return (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.875rem' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {cat.name}
                        {cat.isContingency && (
                          <span className="badge badge-neutral" style={{ marginLeft: '0.4rem', fontSize: '0.6875rem', padding: '0.05rem 0.35rem' }}>
                            Reserve
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatCurrency(cat.plannedAmount, currency)}{' '}
                        <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                          ({pct}%)
                        </span>
                      </span>
                    </div>

                    <div
                      style={{
                        height: '4px',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          backgroundColor: cat.isContingency ? 'var(--text-muted)' : 'var(--forest-primary)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
