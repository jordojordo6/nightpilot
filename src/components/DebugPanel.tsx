import { useState } from "react";
import type { TasteProfile } from "../types";
import {
  getTopPositiveTags,
  getTopNegativeTags,
  getPreferredNeighborhoods,
  getPreferredPrices,
} from "../engine/taste";

interface Props {
  profile: TasteProfile;
}

export function DebugPanel({ profile }: Props) {
  const [open, setOpen] = useState(false);

  // Only render in dev mode
  if (!import.meta.env.DEV) return null;

  const positiveTags = getTopPositiveTags(profile, 6);
  const negativeTags = getTopNegativeTags(profile, 4);
  const neighborhoods = getPreferredNeighborhoods(profile, 4);
  const prices = getPreferredPrices(profile);
  const total =
    profile.likeCount + profile.saveCount + profile.rejectCount;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 999,
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "absolute",
          bottom: open ? undefined : 70,
          top: open ? -28 : undefined,
          right: 8,
          background: "rgba(251,191,36,.2)",
          border: "1px solid rgba(251,191,36,.4)",
          borderRadius: 6,
          color: "#fbbf24",
          fontSize: 10,
          fontWeight: 700,
          padding: "3px 8px",
          cursor: "pointer",
          fontFamily: "monospace",
        }}
      >
        {open ? "× DEBUG" : "🐛 DEBUG"}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            background: "rgba(10,10,15,.95)",
            borderTop: "1px solid rgba(251,191,36,.3)",
            padding: "12px 16px",
            fontFamily: "monospace",
            fontSize: 11,
            color: "rgba(255,255,255,.7)",
            maxHeight: 220,
            overflow: "auto",
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Label>Swipes</Label>
            <span style={{ color: "#22c55e" }}>
              {profile.likeCount} likes
            </span>
            {" · "}
            <span style={{ color: "#fbbf24" }}>
              {profile.saveCount} saves
            </span>
            {" · "}
            <span style={{ color: "#ef4444" }}>
              {profile.rejectCount} rejects
            </span>
            {" · "}
            <span>{total} total</span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <Label>Top positive tags</Label>
            {positiveTags.length > 0 ? (
              <TagRow tags={positiveTags} color="#22c55e" />
            ) : (
              <span style={{ color: "rgba(255,255,255,.3)" }}>
                none yet
              </span>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <Label>Top negative tags</Label>
            {negativeTags.length > 0 ? (
              <TagRow tags={negativeTags} color="#ef4444" />
            ) : (
              <span style={{ color: "rgba(255,255,255,.3)" }}>
                none yet
              </span>
            )}
          </div>

          <div style={{ marginBottom: 8 }}>
            <Label>Preferred neighborhoods</Label>
            {neighborhoods.length > 0 ? (
              <TagRow tags={neighborhoods} color="#60a5fa" />
            ) : (
              <span style={{ color: "rgba(255,255,255,.3)" }}>
                none yet
              </span>
            )}
          </div>

          <div>
            <Label>Preferred price levels</Label>
            {prices.length > 0 ? (
              <span>
                {prices.map((p) => "$".repeat(p)).join(", ")}
              </span>
            ) : (
              <span style={{ color: "rgba(255,255,255,.3)" }}>
                none yet
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        color: "rgba(255,255,255,.4)",
        textTransform: "uppercase",
        fontSize: 9,
        letterSpacing: 1,
        display: "block",
        marginBottom: 2,
      }}
    >
      {children}
    </span>
  );
}

function TagRow({ tags, color }: { tags: string[]; color: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {tags.map((tag) => (
        <span
          key={tag}
          style={{
            background: `${color}22`,
            border: `1px solid ${color}44`,
            padding: "1px 6px",
            borderRadius: 4,
            fontSize: 10,
            color,
          }}
        >
          {tag.replace(/-/g, " ")}
        </span>
      ))}
    </div>
  );
}
