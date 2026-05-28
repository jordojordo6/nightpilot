# NightPilot — Claude Session Context

> **Purpose:** This file backs up key context from Cowork sessions so it's version-controlled on GitHub. Keep it updated as the project evolves.
>
> **Last updated:** 2026-05-28

---

## About the Founder

Jordan Bhullar is building NightPilot as an acquisition-oriented startup. He's technically capable (terminal, git, Vercel deploys) but isn't a developer by trade — he needs step-by-step guidance for dev tooling and prefers concise instructions over long explanations. Based in Vancouver. Values shipping fast over over-engineering.

## Product Vision

NightPilot is a personal AI taste agent for going out. The core thesis: own the personalized decision layer before someone books, eats, drinks, or orders wine. It replaces the fragmented behavior of checking Google Maps, Yelp, TikTok, texting friends, OpenTable, and Instagram saves.

**Hero use case:** "I'm in a city tonight and don't know where to go."

**Key features in the vision:**
- Taste Graph — learns from behavior (swipes, saves, time-on-card, bookings, wine scans), not forms
- Vibe Graph — venue-level tagging (romantic, divey, speakeasy, cocktail-forward, etc.)
- Night Mode — intent-based itinerary generation (dinner + drinks + walk time)
- Wine Radar — photo of wine list → personalized recommendations via Claude vision API
- Multi-city portability — taste profile travels with the user
- Celebrity/Expert Personas — recommendation styles (future feature)
- Built-in reservations — deep links then API integration (future feature)

**Data moat:** Proprietary taste data from actual behavior, not scraped reviews.

**Revenue path:** Reservation affiliate → premium subs → B2B licensing / acquisition.

**Acquisition targets:** OpenTable/Booking Holdings, Resy/Amex, Yelp, Google Maps, Airbnb, Uber, TripAdvisor.

## Current State (May 2026)

- **Live at:** nightpilot.vercel.app
- **4 cities:** Vancouver (35 venues, 30 with photos), Dublin (35), Amsterdam (33, 11 with photos), Salt Lake City (35) — 138 total
- **Tech stack:** React 19 + TypeScript + Vite, Vercel serverless functions, Claude API (Wine Radar)
- **No backend/database** — taste profiles in localStorage. No user accounts, no cross-device sync.
- **All venues audited** for closures as of May 2026

### Features Complete
- Swipe flow with taste engine (tag weights, price sensitivity, neighborhood affinity)
- Night Mode: occasion, budget, neighborhood, plan type (dinner/drinks/both), location filter (GPS/address/radius with walk/bike/drive)
- Wine Radar: camera capture, multi-page wine lists, mood/voice input, food pairing chips, wine taste profile, confidence scoring
- Settings: dietary restrictions, Michelin filter
- Venue images via OG tags (three-state loading, cache detection, referrerPolicy for hotlink bypass)
- VenueCard keyed by venue.id to prevent image state contamination
- Feedback collection: quick feedback to Google Sheets, detailed feedback to Google Forms
- Analytics events logged to localStorage
- Share functionality (clipboard + native share sheet)

### What's Missing
- Analytics dashboard (PostHog/Mixpanel) — can't see aggregate user behavior yet
- User accounts / cross-device sync
- Push notifications / re-engagement
- Native app (currently mobile web / PWA)
- More cities (each requires ~35 hand-curated venues)

## Critical Rules

### TOS Compliance (MANDATORY)
Every proposed feature, integration, or enhancement must be checked for third-party Terms of Service compliance before building. Do not assume an API or data source is fair game just because it's technically accessible.

**Origin:** We discovered Google Places API photos were being displayed outside a Google Map, violating their TOS. This could have exposed the project to legal risk.

**How to apply:**
- Review TOS for any third-party API, image source, data feed, or service before implementing
- Flag compliance issues proactively
- If TOS is ambiguous, default to the conservative interpretation
- Applies to: image sourcing, venue data, map embeds, booking APIs, analytics, AI APIs, scraping, affiliate links — everything
- Include a TOS compliance note when presenting integration options

### Deletion Policy
Always ask Jordan before deleting anything. No exceptions.

### Wine Radar Scope
Wine-only for MVP. Expanding to cocktail/beer/food menus was discussed and deferred — validate the wine use case first.

### Internal vs User-Facing Naming
Internal code names (WineLensScreen, /api/wine-lens, onWineLens props) stay as-is to minimize diff size. Only user-facing text, analytics events, and docs use the current branding.

## GTM Strategy

- **Focus city:** Amsterdam (Jordan is on the ground there, high tourist density, compact walkable city)
- **Sharpest wedge:** Wine Radar — someone at a restaurant staring at a wine list
- **Tactics:** Wine Radar video demos, "let AI pick my night" content (TikTok/Reels), direct seeding to 20 frequent diners per city, restaurant partnership conversations
- **Prerequisite:** Analytics infrastructure must be live before any real acquisition push

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app shell and state management |
| `src/engine/taste.ts` | Taste profile engine (scoring, undo, analysis) |
| `src/engine/recommendations.ts` | Plan generator (dinner, drinks, both modes) |
| `src/screens/SwipeScreen.tsx` | Swipe deck with keyed VenueCards |
| `src/screens/WineLensScreen.tsx` | Wine Radar UI (internal name kept as WineLens) |
| `api/wine-lens.ts` | Vercel serverless function for Claude vision API |
| `src/data/venues.ts` | Vancouver venues |
| `src/data/dublin.ts` | Dublin venues |
| `src/data/amsterdam.ts` | Amsterdam venues |
| `src/data/slc.ts` | Salt Lake City venues |
| `scripts/inject-og-images.mjs` | OG image enrichment with URL validation |
| `scripts/audit-images.mjs` | Image audit diagnostic |

## Recent Work Log

- **2026-05-28:** Amsterdam OG image pipeline — added websiteUrl to 31/33 venues, ogImage to 11/33 venues (real photos only, logos/TOS violations/broken URLs rejected). Created CLAUDE_CONTEXT.md as cloud-backed memory. Saved TOS compliance rule to persistent memory.
- **2026-05-27:** Fixed VenueCard keying bug (images breaking after ~25 swipes), improved image loading (three-state, cache detection), renamed Wine Lens → Wine Radar (user-facing only), logo sketch render
- **2026-05-26:** Venue closure audit across 4 cities, replaced 8 closed venues, wrote GTM onboarding doc, venue photo pipeline (OG images for Vancouver)
- **2026-05-25:** SLC city launch, location filter with haversine distance, walk/bike/drive radius, multi-neighborhood selection
