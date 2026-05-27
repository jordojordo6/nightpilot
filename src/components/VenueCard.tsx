import { useState, useCallback } from "react";
import type { Venue } from "../types";
import { logEvent } from "../engine/analytics";

interface Props {
  venue: Venue;
  cityKey?: string;
}

/** Normalize ogImage URL: upgrade http→https */
function normalizeImageUrl(url: string): string {
  return url.replace(/^http:\/\//, "https://");
}

export function VenueCard({ venue, cityKey }: Props) {
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "failed">(
    venue.ogImage ? "loading" : "failed"
  );

  const hasPhoto = !!venue.ogImage && imgStatus === "loaded";

  const handleLoad = useCallback(() => {
    setImgStatus("loaded");
    if (import.meta.env.DEV) {
      console.log(`[img:ok] #${venue.id} ${venue.name}`);
    }
    logEvent("venue_image_loaded", {
      venueId: venue.id,
      venueName: venue.name,
      city: cityKey,
    });
  }, [venue.id, venue.name, cityKey]);

  const handleError = useCallback(() => {
    setImgStatus("failed");
    if (import.meta.env.DEV) {
      console.warn(
        `[img:FAIL] #${venue.id} ${venue.name}`,
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
    });
  }, [venue.id, venue.name, cityKey, venue.ogImage]);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: `linear-gradient(145deg, ${venue.gradient[0]}, ${venue.gradient[1]})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background photo (if available) */}
      {venue.ogImage && imgStatus !== "failed" && (
        <img
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
            // Hide while loading to prevent flash of broken icon
            opacity: imgStatus === "loaded" ? 1 : 0,
            transition: "opacity 0.3s ease-in",
          }}
        />
      )}

      {/* Dark overlay for readability when photo is present */}
      {hasPhoto && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,.15) 0%, rgba(0,0,0,.7) 70%, rgba(0,0,0,.85) 100%)",
            zIndex: 1,
          }}
        />
      )}

      {/* Top badges */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          zIndex: 2,
        }}
      >
        <Badge label={venue.type === "restaurant" ? "Restaurant" : "Bar"} />
        <Badge label={venue.neighborhood} />
      </div>

      {/* Price badge */}
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 2 }}>
        <Badge label={"$".repeat(venue.price)} bold />
      </div>

      {/* Background emoji (only when no photo) */}
      {!hasPhoto && (
        <div
          style={{
            position: "absolute",
            top: "28%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            fontSize: 90,
            opacity: 0.12,
            pointerEvents: "none",
            zIndex: 2,
          }}
        >
          {venue.emoji}
        </div>
      )}

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, padding: 28 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{venue.emoji}</div>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 4,
            lineHeight: 1.1,
            textShadow: "0 2px 12px rgba(0,0,0,.3)",
          }}
        >
          {venue.name}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,.75)",
            marginBottom: 2,
            fontWeight: 500,
          }}
        >
          {venue.cuisine}
        </p>
        <p
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,.55)",
            marginBottom: 12,
            lineHeight: 1.4,
          }}
        >
          {venue.tagline}
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 14,
            alignItems: "center",
          }}
        >
          <span
            style={{
              background: "rgba(255,255,255,.15)",
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ★ {venue.rating}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {venue.highlights.map((h) => (
            <span
              key={h}
              style={{
                background: "rgba(255,255,255,.15)",
                backdropFilter: "blur(4px)",
                padding: "5px 12px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 500,
                color: "rgba(255,255,255,.85)",
              }}
            >
              {h}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Badge({ label, bold }: { label: string; bold?: boolean }) {
  return (
    <span
      style={{
        background: "rgba(0,0,0,.45)",
        backdropFilter: "blur(8px)",
        padding: "5px 12px",
        borderRadius: 20,
        fontSize: bold ? 13 : 12,
        fontWeight: bold ? 700 : 600,
        color: "rgba(255,255,255,.9)",
      }}
    >
      {label}
    </span>
  );
}
