import type { Venue, ScoredVenue, TasteProfile, NightPrefs, Plan } from "../types";
import { VENUES } from "../data/venues";
import { areNearby, estimateWalkTime } from "../data/neighborhoods";
import { scoreVenue, normalizeScore, getDrivingTags, getNetTagScore } from "./taste";
import { logEvent } from "./analytics";

// ─── Explanation generator ──────────────────────────────────────────

export function generateExplanation(
  venue: Venue,
  profile: TasteProfile,
  occasion: string | null
): string {
  // Find the venue's tags with the highest positive net score
  const topMatches = venue.tags
    .map((t) => ({ tag: t, score: getNetTagScore(t, profile) }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score);

  const labels = topMatches.slice(0, 3).map((t) => t.tag.replace(/-/g, " "));

  // Strong signals: tags the user has both liked AND saved
  const strongSignals = topMatches
    .filter(
      (t) =>
        (profile.savedTags[t.tag] ?? 0) > 0 ||
        (profile.likedTags[t.tag] ?? 0) >= 2
    )
    .map((t) => t.tag.replace(/-/g, " "));

  if (topMatches.length === 0) {
    const wildcards = [
      "A wild card to stretch your palate — sometimes the best nights are unexpected",
      "Outside your usual picks, but that's what makes a great night surprising",
      "Something different from your typical choices — worth the detour",
    ];
    return wildcards[venue.id % wildcards.length];
  }

  const templates: string[] = [];

  if (strongSignals.length >= 2) {
    templates.push(
      `You've consistently loved ${strongSignals[0]} and ${strongSignals[1]} — this place nails both`
    );
    templates.push(
      `Strong match: your top signals are ${strongSignals[0]} and ${strongSignals[1]}, and ${venue.name} delivers`
    );
  }

  if (strongSignals.length === 1) {
    const cap =
      strongSignals[0].charAt(0).toUpperCase() + strongSignals[0].slice(1);
    templates.push(
      `${cap} is one of your strongest taste signals, and ${venue.name} is known for it`
    );
    templates.push(
      `You keep gravitating toward ${strongSignals[0]} — this is one of the best in Vancouver for it`
    );
  }

  if (venue.bestFor && labels.length > 0) {
    templates.push(
      `Great for ${venue.bestFor} — and it matches your ${labels[0]} preference`
    );
  }

  if (labels.length >= 2) {
    templates.push(`Fits your ${labels[0]} and ${labels[1]} preferences`);
    templates.push(
      `Your profile says ${labels[0]} + ${labels[1]} — this checks both boxes`
    );
  }

  if (labels.length >= 3) {
    templates.push(
      `Triple match on ${labels[0]}, ${labels[1]}, and ${labels[2]}`
    );
  }

  if (occasion === "date" && venue.tags.includes("date-night")) {
    templates.push(
      `Date-night worthy, and it aligns with your love of ${labels[0] ?? "great spots"}`
    );
  }

  if (occasion === "casual" && venue.tags.includes("casual")) {
    templates.push(
      "Low-key and easy — exactly the casual vibe you tend to prefer"
    );
  }

  if (templates.length === 0) {
    return `Matches your taste for ${labels.join(" and ")}`;
  }
  return templates[venue.id % templates.length];
}

// ─── Pairing rationale ──────────────────────────────────────────────

export function generatePairingRationale(
  restaurant: Venue,
  bar: Venue
): string {
  const walkTime = estimateWalkTime(restaurant.neighborhood, bar.neighborhood);
  const sameHood = restaurant.neighborhood === bar.neighborhood;

  const parts: string[] = [];

  if (sameHood) {
    parts.push(
      `Both in ${restaurant.neighborhood} — ${walkTime} between them, so you can stroll over after dinner.`
    );
  } else if (areNearby(restaurant.neighborhood, bar.neighborhood)) {
    parts.push(
      `${restaurant.neighborhood} to ${bar.neighborhood} is a quick ${walkTime} — easy transition.`
    );
  } else {
    parts.push(
      `${restaurant.neighborhood} to ${bar.neighborhood} — ${walkTime}. Worth the trip.`
    );
  }

  const rVibes = new Set(restaurant.vibe);
  const bVibes = new Set(bar.vibe);

  if (rVibes.has("upscale") && bVibes.has("casual")) {
    parts.push(
      "Nice contrast — upscale dinner then a relaxed, no-pressure bar."
    );
  } else if (rVibes.has("casual") && bVibes.has("upscale")) {
    parts.push(
      "Start casual, then elevate the evening with a polished bar."
    );
  } else if (rVibes.has("intimate") && bVibes.has("intimate")) {
    parts.push(
      "Both intimate spots — perfect for keeping the conversation going all night."
    );
  } else if (rVibes.has("lively") && bVibes.has("lively")) {
    parts.push(
      "High energy all night — dinner and drinks that both bring the buzz."
    );
  }

  return parts.join(" ");
}

// ─── "Why this fits you" per plan ───────────────────────────────────

function generateWhyFitsYou(
  restaurant: ScoredVenue,
  bar: ScoredVenue,
  drivingTags: string[],
  profile: TasteProfile,
  occasion: string | null
): string {
  const labels = drivingTags.map((t) => t.replace(/-/g, " "));
  const sameHood = restaurant.neighborhood === bar.neighborhood;
  const nearby = areNearby(restaurant.neighborhood, bar.neighborhood);

  const parts: string[] = [];

  // Taste-driven opener
  if (labels.length >= 2) {
    const hasSaved = drivingTags.some((t) => (profile.savedTags[t] ?? 0) > 0);
    if (hasSaved) {
      parts.push(
        `You saved spots with ${labels[0]} and ${labels[1]} vibes — this pairing delivers both`
      );
    } else {
      parts.push(
        `Your taste for ${labels[0]} and ${labels[1]} shines through here`
      );
    }
  } else if (labels.length === 1) {
    parts.push(`Matches your strong ${labels[0]} preference`);
  }

  // Location context
  if (sameHood) {
    parts.push(
      `both in ${restaurant.neighborhood} for an easy stroll between spots`
    );
  } else if (nearby) {
    parts.push(
      `${restaurant.neighborhood} to ${bar.neighborhood} is a quick walk`
    );
  }

  // Occasion flavor
  if (occasion === "date") {
    parts.push("setting the mood all evening");
  } else if (occasion === "friends") {
    parts.push("great energy for a night with friends");
  } else if (occasion === "fancy") {
    parts.push("polished from start to finish");
  }

  return parts.join(" — ") + ".";
}

// ─── Vibe compatibility ────────────────────────────────────────────

function vibeCompatibilityScore(restaurant: Venue, bar: Venue): number {
  const rVibes = new Set(restaurant.vibe);
  const bVibes = new Set(bar.vibe);
  let overlap = 0;
  for (const v of rVibes) {
    if (bVibes.has(v)) overlap++;
  }

  // Complementary vibes also count (upscale dinner + chill bar = good contrast)
  const complementary = [
    ["upscale", "casual"],
    ["upscale", "chill"],
    ["intimate", "cozy"],
    ["trendy", "creative"],
    ["lively", "fun"],
    ["warm", "intimate"],
  ];
  for (const [a, b] of complementary) {
    if ((rVibes.has(a) && bVibes.has(b)) || (rVibes.has(b) && bVibes.has(a))) {
      overlap++;
    }
  }

  return overlap > 0 ? 3 : 0;
}

// ─── Plan name presets ──────────────────────────────────────────────

const PLAN_PRESETS_BOTH = [
  { name: "The Perfect Evening", icon: "✨" },
  { name: "The Bold Alternative", icon: "🔥" },
  { name: "The Hidden Gem Route", icon: "💎" },
];

const PLAN_PRESETS_DINNER = [
  { name: "Top Pick", icon: "🍽️" },
  { name: "The Bold Choice", icon: "🔥" },
  { name: "Hidden Gem", icon: "💎" },
];

const PLAN_PRESETS_DRINKS = [
  { name: "Top Pick", icon: "🍸" },
  { name: "The Bold Choice", icon: "🔥" },
  { name: "Hidden Gem", icon: "💎" },
];

// ─── Single-venue "why this fits you" ──────────────────────────────

function generateSingleWhyFitsYou(
  venue: ScoredVenue,
  profile: TasteProfile,
  occasion: string | null
): string {
  const topMatches = venue.tags
    .map((t) => ({ tag: t, score: getNetTagScore(t, profile) }))
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score);

  const labels = topMatches.slice(0, 3).map((t) => t.tag.replace(/-/g, " "));
  const parts: string[] = [];

  if (labels.length >= 2) {
    const hasSaved = topMatches
      .slice(0, 2)
      .some((t) => (profile.savedTags[t.tag] ?? 0) > 0);
    if (hasSaved) {
      parts.push(`You saved spots with ${labels[0]} and ${labels[1]} vibes — this one delivers`);
    } else {
      parts.push(`Your taste for ${labels[0]} and ${labels[1]} shines through here`);
    }
  } else if (labels.length === 1) {
    parts.push(`Matches your strong ${labels[0]} preference`);
  }

  if (occasion === "date") parts.push("setting the mood for the evening");
  else if (occasion === "friends") parts.push("great energy for a night out");
  else if (occasion === "fancy") parts.push("polished and impressive");
  else if (occasion === "casual") parts.push("relaxed and easy");

  return parts.length > 0 ? parts.join(" — ") + "." : "A great match based on your swipe history.";
}

