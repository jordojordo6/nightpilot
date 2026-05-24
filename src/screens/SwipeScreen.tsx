import { useState, useEffect, useRef, useCallback } from "react";
import type { Venue, SwipeAction, TasteProfile } from "../types";
import { VenueCard } from "../components/VenueCard";
import { ProgressBar } from "../components/ProgressBar";
import { logEvent } from "../engine/analytics";

const THRESHOLD = 80;
const MIN_SWIPES = 8;

interface Props {
  venues: Venue[];
  onSwipe: (venue: Venue, action: SwipeAction) => void;
  swipeCount: number;
  onNightMode: () => void;
  onBack: () => void;
  tasteProfile: TasteProfile;
}

export function SwipeScreen({
  venues,
  onSwipe,
  swipeCount,
  onNightMode,
  onBack,
}: Props) {
  const [offset, setOffset] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitAnim, setExitAnim] = useState<string | null>(null);
  const startRef = useRef({ x: 0, y: 0 });

  // Always show index 0 — the venues array is already filtered by App
  const currentVenue = venues[0] as Venue | undefined;
  const nextVenue = venues[1] as Venue | undefined;
  const nightReady = swipeCount >= MIN_SWIPES;

  // Log card_viewed
  useEffect(() => {
    if (currentVenue) {
      logEvent("card_viewed", {
        venueId: currentVenue.id,
        venueName: currentVenue.name,
      });
    }
  }, [currentVenue]);

  const processSwipe = useCallback(
    (action: SwipeAction) => {
      if (!currentVenue || exitAnim) return;
      const animName =
        action === "nope"
          ? "flyLeft"
          : action === "save"
            ? "flyUp"
            : "flyRight";
      setExitAnim(animName);
      setTimeout(() => {
        onSwipe(currentVenue, action);
        setExitAnim(null);
        setOffset(0);
        setOffsetY(0);
      }, 280);
    },
    [currentVenue, onSwipe, exitAnim]
  );

  const handlePointerDown = (
    e: React.TouchEvent | React.MouseEvent
  ) => {
    if (exitAnim) return;
    const point = "touches" in e ? e.touches[0] : e;
    startRef.current = { x: point.clientX, y: point.clientY };
    setIsDragging(true);
  };

  const handlePointerMove = (
    e: React.TouchEvent | React.MouseEvent
  ) => {
    if (!isDragging || exitAnim) return;
    const point = "touches" in e ? e.touches[0] : e;
    const dx = point.clientX - startRef.current.x;
    const dy = point.clientY - startRef.current.y;
    setOffset(dx);
    setOffsetY(dy * 0.3);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (offsetY < -60) {
      processSwipe("save");
      return;
    }
    if (offset > THRESHOLD) {
      processSwipe("like");
      return;
    }
    if (offset < -THRESHOLD) {
      processSwipe("nope");
      return;
    }
    setOffset(0);
    setOffsetY(0);
  };

  // Prevent scroll while dragging
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (isDragging) e.preventDefault();
    };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, [isDragging]);

  // All swiped
  if (!currentVenue) {
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          You've seen every spot!
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,.5)",
            textAlign: "center",
            marginBottom: 32,
            lineHeight: 1.5,
          }}
        >
          You've rated {swipeCount} spots. Your taste profile is ready
          to build your night.
        </p>
        <button
          onClick={onNightMode}
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
          Build My Night
        </button>
      </div>
    );
  }

  const rotation = offset * 0.08;
  const likeOpacity = Math.max(0, Math.min(1, offset / THRESHOLD));
  const nopeOpacity = Math.max(0, Math.min(1, -offset / THRESHOLD));
  const saveOpacity = Math.max(0, Math.min(1, -offsetY / 50));

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0a0a0f",
      }}
      className="no-select"
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px 8px",
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
            padding: 4,
          }}
        >
          ←
        </button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,.4)",
              fontWeight: 500,
            }}
          >
            {swipeCount} rated
          </span>
        </div>
        {nightReady ? (
          <button
            onClick={onNightMode}
            style={{
              background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
              color: "#0a0a0f",
              border: "none",
              borderRadius: 10,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Build My Night 🌙
          </button>
        ) : (
          <div style={{ width: 90 }} />
        )}
      </div>

      <ProgressBar current={swipeCount} target={MIN_SWIPES} />

      {/* Card area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          padding: "0 20px 0",
          overflow: "hidden",
        }}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onMouseDown={handlePointerDown}
        onMouseMove={isDragging ? handlePointerMove : undefined}
        onMouseUp={handlePointerUp}
        onMouseLeave={isDragging ? handlePointerUp : undefined}
      >
        {/* Next card (behind) */}
        {nextVenue && (
          <div
            style={{
              position: "absolute",
              inset: "0 20px",
              transform: "scale(0.95)",
              opacity: 0.5,
              borderRadius: 24,
              overflow: "hidden",
            }}
          >
            <VenueCard venue={nextVenue} />
          </div>
        )}

        {/* Current card */}
        <div
          style={{
            position: "absolute",
            inset: "0 20px",
            borderRadius: 24,
            overflow: "hidden",
            cursor: "grab",
            transform: exitAnim
              ? undefined
              : `translateX(${offset}px) translateY(${offsetY}px) rotate(${rotation}deg)`,
            transition: isDragging
              ? "none"
              : "transform 0.4s cubic-bezier(.25,.1,.25,1)",
            animation: exitAnim
              ? `${exitAnim} 0.3s ease-out forwards`
              : undefined,
          }}
        >
          <div
            className="swipe-indicator like"
            style={{ opacity: likeOpacity }}
          >
            LIKE
          </div>
          <div
            className="swipe-indicator nope"
            style={{ opacity: nopeOpacity }}
          >
            NOPE
          </div>
          <div
            className="swipe-indicator save"
            style={{ opacity: saveOpacity }}
          >
            SAVE ★
          </div>
          <VenueCard venue={currentVenue} />
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          padding: "16px 20px 12px",
          flexShrink: 0,
        }}
      >
        <SwipeButton
          color="#ef4444"
          icon="✕"
          onClick={() => processSwipe("nope")}
        />
        <SwipeButton
          color="#fbbf24"
          icon="★"
          onClick={() => processSwipe("save")}
          size={20}
        />
        <SwipeButton
          color="#22c55e"
          icon="♥"
          onClick={() => processSwipe("like")}
        />
      </div>

      {swipeCount < 3 && (
        <div
          style={{
            textAlign: "center",
            paddingBottom: 20,
            animation: "pulse 2s infinite",
          }}
        >
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
            ← skip · like → · save ↑
          </p>
        </div>
      )}
    </div>
  );
}

function SwipeButton({
  color,
  icon,
  onClick,
  size = 24,
}: {
  color: string;
  icon: string;
  onClick: () => void;
  size?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        border: `2px solid ${color}66`,
        background: `${color}1a`,
        color,
        fontSize: size,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform .15s",
      }}
      onMouseDown={(e) =>
        (e.currentTarget.style.transform = "scale(0.9)")
      }
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {icon}
    </button>
  );
}
