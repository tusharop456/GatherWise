import {
  EventDetails,
  AIProposal,
  BudgetReductionResult,
  PersonalizedIdeasResult,
} from '../src/types';
import { getTodayDateString, addDays, clampTaskDueDate } from '../src/utils/dates';
import { normalizeProposedAllocations, toMinorUnits, fromMinorUnits } from '../src/utils/budget';

export function generateSampleProposal(event: EventDetails): AIProposal {
  const today = getTodayDateString();
  const total = event.totalBudget;

  let rawAllocations: Array<{ category: string; plannedAmount: number; notes: string; isContingency?: boolean }> = [];
  let tasks: Array<{ title: string; category: string; dueDate: string; owner?: string; isCritical?: boolean }> = [];
  let vendorChecklists: Array<{ category: string; items: string[] }> = [];
  let themeIdeas: string[] = [];
  let activityIdeas: string[] = [];
  let summary = '';

  if (event.type === 'wedding') {
    summary = `A tailored wedding plan for ${event.name} in ${event.location} designed for ${event.guestCount} guests with dedicated cultural ceremonies, hospitality, and sustainable styling.`;
    themeIdeas = [
      event.preferences.theme || 'Royal Heritage & Contemporary Floral Fusion',
      'Timeless Ivory, Brass Lanterns & Marigold Twilight',
    ];
    activityIdeas = [
      'Sunset Welcome Sangeet & Folk Fusion Musical Evening',
      'Interactive Live Sweet & Savory Chaat Station for Guests',
      'Memory Lane Photo Wall & Handwritten Blessing Tree',
    ];
    rawAllocations = [
      { category: 'Venue & Suites Booking', plannedAmount: Math.round(total * 0.32), notes: 'Banquet halls, lawns, and bridal preparation suites' },
      { category: 'Catering & Dining Hospitality', plannedAmount: Math.round(total * 0.28), notes: 'Multi-course regional cuisine, dessert bars, live counters' },
      { category: 'Floral & Thematic Decor', plannedAmount: Math.round(total * 0.14), notes: 'Stage mandap, entrance arches, floral centerpieces' },
      { category: 'Photography & Cinematic Video', plannedAmount: Math.round(total * 0.10), notes: 'Pre-wedding coverage, drone footage, album production' },
      { category: 'Entertainment & Sound Production', plannedAmount: Math.round(total * 0.06), notes: 'DJ, traditional musicians, sound & mood lighting' },
      { category: 'Attire, Styling & Favors', plannedAmount: Math.round(total * 0.05), notes: 'Stylist bookings and guest welcome favor kits' },
      { category: 'Contingency & Emergency Buffer (5%)', plannedAmount: Math.round(total * 0.05), notes: 'Weather mitigation and unforeseen last-minute adjustments', isContingency: true },
    ];
    tasks = [
      { title: 'Lock down venue and sign booking contract', category: 'Venue', dueDate: clampTaskDueDate(addDays(today, 10), today, event.date), owner: 'Lead Planner', isCritical: true },
      { title: 'Menu curation & allergen/Jain tasting session', category: 'Catering', dueDate: clampTaskDueDate(addDays(today, 20), today, event.date), isCritical: false },
      { title: 'Review decor theme render & floral mockups', category: 'Decor', dueDate: clampTaskDueDate(addDays(today, 35), today, event.date), isCritical: false },
      { title: 'Dispatch wedding invitations with RSVP tracking', category: 'Stationery', dueDate: clampTaskDueDate(addDays(today, 45), today, event.date), isCritical: true },
      { title: 'Confirm photographer shot list & timeline', category: 'Media', dueDate: clampTaskDueDate(addDays(today, 60), today, event.date), isCritical: false },
      { title: 'Verify step-free ramps & elder assistance cart', category: 'Accessibility', dueDate: clampTaskDueDate(addDays(today, 75), today, event.date), isCritical: true },
    ];
    vendorChecklists = [
      { category: 'Venue', items: ['Seating capacity verified', 'Bridal suite included', 'Noise curfew time confirmed', 'Power backup generator test'] },
      { category: 'Catering', items: ['Tasting session completed', 'Separate vegetarian/Jain prep line', 'Staffing ratio at least 1:12', 'Eco-friendly cutlery'] },
      { category: 'Decor', items: ['Setup window at least 6 hours', 'Fire safety compliance for candles', 'No single-use plastics'] },
    ];
  } else if (event.type === 'birthday') {
    summary = `An energetic milestone birthday celebration for ${event.name} in ${event.location} featuring immersive theme games, custom treats, and memorable hospitality for ${event.guestCount} guests.`;
    themeIdeas = [
      event.preferences.theme || 'Galactic Explorer & Wonder Adventure',
      'Retro Arcade Fiesta with Neon & Pop Art Glow',
    ];
    activityIdeas = [
      'Interactive DIY Themed Maker Workshop / Science Blast',
      'High-Energy Scavenger Hunt & Balloon Quest',
      'Themed Photo Booth with Instant Polaroid Souvenirs',
    ];
    rawAllocations = [
      { category: 'Party Hall / Venue Space', plannedAmount: Math.round(total * 0.25), notes: 'Rental duration plus 1 hour setup buffer' },
      { category: 'Themed Decor & Balloon Installations', plannedAmount: Math.round(total * 0.18), notes: 'Custom cake backdrop, table styling, lighting' },
      { category: 'Custom Cake & Gourmet Finger Foods', plannedAmount: Math.round(total * 0.27), notes: 'Allergen-conscious cake, sliders, mocktails, fruit skewers' },
      { category: 'Interactive Entertainment & Host', plannedAmount: Math.round(total * 0.15), notes: 'Party entertainer, games host, activity supplies' },
      { category: 'Personalized Return Favors', plannedAmount: Math.round(total * 0.08), notes: 'Curated gift boxes aligned with event theme' },
      { category: 'Contingency & Last-Minute Buffer (7%)', plannedAmount: Math.round(total * 0.07), notes: 'Spare supplies, extra treats, emergency transport', isContingency: true },
    ];
    tasks = [
      { title: 'Reserve party venue and review sound policy', category: 'Venue', dueDate: clampTaskDueDate(addDays(today, 5), today, event.date), isCritical: true },
      { title: 'Confirm theme cake design with nut-free bakery', category: 'Catering', dueDate: clampTaskDueDate(addDays(today, 10), today, event.date), isCritical: true },
      { title: 'Order custom return favors and party props', category: 'Favors', dueDate: clampTaskDueDate(addDays(today, 14), today, event.date), isCritical: false },
      { title: 'Prepare music playlist and game activity gear', category: 'Entertainment', dueDate: clampTaskDueDate(addDays(today, 20), today, event.date), isCritical: false },
    ];
    vendorChecklists = [
      { category: 'Catering', items: ['Strict allergen isolation (nut-free)', 'Child-safe temperature beverages', 'Dedicated cake table setup'] },
      { category: 'Entertainment', items: ['Background check / verified references', 'Sound equipment included', 'Age-appropriate games program'] },
    ];
  } else {
    // Community Event
    summary = `A purpose-driven, inclusive community event plan for ${event.name} in ${event.location} bringing together ${event.guestCount} neighbors with civic safety, waste management, and accessible staging.`;
    themeIdeas = [
      event.preferences.theme || 'Civic Harmony & Green Sustainability',
      'Open Streets Festival & Local Heritage Celebration',
    ];
    activityIdeas = [
      'Community Artisans & Farmers Exhibition Market',
      'Open Mic & Local Youth Talent Showcase',
      'Hands-On Eco-Living / Recycling Demonstration Hub',
    ];
    rawAllocations = [
      { category: 'Permits, Park Sanitation & Security', plannedAmount: Math.round(total * 0.22), notes: 'Municipal fees, clean-up crews, first aid station' },
      { category: 'Staging, Canopies, Sound & Seating', plannedAmount: Math.round(total * 0.35), notes: 'Modular canopies, PA system, folding chairs, ramps' },
      { category: 'Signage, Wayfinding & Volunteer Kits', plannedAmount: Math.round(total * 0.12), notes: 'Recycled wood directional signs, volunteer sashes' },
      { category: 'Performers & Speaker Honorariums', plannedAmount: Math.round(total * 0.15), notes: 'Local musicians, workshop facilitators' },
      { category: 'Public Water Refill & Basic Refreshments', plannedAmount: Math.round(total * 0.08), notes: 'Hydration tankers, compostable cups' },
      { category: 'Contingency & Emergency Reserve (8%)', plannedAmount: Math.round(total * 0.08), notes: 'Weather protection tarps, contingency medical kit', isContingency: true },
    ];
    tasks = [
      { title: 'Submit park application & municipal noise permit', category: 'Permits', dueDate: clampTaskDueDate(addDays(today, 7), today, event.date), isCritical: true },
      { title: 'Publish volunteer sign-up form & assign marshals', category: 'Volunteers', dueDate: clampTaskDueDate(addDays(today, 15), today, event.date), isCritical: true },
      { title: 'Inspect park for wheelchair access and install temporary ramps', category: 'Accessibility', dueDate: clampTaskDueDate(addDays(today, 25), today, event.date), isCritical: true },
      { title: 'Brief stage managers and test public address system', category: 'Technical', dueDate: clampTaskDueDate(addDays(today, 35), today, event.date), isCritical: false },
    ];
    vendorChecklists = [
      { category: 'Equipment & Staging', items: ['Wind-resistance ratings verified', 'Step-free ramp access to podium', 'Generator with noise baffle'] },
      { category: 'Sanitation', items: ['3-stream waste segregation bins', 'Composting contract in place', 'Handwashing stations provided'] },
    ];
  }

  // Deterministically normalize allocations to hit event.totalBudget exactly
  const norm = normalizeProposedAllocations(rawAllocations, total);

  return {
    summary,
    themeIdeas,
    activityIdeas,
    budgetAllocations: norm.allocations,
    tasks,
    vendorChecklists,
    assumptionsAndLimitations: [
      'All figures are calculated planning estimates and subject to vendor quote confirmations.',
      'Check local municipal noise and fire regulations before locking open-air staging.',
      'Accessibility accommodations should be verified with an on-site physical walk-through.',
    ],
    generatedAt: new Date().toISOString(),
    isSampleMode: true,
    normalizationNotice: norm.adjusted ? norm.explanation : undefined,
  };
}

