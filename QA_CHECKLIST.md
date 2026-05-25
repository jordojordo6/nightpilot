# NightPilot QA Checklist — Beta Release (4 Cities)

## Setup
- [ ] Run `npm install` (installs vitest for tests)
- [ ] Run `npm run typecheck` — should pass with no errors
- [ ] Run `npm run build` — should produce clean Vite build
- [ ] Run `npm test` — all unit tests should pass
- [ ] Deploy to Vercel and confirm live URL loads

## City Selector
- [ ] App launches to city picker on fresh visit (no localStorage)
- [ ] All 4 cities listed alphabetically: Amsterdam, Dublin, Salt Lake City, Vancouver
- [ ] Selecting a city navigates to Landing Screen
- [ ] City flag emoji renders correctly on mobile (🇳🇱 🇮🇪 🇺🇸 🇨🇦)

## Landing Screen
- [ ] "Start Swiping" button navigates to Swipe Screen
- [ ] "Wine Lens" button navigates to Wine Lens
- [ ] "Change City" option returns to city picker
- [ ] Swipe count displays correctly
- [ ] City name appears in header

## Swipe Screen (test per city)
- [ ] Cards display with emoji, name, cuisine, neighborhood, price
- [ ] Gradient header renders correctly
- [ ] Highlights and tags display on card
- [ ] **Swipe right** = like (card animates out right)
- [ ] **Swipe left** = nope (card animates out left)
- [ ] **Swipe up** = super like (card animates up, "Super liked! ★" toast)
- [ ] **Button controls** work: ✗, ♥, ★
- [ ] **Undo button** appears after first swipe and reverses the last action
- [ ] Undo toast appears: "Undo!"
- [ ] Progress bar advances with each swipe
- [ ] "Build My Night" button appears after sufficient swipes
- [ ] Back button returns to Landing Screen
- [ ] Venue count matches expected (35 Van, 35 Dublin, 33 Amsterdam, 35 SLC)

## Settings (⚙️ gear icon)
- [ ] Gear icon visible on all screens except city picker
- [ ] Settings modal opens/closes cleanly
- [ ] **Dietary Restrictions** section appears above Michelin
- [ ] Selecting dietary restrictions filters restaurants in swipe deck
- [ ] **Michelin Guide** section shows with rosette SVG icons
- [ ] Michelin filter works (only shows matching restaurants — note: SLC has no Michelin venues)
- [ ] Gear icon turns purple when dietary filter active
- [ ] Gear icon turns red when Michelin filter active
- [ ] Settings persist across page reloads

## Night Mode (Build My Night)
- [ ] Occasion selector works (date, friends, fancy, casual, solo, group)
- [ ] Budget selector works ($–$$, $$–$$$, $$$+)
- [ ] Neighborhood selector shows neighborhoods from current city only
- [ ] Plan type selector works: Dinner Only, Drinks Only, Dinner + Drinks
- [ ] "Find My Night" button generates results
- [ ] Taste profile summary shows tags from swiping history

## Results Screen
- [ ] Plan dots show at top (up to 3 plans), tappable
- [ ] Plan name, icon, and match score (X% match) display
- [ ] Driving tags display as pills
- [ ] "Why this fits you" section explains match
- [ ] **Dinner Only** mode: shows restaurant card, no bar
- [ ] **Drinks Only** mode: shows bar card, no restaurant
- [ ] **Dinner + Drinks** mode: shows restaurant + pairing rationale + bar
- [ ] Pairing rationale mentions neighborhoods and walk time
- [ ] Recommendation cards show: emoji, name, cuisine, neighborhood, price, rating
- [ ] 🎯 explanation text is personalized (not generic)
- [ ] Highlight pills display
- [ ] **🔍 Search** button opens Google search for the venue in new tab
- [ ] **📍 Map** button opens Google Maps in new tab with correct venue + city
- [ ] **📋 Copy** button copies venue details to clipboard
- [ ] **Share This Night 📤** copies plan summary to clipboard (or opens native share sheet on mobile)
- [ ] Share message includes NightPilot link at the bottom
- [ ] Quick feedback: "Yes, surprisingly accurate" / "Kind of" / "Not really"
- [ ] Selecting feedback sends to Google Sheets (check quick_feedback tab)
- [ ] "Share detailed feedback →" opens Google Form in new tab
- [ ] "Keep Swiping" returns to swipe screen
- [ ] "Start Over" shows confirmation dialog mentioning memory/swipes, then resets