// ─── Helper: score and filter venues ────────────────────────────────

function scoreAndFilter(
  venues: Venue[],
  profile: TasteProfile,
  prefs: NightPrefs,
  saved: Set<number>
): ScoredVenue[] {
  let scored: ScoredVenue[] = venues.map((v) => ({
    ...v,
    score: scoreVenue(v, profile, prefs),
  }));

  if (prefs.budget) {
    const max = prefs.budget;
    scored = scored.filter((v) => v.price <= max);
  }

  for (const v of scored) {
    if (saved.has(v.id)) v.score += 10;
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ─── Main recommendation engine ─────────────────────────────────────

export function generateRecommendations(
  profile: TasteProfile,
  prefs: NightPrefs,
  swiped: Set<number>,
  saved: Set<number>
): Plan[] {
  const planType = prefs.planType ?? "both";

  const restaurants = VENUES.filter(
    (v) => v.type === "restaurant" && (!swiped.has(v.id) || saved.has(v.id))
  );
  const bars = VENUES.filter(
    (v) => v.type === "bar" && (!swiped.has(v.id) || saved.has(v.id))
  );

  const scoredR = scoreAndFilter(restaurants, profile, prefs, saved);
  const scoredB = scoreAndFilter(bars, profile, prefs, saved);

  let plans: Plan[];

  if (planType === "dinner") {
    plans = generateSingleVenuePlans(scoredR, profile, prefs, PLAN_PRESETS_DINNER, "dinner");
  } else if (planType === "drinks") {
    plans = generateSingleVenuePlans(scoredB, profile, prefs, PLAN_PRESETS_DRINKS, "drinks");
  } else {
    plans = generatePairedPlans(scoredR, scoredB, profile, prefs);
  }

  logEvent("night_generated", {
    occasion: prefs.occasion,
    budget: prefs.budget,
    neighborhood: prefs.neighborhood,
    planType,
    planCount: plans.length,
    topMatch: plans[0]?.matchScore,
  });

  return plans;
}

// ─── Single-venue plan generator ────────────────────────────────────

function generateSingleVenuePlans(
  scored: ScoredVenue[],
  profile: TasteProfile,
  prefs: NightPrefs,
  presets: { name: string; icon: string }[],
  type: "dinner" | "drinks"
): Plan[] {
  const plans: Plan[] = [];

  for (let i = 0; i < Math.min(3, scored.length); i++) {
    const venue = scored[i];

    const topTags = venue.tags
      .map((t) => ({ tag: t, score: getNetTagScore(t, profile) }))
      .filter((t) => t.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((t) => t.tag);

    const matchScore = normalizeScore(venue.score);

    plans.push({
      ...presets[i],
      planType: type,
      ...(type === "dinner"
        ? { restaurant: venue, bar: undefined }
        : { restaurant: undefined, bar: venue }),
      matchScore,
      rExplanation:
        type === "dinner"
          ? generateExplanation(venue, profile, prefs.occasion)
          : "",
      bExplanation:
        type === "drinks"
          ? generateExplanation(venue, profile, prefs.occasion)
          : "",
      pairingRationale: "",
      walkTime: "",
      drivingTags: topTags,
      whyFitsYou: generateSingleWhyFitsYou(venue, profile, prefs.occasion),
    });
  }

  return plans;
}

// ─── Paired plan generator (original "both" mode) ───────────────────

function generatePairedPlans(
  scoredR: ScoredVenue[],
  scoredB: ScoredVenue[],
  profile: TasteProfile,
  prefs: NightPrefs
): Plan[] {
  const plans: Plan[] = [];
  const usedR = new Set<number>();
  const usedB = new Set<number>();

  for (let i = 0; i < Math.min(3, scoredR.length); i++) {
    const r = scoredR.find((v) => !usedR.has(v.id));
    if (!r) break;
    usedR.add(r.id);

    const candidateBars = scoredB
      .filter((v) => !usedB.has(v.id))
      .map((b) => {
        let pairingBonus = 0;
        if (b.neighborhood === r.neighborhood) pairingBonus += 3;
        else if (areNearby(r.neighborhood, b.neighborhood)) pairingBonus += 1;
        pairingBonus += vibeCompatibilityScore(r, b);
        return { bar: b, pairingBonus, combinedScore: b.score + pairingBonus };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore);

    const bestBar = candidateBars[0];
    if (!bestBar) break;
    const b = bestBar.bar;
    usedB.add(b.id);

    const rawPlanScore = (r.score + b.score) / 2 + bestBar.pairingBonus;
    const matchScore = normalizeScore(rawPlanScore);
    const drivingTags = getDrivingTags(r, b, profile);

    plans.push({
      ...PLAN_PRESETS_BOTH[i],
      planType: "both",
      restaurant: r,
      bar: b,
      matchScore,
      rExplanation: generateExplanation(r, profile, prefs.occasion),
      bExplanation: generateExplanation(b, profile, prefs.occasion),
      pairingRationale: generatePairingRationale(r, b),
      walkTime: estimateWalkTime(r.neighborhood, b.neighborhood),
      drivingTags,
      whyFitsYou: generateWhyFitsYou(
        r,
        b,
        drivingTags,
        profile,
        prefs.occasion
      ),
    });
  }

  return plans;
}
