# NightPilot — GTM Onboarding Brief

**Last updated:** May 2026
**For:** Go-to-market, user acquisition, partnerships
**Product owner:** Jordan Bhullar

---

## What NightPilot Is

NightPilot is an AI-powered taste agent for going out. It learns what you like — cuisine, vibe, price range, neighborhoods — and tells you exactly where to eat, drink, and what wine to order. Think of it as a personal concierge that gets smarter every time you use it.

The product is a mobile-first web app (not a native app yet) deployed at a Vercel URL. Users open it on their phone, no download required.

## The Problem We Solve

Deciding where to go out is broken. Your options today are: scroll through hundreds of Google reviews (noisy, not personalized), ask a friend (doesn't scale, especially in a new city), or read a "Best Of" list on Eater or The Infatuation (generic, not tailored to you). None of these know *your* taste. NightPilot does.

The key insight: the downside of trying us is low. Worst case, you have a mediocre meal. Best case, you discover your new favorite spot. That risk asymmetry makes people willing to try it.

## How It Works — The User Journey

**1. Pick a city**
Currently live in: Vancouver, Dublin, Amsterdam, Salt Lake City. Each city has ~35 hand-curated restaurants and bars.

**2. Swipe to teach your taste**
Users see venue cards (name, cuisine, vibe, price, tagline) and swipe right (like), left (pass), or up (save/super-like). Each swipe trains the taste profile — the engine tracks which tags, price levels, and neighborhoods the user gravitates toward. After ~10 swipes, the profile is meaningful.

**3. Build My Night**
Users pick an occasion (date night, friends, solo, group, fancy, casual), optionally set a budget and neighborhood preference, and choose whether they want dinner, drinks, or both. NightPilot generates 3 personalized plans — each a restaurant + bar pairing with a match score, walk time between them, and an explanation of why it fits.

**4. Wine Radar**
Users photograph a wine menu at a restaurant and NightPilot's AI reads it, then recommends specific wines based on their taste profile, what they're eating, their mood, and their budget. This is the highest-engagement feature — it solves a real moment of anxiety (staring at a wine list you don't understand) and delivers value instantly.

## The Taste Engine — What Makes Us Different

Every swipe feeds a weighted scoring system:

- **Tags:** Each venue has 6-8 descriptive tags (e.g., "intimate," "craft-cocktails," "italian," "date-night"). Likes boost those tags, saves boost them 2x, rejects penalize them. Over time, the system builds a rich map of what resonates with each user.
- **Price sensitivity:** Tracks which price levels (1-4) users prefer.
- **Neighborhood affinity:** Learns which areas of the city the user gravitates toward.
- **Occasion matching:** When a user selects "date night," the engine boosts venues whose vibe and bestFor text align with romantic/intimate/upscale signals.

The profile is **portable across cities**. If you build your taste in SLC, NightPilot can immediately serve you personalized recommendations when you land in Amsterdam. This is the moat — no other product has a cross-city personal taste graph for going out.

## Current State of the Product

- **Live and deployed** on Vercel
- **4 cities**, 138 total venues, all verified open as of May 2026
- **Core features complete:** Swipe flow, taste engine, Night Mode recommendations, Wine Radar, location filtering, dietary restrictions, Michelin filtering, settings, feedback collection
- **Tech stack:** React 19 + TypeScript + Vite (frontend), Vercel serverless functions (Wine Radar API)
- **No backend/database yet** — taste profiles live in the user's browser (localStorage). This means we can't track users across devices or see aggregate usage data yet.

## What's Missing (And What We're Not Building Yet)

- **Analytics dashboard:** Events are logged locally but we have no way to see aggregate user behavior. Setting up PostHog or Mixpanel is a near-term priority so GTM efforts can be measured.
- **User accounts:** No login, no cross-device sync. Not needed for beta but will matter for retention tracking.
- **Push notifications / re-engagement:** Nothing yet. Revisit after we prove retention organically.
- **Native app:** It's a web app. PWA (add to home screen) is possible but not prioritized.
- **More cities:** Each city requires ~35 hand-curated venues. Scaling the data pipeline is a future problem.

## Key Metrics to Track

These are the numbers that tell us if the product is working:

| Metric | What it tells us | Target |
|--------|-----------------|--------|
| **Swipe completion rate** | Do people finish the swipe deck or drop off? | >60% complete 10+ swipes |
| **Night Mode conversion** | After swiping, do they build a night? | >40% of swipe completers |
| **Wine Radar usage** | Are people using the flashiest feature? | Track total scans per city |
| **Return rate (7-day)** | Do people come back next weekend? | >30% weekly return |
| **Cross-city usage** | Does someone who built a profile in one city open the app in another? | Any signal here is gold |
| **Share rate** | Do people send their plan to friends? | Track share button taps |
| **Feedback submissions** | Are people telling us what they think? | Volume + sentiment |

*Note: Most of these require analytics infrastructure (PostHog/Mixpanel) to be set up before GTM push.*

## Target User

The person who:
- Goes out 2-4x per month and cares about where they go
- Travels to other cities and wants to eat well without research
- Feels overwhelmed by wine lists
- Is 25-40, has disposable income, uses their phone for everything
- Currently asks friends, checks Instagram, or reads Eater/Infatuation lists

**The sharpest wedge:** Someone sitting at a restaurant right now, staring at a wine list. Wine Radar solves that in 10 seconds.

## GTM Priorities

### 1. Get the app into hands (not eyeballs)

We don't need awareness — we need people to actually open the app in a real going-out moment. Tactics that work for this:

- **Wine Radar demos:** Film yourself scanning a wine menu and getting a recommendation. This is inherently shareable content — it looks like magic.
- **"Let AI pick my night"** content: TikTok/Reels format. Go through the full flow on camera — swipe, build a night, go to the recommended spot, show the experience.
- **Direct seeding:** Text the link to 20 people in each city who go out frequently. Ask them to use it next time they're choosing a restaurant. Personal outreach > broadcast.
- **Restaurant/bar partnerships:** If a venue owner sees their place being recommended by an AI that actually understands taste, that's a compelling pitch. Start conversations, not deals.

### 2. Measure everything before scaling

Don't spend money on acquisition until we can see:
- Where users drop off in the funnel
- Whether they come back
- Which features they actually use

This means analytics infrastructure needs to be live before any real push.

### 3. Focus on Amsterdam first

Why Amsterdam:
- You're on the ground there
- High tourist density = lots of people who don't know where to go
- Compact city = our neighborhood/walking recommendations are highly relevant
- English-speaking enough that the app works without localization
- Food/drink culture is strong but discovery is hard for visitors

### 4. Build the feedback loop

Every conversation with an early user is data. What we want to learn:
- Did they trust the recommendation enough to actually go?
- Was the recommendation good?
- Did they use Wine Radar? When and where?
- Would they use it again unprompted?
- What would make them tell a friend?

## Monetization Path (For Context)

Not relevant yet, but useful to know the thinking:

- **Near-term:** Affiliate referrals on restaurant bookings (Resy/OpenTable)
- **Medium-term:** Premium subscription for power users ($10/month)
- **Long-term / exit:** The taste graph is the asset. Acquirers in travel/hospitality (Airbnb, Booking.com) or premium lifestyle (Amex) would pay for a portable taste engine with hundreds of thousands of profiled users.

## Venue Data

Each venue in the app has: name, type (restaurant/bar), cuisine, neighborhood, price (1-4), rating, vibe tags, descriptive tags, emoji, tagline, highlights, "best for" text, dietary flags, Michelin status, and GPS coordinates.

**Cities and venue counts:**
- Vancouver: 35 venues (18 restaurants, 17 bars)
- Dublin: 35 venues (18 restaurants, 17 bars)
- Amsterdam: 33 venues
- Salt Lake City: 35 venues (20 restaurants, 15 bars)

All venues were audited for closures in May 2026. Amsterdam had zero changes needed. Vancouver, Dublin, and SLC each had closed venues replaced with verified-open alternatives.

## How to Use Cowork With This Project

This project folder contains the full NightPilot codebase. You can open it in your own Cowork session and:

- **Ask questions** about any part of the product, data, or strategy
- **Create docs** like GTM plans, outreach templates, partnership decks — save them right in this folder and they'll sync through git
- **Research** competitors, market data, venue partnerships
- **Draft content** for social media, landing pages, or pitch materials

Just select the `nightpilot` folder when starting your Cowork session and you'll have full context.

---

*Built by Jordan Bhullar. NightPilot is an acquisition-oriented startup building the world's first portable taste graph for going out.*
