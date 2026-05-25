import type { ScoredVenue } from "../types";
import { logEvent } from "../engine/analytics";

interface Props {
  venue: ScoredVenue;
  explanation: string;
  showToast: (msg: string) => void;
  cityKey?: string;
  cityName?: string;
}

export function RecommendationCard({ venue, explanation, showToast, cityKey, cityName }: Props) {
  const handleSearch = () => {
    logEvent("search_clicked", { venueId: venue.id, venueName: venue.name, city: cityKey });
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(venue.name + " " + (cityName ?? cityKey ?? "") + " " + (venue.type === "bar" ? "bar" : "restaurant"))}`,
      "_blank"
    );
  };

  const handleMap = () => {
    logEvent("map_clicked", { venueId: venue.id, venueName: venue.name, city: cityKey });
    showToast("Opening Maps...");
    window.open(
      `https://www.google.com/maps/search/${encodeURIComponent(venue.name + " " + (cityName ?? cityKey ?? ""))}`,
      "_blank"
    );
  };

  const handleCopy = () => {
    const text = `${venue.name} — ${venue.cuisine} · ${venue.neighborhood} · ${"$".repeat(venue.price)}`;
    navigator.clipboard.writeText(text).then(
      () => showToast("Copied to clipboard!"),
      () => showToast("Couldn't copy")
    );
    logEvent("venue_copied", {
      venueId: venue.id,
      venueName: venue.name,
      source: "results",
      city: cityKey,
    });
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,.04)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 20,
        overflow: "hidden",
      }}
    >
      {/* Color header */}
      <div
        style={{
          height: 80,
          background: `linear-gradient(135deg, ${venue.gradient[0]}, ${venue.gradient[1]})`,
          display: "flex",
          alignItems: "center",
          padding: "0 20px",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 36 }}>{venue.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              textShadow: "0 1px 8px rgba(0,0,0,.3)",
            }}
          >
            {venue.name}
          </h3>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}>
            {venue.cuisine} · {venue.neighborhood}
          </p>
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            background: "rgba(0,0,0,.3)",
            padding: "3px 10px",
            borderRadius: 8,
          }}
        >
          {"$".repeat(venue.price)}
        </span>
      </div>

      <div style={{ padding: "14px 18px 16px" }}>
        {/* Explanation */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 12,
            background: "rgba(251,191,36,.05)",
            border: "1px solid rgba(251,191,36,.1)",
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>
            🎯
          </span>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,.65)",
              lineHeight: 1.45,
            }}
          >
            {explanation}
          </p>
        </div>

        {/* Rating */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <span
            style={{
              background: "rgba(255,255,255,.08)",
              padding: "3px 8px",
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            ★ {venue.rating}
          </span>
        </div>

        {/* Highlights */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            marginBottom: 14,
          }}
        >
          {venue.highlights.map((h) => (
            <span
              key={h}
              style={{
                background: "rgba(255,255,255,.06)",
                padding: "3px 10px",
                borderRadius: 6,
                fontSize: 11,
                color: "rgba(255,255,255,.5)",
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          <ActionButton label="🔍 Search" primary onClick={handleSearch} />
          <ActionButton label="📍 Map" onClick={handleMap} />
          <ActionButton label="📋 Copy" onClick={handleCopy} />
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  primary,
  onClick,
}: {
  label: string;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px",
        background: primary
          ? "rgba(251,191,36,.1)"
          : "rgba(255,255,255,.06)",
        border: primary
          ? "1px solid rgba(251,191,36,.25)"
          : "1px solid rgba(255,255,255,.1)",
        borderRadius: 10,
        color: primary ? "#fbbf24" : "rgba(255,255,255,.6)",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        transition: "transform .1s",
        fontFamily: "inherit",
      }}
      onMouseDown={(e) =>
        (e.currentTarget.style.transform = "scale(0.95)")
      }
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {label}
    </button>
  );
}
