import { useState, useRef } from "react";
import type { TasteProfile, WineProfile, WineSelection } from "../types";
import { getTopPositiveTags, getTopNegativeTags } from "../engine/taste";
import { logEvent } from "../engine/analytics";
import { loadWineProfile, saveWineSelection, buildWineTasteContext } from "../engine/wine";

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

interface PhotoItem {
  base64: string;
  mediaType: string;
  preview: string; // data URL for thumbnail
}

/** Compress an image file to max 800px wide JPEG at 0.6 quality */
function compressImage(file: File): Promise<PhotoItem> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 800;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      const base64 = dataUrl.split(",")[1];

      URL.revokeObjectURL(url);
      resolve({
        base64,
        mediaType: "image/jpeg",
        preview: dataUrl,
      });
    };
    img.src = url;
  });
}

export function WineLensScreen({ onBack, tasteProfile }: Props) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wineProfile, setWineProfile] = useState<WineProfile>(() => loadWineProfile());
  const [selectedWine, setSelectedWine] = useState<WineRec | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [mood, setMood] = useState("");
  const [foodPairing, setFoodPairing] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ??
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input not supported on this browser");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    // Store the text that existed before we started listening
    const baseline = mood;

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      const prefix = baseline ? `${baseline} ` : "";
      setMood(prefix + final + interim);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const compressed = await Promise.all(
      Array.from(files).map((f) => compressImage(f))
    );

    setPhotos((prev) => [...prev, ...compressed]);
    setResult(null);
    setError(null);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (photos.length === 0) return;
    setLoading(true);
    setError(null);

    const topTags = getTopPositiveTags(tasteProfile, 6);
    const negTags = getTopNegativeTags(tasteProfile, 4);
    const wineTaste = buildWineTasteContext(wineProfile);

    // Build richer venue taste context
    const venueParts: string[] = [];
    if (topTags.length > 0) {
      venueParts.push(`They enjoy dining at places that are ${topTags.join(", ")}`);
    }
    if (negTags.length > 0) {
      venueParts.push(`they tend to avoid ${negTags.join(", ")} spots`);
    }
    // Infer wine-relevant signals from venue tags
    const hasUpscale = topTags.some((t) => ["upscale", "fine-dining", "romantic"].includes(t));
    const hasCasual = topTags.some((t) => ["casual", "fun", "budget", "dive"].includes(t));
    const hasAdventurous = topTags.some((t) => ["creative", "trendy", "fusion"].includes(t));
    if (hasUpscale) venueParts.push("they appreciate quality and are open to spending more on a good bottle");
    if (hasCasual && !hasUpscale) venueParts.push("they prefer approachable, good-value wines over showy labels");
    if (hasAdventurous) venueParts.push("they're open to unusual or lesser-known varietals");
    const venueTaste = venueParts.length > 0 ? venueParts.join("; ") + "." : "";

    const moodContext = mood.trim()
      ? `Right now they're in the mood for: ${mood.trim()}.`
      : "";
    const foodContext = foodPairing
      ? `They're eating: ${foodPairing}. Prioritize wines that pair well with this.`
      : "";
    const tasteContext =
      moodContext || foodContext || wineTaste || venueTaste
        ? [moodContext, foodContext, wineTaste, venueTaste].filter(Boolean).join(" ")
        : undefined;

    try {
      const res = await fetch("/api/wine-lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: photos.map((p) => ({
            image: p.base64,
            mediaType: p.mediaType,
          })),
          tasteContext,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let msg = `Error ${res.status}`;
        try {
          const errData = JSON.parse(errText);
          if (errData.error) msg = errData.error;
        } catch {
          if (errText) msg = errText.slice(0, 200);
        }
        throw new Error(msg);
      }

      const data = (await res.json()) as WineResult;
      setResult(data);

      logEvent("wine_lens_scan", {
        wineCount: data.wines.length,
        photoCount: photos.length,
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

  const handleSelectWine = (wine: WineRec) => {
    setSelectedWine(wine);
    setRating(0);
    setRatingSubmitted(false);
  };

  const handleSubmitRating = () => {
    if (!selectedWine || rating === 0) return;

    const selection: WineSelection = {
      name: selectedWine.name,
      type: selectedWine.type,
      grape: selectedWine.grape,
      region: selectedWine.region,
      rating,
      timestamp: new Date().toISOString(),
    };

    const updated = saveWineSelection(wineProfile, selection);
    setWineProfile(updated);
    setRatingSubmitted(true);

    logEvent("wine_rated", {
      name: selectedWine.name,
      type: selectedWine.type,
      grape: selectedWine.grape,
      region: selectedWine.region,
      rating,
      totalWinesRated: updated.selections.length,
    });
  };

  const handleReset = () => {
    setPhotos([]);
    setResult(null);
    setError(null);
    setSelectedWine(null);
    setRating(0);
    setRatingSubmitted(false);
    setFeedbackSent(false);
    setMood("");
    setFoodPairing(null);
  };

  const handleFeedback = (value: string) => {
    setFeedbackSent(true);

    const wineNames = result?.wines.map((w) => w.name) ?? [];
    const avoidNames = result?.avoid.map((w) => w.name) ?? [];

    logEvent("wine_lens_feedback", {
      response: value,
      wineNames,
      avoidNames,
      photoCount: photos.length,
      listSummary: result?.listSummary ?? "",
      winesRated: wineProfile.selections.length,
    });

    fetch(
      "https://script.google.com/macros/s/AKfycbxwtmbMlR8jBpE_QkvEkVmGNIO89u1JCTegtIU9_D0_I484SCY-Bf4Hql0jPl3kUr8-/exec",
      {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          feature: "wine_lens",
          response: value,
          wineNames,
          avoidNames,
          photoCount: photos.length,
          listSummary: result?.listSummary ?? "",
          tip: result?.tip ?? "",
          winesRated: wineProfile.selections.length,
          avgWineRating: wineProfile.avgRating,
          userAgent: navigator.userAgent,
        }),
      }
    ).catch(() => {});
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

            {/* Taste profile indicator */}
            {(tasteProfile.likeCount + tasteProfile.saveCount > 0 ||
              wineProfile.selections.length > 0) && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  background: "rgba(34,197,94,.08)",
                  border: "1px solid rgba(34,197,94,.2)",
                  borderRadius: 20,
                  marginBottom: 20,
                }}
              >
                <span style={{ fontSize: 10, color: "#22c55e" }}>●</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.45)", fontWeight: 500 }}>
                  {[
                    tasteProfile.likeCount + tasteProfile.saveCount > 0
                      ? `${tasteProfile.likeCount + tasteProfile.saveCount} venues rated`
                      : "",
                    wineProfile.selections.length > 0
                      ? `${wineProfile.selections.length} wines rated`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  — personalizing picks
                </span>
              </div>
            )}

            {/* Mood prompt */}
            <div
              style={{
                position: "relative",
                marginBottom: 20,
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,.4)",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                What are you in the mood for?
              </p>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder='e.g. "a dry white wine" or "something bold and red"'
                  style={{
                    width: "100%",
                    padding: "12px 48px 12px 14px",
                    background: "rgba(255,255,255,.06)",
                    border: listening
                      ? "1.5px solid #a855f7"
                      : "1.5px solid rgba(255,255,255,.1)",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 14,
                    fontFamily: "inherit",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                  }}
                />
                <button
                  onClick={listening ? stopListening : startListening}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: listening
                      ? "rgba(168,85,247,.25)"
                      : "rgba(255,255,255,.06)",
                    border: listening
                      ? "1.5px solid #a855f7"
                      : "1.5px solid rgba(255,255,255,.1)",
                    color: listening ? "#c084fc" : "rgba(255,255,255,.4)",
                    fontSize: 18,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    transition: "all 0.2s",
                  }}
                >
                  {listening ? "⏹" : "🎤"}
                </button>
              </div>
              {listening && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#a855f7",
                    marginTop: 6,
                    textAlign: "center",
                    animation: "pulse 1.5s infinite",
                  }}
                >
                  Listening...
                </p>
              )}
            </div>

            {/* Food pairing chips */}
            <div style={{ marginBottom: 20, textAlign: "left" }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "rgba(255,255,255,.4)",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Know what you're eating?
              </p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                }}
              >
                {([
                  { label: "🥩 Beef", value: "beef" },
                  { label: "🍗 Chicken", value: "chicken" },
                  { label: "🐟 Seafood", value: "seafood" },
                  { label: "🍝 Pasta", value: "pasta" },
                  { label: "🥗 Salad", value: "salad / vegetables" },
                  { label: "🧀 Cheese", value: "cheese" },
                  { label: "🍕 Pizza", value: "pizza" },
                  { label: "🍣 Sushi", value: "sushi / raw fish" },
                  { label: "🌶️ Spicy", value: "spicy food" },
                ] as const).map((item) => (
                  <button
                    key={item.value}
                    onClick={() =>
                      setFoodPairing((prev) =>
                        prev === item.value ? null : item.value
                      )
                    }
                    style={{
                      padding: "7px 12px",
                      background:
                        foodPairing === item.value
                          ? "rgba(168,85,247,.2)"
                          : "rgba(255,255,255,.05)",
                      border:
                        foodPairing === item.value
                          ? "1.5px solid rgba(168,85,247,.5)"
                          : "1.5px solid rgba(255,255,255,.08)",
                      borderRadius: 20,
                      color:
                        foodPairing === item.value
                          ? "#c084fc"
                          : "rgba(255,255,255,.5)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo thumbnails */}
            {photos.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 16,
                  overflowX: "auto",
                  padding: "4px 0",
                }}
              >
                {photos.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      flexShrink: 0,
                      width: 80,
                      height: 100,
                      borderRadius: 12,
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,.15)",
                    }}
                  >
                    <img
                      src={p.preview}
                      alt={`Wine list page ${i + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,.7)",
                        border: "none",
                        color: "#fff",
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 4,
                        left: 4,
                        background: "rgba(0,0,0,.6)",
                        borderRadius: 4,
                        padding: "1px 5px",
                        fontSize: 9,
                        color: "rgba(255,255,255,.7)",
                        fontWeight: 600,
                      }}
                    >
                      {i + 1}
                    </div>
                  </div>
                ))}
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
              multiple
              onChange={handleCapture}
              style={{ display: "none" }}
            />

            {/* Capture buttons — always show so user can add more */}
            <div style={{ display: "flex", gap: 10, marginBottom: photos.length > 0 ? 12 : 0 }}>
              <button
                onClick={() => fileRef.current?.click()}
                style={{
                  flex: 1,
                  padding: photos.length > 0 ? "12px" : "16px",
                  background:
                    photos.length > 0
                      ? "rgba(168,85,247,.12)"
                      : "linear-gradient(135deg, #a855f7, #7c3aed)",
                  color: photos.length > 0 ? "#c084fc" : "#fff",
                  border: photos.length > 0
                    ? "1px solid rgba(168,85,247,.3)"
                    : "none",
                  borderRadius: photos.length > 0 ? 12 : 16,
                  fontSize: photos.length > 0 ? 13 : 15,
                  fontWeight: photos.length > 0 ? 600 : 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {photos.length > 0 ? "+ Take Another" : "Take Photo 📸"}
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                style={{
                  flex: 1,
                  padding: photos.length > 0 ? "12px" : "16px",
                  background: "rgba(168,85,247,.12)",
                  border: "1px solid rgba(168,85,247,.3)",
                  borderRadius: photos.length > 0 ? 12 : 16,
                  fontSize: photos.length > 0 ? 13 : 15,
                  fontWeight: photos.length > 0 ? 600 : 700,
                  color: "#c084fc",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {photos.length > 0 ? "+ From Photos" : "From Photos 🖼️"}
              </button>
            </div>

            {/* Analyze / Clear buttons */}
            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleReset}
                  style={{
                    padding: "14px 16px",
                    background: "rgba(255,255,255,.06)",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 14,
                    color: "rgba(255,255,255,.5)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  style={{
                    flex: 1,
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
                  {loading
                    ? "Analyzing..."
                    : `Analyze ${photos.length} ${photos.length === 1 ? "Page" : "Pages"} 🍷`}
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

                  {/* "I ordered this" button */}
                  {selectedWine?.name === wine.name && !ratingSubmitted ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "12px",
                        background: "rgba(168,85,247,.08)",
                        border: "1px solid rgba(168,85,247,.2)",
                        borderRadius: 12,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,.5)",
                          marginBottom: 8,
                          textAlign: "center",
                        }}
                      >
                        How was it?
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 6,
                          marginBottom: 10,
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            style={{
                              background: "none",
                              border: "none",
                              fontSize: 28,
                              cursor: "pointer",
                              opacity: star <= rating ? 1 : 0.25,
                              transition: "opacity 0.15s, transform 0.15s",
                              transform: star <= rating ? "scale(1.15)" : "scale(1)",
                              padding: 2,
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => setSelectedWine(null)}
                          style={{
                            padding: "8px 12px",
                            background: "rgba(255,255,255,.06)",
                            border: "1px solid rgba(255,255,255,.1)",
                            borderRadius: 10,
                            color: "rgba(255,255,255,.4)",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSubmitRating}
                          disabled={rating === 0}
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            background:
                              rating === 0
                                ? "rgba(168,85,247,.15)"
                                : "linear-gradient(135deg, #a855f7, #7c3aed)",
                            color: rating === 0 ? "rgba(255,255,255,.3)" : "#fff",
                            border: "none",
                            borderRadius: 10,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: rating === 0 ? "default" : "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Save Rating
                        </button>
                      </div>
                    </div>
                  ) : selectedWine?.name === wine.name && ratingSubmitted ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 14px",
                        background: "rgba(34,197,94,.08)",
                        border: "1px solid rgba(34,197,94,.2)",
                        borderRadius: 12,
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          color: "#22c55e",
                          fontWeight: 600,
                        }}
                      >
                        ✓ Rated {"★".repeat(rating)} — saved to your taste profile
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectWine(wine)}
                      style={{
                        marginTop: 12,
                        width: "100%",
                        padding: "10px",
                        background: "rgba(168,85,247,.08)",
                        border: "1px solid rgba(168,85,247,.2)",
                        borderRadius: 10,
                        color: "#c084fc",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "background 0.2s",
                      }}
                    >
                      I ordered this 🍷
                    </button>
                  )}
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

            {/* Feedback */}
            <div
              style={{
                padding: "16px",
                background: "rgba(255,255,255,.03)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 16,
                marginBottom: 16,
                animation: "fadeInUp 0.5s ease-out 0.45s both",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(255,255,255,.6)",
                  textAlign: "center",
                  marginBottom: 12,
                }}
              >
                How were these wine picks?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {([
                  { label: "Great picks", value: "great", color: "#22c55e" },
                  { label: "Okay", value: "okay", color: "#fbbf24" },
                  { label: "Missed the mark", value: "missed", color: "#ef4444" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleFeedback(opt.value)}
                    disabled={feedbackSent}
                    style={{
                      flex: 1,
                      padding: "10px 6px",
                      background:
                        feedbackSent
                          ? "rgba(255,255,255,.03)"
                          : "rgba(255,255,255,.05)",
                      border: "1.5px solid rgba(255,255,255,.08)",
                      borderRadius: 10,
                      color: feedbackSent
                        ? "rgba(255,255,255,.2)"
                        : opt.color,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: feedbackSent ? "default" : "pointer",
                      fontFamily: "inherit",
                      opacity: feedbackSent ? 0.5 : 1,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {feedbackSent && (
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,.35)",
                    textAlign: "center",
                    marginTop: 10,
                  }}
                >
                  Thanks! Your feedback helps us improve.
                </p>
              )}
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSeIMnxY-_gBGckzCc9rSPajOZGvK8AHwXP52yfi5uYq20Fl3Q/viewform"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: 10,
                  fontSize: 11,
                  color: "rgba(255,255,255,.25)",
                  textDecoration: "none",
                }}
              >
                Have more thoughts? Share detailed feedback →
              </a>
            </div>

            {/* Wine profile summary */}
            {wineProfile.selections.length > 0 && (
              <div
                style={{
                  background: "rgba(168,85,247,.06)",
                  border: "1px solid rgba(168,85,247,.15)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(255,255,255,.3)",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    marginBottom: 10,
                  }}
                >
                  Your Wine Profile
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "8px",
                      background: "rgba(255,255,255,.04)",
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#c084fc" }}>
                      {wineProfile.selections.length}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>
                      wines rated
                    </div>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "8px",
                      background: "rgba(255,255,255,.04)",
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#fbbf24" }}>
                      {wineProfile.avgRating.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>
                      avg rating
                    </div>
                  </div>
                </div>
                {/* Recent ratings */}
                {wineProfile.selections.slice(-3).reverse().map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0",
                      borderTop:
                        i === 0 ? "none" : "1px solid rgba(255,255,255,.05)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,.5)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginRight: 8,
                      }}
                    >
                      {s.name}
                    </span>
                    <span style={{ fontSize: 12, color: "#fbbf24", flexShrink: 0 }}>
                      {"★".repeat(s.rating)}
                      {"☆".repeat(5 - s.rating)}
                    </span>
                  </div>
                ))}
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,.3)",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Future scans use your taste profile for better picks
                </p>
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
