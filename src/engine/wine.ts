import type { WineProfile, WineSelection } from "../types";
import { EMPTY_WINE_PROFILE } from "../types";
import { loadState, saveState } from "./storage";

export function loadWineProfile(): WineProfile {
  const raw = loadState<unknown>("wineProfile", null);
  if (raw && typeof raw === "object" && "selections" in raw) {
    return raw as WineProfile;
  }
  return { ...EMPTY_WINE_PROFILE, selections: [] };
}

export function saveWineSelection(
  profile: WineProfile,
  selection: WineSelection
): WineProfile {
  const next: WineProfile = {
    selections: [...profile.selections, selection],
    preferredTypes: { ...profile.preferredTypes },
    preferredGrapes: { ...profile.preferredGrapes },
    preferredRegions: { ...profile.preferredRegions },
    avgRating: 0,
  };

  // Weight by rating: 4-5 = positive, 3 = neutral, 1-2 = negative
  const weight = selection.rating >= 4 ? 1 : selection.rating <= 2 ? -1 : 0;

  if (weight !== 0) {
    next.preferredTypes[selection.type] =
      (next.preferredTypes[selection.type] ?? 0) + weight;
    next.preferredGrapes[selection.grape] =
      (next.preferredGrapes[selection.grape] ?? 0) + weight;
    next.preferredRegions[selection.region] =
      (next.preferredRegions[selection.region] ?? 0) + weight;
  }

  // Recalculate average
  const ratings = next.selections.map((s) => s.rating);
  next.avgRating =
    ratings.reduce((a, b) => a + b, 0) / ratings.length;

  saveState("wineProfile", next);
  return next;
}

/** Build a taste context string from the wine profile for the AI prompt */
export function buildWineTasteContext(profile: WineProfile): string | undefined {
  if (profile.selections.length === 0) return undefined;

  const parts: string[] = [];

  // Top liked types
  const likedTypes = Object.entries(profile.preferredTypes)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const dislikedTypes = Object.entries(profile.preferredTypes)
    .filter(([, v]) => v < 0)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([k]) => k);

  // Top liked grapes
  const likedGrapes = Object.entries(profile.preferredGrapes)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);

  const dislikedGrapes = Object.entries(profile.preferredGrapes)
    .filter(([, v]) => v < 0)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([k]) => k);

  // Top liked regions
  const likedRegions = Object.entries(profile.preferredRegions)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  if (likedTypes.length > 0) {
    parts.push(`They prefer ${likedTypes.join(", ")} wines`);
  }
  if (dislikedTypes.length > 0) {
    parts.push(`they tend to avoid ${dislikedTypes.join(", ")}`);
  }
  if (likedGrapes.length > 0) {
    parts.push(`favorite grapes: ${likedGrapes.join(", ")}`);
  }
  if (dislikedGrapes.length > 0) {
    parts.push(`grapes they don't love: ${dislikedGrapes.join(", ")}`);
  }
  if (likedRegions.length > 0) {
    parts.push(`preferred regions: ${likedRegions.join(", ")}`);
  }

  // Recent high-rated picks
  const recent = profile.selections
    .filter((s) => s.rating >= 4)
    .slice(-3)
    .map((s) => `${s.name} (${s.grape}, ${s.region}) — rated ${s.rating}/5`);

  if (recent.length > 0) {
    parts.push(`Recent favorites: ${recent.join("; ")}`);
  }

  parts.push(`${profile.selections.length} wines rated, avg ${profile.avgRating.toFixed(1)}/5`);

  return parts.join(". ") + ".";
}
