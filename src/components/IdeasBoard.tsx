import React from 'react';
import {
  Lightbulb,
  CheckCircle2,
} from 'lucide-react';
import { PersonalizedIdeasResult, EventDetails } from '../types';

interface IdeasBoardProps {
  ideas: PersonalizedIdeasResult | null;
  eventDetails: EventDetails;
  onRequestIdeas: () => void;
  isGeneratingAI: boolean;
}

// Curated intentional color swatches for wedding, birthday, community themes
const THEME_PALETTES: Record<string, string[]> = {
  royal: ['#173F35', '#B99250', '#E8EFE7', '#202923'],
  space: ['#173F35', '#3A6351', '#8FA89B', '#F7F5EF'],
  eco: ['#173F35', '#52796F', '#E8EFE7', '#B99250'],
  default: ['#173F35', '#B99250', '#E8EFE7', '#F7F5EF'],
};

function getThemeSwatches(themeName: string): string[] {
  const lower = themeName.toLowerCase();
  if (lower.includes('eco') || lower.includes('heritage') || lower.includes('green') || lower.includes('harvest')) {
    return THEME_PALETTES.eco;
  }
  if (lower.includes('space') || lower.includes('cosmic') || lower.includes('galaxy') || lower.includes('star')) {
    return THEME_PALETTES.space;
  }
  if (lower.includes('royal') || lower.includes('jubilee') || lower.includes('gold') || lower.includes('palace')) {
    return THEME_PALETTES.royal;
  }
  return THEME_PALETTES.default;
}

export const IdeasBoard: React.FC<IdeasBoardProps> = ({
  ideas,
  eventDetails,
  onRequestIdeas,
  isGeneratingAI,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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
            <Lightbulb size={19} color="var(--forest-primary)" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
              Ideas
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Tailored suggestions for {eventDetails.name} ({eventDetails.guestCount} guests in {eventDetails.location}).
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={onRequestIdeas}
          disabled={isGeneratingAI}
          style={{ fontSize: '0.875rem' }}
        >
          <span>{isGeneratingAI ? 'Synthesizing ideas...' : ideas ? 'Regenerate ideas' : 'Generate ideas'}</span>
        </button>
      </div>

      {!ideas ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-7) var(--space-4)', color: 'var(--text-muted)' }}>
          <Lightbulb size={40} color="var(--forest-primary)" aria-hidden="true" style={{ margin: '0 auto var(--space-3)', opacity: 0.8 }} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            No ideas generated yet
          </h2>
          <p style={{ maxWidth: '440px', margin: '0 auto var(--space-4)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
            Synthesize bespoke event themes, interactive guest activities, dietary menu adaptations, and accessibility accommodations.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={onRequestIdeas}
            disabled={isGeneratingAI}
          >
            <span>Generate ideas</span>
          </button>
        </div>
      ) : (
        <>
          {/* Sage Introductory Panel (Creative Direction) */}
          <div
            className="card card-sage"
            style={{
              padding: 'var(--space-4)',
              borderLeft: '4px solid var(--forest-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--forest-primary)' }}>
                Creative Direction
              </span>
              <span
                style={{
                  display: 'inline-block',
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--gold-detail)',
                }}
                aria-hidden="true"
              />
              <span className={`badge ${ideas.isSampleMode ? 'badge-neutral' : 'badge-success'}`} style={{ fontSize: '0.6875rem' }}>
                {ideas.isSampleMode ? 'Sample data engine' : 'Live Gemini verified'}
              </span>
            </div>
            <p style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>
              {ideas.summary}
            </p>
          </div>

          {/* Section 1: Themes */}
          <div>
            <h2 style={{ fontSize: '1.1875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
              Themes
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-3)' }}>
              {ideas.themes.map((theme, idx) => {
                const swatches = getThemeSwatches(theme.name);

                return (
                  <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {theme.name}
                      </h3>
                      {/* Intentional Color Swatches */}
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} title="Suggested color palette">
                        {swatches.map((color, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              backgroundColor: color,
                              border: '1px solid rgba(0,0,0,0.1)',
                              display: 'inline-block',
                            }}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    </div>

                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {theme.description}
                    </p>

                    <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', marginTop: 'auto' }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.15rem' }}>
                        Decor & Materials:
                      </strong>
                      <span style={{ color: 'var(--text-secondary)' }}>{theme.decorNotes}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Activities */}
          <div>
            <h2 style={{ fontSize: '1.1875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
              Activities
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
              {ideas.activities.map((activity, idx) => (
                <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {activity.title}
                    </h3>
                    <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                      {activity.audience}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {activity.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Food & dietary needs & Section 4: Accessibility */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
            {/* Food & dietary needs */}
            <div className="card">
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                Food & dietary needs
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {ideas.dietaryConsiderations.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--forest-primary)', fontWeight: 700, lineHeight: 1.2 }}>&bull;</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Accessibility */}
            <div className="card">
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                Accessibility
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {ideas.accessibilityHighlights.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={16} color="var(--forest-primary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
