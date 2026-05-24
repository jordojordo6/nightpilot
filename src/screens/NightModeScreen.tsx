import { useState } from "react";
import type { NightPrefs, TasteProfile, PlanType } from "../types";
import { VENUES } from "../data/venues";
import { getProfileSummary } from "../engine/taste";

interface Props {
  onSubmit: (prefs: NightPrefs) => void;
  onBack: () => void;
  swipeCount: number;
  tasteProfile: TasteProfile;
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

const NEIGHBORHOODS = [
  ...new Set(VENUES.map((v) => v.neighborhood)),
].sort();

export function NightModeScreen({
  onSubmit,
  onBack,
  swipeCount,
  tasteProfile,
}: Props) {
  const [planType, setPlanType] = useState<PlanType>("both");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [neighborhood, setNeighborhood] = useState<string | null>(null);

  const profileSummary = getProfileSummary(tasteProfile);

  const handleSubmit = () => {
    if (occasion) {
      onSubmit({ occasion, budget, neighborhood, planType });
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
              Based on {swipeCount} ratings
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
              selected={neighborhood === null}
              onClick={() => setNeighborhood(null)}
            />
            {NEIGHBORHOODS.map((n) => (
              <OptionPill
                key={n}
                label={n}
                selected={neighborhood === n}
                onClick={() => setNeighborhood(n)}
              />
            ))}
          </div>
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
