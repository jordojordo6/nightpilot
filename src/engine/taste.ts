import type { Venue, TasteProfile, SwipeAction, ProfileSummary, NightPrefs } from "../types";

// ─── Profile update ────────────────────────────────────────────────

export function updateTasteProfile(
  profile: TasteProfile,
  venue: Venue,
  action: SwipeAction
): TasteProfile {
  const next: TasteProfile = {
    likedTags: { ...profile.likedTags },
    savedTags: { ...profile.savedTags },
    rejectedTags: { ...profile.rejectedTags },
    neighborhoods: { ...profile.neighborhoods },
    prices: { ...profile.prices },
    likeCount: profile.likeCount,
    saveCount: profile.saveCount,
    rejectCount: profile.rejectCount,
  };

  const priceKey = String(venue.price);

  if (action === "like") {
    for (const tag of venue.tags) {
      next.likedTags[tag] = (next.likedTags[tag] ?? 0) + 1;
    }
    next.neighborhoods[venue.neighborhood] =
      (next.neighborhoods[venue.neighborhood] ?? 0) + 2;
    next.prices[priceKey] = (next.prices[priceKey] ?? 0) + 1;
    next.likeCount++;
  } else if (action === "save") {
    for (const tag of venue.tags) {
      next.savedTags[tag] = (next.savedTags[tag] ?? 0) + 1;
    }
    next.neighborhoods[venue.neighborhood] =
      (next.neighborhoods[venue.neighborhood] ?? 0) + 3;
    next.prices[priceKey] = (next.prices[priceKey] ?? 0) + 2;
    next.saveCount++;
  } else {
    for (const tag of venue.tags) {
      next.rejectedTags[tag] = (next.rejectedTags[tag] ?? 0) + 1;
    }
    next.neighborhoods[venue.neighborhood] =
      (next.neighborhoods[venue.neighborhood] ?? 0) - 1;
    next.prices[priceKey] = (next.prices[priceKey] ?? 0) - 1;
    next.rejectCount++;
  }

  return next;
}

/** Reverse a single swipe — exact inverse of updateTasteProfile. */
export function undoTasteProfile(
  profile: TasteProfile,
  venue: Venue,
  action: SwipeAction
): TasteProfile {
  const next: TasteProfile = {
    likedTags: { ...profile.likedTags },
    savedTags: { ...profile.savedTags },
    rejectedTags: { ...profile.rejectedTags },
    neighborhoods: { ...profile.neighborhoods },
    prices: { ...profile.prices },
    likeCount: profile.likeCount,
    saveCount: profile.saveCount,
    rejectCount: profile.rejectCount,
  };

  const priceKey = String(venue.price);

  if (action === "like") {
    for (const tag of venue.tags) {
      next.likedTags[tag] = (next.likedTags[tag] ?? 0) - 1;
    }
    next.neighborhoods[venue.neighborhood] =
      (next.neighborhoods[venue.neighborhood] ?? 0) - 2;
    next.prices[priceKey] = (next.prices[priceKey] ?? 0) - 1;
    next.likeCount = Math.max(0, next.likeCount - 1);
  } else if (action === "save") {
    for (const tag of venue.tags) {
      next.savedTags[tag] = (next.savedTags[tag] ?? 0) - 1;
    }
    next.neighborhoods[venue.neighborhood] =
      (next.neighborhoods[venue.neighborhood] ?? 0) - 3;
    next.prices[priceKey] = (next.prices[priceKey] ?? 0) - 2;
    next.saveCount = Math.max(0, next.saveCount - 1);
  } else {
    for (const tag of venue.tags) {
      next.rejectedTags[tag] = (next.rejectedTags[tag] ?? 0) - 1;
    }
    next.neighborhoods[venue.neighborhood] =
      (next.neighborhoods[venue.neighborhood] ?? 0) + 1;
    next.prices[priceKey] = (next.prices[priceKey] ?? 0) + 1;
    next.rejectCount = Math.max(0, next.rejectCount - 1);
  }

  return next;
}

// ─── Venue scoring ─────────────────────────────────────────────────

const MOOD_KEYWORDS: Record<string, string[]> = {
  date: ["date", "romantic", "intimate", "impressing"],
  friends: ["friends", "group", "fun", "sharing"],
  fancy: ["special occasion", "splurge", "fine dining", "upscale"],
  casual: ["casual", "no-fuss", "low-key", "relaxed", "no-pretension"],
  solo: ["solo", "intimate", "quiet", "secret"],
  group: ["group", "celebration", "fun", "party", "outings"],
};

const VIBE_MAP: Record<string, string[]> = {
  date: ["romantic", "intimate", "upscale", "cozy", "wine", "date-night"],
  friends: ["lively", "fun", "casual", "shareable", "craft-beer", "patio"],
  fancy: ["upscale", "fine-dining", "tasting-menu", "views", "champagne"],
  casual: ["casual", "chill", "neighbourhood", "budget", "comfort-food", "patio"],
  solo: ["chill", "intimate", "cozy", "craft-cocktails", "natural-wine"],
  group: ["lively", "vibrant", "fun", "shareable", "casual", "late-night"],
};

