import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Venue, SwipeAction, TasteProfile, NightPrefs, Plan, Screen } from "./types";
import { EMPTY_PROFILE } from "./types";
import { VENUES } from "./data/venues";
import { updateTasteProfile, seededShuffle } from "./engine/taste";
import { generateRecommendations } from "./engine/recommendations";
import { loadState, saveState, clearNightPilotData } from "./engine/storage";
import { logEvent } from "./engine/analytics";
import { LandingScreen } from "./screens/LandingScreen";
import { SwipeScreen } from "./screens/SwipeScreen";
import { NightModeScreen } from "./screens/NightModeScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { Toast } from "./components/Toast";
import { DebugPanel } from "./components/DebugPanel";

function getOrCreateSeed(): number {
  const existing = loadState<number | null>("seed", null);
  if (existing !== null) return existing;
  const seed = Math.floor(Math.random() * 2147483646) + 1;
  saveState("seed", seed);
  return seed;
}

/** Validate that a loaded profile has the new structure. */
function validateProfile(raw: unknown): TasteProfile {
  if (
    raw &&
    typeof raw === "object" &&
    "likedTags" in raw &&
    "savedTags" in raw &&
    "rejectedTags" in raw
  ) {
    return raw as TasteProfile;
  }
  // Old format or corrupted — start fresh
  return { ...EMPTY_PROFILE };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [tasteProfile, setTasteProfile] = useState<TasteProfile>(() =>
    validateProfile(loadState<unknown>("taste", null))
  );
  const [swipedIds, setSwipedIds] = useState<Set<number>>(
    () => new Set(loadState<number[]>("swiped", []))
  );
  const [savedIds, setSavedIds] = useState<Set<number>>(
    () => new Set(loadState<number[]>("saved", []))
  );
  const [swipeCount, setSwipeCount] = useState(() =>
    loadState<number>("swipeCount", 0)
  );
  const [, setNightPrefs] = useState<NightPrefs>({
    occasion: null,
    budget: null,
    neighborhood: null,
    planType: "both" as const,
  });
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanIdx, setCurrentPlanIdx] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(() => getOrCreateSeed());

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist state changes
  useEffect(() => {
    saveState("taste", tasteProfile);
  }, [tasteProfile]);

  useEffect(() => {
    saveState("swiped", [...swipedIds]);
  }, [swipedIds]);

  useEffect(() => {
    saveState("saved", [...savedIds]);
  }, [savedIds]);

  useEffect(() => {
    saveState("swipeCount", swipeCount);
  }, [swipeCount]);

  // Stable shuffled venue list — re-shuffles when seed changes (on reset)
  const shuffledVenues = useMemo(() => {
    return seededShuffle(VENUES, shuffleSeed);
  }, [shuffleSeed]);

  // Filter out already-swiped venues for the swipe screen
  const availableVenues = useMemo(
    () => shuffledVenues.filter((v) => !swipedIds.has(v.id)),
    [shuffledVenues, swipedIds]
  );

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSwipe = useCallback(
    (venue: Venue, action: SwipeAction) => {
      setTasteProfile((prev) => updateTasteProfile(prev, venue, action));
      setSwipedIds((prev) => {
        const next = new Set(prev);
        next.add(venue.id);
        return next;
      });
      setSwipeCount((prev) => prev + 1);

      if (action === "save") {
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.add(venue.id);
          return next;
        });
        showToast("Saved for later!");
      }

      const eventMap: Record<SwipeAction, string> = {
        like: "venue_liked",
        nope: "venue_rejected",
        save: "venue_saved",
      };
      logEvent(eventMap[action], {
        venueId: venue.id,
        venueName: venue.name,
      });
    },
    [showToast]
  );

  const handleNightMode = useCallback(
    (prefs: NightPrefs) => {
      setNightPrefs(prefs);
      const recs = generateRecommendations(
        tasteProfile,
        prefs,
        swipedIds,
        savedIds
      );
      setPlans(recs);
      setCurrentPlanIdx(0);
      setScreen("results");
    },
    [tasteProfile, swipedIds, savedIds]
  );

  const resetProfile = useCallback(() => {
    clearNightPilotData();
    const newSeed = Math.floor(Math.random() * 2147483646) + 1;
    saveState("seed", newSeed);
    setShuffleSeed(newSeed);
    setTasteProfile({ ...EMPTY_PROFILE });
    setSwipedIds(new Set());
    setSavedIds(new Set());
    setSwipeCount(0);
    setNightPrefs({ occasion: null, budget: null, neighborhood: null });
    setPlans([]);
    setCurrentPlanIdx(0);
    setScreen("landing");
    showToast("Profile reset!");
  }, [showToast]);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {screen === "landing" && (
        <LandingScreen
          onStart={() => setScreen("swipe")}
          swipeCount={swipeCount}
        />
      )}

      {screen === "swipe" && (
        <SwipeScreen
          venues={availableVenues}
          onSwipe={handleSwipe}
          swipeCount={swipeCount}
          onNightMode={() => setScreen("nightmode")}
          onBack={() => setScreen("landing")}
          tasteProfile={tasteProfile}
        />
      )}

      {screen === "nightmode" && (
        <NightModeScreen
          onSubmit={handleNightMode}
          onBack={() => setScreen("swipe")}
          swipeCount={swipeCount}
          tasteProfile={tasteProfile}
        />
      )}

      {screen === "results" && (
        <ResultsScreen
          plans={plans}
          currentIdx={currentPlanIdx}
          setCurrentIdx={setCurrentPlanIdx}
          onBack={() => setScreen("nightmode")}
          onKeepSwiping={() => setScreen("swipe")}
          onReset={resetProfile}
          showToast={showToast}
        />
      )}

      <Toast message={toast} />
      <DebugPanel profile={tasteProfile} />
    </div>
  );
}
