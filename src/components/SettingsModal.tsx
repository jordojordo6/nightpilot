import type { UserSettings, DietaryRestriction, MichelinLevel } from "../types";
import { DIETARY_OPTIONS, MICHELIN_OPTIONS } from "../types";

/* ── Tabler Icons (MIT) – inline SVG for Michelin rosette & Bib Gourmand ── */
function MichelinRosette({ size = 20, color = "#c4233b" }: { size?: number; color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.792 17.063c0 .337 .057 .618 .057 .9c0 1.8 -1.238 3.037 -2.982 3.037c-1.8 0 -2.98 -1.238 -2.98 -3.206v-.731c-.957 .675 -1.576 .9 -2.42 .9c-1.518 0 -2.925 -1.463 -2.925 -3.094c0 -1.181 .844 -2.194 2.082 -2.756l.28 -.113c-1.574 -.787 -2.362 -1.688 -2.362 -2.925c0 -1.687 1.294 -3.094 2.925 -3.094c.675 0 1.52 .338 2.138 .788l.281 .112c0 -.337 -.056 -.619 -.056 -.844c0 -1.8 1.237 -3.037 2.98 -3.037c1.8 0 2.981 1.237 2.981 3.206v.394l-.056 .281c.956 -.675 1.575 -.9 2.419 -.9c1.519 0 2.925 1.463 2.925 3.094c0 1.181 -.844 2.194 -2.081 2.756l-.282 .169c1.575 .787 2.363 1.688 2.363 2.925c0 1.688 -1.294 3.094 -2.925 3.094c-.675 0 -1.575 -.281 -2.138 -.788l-.225 -.169l.001 .001" />
    </svg>
  );
}

function BibGourmand({ size = 20, color = "#c4233b" }: { size?: number; color?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.97 20c-2.395 -1.947 -4.763 -5.245 -1.005 -8c-.52 -4 3.442 -7.5 5.524 -7.5c.347 -1 1.499 -1.5 2.54 -1.5c1.04 0 2.135 .5 2.482 1.5c2.082 0 6.044 3.5 5.524 7.5c3.758 2.755 1.39 6.053 -1.005 8" />
      <path d="M8 11a1 2 0 1 0 2 0a1 2 0 1 0 -2 0" />
      <path d="M14 11a1 2 0 1 0 2 0a1 2 0 1 0 -2 0" />
      <path d="M8 17.085c3.5 2.712 6.5 2.712 9 -1.085" />
      <path d="M13 18.5c.815 -2.337 1.881 -1.472 2 -.5" />
    </svg>
  );
}

/** Render the correct icon(s) for a Michelin level */
function MichelinIcon({ level, color }: { level: MichelinLevel; color: string }) {
  const size = 18;
  switch (level) {
    case "3-star":
      return (
        <span style={{ display: "flex", gap: 2 }}>
          <MichelinRosette size={size} color={color} />
          <MichelinRosette size={size} color={color} />
          <MichelinRosette size={size} color={color} />
        </span>
      );
    case "2-star":
      return (
        <span style={{ display: "flex", gap: 2 }}>
          <MichelinRosette size={size} color={color} />
          <MichelinRosette size={size} color={color} />
        </span>
      );
    case "1-star":
      return (
        <span style={{ display: "flex", gap: 2 }}>
          <MichelinRosette size={size} color={color} />
        </span>
      );
    case "bib-gourmand":
      return <BibGourmand size={22} color={color} />;
  }
}

interface Props {
  open: boolean;
  settings: UserSettings;
  onClose: () => void;
  onChange: (settings: UserSettings) => void;
}

export function SettingsModal({ open, settings, onClose, onChange }: Props) {
  if (!open) return null;

  const toggleDietary = (key: DietaryRestriction) => {
    const next = settings.dietary.includes(key)
      ? settings.dietary.filter((d) => d !== key)
      : [...settings.dietary, key];
    onChange({ ...settings, dietary: next });
  };

  const toggleMichelin = (key: MichelinLevel) => {
    const next = settings.michelin.includes(key)
      ? settings.michelin.filter((m) => m !== key)
      : [...settings.michelin, key];
    onChange({ ...settings, michelin: next });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.6)",
          zIndex: 998,
          animation: "fadeIn 0.2s ease-out",
        }}
      />
      {/* Modal */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(180deg, #1a1a2e 0%, #0a0a1a 100%)",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: "20px 24px 40px",
          zIndex: 999,
          animation: "slideUp 0.3s ease-out",
          maxHeight: "80vh",
          overflow: "auto",
          WebkitOverflowScrolling: "touch" as const,
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,.15)",
            margin: "0 auto 16px",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,.4)",
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            Done
          </button>
        </div>

        {/* Michelin Filter */}
        <div style={{ marginBottom: 28 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,.3)",
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 12,
            }}
          >
            Michelin Guide
          </p>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,.35)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            Only show Michelin-recognised restaurants.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {MICHELIN_OPTIONS.map((opt) => {
              const active = settings.michelin.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleMichelin(opt.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    background: active
                      ? "rgba(220,38,38,.10)"
                      : "rgba(255,255,255,.04)",
                    border: active
                      ? "1.5px solid rgba(220,38,38,.4)"
                      : "1.5px solid rgba(255,255,255,.08)",
                    borderRadius: 14,
                    color: active ? "#ef4444" : "rgba(255,255,255,.6)",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                    textAlign: "left",
                  }}
                >
                  <span style={{ minWidth: 60, display: "flex", alignItems: "center" }}>
                    <MichelinIcon level={opt.key} color={active ? "#ef4444" : "#c4233b"} />
                  </span>
                  {opt.label && <span style={{ flex: 1 }}>{opt.label}</span>}
                  {!opt.label && <span style={{ flex: 1 }} />}
                  {active && (
                    <span style={{ fontSize: 16, color: "#ef4444" }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,.3)",
              textTransform: "uppercase",
              letterSpacing: 2,
              marginBottom: 12,
            }}
          >
            Dietary Restrictions
          </p>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,.35)",
              marginBottom: 16,
              lineHeight: 1.5,
            }}
          >
            We'll only recommend restaurants with options for you.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {DIETARY_OPTIONS.map((opt) => {
              const active = settings.dietary.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  onClick={() => toggleDietary(opt.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    background: active
                      ? "rgba(168,85,247,.12)"
                      : "rgba(255,255,255,.04)",
                    border: active
                      ? "1.5px solid rgba(168,85,247,.4)"
                      : "1.5px solid rgba(255,255,255,.08)",
                    borderRadius: 14,
                    color: active ? "#c084fc" : "rgba(255,255,255,.6)",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{opt.icon}</span>
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {active && (
                    <span
                      style={{
                        fontSize: 16,
                        color: "#a855f7",
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