export function scoreVenue(
  venue: Venue,
  profile: TasteProfile,
  prefs: NightPrefs
): number {
  let score = 0;

  // Tag matching: liked +3, saved +6, rejected -5
  for (const tag of venue.tags) {
    if ((profile.likedTags[tag] ?? 0) > 0) score += 3;
    if ((profile.savedTags[tag] ?? 0) > 0) score += 6;
    if ((profile.rejectedTags[tag] ?? 0) > 0) score -= 5;
  }

  // Neighborhood preference from swipe history: +4
  if ((profile.neighborhoods[venue.neighborhood] ?? 0) > 0) score += 4;

  // Price preference from swipe history: +2
  const priceKey = String(venue.price);
  if ((profile.prices[priceKey] ?? 0) > 0) score += 2;

  // Selected budget match: +2
  if (prefs.budget !== null && venue.price <= prefs.budget) score += 2;

  // Selected neighborhood match: +4
  if (prefs.neighborhood !== null && venue.neighborhood === prefs.neighborhood) {
    score += 4;
  }

  // Mood/bestFor match: +4
  if (prefs.occasion) {
    const keywords = MOOD_KEYWORDS[prefs.occasion] ?? [];
    const bestForLower = venue.bestFor.toLowerCase();
    if (keywords.some((kw) => bestForLower.includes(kw))) score += 4;

    // Vibe tag overlap with mood: +2
    const moodTags = VIBE_MAP[prefs.occasion] ?? [];
    if (venue.tags.some((t) => moodTags.includes(t))) score += 2;
  }

  return score;
}

/**
 * Normalize a raw score to 0–100 percentage.
 * After ~10 swipes a strong match typically scores 20–35 raw,
 * so we center at 50 and scale by 1.5.
 */
export function normalizeScore(raw: number): number {
  return Math.max(5, Math.min(99, Math.round(50 + raw * 1.5)));
}

// ─── Tag analysis helpers ──────────────────────────────────────────

/** Combined net score for a tag: liked*3 + saved*6 - rejected*5 */
export function getNetTagScore(tag: string, profile: TasteProfile): number {
  return (
    (profile.likedTags[tag] ?? 0) * 3 +
    (profile.savedTags[tag] ?? 0) * 6 -
    (profile.rejectedTags[tag] ?? 0) * 5
  );
}

/** Get the 2–3 tags from a venue pair that contributed most to the score */
export function getDrivingTags(
  restaurant: Venue,
  bar: Venue,
  profile: TasteProfile,
  count = 3
): string[] {
  const allTags = [...new Set([...restaurant.tags, ...bar.tags])];
  return allTags
    .map((tag) => ({ tag, score: getNetTagScore(tag, profile) }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((t) => t.tag);
}

/** Top positive tags across the whole profile */
export function getTopPositiveTags(
  profile: TasteProfile,
  count = 6
): string[] {
  const allTags = new Set([
    ...Object.keys(profile.likedTags),
    ...Object.keys(profile.savedTags),
  ]);
  return [...allTags]
    .map((tag) => ({ tag, score: getNetTagScore(tag, profile) }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((t) => t.tag);
}

/** Top negative tags (most rejected) */
export function getTopNegativeTags(
  profile: TasteProfile,
  count = 4
): string[] {
  return Object.entries(profile.rejectedTags)
    .map(([tag, ct]) => ({ tag, score: getNetTagScore(tag, profile), ct }))
    .filter((t) => t.score < 0 && t.ct > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((t) => t.tag);
}

/** Preferred neighborhoods (positive score, sorted) */
export function getPreferredNeighborhoods(
  profile: TasteProfile,
  count = 4
): string[] {
  return Object.entries(profile.neighborhoods)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([k]) => k);
}

/** Preferred price levels (positive score, sorted) */
export function getPreferredPrices(profile: TasteProfile): number[] {
  return Object.entries(profile.prices)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => Number(k));
}

// ─── Profile summary for Build My Night screen ─────────────────────

const VIBE_WORDS = new Set([
  "romantic", "lively", "chill", "trendy", "casual", "intimate",
  "upscale", "cozy", "fun", "creative", "vibrant", "classic",
  "warm", "quirky",
]);

export function getProfileSummary(
  profile: TasteProfile
): ProfileSummary | null {
  const top = getTopPositiveTags(profile, 6);
  if (top.length === 0) return null;

  const vibeWords = top.filter((t) => VIBE_WORDS.has(t));
  const tasteWords = top.filter((t) => !VIBE_WORDS.has(t));

  return { vibeWords, tasteWords, topTags: top };
}

// ─── Shuffle ────────────────────────────────────────────────────────

export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const shuffled = [...arr];
  let s = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
