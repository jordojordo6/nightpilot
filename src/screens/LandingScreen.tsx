interface Props {
  onStart: () => void;
  onWineLens: () => void;
  onChangeCity: () => void;
  swipeCount: number;
  cityName: string;
}

export function LandingScreen({ onStart, onWineLens, onChangeCity, swipeCount, cityName }: Props) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 24px",
        background:
          "linear-gradient(160deg, #0a0a1a 0%, #1a0a2e 40%, #0a0a1a 100%)",
      }}
    >
      <div style={{ animation: "fadeIn 0.8s ease-out" }}>
        <div style={{ fontSize: 64, marginBottom: 8, textAlign: "center" }}>
          🌙
        </div>
        <h1
          style={{
            fontSize: 36,
            fontWeight: 900,
            textAlign: "center",
            background:
              "linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-1px",
          }}
        >
          NightPilot
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,.5)",
            textAlign: "center",
            marginTop: 4,
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Your night, perfected
        </p>
      </div>

      <div
        style={{
          animation: "fadeInUp 1s ease-out 0.3s both",
          marginTop: 48,
          textAlign: "center",
          maxWidth: 280,
        }}
      >
        <p
          style={{
            fontSize: 16,
            color: "rgba(255,255,255,.7)",
            lineHeight: 1.6,
          }}
        >
          Swipe through spots. We'll learn your taste. Then let us plan
          your perfect night out.
        </p>
      </div>

      <div
        style={{
          animation: "fadeInUp 1s ease-out 0.6s both",
          marginTop: 48,
          width: "100%",
          maxWidth: 280,
        }}
      >
        <button
          onClick={onStart}
          style={{
            width: "100%",
            padding: "16px 32px",
            background: "linear-gradient(135deg,#fbbf24,#f59e0b)",
            color: "#0a0a0f",
            border: "none",
            borderRadius: 16,
            fontSize: 17,
            fontWeight: 700,
            cursor: "pointer",
            animation: "glow 3s ease-in-out infinite",
            letterSpacing: "0.5px",
            fontFamily: "inherit",
          }}
        >
          {swipeCount > 0 ? "Keep Discovering" : "Start Discovering"}
        </button>
        {swipeCount > 0 && (
          <p
            style={{
              textAlign: "center",
              marginTop: 12,
              fontSize: 13,
              color: "rgba(255,255,255,.4)",
            }}
          >
            {swipeCount} spots rated · Taste profile active
          </p>
        )}

        <button
          onClick={onWineLens}
          style={{
            width: "100%",
            marginTop: 14,
            padding: "14px 32px",
            background: "rgba(168,85,247,.12)",
            border: "1px solid rgba(168,85,247,.3)",
            borderRadius: 16,
            fontSize: 15,
            fontWeight: 600,
            color: "#c084fc",
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.3px",
          }}
        >
          Wine Radar 🍷
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 32,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <button
          onClick={onChangeCity}
          style={{
            background: "none",
            border: "none",
            fontSize: 11,
            color: "rgba(255,255,255,.25)",
            cursor: "pointer",
            fontFamily: "inherit",
            padding: "6px 12px",
          }}
        >
          📍 {cityName} · tap to change
        </button>
      </div>
    </div>
  );
}