export function generateSampleBudgetReduction(
  _event: EventDetails,
  categories: Array<{ id: string; name: string; plannedAmount: number }>
): BudgetReductionResult {
  const proposedModifications = categories
    .filter(c => !/contingency|emergency/i.test(c.name) && c.plannedAmount > 0)
    .map(c => {
      const currentMinor = toMinorUnits(c.plannedAmount);
      // Reduce by 12% to 20%
      const reductionFactor = /decor|favors|stationery|attire/i.test(c.name) ? 0.20 : 0.12;
      const savingsMinor = Math.round(currentMinor * reductionFactor);
      const proposedMinor = currentMinor - savingsMinor;

      let rationale = 'Optimized specifications and switched to local seasonal alternatives.';
      if (/venue/i.test(c.name)) {
        rationale = 'Adjusted booking duration by 1 hour and negotiated weekday or afternoon discount.';
      } else if (/catering/i.test(c.name)) {
        rationale = 'Streamlined live counter count from 4 to 2 and focused on crowd-pleasing signature mains.';
      } else if (/decor/i.test(c.name)) {
        rationale = 'Replaced imported exotic blooms with native foliage, reusable brass urns, and atmospheric LED candles.';
      } else if (/photography/i.test(c.name)) {
        rationale = 'Opted for single lead photographer coverage with digital gallery delivery rather than multi-volume physical prints.';
      }

      return {
        categoryId: c.id,
        categoryName: c.name,
        currentAmount: c.plannedAmount,
        proposedAmount: fromMinorUnits(proposedMinor),
        savingsAmount: fromMinorUnits(savingsMinor),
        rationale,
      };
    })
    .slice(0, 4); // Top 4 actionable suggestions

  const totalSavingsMinor = proposedModifications.reduce((sum, m) => sum + toMinorUnits(m.savingsAmount), 0);
  const currentPlannedTotalMinor = categories.reduce((sum, c) => sum + toMinorUnits(c.plannedAmount), 0);
  const projectedPlannedTotalMinor = currentPlannedTotalMinor - totalSavingsMinor;

  return {
    summary: `Identified ${proposedModifications.length} practical cost-optimization opportunities preserving core hospitality while trimming non-essential expenditures.`,
    currentPlannedTotal: fromMinorUnits(currentPlannedTotalMinor),
    projectedPlannedTotal: fromMinorUnits(projectedPlannedTotalMinor),
    totalSavings: fromMinorUnits(totalSavingsMinor),
    proposedModifications,
    practicalTradeoffs: [
      'Decor substitutions rely on creative lighting and local flora rather than imported exotics.',
      'Catering tweaks streamline prep waste without decreasing per-guest food portion size.',
    ],
    isSampleMode: true,
  };
}

