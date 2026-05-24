interface Props {
  current: number;
  target: number;
}

export function ProgressBar({ current, target }: Props) {
  const progress = Math.min(1, current / target);
  const ready = current >= target;
  const remaining = target - current;

  return (
    <div style={{ padding: "0 20px 8px", flexShrink: 0 }}>
      <div
        style={{
          height: 3,
          background: "rgba(255,255,255,.08)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            background: ready
              ? "#fbbf24"
              : "linear-gradient(90deg, rgba(251,191,36,.4), rgba(251,191,36,.8))",
            borderRadius: 2,
            transition: "width 0.4s ease-out",
            animation: ready
              ? "progressPulse 2s ease-in-out infinite"
              : "none",
          }}
        />
      </div>
      {!ready && (
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,.25)",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {remaining} more to unlock Build My Night
        </p>
      )}
    </div>
  );
}
