import { useState } from "react";
import type { Venue, NightPrefs, TasteProfile, PlanType, LocationMode, LocationFilter } from "../types";
import { EMPTY_LOCATION_FILTER } from "../types";
import { getProfileSummary } from "../engine/taste";
import { getCurrentPosition } from "../engine/geo";

interface Props {
  onSubmit: (prefs: NightPrefs) => void;
  onBack: () => void;
  tasteProfile: TasteProfile;
  venues: Venue[];
}

const OCCASIONS = [
  { key: "date", label: "Date Night", icon: "💕" },
  { key: "friends", label: "Drinks with Friends", icon: "🍻" },
  { key: "fancy", label: "Fancy Evening", icon: "✨" },
  { key: "casual", label: "Casual Vibes", icon: "😎" },
  { key: "solo", label: "Solo Adventure", icon: "🎯" },
  { key: "group", label: "Group Celebration", icon: "🎉" },
] as const;

const BUDGETS = [
  { key: 2, label: "$ – $$", desc: "Keep it chill" },
  { key: 3, label: "$$ – $$$", desc: "Treat yourself" },
  { key: 4, label: "$$$+", desc: "Go all out" },
] as const;

export function NightModeScreen({
  onSubmit,
  onBack,
  tasteProfile,
  venues,
}: Props) {
  const NEIGHBORHOODS = [
    ...new Set(venues.map((v) => v.neighborhood)),
  ].sort();
  const [planType, setPlanType] = useState<PlanType>("both");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);

  // Location filter state
  const [locationMode, setLocationMode] = useState<LocationMode>("anywhere");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [walkMinutes, setWalkMinutes] = useState<string>("");
  const [bikeMinutes, setBikeMinutes] = useState<string>("");
  const [driveMinutes, setDriveMinutes] = useState<string>("");
  const [radiusKm, setRadiusKm] = useState<string>("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [addressInput, setAddressInput] = useState("");

  const toggleNeighborhood = (n: string) => {
    setNeighborhoods((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };

  const handleUseMyLocation = async () => {
    setGeoStatus("loading");
    try {
      const pos = await getCurrentPosition();
      setLocationLat(pos.lat);
      setLocationLng(pos.lng);
      setLocationMode("current");
      setGeoStatus("success");
    } catch {
      setGeoStatus("error");
    }
  };

  const handleSetAddress = () => {
    // For MVP: use hardcoded city centers as geocoding fallback
    // In production this would call a geocoding API
    if (addressInput.trim()) {
      setLocationMode("address");
      // Use first venue's coords as a rough city center proxy
      if (venues.length > 0) {
        setLocationLat(venues[0].lat);
        setLocationLng(venues[0].lng);
      }
    }
  };

  const buildLocationFilter = (): LocationFilter => {
    if (locationMode === "anywhere") return { ...EMPTY_LOCATION_FILTER };
    return {
      mode: locationMode,
      lat: locationLat,
      lng: locationLng,
      walkMinutes: walkMinutes ? Number(walkMinutes) : null,
      bikeMinutes: bikeMinutes ? Number(bikeMinutes) : null,
      driveMinutes: driveMinutes ? Number(driveMinutes) : null,
      radiusKm: radiusKm ? Number(radiusKm) : null,
    };
  };

  const profileSummary = getProfileSummary(tasteProfile);

  const handleSubmit = () => {
    if (occasion) {
      onSubmit({ occasion, budget, neighborhoods, planType, location: buildLocationFilter() });
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 20px",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,.5)",
            fontSize: 24,
            cursor: "pointer",
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#fbbf24" }}>
            Build My Night
          </span>
        </div>
        <div style={{ width: 32 }} />
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "4px 24px 32px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Intro */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
            animation: "fadeIn 0.6s ease-out",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>🌙</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            What's the vibe tonight?
          </h2>
        </div>

        {/* Profile summary */}
        {profileSummary && (
          <div
            style={{
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 16,
              padding: "14px 18px",
              marginBottom: 24,
              animation: "fadeIn 0.6s ease-out 0.1s both",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(255,255,255,.3)",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Your taste profile
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {profileSummary.topTags.map((tag, i) => (
                <span
                  key={tag}
                  style={{
                    background:
                      i < 3
                        ? "rgba(251,191,36,.12)"
                        : "rgba(255,255,255,.06)",
                    border:
                      i < 3
                        ? "1px solid rgba(251,191,36,.25)"
                        : "1px solid rgba(255,255,255,.08)",
                    padding: "4px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    color:
                      i < 3 ? "#fbbf24" : "rgba(255,255,255,.5)",
                  }}
                >
                  {tag.replace(/-/g, " ")}
                </span>
              ))}
            </div>
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,.35)",
                marginTop: 8,
              }}
            >
              Based on {tasteProfile.likeCount + tasteProfile.saveCount + tasteProfile.rejectCount} ratings
            </p>
          </div>
        )}

        {/* Plan type */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>What are you planning?</SectionLabel>
          <div style={{ display: "flex", gap: 10 }}>
            {([
              { key: "both" as PlanType, label: "Dinner + Drinks", icon: "🍽️🍸" },
              { key: "dinner" as PlanType, label: "Dinner Only", icon: "🍽️" },
              { key: "drinks" as PlanType, label: "Drinks Only", icon: "🍸" },
            ]).map((pt) => (
              <OptionButton
                key={pt.key}
                selected={planType === pt.key}
                onClick={() => setPlanType(pt.key)}
                style={{ flex: 1, textAlign: "center" }}
              >
                <span style={{ fontSize: 18 }}>{pt.icon}</span>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color:
                      planType === pt.key
                        ? "#fbbf24"
                        : "rgba(255,255,255,.8)",
                    marginTop: 4,
                  }}
                >
                  {pt.label}
                </p>
              </OptionButton>
            ))}
          </div>
        </div>

        {/* Occasion */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Occasion</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {OCCASIONS.map((o) => (
              <OptionButton
                key={o.key}
                selected={occasion === o.key}
                onClick={() => setOccasion(o.key)}
              >
                <span style={{ fontSize: 20 }}>{o.icon}</span>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color:
                      occasion === o.key
                        ? "#fbbf24"
                        : "rgba(255,255,255,.8)",
                    marginTop: 4,
                  }}
                >
                  {o.label}
                </p>
              </OptionButton>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Budget</SectionLabel>
          <div style={{ display: "flex", gap: 10 }}>
            {BUDGETS.map((b) => (
              <OptionButton
                key={b.key}
                selected={budget === b.key}
                onClick={() => setBudget(b.key)}
                style={{ flex: 1, textAlign: "center" }}
              >
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color:
                      budget === b.key
                        ? "#fbbf24"
                        : "rgba(255,255,255,.8)",
                  }}
                >
                  {b.label}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,.4)",
                    marginTop: 2,
                  }}
                >
                  {b.desc}
                </p>
              </OptionButton>
            ))}
          </div>
        </div>

        {/* Neighborhood */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Neighborhood (optional)</SectionLabel>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <OptionPill
              label="Anywhere"
              selected={neighborhoods.length === 0}
              onClick={() => setNeighborhoods([])}
            />
            {NEIGHBORHOODS.map((n) => (
              <OptionPill
                key={n}
                label={n}
                selected={neighborhoods.includes(n)}
                onClick={() => toggleNeighborhood(n)}
              />
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 28 }}>
          <SectionLabel>Location (optional)</SectionLabel>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <OptionPill
              label="Anywhere"
              selected={locationMode === "anywhere"}
              onClick={() => {
                setLocationMode("anywhere");
                setLocationLat(null);
                setLocationLng(null);
                setGeoStatus("idle");
              }}
            />
            <OptionPill
              label="📍 My Location"
              selected={locationMode === "current"}
              onClick={handleUseMyLocation}
            />
            <OptionPill
              label="📫 Address"
              selected={locationMode === "address"}
              onClick={() => setLocationMode("address")}
            />
          </div>

          {geoStatus === "loading" && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 8 }}>
              Getting your location...
            </p>
          )}
          {geoStatus === "error" && (
            <p style={{ fontSize: 12, color: "#ef4444", marginBottom: 8 }}>
              Couldn't get location — check permissions
            </p>
          )}
          {geoStatus === "success" && locationMode === "current" && (
            <p style={{ fontSize: 12, color: "#4ade80", marginBottom: 8 }}>
              ✓ Location set
            </p>
          )}

          {locationMode === "address" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Enter neighborhood or address"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                onBlur={handleSetAddress}
                onKeyDown={(e) => e.key === "Enter" && handleSetAddress()}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,.06)",
                  border: "1.5px solid rgba(255,255,255,.12)",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </div>
          )}

          {locationMode !== "anywhere" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)", minWidth: 60 }}>
                  🚶 Walk
                </span>
                <input
                  type="number"
                  placeholder="min"
                  value={walkMinutes}
                  onChange={(e) => setWalkMinutes(e.target.value)}
                  style={{
                    width: 70,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,.06)",
                    border: "1.5px solid rgba(255,255,255,.12)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    textAlign: "center",
                  }}
                />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>minutes</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)", minWidth: 60 }}>
                  🚲 Bike
                </span>
                <input
                  type="number"
                  placeholder="min"
                  value={bikeMinutes}
                  onChange={(e) => setBikeMinutes(e.target.value)}
                  style={{
                    width: 70,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,.06)",
                    border: "1.5px solid rgba(255,255,255,.12)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    textAlign: "center",
                  }}
                />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>minutes</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)", minWidth: 60 }}>
                  🚗 Drive
                </span>
                <input
                  type="number"
                  placeholder="min"
                  value={driveMinutes}
                  onChange={(e) => setDriveMinutes(e.target.value)}
                  style={{
                    width: 70,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,.06)",
                    border: "1.5px solid rgba(255,255,255,.12)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    textAlign: "center",
                  }}
                />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>minutes</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)", minWidth: 60 }}>
                  📏 Radius
                </span>
                <input
                  type="number"
                  placeholder="km"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  style={{
                    width: 70,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,.06)",
                    border: "1.5px solid rgba(255,255,255,.12)",
                    borderRadius: 10,
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    textAlign: "center",
                  }}
                />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>km</span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.25)", marginTop: 2 }}>
                Fill any one — we'll use the widest range
              </p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!occasion}
          style={{
            width: "100%",
            padding: "16px",
            background: occasion
              ? "linear-gradient(135deg,#fbbf24,#f59e0b)"
              : "rgba(255,255,255,.1)",
            color: occasion ? "#0a0a0f" : "rgba(255,255,255,.3)",
            border: "none",
            borderRadius: 16,
            fontSize: 17,
            fontWeight: 700,
            cursor: occasion ? "pointer" : "default",
            transition: "all .3s",
            letterSpacing: "0.5px",
            opacity: occasion ? 1 : 0.5,
            fontFamily: "inherit",
          }}
        >
          Find My Night ✨
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 13,
        fontWeight: 600,
        color: "rgba(255,255,255,.4)",
        marginBottom: 10,
        textTransform: "uppercase",
        letterSpacing: 1,
      }}
    >
      {children}
    </p>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
  style,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "14px 12px",
        background: selected
          ? "rgba(251,191,36,.15)"
          : "rgba(255,255,255,.05)",
        border: selected
          ? "1.5px solid rgba(251,191,36,.5)"
          : "1.5px solid rgba(255,255,255,.08)",
        borderRadius: 14,
        cursor: "pointer",
        textAlign: "left",
        transition: "all .2s",
        fontFamily: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function OptionPill({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        background: selected
          ? "rgba(251,191,36,.15)"
          : "rgba(255,255,255,.05)",
        border: selected
          ? "1.5px solid rgba(251,191,36,.5)"
          : "1.5px solid rgba(255,255,255,.08)",
        borderRadius: 20,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: selected ? 600 : 500,
        color: selected ? "#fbbf24" : "rgba(255,255,255,.6)",
        transition: "all .2s",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}
