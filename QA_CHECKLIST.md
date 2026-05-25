# NightPilot QA Checklist — Beta Release

## Setup
- [ ] Run `npm install` (installs vitest for tests)
- [ ] Run `npm run typecheck` — should pass with no errors
- [ ] Run `npm run build` — should produce clean Vite build
- [ ] Run `npm test` — all unit tests should pass
- [ ] Deploy to Vercel and confirm live URL loads

## City Selector
- [ ] App launches to city picker on fresh visit (no localStorage)
- [ ] All 3 cities listed alphabetically: Amsterdam, Dublin, Vancouver
- [ ] Selecting a city navigates to Landing Screen
- [ ] City flag emoji renders correctly on mobile

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
- [ ] **Swipe up** = save (card animates up, "Saved for later!" toast)
- [ ] **Button controls** work: ✗, ♥, ★
- [ ] **Undo button** appears after first swipe and reverses the last action
- [ ] Undo toast appears: "Undo!"
- [ ] Progress bar advances with each swipe
- [ ] "Build My Night" button appears after sufficient swipes
- [ ] Back button returns to Landing Screen
- [ ] Venue count matches expected (35 Van, 35 Dublin, 33 Amsterdam)

## Settings (⚙️ gear icon)
- [ ] Gear icon visible on all screens except city picker
- [ ] Settings modal opens/closes cleanly
- [ ] **Dietary Restrictions** section appears above Michelin
- [ ] Selecting dietary restrictions filters restaurants in swipe deck
- [ ] **Michelin Guide** section shows with rosette SVG icons
- [ ] Michelin filter works (only shows matching restaurants)
- [ ] Gear icon turns purple when dietary filter active
- [ ] Gear icon turns red when Michelin filter active
- [ ] Settings persist across page reloads

## Night Mode (Build My Night)
- [ ] Occasion selector works (date, friends, fancy, casual, solo, group)
- [ ] Budget selector works ($, $$, $$$, $$$$)
- [ ] Neighborhood selector shows neighborhoods from current city
- [ ] Plan type selector works: Dinner Only, Drinks Only, Full Night
- [ ] "Build My Night" button generates results

## Results Screen
- [ ] Plan dots show at top (up to 3 plans), tappable
- [ ] Plan name, icon, and match score (X% match) display
- [ ] Driving tags display as pills
- [ ] "Why this fits you" section explains match
- [ ] **Dinner Only** mode: shows restaurant card, no bar
- [ ] **Drinks Only** mode: shows bar card, no restaurant
- [ ] **Full Night** mode: shows restaurant + pairing rationale + bar
- [ ] Pairing rationale mentions neighborhoods and walk time
- [ ] Recommendation cards show: emoji, name, cuisine, neighborhood, price, rating
- [ ] 🎯 explanation text is personalized (not generic)
- [ ] Highlight pills display
- [ ] **📞 Reserve** button shows "Reservations coming soon!" toast
- [ ] **📍 Map** button opens Google Maps in new tab with correct venue + city
- [ ] **♥ Save** button shows toast
- [ ] **Save This Night** button shows toast
- [ ] Quick feedback: "Yes, surprisingly accurate" / "Kind of" / "Not really"
- [ ] Selecting feedback sends to Google Sheets (check quick_feedback tab)
- [ ] "Share detailed feedback →" opens Google Form in new tab
- [ ] "Keep Swiping" returns to swipe screen
- [ ] "Reset" clears all data and returns to landing

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
- [ ] Switch cities: profile resets, fresh venues appear
- [ ] Swipe 10+ venues in city A → switch to city B → verify clean slate
- [ ] Generate Night Mode recommendations in each city
- [ ] Verify no hardcoded "Vancouver" text appears in any city

## Mobile-Specific
- [ ] Test on iPhone Safari (primary target)
- [ ] No horizontal scroll / content overflow
- [ ] Touch swipe gestures work smoothly
- [ ] Safe area padding at top/bottom
- [ ] Keyboard doesn't break layout (Wine Lens mood input)
- [ ] Camera/photo upload works on mobile

## Edge Cases
- [ ] 0 swipes → "Build My Night" → "Need more data" empty state
- [ ] All venues swiped → empty swipe deck state
- [ ] Wine Lens with no API key → "API key not configured" error
- [ ] Wine Lens with unreadable photo → graceful degradation
- [ ] Corrupted localStorage → app recovers gracefully
