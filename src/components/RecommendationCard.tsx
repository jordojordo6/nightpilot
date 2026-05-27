import { useState, useCallback, useRef } from "react";
import type { ScoredVenue } from "../types";
import { logEvent } from "../engine/analytics";

interface Props {
  venue: ScoredVenue;
  explanation: string;
  showToast: (msg: string) => void;
  cityKey?: string;
  cityName?: string;
}

/** Normalize ogImage URL: upgrade http→https */
function normalizeImageUrl(url: string): string {
  return url.replace(/^http:\/\//, "https://");
}

export function RecommendationCard({ venue, explanation, showToast, cityKey, cityName }: Props) {
  const wasCachedRef = useRef(false);
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "failed">(
    venue.ogImage ? "loading" : "failed"
  );
  const hasPhoto = !!venue.ogImage && imgStatus === "loaded";

  /** Ref callback: if the image is already cached, show it instantly */
  const imgRef = useCallback((el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth > 0) {
      wasCachedRef.current = true;
      setImgStatus("loaded");
    }
  }, []);

  const handleLoad = useCallback(() => {
    setImgStatus("loaded");
    if (import.meta.env.DEV) {
      console.log(`[img:ok] rec #${venue.id} ${venue.name}`);
    }
    logEvent("venue_image_loaded", {
      venueId: venue.id,
      venueName: venue.name,
      city: cityKey,
      source: "recommendation",
    });
  }, [venue.id, venue.name, cityKey]);

  const handleError = useCallback(() => {
    setImgStatus("failed");
    if (import.meta.env.DEV) {
      console.warn(
        `[img:FAIL] rec #${venue.id} ${venue.name}`,
        venue.ogImage?.substring(0, 80)
      );
    }
    logEvent("venue_image_failed", {
      venueId: venue.id,
      venueName: venue.name,
      city: cityKey,
      ogImageUrl: venue.ogImage,
      timestamp: new Date().toISOString(),
      errorReason: "img_onerror",
      source: "recommendation",
    });
  }, [venue.id, venue.name, cityKey, venue.ogImage]);

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

  const handleWebsite = () => {
    if (!venue.websiteUrl) return;
    logEvent("website_clicked", { venueId: venue.id, venueName: venue.name, city: cityKey });
    window.open(venue.websiteUrl, "_blank");
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
      {/* Color header with optional photo */}
      <div
        style={{
          height: hasPhoto ? 120 : 80,
          background: `linear-gradient(135deg, ${venue.gradient[0]}, ${venue.gradient[1]})`,
          display: "flex",
          alignItems: "flex-end",
          padding: "0 20px 12px",
          gap: 12,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background photo */}
        {venue.ogImage && imgStatus !== "failed" && (
          <img
            ref={imgRef}
            src={normalizeImageUrl(venue.ogImage)}
            alt=""
            referrerPolicy="no-referrer"
            onLoad={handleLoad}
            onError={handleError}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 0,
              opacity: imgStatus === "loaded" ? 1 : 0,
              transition: wasCachedRef.current ? "none" : "opacity 0.3s ease-in",
            }}
          />
        )}
        {/* Dark overlay for text readability */}
        {hasPhoto && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,.1) 0%, rgba(0,0,0,.65) 100%)",
              zIndex: 1,
            }}
          />
        )}

        <span style={{ fontSize: 36, position: "relative", zIndex: 2 }}>{venue.emoji}</span>
        <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 2 }}>
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
            position: "relative",
            zIndex: 2,
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
          {venue.websiteUrl ? (
            <ActionButton label="🌐 See website" primary onClick={handleWebsite} />
          ) : (
            <ActionButton label="🔍 Search" primary onClick={handleSearch} />
          )}
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
