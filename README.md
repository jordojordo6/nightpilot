# NightPilot

AI-powered taste engine that learns what you like and plans your perfect night out. Swipe through restaurants and bars, build a taste profile, and get personalized dinner + drinks recommendations.

Live in Amsterdam, Dublin, and Vancouver.

## Quick Start (Local Dev)

```bash
npm install
npm run dev          # opens at localhost:5173
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. In **Settings > Environment Variables**, add:
   - `ANTHROPIC_API_KEY` — your Anthropic API key (required for Wine Lens)
4. Click **Deploy**. Vercel auto-detects the Vite config and the `api/` serverless function.
5. Every `git push` to `main` triggers a new deploy automatically.

## Test on iPhone

1. Deploy to Vercel (see above) to get your `*.vercel.app` URL.
2. Open the URL in Safari on your iPhone.
3. Tap **Share > Add to Home Screen** to install as a PWA-style app.
4. Test the full flow: pick a city, swipe 8+ venues, build your night, tap Share/Map/Search on results.
5. For Wine Lens: take a photo of any wine list and tap Analyze.

## How It Works

**Swipe Phase** — Browse venue cards. Swipe right to like, left to skip, up to save. Each swipe updates your taste profile (tag weights, neighborhood preferences, price comfort).

**Build My Night** — Pick your occasion, budget, neighborhood, and plan type (dinner only, drinks only, or both). The engine scores every venue against your profile and pairs complementary restaurants + bars.

**Wine Lens** — Photograph a wine list at a restaurant. The app sends the image + your taste profile to Claude, which returns personalized wine picks ranked by match confidence.

## Project Structure

```
src/
  App.tsx              — main app shell and state management
  types.ts             — TypeScript types (Venue, TasteProfile, Plan, etc.)
  data/
    cities.ts          — city registry (Amsterdam, Dublin, Vancouver)
    venues.ts          — Vancouver venues (35)
    dublin.ts          — Dublin venues (35)
    amsterdam.ts       — Amsterdam venues (33)
    neighborhoods.ts   — proximity map for walk time estimates
  engine/
    taste.ts           — taste profile engine (scoring, undo, analysis)
    recommendations.ts — plan generator (dinner, drinks, both modes)
    analytics.ts       — localStorage event logging
    storage.ts         — state persistence helpers
    wine.ts            — wine taste profile storage
  screens/             — LandingScreen, SwipeScreen, NightModeScreen, ResultsScreen, WineLensScreen
  components/          — VenueCard, RecommendationCard, SettingsModal, Toast, ProgressBar, DebugPanel
api/
  wine-lens.ts         — Vercel serverless function (Claude vision API)
```

## Scripts

```bash
npm run dev        # local dev server
npm run build      # production build
npm run typecheck  # TypeScript check only
npm run lint       # ESLint
npm test           # unit tests (after npm install)
npm run test:watch # watch mode
```

## Feedback Collection

The app collects two types of feedback:

- **Quick feedback** — inline buttons after results ("Yes, surprisingly accurate" / "Kind of" / "Not really"), sent to Google Sheets via Apps Script
- **Detailed feedback** — links to Google Forms (separate forms for Night Mode and Wine Lens)

All analytics events are also logged to localStorage for debugging (open DevTools > Application > Local Storage > look for `nightpilot_events`).

## Tech Stack

React 19, TypeScript, Vite, Vercel (hosting + serverless), Claude API (Wine Lens vision)
