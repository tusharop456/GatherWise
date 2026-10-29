# GatherWise 🌸✨

**GenAI-Powered Event Planning Assistant for Weddings, Birthdays, and Community Gatherings**

GatherWise is a full-stack event-planning workspace engineered for the hackathon challenge:
> *"Create a GenAI-powered planning assistant that helps users organize weddings, birthdays, and community events with budgets, timelines, vendor checklists, and personalized ideas."*

---

## Table of Contents
- [Executive Overview](#executive-overview)
- [Design Aesthetics & Product Experience](#design-aesthetics--product-experience)
- [Core Planning Modules](#core-planning-modules)
- [System Architecture](#system-architecture)
- [Security & AI Safety Boundary](#security--ai-safety-boundary)
- [Setup & Environment Configuration](#setup--environment-configuration)
- [Running Tests & Quality Assurance](#running-tests--quality-assurance)
- [Judging Criteria & Rubric Evidence Table](#judging-criteria--rubric-evidence-table)
- [Demo Walkthrough](#demo-walkthrough)
- [Known Limitations & Engineering Decisions](#known-limitations--engineering-decisions)

---

## Executive Overview

Planning large celebrations often suffers from fragmented spreadsheets, unrealistic arithmetic, double-counted vendor estimates, and generic advice. GatherWise solves this with:

1. **Deterministic Financial Normalization**: AI model arithmetic is never authoritative. Budget allocations, including a mandatory visible contingency buffer (5–10%), are scaled to equal the total budget limit exact to the integer minor unit (paise/cents).
2. **Date-Only Calendar Semantics**: All timeline and event dates use strict calendar arithmetic (`YYYY-MM-DD`), preventing timezone shifts from altering days.
3. **Compressed Preparation Detection**: Dynamically warns organizers if remaining runway is compressed (<60 days for weddings, <21 days for birthdays/community events), surfacing critical path milestones.
4. **Isolated Vendor Benchmarks**: Vendor quotes are tracked for negotiation and comparison checklists (accessibility, sound curfews, dietary isolation) without contaminating budget calculations unless explicitly synced.
5. **Secure Dual-Mode AI Gateway**: Seamlessly supports live Google Gemini API (`gemini-2.5-flash`) via `@google/genai` and server-side secrets. If a key is present but no call has succeeded, the status reflects **AI configured — unverified**. Only an actual successful upstream generation and validation produces a **Verified Live Request**. If no key is set, GatherWise automatically runs in a clearly badged **Curated Sample Mode**, preserving full end-to-end functionality without hallucinating live calls.

---

## Design Aesthetics & Product Experience

GatherWise implements a bespoke, WCAG AA compliant design system:
- **Palette**: Warm ivory background (`#FAF7F2`), readable dark charcoal text (`#1C1917`), restrained deep plum (`#63234F`), and calming teal (`#0D6E6E`).
- **Typography**: Clean, geometric typography leveraging the Inter typeface with generous whitespace and clear visual hierarchy.
- **Micro-Animations & Motion**: Smooth CSS micro-transitions respecting `@media (prefers-reduced-motion: reduce)`.
- **Navigation**: Desktop sidebar and accessible mobile tab bar with active `aria-current="page"` indicators.
- **Honesty & Integrity**: Zero fake reviews, zero invented vendor ratings, zero decorative buttons that do nothing.

---

## Core Planning Modules

### 1. Event Setup & Specification
- Collects event name, type (`wedding`, `birthday`, `community`), calendar date, city/general location, guest count, total budget, currency (default `INR ₹`), thematic/atmosphere preferences, dietary accommodations, and accessibility requirements.
- Inline form validation using `aria-describedby` error bindings. Rejects past dates, zero/negative budgets, and guest counts above 100,000.
- Provides 3 pre-built sample event loaders (Wedding, Birthday, Community) clearly labeled as sample templates.

### 2. Event Overview & Real-Time Summaries
- Real-time calculations derived from application state:
  - Budget Limit, Total Planned, Total Actual Spending.
  - Unallocated or Over-Budget Amount with prominent warning banners.
  - Task completion progress bar and upcoming task status.
  - Vendor confirmation metrics.
  - Near-term compressed timeline warnings.

### 3. Budget Planner
- Editable rows: Category Name, Planned Amount, Actual Amount, Notes, and Buffer tags.
- Minor unit scaling eliminates floating-point arithmetic drift.
- Inline row addition and deletion.
- **AI Budget Reduction Advisor**: Evaluates categories, generates targeted cost-saving alternatives, and calculates exact savings in code before user confirmation.

### 4. Timeline & Checklists
- Tasks categorized with title, category, due date, owner, completion checkbox, and critical milestone flags.
- Validates that tasks cannot be scheduled in the past or after the event date.
- Real-time state indicators: `Upcoming`, `Due Today`, `Overdue`, and `Completed`.
- Filterable by Status (All, Pending, Completed, Overdue) and Category.

### 5. Vendor Tracker
- Tracks vendor proposals across categories: Venue, Catering, Decor, Entertainment, Photography, Equipment, Logistics.
- Comparison checklists tailored to category:
  - *Venue*: Capacity certification, step-free access, curfew hours, generator backup.
  - *Catering*: Allergen isolation, Jain counters, tasting completion, staffing ratio.
  - *Decor*: Setup window, candle safety compliance, zero-thermocol policy.
- Explicit "Sync Quote to Budget" action to avoid double-counting.

### 6. Personalized Ideas Board
- AI-generated themes with decor palettes, lighting notes, and materials.
- Demographically targeted guest engagement activities (e.g. stomp rocket workshops, folk music circles).
- Hospitality notes for dietary care and universal accessibility.

---

## System Architecture

```
gatherwise/
├── package.json              # Full-stack dependencies and scripts
├── tsconfig.json             # Strict TypeScript configuration
├── vite.config.ts            # Vite bundler, proxy to port 3001, Vitest setup
├── .env.example              # Environment variable template
├── server/
│   ├── index.ts              # Express server with rate limiting, CORS, & AI routes
│   ├── gemini.ts             # Google Gemini client with timeout & safety wrappers
│   ├── prompts.ts            # Isolated system prompts separating untrusted user data
│   ├── validator.ts          # Server-side payload & AI response schema validation
│   └── sampleData.ts         # Deterministic sample proposal generator
├── src/
│   ├── main.tsx              # React entrypoint
│   ├── App.tsx               # Main state container & modal coordinators
│   ├── index.css             # Ivory, plum & teal design tokens & print styles
│   ├── test-setup.ts         # JSDOM mocks (localStorage, URL.createObjectURL)
│   ├── types/index.ts        # TypeScript domain models
│   ├── utils/
│   │   ├── budget.ts         # Minor-unit math, formatting, exact normalization
│   │   ├── dates.ts          # Date-only arithmetic, compressed runway analysis
│   │   ├── validation.ts     # Input validation rules & inline error mappings
│   │   ├── storage.ts        # Versioned LocalStorage with error recovery
│   │   └── export.ts         # Clean JSON export & print triggers
│   ├── services/
│   │   └── aiService.ts      # Client API service with AbortController support
│   ├── data/
│   │   └── sampleEvents.ts   # Rich sample datasets (Wedding, Birthday, Community)
│   └── components/
│       ├── Header.tsx
│       ├── Navigation.tsx
│       ├── EventOverview.tsx
│       ├── BudgetPlanner.tsx
│       ├── TimelineManager.tsx
│       ├── VendorTracker.tsx
│       ├── IdeasBoard.tsx
│       ├── EventSetupModal.tsx
│       ├── ProposalReviewModal.tsx
│       ├── BudgetReductionModal.tsx
│       ├── PrivacyNoticeModal.tsx
│       ├── ConfirmDialog.tsx
│       └── Toast.tsx
└── tests/
    ├── budget.test.ts        # Minor units, allocation normalization, overbudget math
    ├── dates.test.ts         # Calendar boundaries, compressed timeline checks
    ├── validation.test.ts    # Form bounds, character limits, past date rejections
    ├── storage.test.ts       # LocalStorage schema versioning & corruption handling
    ├── aiSchema.test.ts      # Server-side AI boundary & schema validation
    ├── components.test.tsx   # React component workflows & state updates
    └── e2e.test.tsx          # Full end-to-end integration journey
```

---

## Security & AI Safety Boundary

1. **No Embedded Secrets**: Client code contains no API keys or internal system prompts.
2. **Untrusted Data Isolation**: Event notes and user text are demarcated in `<UNTRUSTED_USER_NOTES>` blocks and separated from system instructions.
3. **No Tool or Shell Access**: The Gemini model is strictly configured for structured JSON text output with no shell, database, or URL-fetching execution permissions.
4. **Input & Output Validation**: Incoming request payloads are checked for character limits and bounds. AI responses are parsed through strict schema validators before reaching client state.
5. **Rate Limiting & Timeouts**: In-memory sliding-window rate limiter (25 requests/min per IP) and strict 30-second request timeouts via `AbortController`.
6. **Privacy Notice**: A modal disclosure explains exactly what parameters are transmitted before any AI operation is executed.
7. **Safe DOM Rendering**: Controlled React components only; zero usage of `dangerouslySetInnerHTML`.

---

## Setup & Environment Configuration

### Prerequisites
- Node.js (v18+ recommended, verified on v26)
- npm (v9+)

### Installation
```bash
git clone <repository_url>
cd hack2skill
npm install
```

### Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env`:
```ini
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```
> **Status Lifecycle**:
> - **Sample Mode Active**: When `GEMINI_API_KEY` is omitted or empty. GatherWise operates in clearly badged Curated Sample Mode.
> - **AI configured — unverified**: When `GEMINI_API_KEY` is detected in `.env`, but no live request has yet succeeded against Google.
> - **Live Gemini Verified**: Transitioned only after an actual upstream request succeeds against Google and passes strict schema validation.

### Running Locally (Development)
To run both the backend server and frontend client concurrently:
```bash
npm run dev:all
```
- Client runs on: `http://localhost:3000`
- API server runs on: `http://localhost:3001`
- Vite proxies `/api` requests to port 3001 during local development.

Or run them individually in separate terminals:
```bash
# Terminal 1: Backend Server (runs on port 3001)
npm run server

# Terminal 2: Frontend Vite Server (runs on port 3000)
npm run dev
```

---

## Deploying to Render (Single Node Web Service)

GatherWise is architected to deploy as a unified **Single Node Web Service** on Render. The Express server binds to `0.0.0.0` and `process.env.PORT`, handles all `/api` endpoints on the same origin, returns JSON 404 responses for any unknown `/api` requests, and serves the pre-compiled Vite production frontend from `dist/` with client-side SPA fallback.

### Render Configuration Settings

| Setting | Value | Description |
| :--- | :--- | :--- |
| **Service Type** | Web Service | Standard Render Web Service |
| **Environment** | `Node` | Node.js v18+ |
| **Build Command** | `npm install && npm run build` | Installs dependencies, runs typecheck (`tsc`), and builds Vite bundle to `dist/` |
| **Start Command** | `npm start` | Launches Express server (`tsx server/index.ts`) on `0.0.0.0:$PORT` |

### Required Environment Variables (Render Dashboard)

Configure these in the **Environment** tab of your Render service:

| Variable | Required? | Example / Default | Purpose |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes (automatic) | `production` | Enables production mode and static asset caching |
| `PORT` | Yes (automatic) | Assigned by Render (e.g. `10000`) | Server automatically reads `process.env.PORT` and binds to host `0.0.0.0` |
| `GEMINI_API_KEY` | Recommended | `AIzaSy...` (secret) | Kept exclusively server-side. If omitted, app operates in Curated Sample Mode |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | Gemini model variant (defaults to `gemini-2.5-flash`) |

> **Security Note**: Never prefix `GEMINI_API_KEY` with `VITE_`. The API key is kept strictly on the backend and is never exposed in the client bundle.

---

## Running Tests & Quality Assurance

GatherWise includes 73 automated tests across 9 comprehensive test suites built on Vitest and React Testing Library:
- **Baseline Test Suite (48 tests)**:
  - `tests/budget.test.ts` (8 tests): Minor-unit integer math, allocation normalization, over-budget indicators.
  - `tests/dates.test.ts` (10 tests): Calendar date arithmetic, leap years, compressed runway detection.
  - `tests/validation.test.ts` (13 tests): Input bounds, past date rejection, field sanitization.
  - `tests/storage.test.ts` (5 tests): LocalStorage versioning, recovery from corrupted JSON.
  - `tests/aiSchema.test.ts` (4 tests): Server schema boundaries and deterministic normalization.
  - `tests/components.test.tsx` (7 tests): Tab navigation, budget updates, task toggle, privacy gate, sample switching.
  - `tests/e2e.test.tsx` (1 test): Complete end-to-end planning journey.
- **Live AI Failure & Resilience Suite (17 tests)**:
  - `tests/liveAiFailure.test.ts` (17 tests): Truncation detection (`MAX_TOKENS`), abnormal stop reasons (`SAFETY`), malformed JSON handling, markdown fence stripping, active upstream timeout abort, AbortSignal cancellation, upstream HTTP 401/403/429/503 translation, strict preservation of user edits upon generation failure, and per-operation live verification tracking.
- **Production Server & Routing Suite (8 tests)**:
  - `tests/productionServer.test.ts` (8 tests): Single-origin `/api/health` response, unknown `/api` JSON 404 isolation (guaranteed never returning HTML), input validation on `/api/ai/proposal`, static asset delivery (`dist/index.html`), client SPA fallback routing, and reverse proxy trust configuration (`trust proxy`).

```bash
# Run all 73 automated tests
npm test

# Run tests in watch mode
npm run test:watch

# Run TypeScript compile and production build
npm run build

# Start production server locally (serves built dist/ on PORT)
npm start
```

---

## Judging Criteria & Rubric Evidence Table

| Criterion | Implemented Features & Technical Architecture | Verification / Test Evidence |
| :--- | :--- | :--- |
| **1. Code Quality** | Modular TypeScript architecture with separated concerns: domain types (`src/types`), pure math (`src/utils/budget.ts`), date logic (`src/utils/dates.ts`), validation (`src/utils/validation.ts`), and storage (`src/utils/storage.ts`). Strict compiler settings (`strict: true`, `noUnusedLocals: true`). | `npm run build` compiles with zero warnings or errors. 73/73 tests passing in `tests/`. |
| **2. Security** | Server-side API endpoint for Gemini model calls via `@google/genai`; server-side secret isolation; in-memory sliding window rate limiter (25 req/min); payload size cap (100kb); active upstream socket timeout abort; untrusted user notes isolation in prompts; zero tool execution permissions; zero `dangerouslySetInnerHTML`. Privacy notice shown prior to first AI call. `.env` strictly gitignored while `.env.example` remains tracked. | Validated in `server/validator.ts`, `server/prompts.ts`, and tested in `tests/aiSchema.test.ts`, `tests/liveAiFailure.test.ts` & `tests/components.test.tsx`. |
| **3. Efficiency** | Integer minor unit arithmetic (paise/cents) eliminates rounding drifts; single source of truth for budget and task totals (derived in real-time, no duplicate state); AbortController actively cancels upstream HTTP sockets; lazy modal rendering; bundle size under 300kB gzip-optimized. | Tested in `tests/budget.test.ts`; verified in Vite production build (`dist/assets/index-N4Qa1e-H.js` = 79.47 kB gzip). |
| **4. Testing** | Comprehensive 73-test suite covering budget math, allocation normalization, date edge cases (leap years, month/year boundaries), compressed runways, LocalStorage corruption recovery, server payload validation, component workflows, full end-to-end user journeys, mocked truncation detection (`MAX_TOKENS`), timeouts with upstream cancellation, upstream 401/429/503 resilience, and production single-origin routing / SPA fallback. | `vitest run` executes 9 test suites, 73 tests passing with exit code 0. |
| **5. Accessibility** | WCAG AA color contrast (ivory `#FAF7F2`, plum `#63234F`, teal `#0D6E6E`); semantic landmarks (`<header>`, `<nav>`, `<main>`, `<section>`); complete keyboard navigation with visible `:focus-visible` rings; minimum 44px touch targets; ARIA roles (`role="dialog"`, `aria-modal="true"`, `aria-describedby` for errors, `aria-live="polite"` for toasts); ESC key listeners; reduced motion support. | Built in `src/index.css` and verified in component DOM tests in `tests/components.test.tsx`. |
| **6. Problem Statement Alignment** | Fully fulfills the hackathon challenge: supports weddings, birthdays, and community events with tailored budgets, milestone timelines, category-specific vendor vetting checklists, and personalized themes/activities. | Verified across all 3 event types in `src/data/sampleEvents.ts` and automated E2E test in `tests/e2e.test.tsx`. |

---

## Demo Walkthrough

### 1. Royal Eco-Heritage Wedding (`/` -> Sample Wedding)
- **Parameters**: 250 Guests in Jaipur, ₹18,00,000 budget, Marwari-Punjabi fusion rituals, zero single-use plastics.
- **Budget**: 7 balanced categories totaling ₹18,00,000 with dedicated ₹90,000 emergency buffer.
- **Timeline**: 120-day phased roadmap (venue deposit, catering tasting, decor CAD mockup, invitation dispatch, buggy transport).
- **Vendors**: Tracks Haveli Heritage Palace with capacity, curfew, and backup power checklists.
- **Ideas**: Genda Phool & Terracotta Splendor theme, interactive lacquer bangle artisans, Jain live counters.

### 2. 10th Cosmic Explorer Birthday (`Load Sample -> Birthday`)
- **Parameters**: 35 Guests in Bengaluru, ₹75,000 budget, nut-free allergy protocol, sensory quiet corner.
- **Budget**: Scaled allocations for recreation hall, STEM rocket kits, custom galaxy cake, and astronaut return favors.
- **Timeline**: 28-day schedule with critical priority science instructor bookings.
- **Vendors**: Tracks RocketLab Science workshop with safety goggle inclusion and nut-free bakery verification.

### 3. Greenfield Earth Day Eco-Fair (`Load Sample -> Community`)
- **Parameters**: 600 Guests in Pune, ₹2,50,000 budget, municipal permits, volunteer marshals, zero waste.
- **Budget**: Staging, solar sound system, eco-sanitation permits, volunteer kits, hydration points.
- **Timeline**: 45-day civic roadmap (park permits, volunteer training, sign language interpreter booking).
- **Vendors**: Paved canopy infrastructure and compost facility logistics.

---

## Known Limitations & Engineering Decisions

1. **In-Memory Rate Limiter**: The sliding-window rate limiter in `server/index.ts` operates in Node memory. For multi-instance clustered or serverless deployments, a shared Redis store would be implemented.
2. **Local Storage Persistence**: For this MVP, events are persisted in the browser's `localStorage` (`gatherwise_event_plan_v1`). Multi-device collaborative sync would require an authenticated database backend.
3. **Single Currency per Event**: Exchange rate conversions are intentionally avoided to maintain financial accuracy without fabricated conversion factors.