## Wine Lens
- [ ] Take Photo button opens camera (mobile)
- [ ] From Photos button opens gallery / file picker
- [ ] Photo thumbnails appear after capture
- [ ] ✕ button removes individual photos
- [ ] "Clear" removes all photos
- [ ] Mood text input works (typing)
- [ ] 🎤 Voice input works on supported browsers (Safari, Chrome)
- [ ] Food pairing chips toggle on/off (only one at a time)
- [ ] Taste profile indicator shows if user has swiped venues or rated wines
- [ ] "Analyze" button sends to API and shows "Analyzing..." state
- [ ] Results display: wine cards with badge, name, grape, region, price, why, pairs with
- [ ] Confidence dots (1-5) render correctly
- [ ] "Maybe Skip" section shows wines to avoid
- [ ] "I ordered this" button opens star rating UI
- [ ] Star rating saves to wine profile
- [ ] Wine profile summary shows after rating wines
- [ ] Quick feedback sends to Google Sheets (check wine_lens tab)
- [ ] "Share detailed feedback →" opens Wine Lens Google Form (separate from Night Mode)
- [ ] "Scan Another List" resets and returns to capture UI
- [ ] Back button returns to Landing

## Analytics & Data
- [ ] Open browser DevTools → Application → Local Storage
- [ ] Verify `nightpilot_taste` updates after swipes
- [ ] Verify `nightpilot_events` logs events with city field
- [ ] Verify `nightpilot_city` persists selected city
- [ ] Google Sheets receives data in correct tabs:
  - `quick_feedback` — Night Mode quick feedback with city
  - `wine_lens` — Wine Lens quick feedback with city
  - `Night Mode Detailed` — Night Mode Google Form responses
  - `Wine Lens Detailed` — Wine Lens Google Form responses

## Cross-City Regression
- [ ] Taste profile persists across city switches (tags carry over)
- [ ] Swipe count and swiped IDs reset on city switch
- [ ] Switch cities: fresh venues appear, no old city venues shown
- [ ] Generate Night Mode recommendations in each city — only local venues appear
- [ ] Verify no hardcoded city names appear in the wrong context

## 4-City Beta Testing Flow

### Amsterdam 🇳🇱
- [ ] Select Amsterdam → 33 venues in deck
- [ ] Swipe 10+ cards (mix of like/nope/super like)
- [ ] Generate Dinner + Drinks → both venues are Amsterdam
- [ ] Click 🔍 Search → opens correct Google search
- [ ] Click 📍 Map → opens Google Maps in Amsterdam
- [ ] Share This Night → text includes NightPilot link

### Dublin 🇮🇪
- [ ] Select Dublin → 35 venues in deck
- [ ] Swipe 10+ cards
- [ ] Generate Dinner + Drinks → both venues are Dublin
- [ ] Click 🔍 Search → correct venue + Dublin search
- [ ] Click 📍 Map → opens Google Maps in Dublin
- [ ] Neighborhood filter shows Dublin neighborhoods

### Salt Lake City 🇺🇸
- [ ] Select Salt Lake City → 35 venues in deck
- [ ] Cards show "Downtown" (not "Downtown SLC")
- [ ] Swipe 10+ cards
- [ ] Generate Dinner Only → SLC restaurants only
- [ ] Generate Drinks Only → SLC bars only
- [ ] Generate Dinner + Drinks → SLC restaurant + SLC bar
- [ ] Click 🔍 Search → venue + "Salt Lake City" + correct type (restaurant/bar)
- [ ] Click 📍 Map → opens Google Maps in SLC
- [ ] Neighborhood selector shows SLC neighborhoods (Downtown, Sugar House, etc.)
- [ ] Wine Lens works with SLC taste profile
- [ ] Michelin filter OFF shows all 35 venues
- [ ] Michelin filter ON shows 0 restaurants (SLC has no Michelin venues) + 15 bars

### Vancouver 🇨🇦
- [ ] Select Vancouver → 35 venues in deck
- [ ] Swipe 10+ cards
- [ ] Generate Dinner + Drinks → both venues are Vancouver
- [ ] Click 🔍 Search → correct venue + Vancouver search
- [ ] Click 📍 Map → opens Google Maps in Vancouver
- [ ] Michelin filter shows only Michelin-tagged venues

## Mobile-Specific
- [ ] Test on iPhone Safari (primary target)
- [ ] No horizontal scroll / content overflow
- [ ] Touch swipe gestures work smoothly
- [ ] Safe area padding at top/bottom
- [ ] Keyboard doesn't break layout (Wine Lens mood input)
- [ ] Camera/photo upload works on mobile
- [ ] "Add to Home Screen" works as standalone PWA

## Edge Cases
- [ ] 0 swipes → "Build My Night" button disabled
- [ ] All venues swiped → empty swipe deck state
- [ ] Wine Lens with no API key → error message displayed
- [ ] Wine Lens with unreadable photo → graceful error
- [ ] Corrupted localStorage → app recovers gracefully (try/catch fallbacks)
- [ ] Michelin filter on in SLC → shows only bars (0 Michelin restaurants)
