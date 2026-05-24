# AGENTS.md
## Project
NightPilot is a mobile-first MVP for personalized dinner, bar, and night-out recommendations.
## Product Principle
Build the smallest impressive version of the core magic:
swipe taste tuning → personalized dinner/drinks recommendations → booking/map action.
## Engineering Principles
- Prefer simple, typed TypeScript.
- Keep components small and reusable.
- Avoid premature infrastructure.
- No external API dependencies in v0.
- Prioritize demoability and speed.
- Build in a way that can later support Supabase, embeddings, OpenAI, and reservation APIs.
## UX Principles
- Mobile-first.
- Minimal friction.
- No long forms.
- Prefer swipes, taps, saves, and implicit signals.
- Recommendations should explain "why this fits you."
## Current Exclusions
Do not add:
- auth
- payments
- real reservations
- native app code
- complex ML
- production database
- social features
## Validation
Before finishing tasks:
- run npm run lint if available
- run npm run typecheck if available
- run npm run build if available
- fix errors before reporting completion
