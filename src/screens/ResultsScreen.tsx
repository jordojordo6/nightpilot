import { useState } from "react";
import type { Plan, TasteProfile } from "../types";
import { RecommendationCard } from "../components/RecommendationCard";
import { logEvent } from "../engine/analytics";
import { getTopPositiveTags } from "../engine/taste";

interface Props {
  plans: Plan[];
  currentIdx: number;
  setCurrentIdx: (i: number) => void;
  onBack: () => void;
  onKeepSwiping: () => void;
  onReset: () => void;
  showToast: (msg: string) => void;
  tasteProfile: TasteProfile;
  cityKey?: string;
  cityName?: string;
}

export function ResultsScreen({
  plans,
  currentIdx,
  setCurrentIdx,
  onBack,
  onKeepSwiping,
  onReset,
  showToast,
  tasteProfile,
  cityKey,
  cityName,
}: Props) {
  if (plans.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
          background: "#0a0a0f",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🤔</div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Need more data
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,.5)",
            textAlign: "center",
            marginBottom: 32,
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          Swipe through more spots so we can learn your taste better.
        </p>
        <button
          onClick={onKeepSwiping}
          style={{
            padding: "14px 32px",
            background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
            color: "#0a0a0f",
            border: "none",
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Keep Swiping
        </button>
      </div>
    );
  }

  const plan = plans[currentIdx];

  const handleShareNight = () => {
    const parts: string[] = [];
    parts.push(`🌙 NightPilot — ${plan.name}`);
    parts.push(`${plan.matchScore}% match\n`);
    if (plan.restaurant) {
      parts.push(`🍽️ ${plan.restaurant.name}`);
      parts.push(`   ${plan.restaurant.cuisine} · ${plan.restaurant.neighborhood} · ${"$".repeat(plan.restaurant.price)}`);
    }
    if (plan.bar) {
      parts.push(`🍸 ${plan.bar.name}`);
      parts.push(`   ${plan.bar.cuisine} · ${plan.bar.neighborhood} · ${"$".repeat(plan.bar.price)}`);
    }
    if (plan.walkTime) {
      parts.push(`\n🚶 ${plan.walkTime} between spots`);
    }
    const text = parts.join("\n");

    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        navigator.clipboard.writeText(text).then(() => showToast("Copied to clipboard!"));
      });
    } else {
      navigator.clipboard.writeText(text).then(
        () => showToast("Copied to clipboard!"),
        () => showToast("Couldn't copy — try a screenshot instead")
      );
    }

    logEvent("night_shared", {
      planName: plan.name,
      restaurant: plan.restaurant?.name ?? null,
      bar: plan.bar?.name ?? null,
      matchScore: plan.matchScore,
      city: cityKey,
    });
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, #0a0a1a 0%, #0f0a1f 100%)",
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
            Your Night
          </span>
        </div>
        <div style={{ width: 32 }} />
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "0 20px 32px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Plan selector dots */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {plans.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              style={{
                width: i === currentIdx ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background:
                  i === currentIdx
                    ? "#fbbf24"
                    : "rgba(255,255,255,.2)",
                border: "none",
                cursor: "pointer",
                transition: "all .3s",
              }}
            />
          ))}
        </div>

        {/* Plan header */}
        <div
          key={currentIdx}
          style={{
            textAlign: "center",
            marginBottom: 12,
            animation: "fadeIn 0.4s ease-out",
          }}
        >
          <span style={{ fontSize: 32 }}>{plan.icon}</span>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
            {plan.name}
          </h2>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              background: "rgba(251,191,36,.1)",
              border: "1px solid rgba(251,191,36,.2)",
              borderRadius: 20,
              padding: "4px 14px",
            }}
          >
            <span
              style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24" }}
            >
              {plan.matchScore}% match
            </span>
          </div>
        </div>

        {/* Driving tags */}
        {plan.drivingTags.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 6,
              marginBottom: 8,
              animation: "fadeIn 0.4s ease-out 0.1s both",
            }}
          >
            {plan.drivingTags.map((tag) => (
              <span
                key={tag}
                style={{
                  background: "rgba(251,191,36,.08)",
                  border: "1px solid rgba(251,191,36,.2)",
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#fbbf24",
                  letterSpacing: "0.3px",
                }}
              >
                {tag.replace(/-/g, " ")}
              </span>
            ))}
          </div>
        )}

        {/* Why this fits you */}
        <div
          style={{
            background: "rgba(255,255,255,.03)",
            border: "1px solid rgba(255,255,255,.06)",
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 20,
            animation: "fadeIn 0.4s ease-out 0.15s both",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,.55)",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            <span style={{ color: "#fbbf24", fontWeight: 600, marginRight: 4 }}>
              Why this fits you:
            </span>
            {plan.whyFitsYou}
          </p>
        </div>

        {/* Dinner (shown for "dinner" and "both" modes) */}
        {plan.restaurant && (
          <div
            key={`r-${currentIdx}`}
            style={{ animation: "fadeInUp 0.5s ease-out 0.1s both" }}
          >
            <SectionLabel>{plan.planType === "dinner" ? "Restaurant" : "Dinner"}</SectionLabel>
            <RecommendationCard
              venue={plan.restaurant}
              explanation={plan.rExplanation}
              showToast={showToast}
              cityKey={cityKey}
              cityName={cityName}
            />
          </div>
        )}

        {/* Pairing connector (only for "both" mode) */}
        {plan.planType === "both" && plan.restaurant && plan.bar && (
          <div
            style={{
              position: "relative",
              padding: "14px 0",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 1,
                height: 12,
                background: "rgba(251,191,36,.25)",
              }}
            />
            <div
              style={{
                background: "rgba(251,191,36,.08)",
                border: "1px solid rgba(251,191,36,.15)",
                borderRadius: 12,
                padding: "8px 16px",
                margin: "4px 0",
                maxWidth: "90%",
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,.45)",
                  textAlign: "center",
                  lineHeight: 1.4,
                }}
              >
                {plan.pairingRationale}
              </p>
            </div>
            <div
              style={{
                width: 1,
                height: 12,
                background: "rgba(251,191,36,.25)",
              }}
            />
          </div>
        )}

        {/* Drinks (shown for "drinks" and "both" modes) */}
        {plan.bar && (
          <div
            key={`b-${currentIdx}`}
            style={{ animation: "fadeInUp 0.5s ease-out 0.3s both" }}
          >
            <SectionLabel>{plan.planType === "drinks" ? "Bar" : "Drinks"}</SectionLabel>
            <RecommendationCard
              venue={plan.bar}
              explanation={plan.bExplanation}
              showToast={showToast}
              cityKey={cityKey}
              cityName={cityName}
            />
          </div>
        )}

        {/* Share Night button */}
        <button
          onClick={handleShareNight}
          style={{
            width: "100%",
            marginTop: 20,
            padding: "14px",
            background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
            color: "#0a0a0f",
            border: "none",
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            animation: "fadeInUp 0.5s ease-out 0.4s both",
          }}
        >
          Share This Night 📤
        </button>

        {/* Feedback section */}
        <FeedbackPrompt
          plans={plans}
          currentIdx={currentIdx}
          tasteProfile={tasteProfile}
          cityKey={cityKey}
        />

        {/* Bottom actions */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            animation: "fadeInUp 0.5s ease-out 0.5s both",
          }}
        >
          <button
            onClick={onKeepSwiping}
            style={{
              flex: 1,
              padding: "14px",
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.1)",
              borderRadius: 14,
              color: "rgba(255,255,255,.7)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Keep Swiping
          </button>
          <button
            onClick={() => {
              if (window.confirm("This will erase all your swipes and taste memory. Start fresh?")) {
                onReset();
              }
            }}
            style={{
              padding: "14px 18px",
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(239,68,68,.2)",
              borderRadius: 14,
              color: "rgba(239,68,68,.6)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Start Over
          </button>
        </div>
      </div>
    </div>
  );
}

const FEEDBACK_OPTIONS = [
  { label: "Yes, surprisingly accurate", value: "accurate", color: "#22c55e" },
  { label: "Kind of", value: "kind_of", color: "#fbbf24" },
  { label: "Not really", value: "not_really", color: "#ef4444" },
] as const;

function FeedbackPrompt({
  plans,
  currentIdx,
  tasteProfile,
  cityKey,
}: {
  plans: Plan[];
  currentIdx: number;
  tasteProfile: TasteProfile;
  cityKey?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleFeedback = (value: string) => {
    setSelected(value);
    const plan = plans[currentIdx];
    const topTags = getTopPositiveTags(tasteProfile, 5);
    const venueIds = [plan.restaurant?.id, plan.bar?.id].filter(
      (id): id is number => id !== undefined
    );

    logEvent("feedback_accuracy_selected", {
      response: value,
      topTasteTags: topTags,
      recommendedVenueIds: venueIds,
      planName: plan.name,
      matchScore: plan.matchScore,
      city: cityKey,
    });

    // Send to Google Sheet
    fetch(
      "https://script.google.com/macros/s/AKfycbxwtmbMlR8jBpE_QkvEkVmGNIO89u1JCTegtIU9_D0_I484SCY-Bf4Hql0jPl3kUr8-/exec",
      {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          feature: "quick_feedback",
          response: value,
          planName: plan.name,
          matchScore: plan.matchScore,
          topTags,
          venueIds,
          planType: plan.planType,
          restaurantName: plan.restaurant?.name ?? null,
          barName: plan.bar?.name ?? null,
          swipeCount:
            tasteProfile.likeCount +
            tasteProfile.saveCount +
            tasteProfile.rejectCount,
          city: cityKey,
          userAgent: navigator.userAgent,
        }),
      }
    ).catch(() => {
      // Silently fail — localStorage already has the data
    });
  };

  return (
    <div
      style={{
        marginTop: 16,
        padding: "16px",
        background: "rgba(255,255,255,.03)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 16,
        animation: "fadeInUp 0.5s ease-out 0.45s both",
      }}
    >
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "rgba(255,255,255,.6)",
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        Did these recommendations feel like you?
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {FEEDBACK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleFeedback(opt.value)}
            style={{
              flex: 1,
              padding: "10px 6px",
              background:
                selected === opt.value
                  ? `${opt.color}22`
                  : "rgba(255,255,255,.05)",
              border:
                selected === opt.value
                  ? `1.5px solid ${opt.color}66`
                  : "1.5px solid rgba(255,255,255,.08)",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600,
              color:
                selected === opt.value
                  ? opt.color
                  : "rgba(255,255,255,.5)",
              cursor: selected ? "default" : "pointer",
              transition: "all .2s",
              fontFamily: "inherit",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {selected && (
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,.3)",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Thanks! Your feedback helps us improve.
        </p>
      )}

      {/* External feedback form link */}
      <a
        href="https://docs.google.com/forms/d/e/1FAIpQLSeIMnxY-_gBGckzCc9rSPajOZGvK8AHwXP52yfi5uYq20Fl3Q/viewform"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          marginTop: 12,
          padding: "8px",
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(255,255,255,.35)",
          textAlign: "center",
          textDecoration: "none",
        }}
      >
        Have more thoughts? Share detailed feedback →
      </a>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "rgba(255,255,255,.3)",
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 8,
      }}
    >
      {children}
    </p>
  );
}
