import type { UserSettings, DietaryRestriction } from "../types";
import { DIETARY_OPTIONS } from "../types";

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
