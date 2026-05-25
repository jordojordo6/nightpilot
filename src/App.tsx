import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { Venue, SwipeAction, TasteProfile, NightPrefs, Plan, Screen, UserSettings } from "./types";
import { EMPTY_PROFILE, DEFAULT_SETTINGS } from "./types";
import { CITIES, getCityByKey } from "./data/cities";
import { updateTasteProfile, undoTasteProfile, seededShuffle } from "./engine/taste";
import { generateRecommendations } from "./engine/recommendations";
import { loadState, saveState, clearNightPilotData } from "./engine/storage";
import { logEvent } from "./engine/analytics";
import { LandingScreen } from "./screens/LandingScreen";
import { SwipeScreen } from "./screens/SwipeScreen";
import { NightModeScreen } from "./screens/NightModeScreen";
import { ResultsScreen } from "./screens/ResultsScreen";
import { Toast } from "./components/Toast";
import { DebugPanel } from "./components/DebugPanel";
import { WineLensScreen } from "./screens/WineLensScreen";
import { SettingsModal } from "./components/SettingsModal";

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
  const [cityKey, setCityKey] = useState<string>(() =>
    loadState<string>("city", "")
  );
  const city = cityKey ? getCityByKey(cityKey) : null;
  const venues = city?.venues ?? [];
  const [screen, setScreen] = useState<Screen>(cityKey ? "landing" : "city" as Screen);
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
  const [userSettings, setUserSettings] = useState<UserSettings>(() =>
    loadState<UserSettings>("userSettings", { ...DEFAULT_SETTINGS })
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastSwipe, setLastSwipe] = useState<{ venue: Venue; action: SwipeAction } | null>(null);

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

  useEffect(() => {
    saveState("userSettings", userSettings);
  }, [userSettings]);

  // Stable shuffled venue list — re-shuffles when seed or city changes
  const shuffledVenues = useMemo(() => {
    return seededShuffle(venues, shuffleSeed);
  }, [venues, shuffleSeed]);

  // Filter out already-swiped venues, dietary-incompatible restaurants, and Michelin filter
  const availableVenues = useMemo(
    () =>
      shuffledVenues.filter((v) => {
        if (swipedIds.has(v.id)) return false;
        if (
          userSettings.dietary.length > 0 &&
          v.type === "restaurant" &&
          !userSettings.dietary.every((d) => v.dietary?.includes(d))
        )
          return false;
        // Michelin filter: if any levels selected, only show venues with matching michelin tag
        if (
          userSettings.michelin.length > 0 &&
          v.type === "restaurant" &&
          (!v.michelin || !userSettings.michelin.includes(v.michelin))
        )
          return false;
        return true;
      }),
    [shuffledVenues, swipedIds, userSettings.dietary, userSettings.michelin]
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
      setLastSwipe({ venue, action });

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

  const handleUndo = useCallback(() => {
    if (!lastSwipe) return;
    const { venue, action } = lastSwipe;

    setTasteProfile((prev) => undoTasteProfile(prev, venue, action));
    setSwipedIds((prev) => {
      const next = new Set(prev);
      next.delete(venue.id);
      return next;
    });
    setSwipeCount((prev) => Math.max(0, prev - 1));

    if (action === "save") {
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(venue.id);
        return next;
      });
    }

    setLastSwipe(null);
    showToast("Undo!");
    logEvent("swipe_undone", { venueId: venue.id, venueName: venue.name });
  }, [lastSwipe, showToast]);

  const handleNightMode = useCallback(
    (prefs: NightPrefs) => {
      setNightPrefs(prefs);
      const recs = generateRecommendations(
        tasteProfile,
        prefs,
        swipedIds,
        savedIds,
        venues,
        userSettings.dietary
      );
      setPlans(recs);
      setCurrentPlanIdx(0);
      setScreen("results");
    },
    [tasteProfile, swipedIds, savedIds, venues, userSettings.dietary]
  );

  const handleSelectCity = useCallback((key: string) => {
    setCityKey(key);
    saveState("city", key);
    setScreen("landing");
    // Reset profile when switching cities
    clearNightPilotData();
    const newSeed = Math.floor(Math.random() * 2147483646) + 1;
    saveState("seed", newSeed);
    saveState("city", key); // re-persist after clear
    setShuffleSeed(newSeed);
    setTasteProfile({ ...EMPTY_PROFILE });
    setSwipedIds(new Set());
    setSavedIds(new Set());
    setSwipeCount(0);
    setLastSwipe(null);
    setPlans([]);
    setCurrentPlanIdx(0);
  }, []);

  const resetProfile = useCallback(() => {
    clearNightPilotData();
    const newSeed = Math.floor(Math.random() * 2147483646) + 1;
    saveState("seed", newSeed);
    setShuffleSeed(newSeed);
    setTasteProfile({ ...EMPTY_PROFILE });
    setSwipedIds(new Set());
    setSavedIds(new Set());
    setSwipeCount(0);
    setNightPrefs({ occasion: null, budget: null, neighborhood: null, planType: "both" as const });
    setPlans([]);
    setCurrentPlanIdx(0);
    setLastSwipe(null);
    setScreen("landing");
    showToast("Profile reset!");
  }, [showToast]);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {screen === "city" && (
        <div
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 50%, #0a0a1a 100%)",
            padding: "0 32px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌃</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>NightPilot</h1>
          <p style={{ color: "rgba(255,255,255,.45)", fontSize: 14, marginBottom: 32 }}>
            Pick your city to get started
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
            {CITIES.map((c) => (
              <button
                key={c.key}
                onClick={() => handleSelectCity(c.key)}
                style={{
                  padding: "18px 20px",
                  background: "rgba(255,255,255,.05)",
                  border: "1.5px solid rgba(255,255,255,.1)",
                  borderRadius: 16,
                  color: "#fff",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 24 }}>{c.flag}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {screen === "landing" && (
        <LandingScreen
          onStart={() => setScreen("swipe")}
          onWineLens={() => setScreen("winelens")}
          onChangeCity={() => setScreen("city")}
          swipeCount={swipeCount}
          cityName={city?.name ?? ""}
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
          canUndo={!!lastSwipe}
          onUndo={handleUndo}
        />
      )}

      {screen === "nightmode" && (
        <NightModeScreen
          onSubmit={handleNightMode}
          onBack={() => setScreen("swipe")}
          swipeCount={swipeCount}
          tasteProfile={tasteProfile}
          venues={venues}
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
          tasteProfile={tasteProfile}
        />
      )}

      {screen === "winelens" && (
        <WineLensScreen
          onBack={() => setScreen("landing")}
          tasteProfile={tasteProfile}
          dietary={userSettings.dietary}
        />
      )}

      {/* Settings gear — visible on all screens except city picker */}
      {screen !== "city" && (
        <button
          onClick={() => setSettingsOpen(true)}
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.1)",
            color: userSettings.michelin.length > 0
              ? "#ef4444"
              : userSettings.dietary.length > 0
                ? "#c084fc"
                : "rgba(255,255,255,.4)",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 0,
            transition: "all 0.2s",
          }}
        >
          ⚙️
        </button>
      )}

      <SettingsModal
        open={settingsOpen}
        settings={userSettings}
        onClose={() => setSettingsOpen(false)}
        onChange={setUserSettings}
      />

      <Toast message={toast} />
      <DebugPanel profile={tasteProfile} />
    </div>
  );
}
