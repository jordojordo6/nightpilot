import { useState, useRef } from "react";
import type { TasteProfile } from "../types";
import { getTopPositiveTags } from "../engine/taste";
import { logEvent } from "../engine/analytics";

interface WineRec {
  name: string;
  type: string;
  grape: string;
  region: string;
  price: string;
  glass: boolean;
  recommendation: string;
  confidence: number;
  why: string;
  pairsWith: string;
}

interface WineAvoid {
  name: string;
  why: string;
}

interface WineResult {
  wines: WineRec[];
  avoid: WineAvoid[];
  listSummary: string;
  tip: string;
}

interface Props {
  onBack: () => void;
  tasteProfile: TasteProfile;
}

const REC_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  best_match: { label: "Best Match", color: "#22c55e", icon: "🎯" },
  best_value: { label: "Best Value", color: "#3b82f6", icon: "💰" },
  adventurous: { label: "Adventurous", color: "#a855f7", icon: "🔮" },
  crowd_pleaser: { label: "Crowd Pleaser", color: "#fbbf24", icon: "⭐" },
};

export function WineLensScreen({ onBack, tasteProfile }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaType(file.type || "image/jpeg");

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Extract base64 data after the prefix
      const base64 = dataUrl.split(",")[1];
      setPhoto(base64);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!photo) return;
    setLoading(true);
    setError(null);

    // Build taste context from profile
    const topTags = getTopPositiveTags(tasteProfile, 5);
    const tasteContext =
      topTags.length > 0
        ? `They tend to like: ${topTags.join(", ")}. They've rated ${tasteProfile.likeCount + tasteProfile.saveCount + tasteProfile.rejectCount} venues.`
        : undefined;

    try {
      const res = await fetch("/api/wine-lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo, mediaType, tasteContext }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as { error?: string }).error || "Failed to analyze"
        );
      }

      const data = (await res.json()) as WineResult;
      setResult(data);

      logEvent("wine_lens_scan", {
        wineCount: data.wines.length,
        listSummary: data.listSummary,
        topTags,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPhoto(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background:
          "linear-gradient(180deg, #0a0a1a 0%, #1a0a2e 100%)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px 20px",
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
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "#c084fc" }}>
            Wine Lens
          </span>
        </div>
        <div style={{ width: 32 }} />
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "0 24px 32px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* No result yet — show capture UI */}
        {!result && (
          <div
            style={{
              textAlign: "center",
              animation: "fadeIn 0.6s ease-out",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>🍷</div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Snap the wine list
            </h2>
            <p
              style={{
                color: "rgba(255,255,255,.45)",
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 24,
              }}
            >
              Take a photo of any wine list and get personalized
              recommendations based on your taste profile.
            </p>

            {/* Photo preview */}
            {photo && (
              <div
                style={{
                  marginBottom: 20,
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,.1)",
                }}
              >
                <img
                  src={`data:${mediaType};base64,${photo}`}
                  alt="Wine list"
                  style={{
                    width: "100%",
                    maxHeight: 300,
                    objectFit: "contain",
                    background: "rgba(0,0,0,.5)",
                  }}
                />
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              style={{ display: "none" }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              onChange={handleCapture}
              style={{ display: "none" }}
            />

            {!photo ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    flex: 1,
                    padding: "16px",
                    background:
                      "linear-gradient(135deg, #a855f7, #7c3aed)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 16,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Take Photo 📸
                </button>
                <button
                  onClick={() => galleryRef.current?.click()}
                  style={{
                    flex: 1,
                    padding: "16px",
                    background: "rgba(168,85,247,.12)",
                    border: "1px solid rgba(168,85,247,.3)",
                    borderRadius: 16,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#c084fc",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  From Photos 🖼️
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleReset}
                  style={{
                    flex: 1,
                    padding: "14px",
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 14,
                    color: "rgba(255,255,255,.7)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Retake
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: "14px",
                    background: loading
                      ? "rgba(168,85,247,.3)"
                      : "linear-gradient(135deg, #a855f7, #7c3aed)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 14,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: loading ? "default" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {loading ? "Analyzing..." : "Analyze Wine List 🍷"}
                </button>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div
                style={{
                  marginTop: 24,
                  animation: "pulse 2s infinite",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,.4)",
                  }}
                >
                  Reading the wine list and matching to your taste...
                </p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "rgba(239,68,68,.1)",
                  border: "1px solid rgba(239,68,68,.3)",
                  borderRadius: 12,
                  color: "#ef4444",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ animation: "fadeIn 0.6s ease-out" }}>
            {/* Summary */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>🍷</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                Your Wine Picks
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,.45)",
                  lineHeight: 1.5,
                }}
              >
                {result.listSummary}
              </p>
            </div>

            {/* Tip */}
            {result.tip && (
              <div
                style={{
                  background: "rgba(168,85,247,.08)",
                  border: "1px solid rgba(168,85,247,.2)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  marginBottom: 20,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,.55)",
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      color: "#c084fc",
                      fontWeight: 600,
                      marginRight: 4,
                    }}
                  >
                    Pro tip:
                  </span>
                  {result.tip}
                </p>
              </div>
            )}

            {/* Wine cards */}
            {result.wines.map((wine, i) => {
              const meta = REC_LABELS[wine.recommendation] ?? {
                label: wine.recommendation,
                color: "#fbbf24",
                icon: "🍷",
              };
              return (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,.04)",
                    border: "1px solid rgba(255,255,255,.08)",
                    borderRadius: 16,
                    padding: "16px",
                    marginBottom: 12,
                    animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both`,
                  }}
                >
                  {/* Badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: `${meta.color}18`,
                      border: `1px solid ${meta.color}40`,
                      borderRadius: 8,
                      padding: "3px 10px",
                      marginBottom: 10,
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{meta.icon}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: meta.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {/* Wine name */}
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 4,
                      color: "#fff",
                    }}
                  >
                    {wine.name}
                  </h3>

                  {/* Details row */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <DetailPill>{wine.grape}</DetailPill>
                    <DetailPill>{wine.region}</DetailPill>
                    <DetailPill>{wine.type}</DetailPill>
                    <DetailPill>
                      {wine.price}
                      {wine.glass ? " (glass)" : ""}
                    </DetailPill>
                  </div>

                  {/* Why */}
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,.6)",
                      lineHeight: 1.5,
                      marginBottom: 6,
                    }}
                  >
                    {wine.why}
                  </p>

                  {/* Pairs with */}
                  <p
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,.35)",
                    }}
                  >
                    Pairs with: {wine.pairsWith}
                  </p>

                  {/* Confidence dots */}
                  <div
                    style={{
                      display: "flex",
                      gap: 3,
                      marginTop: 8,
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div
                        key={n}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            n <= wine.confidence
                              ? meta.color
                              : "rgba(255,255,255,.1)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Avoid section */}
            {result.avoid.length > 0 && (
              <div style={{ marginTop: 8, marginBottom: 20 }}>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.3)",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    marginBottom: 8,
                  }}
                >
                  Maybe Skip
                </p>
                {result.avoid.map((wine, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(239,68,68,.06)",
                      border: "1px solid rgba(239,68,68,.15)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      marginBottom: 8,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,.5)",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: "rgba(239,68,68,.7)",
                        }}
                      >
                        {wine.name}
                      </span>
                      {" — "}
                      {wine.why}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleReset}
                style={{
                  flex: 1,
                  padding: "14px",
                  background:
                    "linear-gradient(135deg, #a855f7, #7c3aed)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 14,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Scan Another List
              </button>
              <button
                onClick={onBack}
                style={{
                  padding: "14px 18px",
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 14,
                  color: "rgba(255,255,255,.5)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        color: "rgba(255,255,255,.45)",
      }}
    >
      {children}
    </span>
  );
}
