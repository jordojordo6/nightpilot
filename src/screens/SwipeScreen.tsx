import { useState, useEffect, useRef, useCallback } from "react";
import type { Venue, SwipeAction, TasteProfile } from "../types";
import { VenueCard } from "../components/VenueCard";
import { ProgressBar } from "../components/ProgressBar";
import { logEvent } from "../engine/analytics";

const THRESHOLD = 80; // px distance to trigger swipe
const VELOCITY_THRESHOLD = 0.5; // px/ms — fast flick triggers even below distance threshold
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
  const [, forceRender] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [exitStyle, setExitStyle] = useState<React.CSSProperties | null>(null);

  // Mutable refs for drag state — avoids re-renders during drag
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
    offsetX: 0,
    offsetY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
  });
  const cardRef = useRef<HTMLDivElement>(null);
  const nextCardRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLDivElement>(null);
  const nopeRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

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

  // ─── Direct DOM updates via rAF for 60fps drag ─────────────────
  const updateCardPosition = useCallback(() => {
    const d = dragRef.current;
    const card = cardRef.current;
    const next = nextCardRef.current;
    if (!card) return;

    const rotation = d.offsetX * 0.06;
    card.style.transform = `translateX(${d.offsetX}px) translateY(${d.offsetY}px) rotate(${rotation}deg)`;
    card.style.transition = "none";

    // Indicator opacities
    const likeOp = Math.max(0, Math.min(1, d.offsetX / THRESHOLD));
    const nopeOp = Math.max(0, Math.min(1, -d.offsetX / THRESHOLD));
    const saveOp = Math.max(0, Math.min(1, -d.offsetY / 50));
    if (likeRef.current) likeRef.current.style.opacity = String(likeOp);
    if (nopeRef.current) nopeRef.current.style.opacity = String(nopeOp);
    if (saveRef.current) saveRef.current.style.opacity = String(saveOp);

    // Next card scales up as top card moves away
    if (next) {
      const progress = Math.min(1, Math.abs(d.offsetX) / (THRESHOLD * 2));
      const scale = 0.95 + progress * 0.05;
      const opacity = 0.5 + progress * 0.5;
      next.style.transform = `scale(${scale})`;
      next.style.opacity = String(opacity);
      next.style.transition = "none";
    }
  }, []);

  const onDragFrame = useCallback(() => {
    updateCardPosition();
    if (dragRef.current.active) {
      rafRef.current = requestAnimationFrame(onDragFrame);
    }
  }, [updateCardPosition]);

  const processSwipe = useCallback(
    (action: SwipeAction) => {
      if (!currentVenue || exiting) return;
      const d = dragRef.current;

      const exitX =
        action === "nope"
          ? -window.innerWidth * 1.5
          : action === "like"
            ? window.innerWidth * 1.5
            : d.offsetX;
      const exitY = action === "save" ? -window.innerHeight * 1.5 : d.offsetY;
      const exitRotation =
        action === "nope" ? -25 : action === "like" ? 25 : 0;

      // Speed up exit based on velocity — faster flick = faster exit
      const speed = Math.sqrt(d.velocityX ** 2 + d.velocityY ** 2);
      const duration = Math.max(0.2, 0.4 - speed * 0.15);

      setExiting(true);
      setExitStyle({
        transform: `translateX(${exitX}px) translateY(${exitY}px) rotate(${exitRotation}deg)`,
        opacity: 0,
        transition: `transform ${duration}s cubic-bezier(.2,.6,.3,1), opacity ${duration}s ease-out`,
      });

      // Next card entrance
      if (nextCardRef.current) {
        nextCardRef.current.style.transform = "scale(1)";
        nextCardRef.current.style.opacity = "1";
        nextCardRef.current.style.transition = `transform ${duration}s cubic-bezier(.2,.6,.3,1), opacity ${duration}s ease-out`;
      }

      setTimeout(() => {
        onSwipe(currentVenue, action);
        setExiting(false);
        setExitStyle(null);
        d.offsetX = 0;
        d.offsetY = 0;
        d.velocityX = 0;
        d.velocityY = 0;
        forceRender((n) => n + 1);
      }, duration * 1000);
    },
    [currentVenue, onSwipe, exiting]
  );

  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent) => {
    if (exiting) return;
    const point = "touches" in e ? e.touches[0] : e;
    const d = dragRef.current;
    d.active = true;
    d.startX = point.clientX;
    d.startY = point.clientY;
    d.currentX = point.clientX;
    d.currentY = point.clientY;
    d.startTime = Date.now();
    d.lastX = point.clientX;
    d.lastY = point.clientY;
    d.lastTime = Date.now();
    d.velocityX = 0;
    d.velocityY = 0;
    d.offsetX = 0;
    d.offsetY = 0;

    rafRef.current = requestAnimationFrame(onDragFrame);
  };

  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    const d = dragRef.current;
    if (!d.active || exiting) return;

    const point = "touches" in e ? e.touches[0] : e;
    const now = Date.now();
    const dt = now - d.lastTime;

    d.currentX = point.clientX;
    d.currentY = point.clientY;
    d.offsetX = point.clientX - d.startX;
    d.offsetY = (point.clientY - d.startY) * 0.3;

    // Track velocity (smoothed)
    if (dt > 0) {
      const vx = (point.clientX - d.lastX) / dt;
      const vy = (point.clientY - d.lastY) / dt;
      d.velocityX = d.velocityX * 0.4 + vx * 0.6;
      d.velocityY = d.velocityY * 0.4 + vy * 0.6;
    }
    d.lastX = point.clientX;
    d.lastY = point.clientY;
    d.lastTime = now;
  };

  const handlePointerUp = () => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    cancelAnimationFrame(rafRef.current);

    // Velocity-based: a fast flick in either direction triggers even below distance threshold
    const absVx = Math.abs(d.velocityX);
    const absVy = Math.abs(d.velocityY);

    if (d.offsetY < -50 || (d.velocityY < -VELOCITY_THRESHOLD && absVy > absVx)) {
      processSwipe("save");
      return;
    }
    if (d.offsetX > THRESHOLD || (d.velocityX > VELOCITY_THRESHOLD && absVx > absVy)) {
      processSwipe("like");
      return;
    }
    if (d.offsetX < -THRESHOLD || (d.velocityX < -VELOCITY_THRESHOLD && absVx > absVy)) {
      processSwipe("nope");
      return;
    }

    // Spring-back with overshoot
    if (cardRef.current) {
      cardRef.current.style.transform = "translateX(0) translateY(0) rotate(0deg)";
      cardRef.current.style.transition = "transform 0.45s cubic-bezier(.175,.885,.32,1.275)";
    }
    if (likeRef.current) {
      likeRef.current.style.opacity = "0";
      likeRef.current.style.transition = "opacity 0.3s ease-out";
    }
    if (nopeRef.current) {
      nopeRef.current.style.opacity = "0";
      nopeRef.current.style.transition = "opacity 0.3s ease-out";
    }
    if (saveRef.current) {
      saveRef.current.style.opacity = "0";
      saveRef.current.style.transition = "opacity 0.3s ease-out";
    }
    if (nextCardRef.current) {
      nextCardRef.current.style.transform = "scale(0.95)";
      nextCardRef.current.style.opacity = "0.5";
      nextCardRef.current.style.transition = "transform 0.4s ease-out, opacity 0.4s ease-out";
    }

    d.offsetX = 0;
    d.offsetY = 0;
    d.velocityX = 0;
    d.velocityY = 0;
  };

  // Prevent scroll while dragging
  useEffect(() => {
    const prevent = (e: TouchEvent) => {
      if (dragRef.current.active) e.preventDefault();
    };
    document.addEventListener("touchmove", prevent, { passive: false });
    return () => document.removeEventListener("touchmove", prevent);
  }, []);

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
          touchAction: "none",
        }}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
      >
        {/* Next card (behind) */}
        {nextVenue && (
          <div
            ref={nextCardRef}
            style={{
              position: "absolute",
              inset: "0 20px",
              transform: "scale(0.95)",
              opacity: 0.5,
              borderRadius: 24,
              overflow: "hidden",
              willChange: "transform, opacity",
            }}
          >
            <VenueCard venue={nextVenue} />
          </div>
        )}

        {/* Current card */}
        <div
          ref={cardRef}
          style={{
            position: "absolute",
            inset: "0 20px",
            borderRadius: 24,
            overflow: "hidden",
            cursor: "grab",
            willChange: "transform",
            ...(exitStyle ?? {}),
          }}
        >
          <div ref={likeRef} className="swipe-indicator like" style={{ opacity: 0 }}>
            LIKE
          </div>
          <div ref={nopeRef} className="swipe-indicator nope" style={{ opacity: 0 }}>
            NOPE
          </div>
          <div ref={saveRef} className="swipe-indicator save" style={{ opacity: 0 }}>
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
          onClick={() => {
            dragRef.current.offsetX = 0;
            dragRef.current.offsetY = 0;
            dragRef.current.velocityX = -1;
            processSwipe("nope");
          }}
        />
        <SwipeButton
          color="#fbbf24"
          icon="★"
          onClick={() => {
            dragRef.current.offsetX = 0;
            dragRef.current.offsetY = 0;
            dragRef.current.velocityX = 0;
            dragRef.current.velocityY = -1;
            processSwipe("save");
          }}
          size={20}
        />
        <SwipeButton
          color="#22c55e"
          icon="♥"
          onClick={() => {
            dragRef.current.offsetX = 0;
            dragRef.current.offsetY = 0;
            dragRef.current.velocityX = 1;
            processSwipe("like");
          }}
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