export function generateSampleIdeas(event: EventDetails): PersonalizedIdeasResult {
  const isWedding = event.type === 'wedding';
  const isBirthday = event.type === 'birthday';

  if (isWedding) {
    return {
      summary: `Bespoke celebration ideas honoring ${event.name}'s cultural background with elegant sustainable accents.`,
      themes: [
        {
          name: 'Sunlit Marigold & Terracotta Heritage',
          description: 'A celebration grounded in warm earthen tones, brass accents, and cheerful marigold florals.',
          decorNotes: 'Handwoven textiles, brass urli with floating petals, natural clay oil lamps, zero single-use plastics.',
        },
        {
          name: 'Royal Rajputana Twilight',
          description: 'Deep royal jewel tones (plum, teal, saffron) with starry twinkling lanterns and acoustic shehnai melodies.',
          decorNotes: 'Bespoke hand-block printed drapes, dim warm ambient spotlights, natural floral perfume fountains.',
        },
      ],
      activities: [
        { title: 'Interactive Bangle & Henna Courtyard', audience: 'All Guests', description: 'Local folk artisans fitting customized glass bangles and applying natural mehndi.' },
        { title: 'Starlit Sangeet Jam & Folk Chorus', audience: 'Evening Celebration', description: 'A lively musical celebration blending regional folk classics with modern family dance choreography.' },
      ],
      dietaryConsiderations: [
        'Dedicated pure vegetarian and Jain culinary line with clearly marked spoon sets.',
        'Millet dessert bar featuring organic jaggery halwa and saffron rabdi.',
      ],
      accessibilityHighlights: [
        'Gentle gradient ramp to central ceremony mandap with stable handrails.',
        'Golf cart shuttle service from main parking pavilion to courtyard entrance.',
      ],
      isSampleMode: true,
    };
  }

  if (isBirthday) {
    return {
      summary: `Exciting, age-appropriate milestone ideas centered on wonder, curiosity, and joyful interactive fun.`,
      themes: [
        {
          name: 'Galactic Odyssey & Lunar Space Mission',
          description: 'Cosmic navy and starlight silver setting with planetary orbs and constellation mapping.',
          decorNotes: 'Glow-in-the-dark galaxy projection, silver rocket balloon arches, astronaut photo cutout portal.',
        },
      ],
      activities: [
        { title: 'DIY Stomp Rocket & Parachute Launch', audience: 'Kids (Ages 6-12)', description: 'Hands-on physics challenge where kids construct paper rocket fins and launch them safely across the lawn.' },
        { title: 'Cosmic Escape Quiet Pod', audience: 'Quiet / Sensory Break', description: 'A softly lit tent with cozy pillows, starry nightlight, and noise-canceling headsets for quiet downtime.' },
      ],
      dietaryConsiderations: [
        'Nut-free kitchen certification with individual ingredient flags on all treats.',
        'Hydrating fruit slushies in astronaut squeeze pouches.',
      ],
      accessibilityHighlights: [
        'Sensory-friendly decompression zone for children sensitive to loud party noises.',
        'Visual party schedule board with pictorial milestones for clarity.',
      ],
      isSampleMode: true,
    };
  }

  return {
    summary: `Inclusive civic fair concepts designed to foster neighborhood connection, intergenerational joy, and sustainability.`,
    themes: [
      {
        name: 'Earth, Soil & Community Harvest',
        description: 'Warm natural textures, reclaimed wood booths, and lush potted greenery.',
        decorNotes: 'Burlap runners, potted native saplings, hand-lettered chalkboard signs, solar lantern strings.',
      },
    ],
    activities: [
      { title: 'Heirloom Seed & Plant Cutting Swap', audience: 'All Ages', description: 'Neighbors exchange garden seeds, saplings, and care advice at an open botanical table.' },
      { title: 'Upcycled Percussion Jam Circle', audience: 'Children & Families', description: 'Interactive community rhythm workshop using instruments made from bamboo and recycled materials.' },
    ],
    dietaryConsiderations: [
      'Locally sourced organic millet snacks from regional farm cooperatives.',
      'BYO-cup filtered drinking water hydration stations.',
    ],
    accessibilityHighlights: [
      'Step-free paved walkways between all stall booths with wheelchair passing space.',
      'Tactile high-contrast map and sign language interpreter for opening address.',
    ],
    isSampleMode: true,
  };
}
