import { describe, it, expect } from "vitest";
import type { Venue, TasteProfile, NightPrefs } from "../../types";
import { EMPTY_PROFILE } from "../../types";
import {
  updateTasteProfile,
  undoTasteProfile,
  scoreVenue,
  normalizeScore,
  getNetTagScore,
  getTopPositiveTags,
  getTopNegativeTags,
  getPreferredNeighborhoods,
  seededShuffle,
} from "../taste";

// ─── Test fixtures ──────────────────────────────────────────────────

const makeVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 1,
  name: "Test Venue",
  type: "restaurant",
  cuisine: "Italian",
  neighborhood: "Downtown",
  price: 2,
  rating: 4.5,
  vibe: ["casual", "fun"],
  tags: ["casual", "italian", "patio"],
  emoji: "🍝",
  tagline: "Great pasta",
  highlights: ["Outdoor seating"],
  gradient: ["#000", "#111"] as [string, string],
  bestFor: "casual dinner with friends",
  dietary: ["vegetarian"],
  ...overrides,
});

const makePrefs = (overrides: Partial<NightPrefs> = {}): NightPrefs => ({
  occasion: null,
  budget: null,
  neighborhoods: [],
  planType: "both",
  ...overrides,
});

// ─── updateTasteProfile ─────────────────────────────────────────────

describe("updateTasteProfile", () => {
  it("increments likedTags for a 'like' action", () => {
    const venue = makeVenue({ tags: ["romantic", "upscale"] });
    const result = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "like");

    expect(result.likedTags["romantic"]).toBe(1);
    expect(result.likedTags["upscale"]).toBe(1);
    expect(result.likeCount).toBe(1);
  });

  it("increments savedTags for a 'save' action", () => {
    const venue = makeVenue({ tags: ["craft-cocktails"] });
    const result = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "save");

    expect(result.savedTags["craft-cocktails"]).toBe(1);
    expect(result.saveCount).toBe(1);
  });

  it("increments rejectedTags for a 'nope' action", () => {
    const venue = makeVenue({ tags: ["loud", "dive"] });
    const result = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "nope");

    expect(result.rejectedTags["loud"]).toBe(1);
    expect(result.rejectedTags["dive"]).toBe(1);
    expect(result.rejectCount).toBe(1);
  });

  it("tracks neighborhood preference with correct weights", () => {
    const venue = makeVenue({ neighborhood: "Gastown" });

    const liked = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "like");
    expect(liked.neighborhoods["Gastown"]).toBe(2); // like = +2

    const saved = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "save");
    expect(saved.neighborhoods["Gastown"]).toBe(3); // save = +3

    const noped = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "nope");
    expect(noped.neighborhoods["Gastown"]).toBe(-1); // nope = -1
  });

  it("tracks price preference", () => {
    const venue = makeVenue({ price: 3 });

    const liked = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "like");
    expect(liked.prices["3"]).toBe(1);

    const saved = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "save");
    expect(saved.prices["3"]).toBe(2);
  });

  it("accumulates across multiple swipes", () => {
    const v1 = makeVenue({ tags: ["romantic"], neighborhood: "Downtown" });
    const v2 = makeVenue({ id: 2, tags: ["romantic", "upscale"], neighborhood: "Downtown" });

    let profile = updateTasteProfile({ ...EMPTY_PROFILE }, v1, "like");
    profile = updateTasteProfile(profile, v2, "like");

    expect(profile.likedTags["romantic"]).toBe(2);
    expect(profile.likedTags["upscale"]).toBe(1);
    expect(profile.likeCount).toBe(2);
    expect(profile.neighborhoods["Downtown"]).toBe(4); // 2 + 2
  });

  it("does not mutate the original profile", () => {
    const original = { ...EMPTY_PROFILE };
    const venue = makeVenue();
    updateTasteProfile(original, venue, "like");

    expect(original.likeCount).toBe(0);
    expect(original.likedTags).toEqual({});
  });
});

// ─── undoTasteProfile ───────────────────────────────────────────────

describe("undoTasteProfile", () => {
  it("exactly reverses a 'like' action", () => {
    const venue = makeVenue({ tags: ["romantic", "upscale"], neighborhood: "Gastown", price: 3 });

    const after = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "like");
    const undone = undoTasteProfile(after, venue, "like");

    expect(undone.likedTags["romantic"]).toBe(0);
    expect(undone.likedTags["upscale"]).toBe(0);
    expect(undone.neighborhoods["Gastown"]).toBe(0);
    expect(undone.prices["3"]).toBe(0);
    expect(undone.likeCount).toBe(0);
  });

  it("exactly reverses a 'save' action", () => {
    const venue = makeVenue({ tags: ["craft-beer"], neighborhood: "Main Street", price: 2 });

    const after = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "save");
    const undone = undoTasteProfile(after, venue, "save");

    expect(undone.savedTags["craft-beer"]).toBe(0);
    expect(undone.neighborhoods["Main Street"]).toBe(0);
    expect(undone.prices["2"]).toBe(0);
    expect(undone.saveCount).toBe(0);
  });

  it("exactly reverses a 'nope' action", () => {
    const venue = makeVenue({ tags: ["loud", "dive"], neighborhood: "Gastown", price: 1 });

    const after = updateTasteProfile({ ...EMPTY_PROFILE }, venue, "nope");
    const undone = undoTasteProfile(after, venue, "nope");

    expect(undone.rejectedTags["loud"]).toBe(0);
    expect(undone.rejectedTags["dive"]).toBe(0);
    expect(undone.neighborhoods["Gastown"]).toBe(0);
    expect(undone.prices["1"]).toBe(0);
    expect(undone.rejectCount).toBe(0);
  });

  it("does not let counts go below zero", () => {
    const venue = makeVenue();
    const undone = undoTasteProfile({ ...EMPTY_PROFILE }, venue, "like");

    expect(undone.likeCount).toBe(0);
  });
});

// ─── scoreVenue ─────────────────────────────────────────────────────

describe("scoreVenue", () => {
  it("returns 0 for empty profile and no preferences", () => {
    const venue = makeVenue();
    const score = scoreVenue(venue, { ...EMPTY_PROFILE }, makePrefs());
    expect(score).toBe(0);
  });

  it("boosts score for liked tags (+3 per matching tag)", () => {
    const venue = makeVenue({ tags: ["romantic", "upscale"] });
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      likedTags: { romantic: 1, upscale: 1 },
    };
    const score = scoreVenue(venue, profile, makePrefs());
    expect(score).toBeGreaterThanOrEqual(6); // +3 per liked tag
  });

  it("boosts score for saved tags (+6 per matching tag)", () => {
    const venue = makeVenue({ tags: ["romantic"] });
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      savedTags: { romantic: 1 },
    };
    const score = scoreVenue(venue, profile, makePrefs());
    expect(score).toBeGreaterThanOrEqual(6);
  });

  it("penalizes rejected tags (-5 per matching tag)", () => {
    const venue = makeVenue({ tags: ["loud", "dive"] });
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      rejectedTags: { loud: 1, dive: 1 },
    };
    const score = scoreVenue(venue, profile, makePrefs());
    expect(score).toBeLessThanOrEqual(-10);
  });

  it("applies neighborhood bonus from swipe history", () => {
    const venue = makeVenue({ neighborhood: "Downtown" });
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      neighborhoods: { Downtown: 5 },
    };
    const score = scoreVenue(venue, profile, makePrefs());
    expect(score).toBeGreaterThanOrEqual(4);
  });

  it("applies budget preference bonus", () => {
    const venue = makeVenue({ price: 2 });
    const prefs = makePrefs({ budget: 3 });
    const score = scoreVenue(venue, { ...EMPTY_PROFILE }, prefs);
    expect(score).toBe(2); // +2 for within budget
  });

  it("does not penalize for being over budget (just no bonus)", () => {
    const venue = makeVenue({ price: 4 });
    const prefs = makePrefs({ budget: 2 });
    const score = scoreVenue(venue, { ...EMPTY_PROFILE }, prefs);
    expect(score).toBe(0);
  });

  it("applies neighborhood preference from prefs", () => {
    const venue = makeVenue({ neighborhood: "Gastown" });
    const prefs = makePrefs({ neighborhoods: ["Gastown"] });
    const score = scoreVenue(venue, { ...EMPTY_PROFILE }, prefs);
    expect(score).toBe(4);
  });

  it("applies occasion/mood bonus", () => {
    const venue = makeVenue({
      bestFor: "romantic date night",
      tags: ["romantic", "date-night"],
    });
    const prefs = makePrefs({ occasion: "date" });
    const score = scoreVenue(venue, { ...EMPTY_PROFILE }, prefs);
    // +4 for bestFor keyword match + +2 for vibe tag overlap
    expect(score).toBeGreaterThanOrEqual(4);
  });
});

// ─── normalizeScore ─────────────────────────────────────────────────

describe("normalizeScore", () => {
  it("centers at 50 for raw score 0", () => {
    expect(normalizeScore(0)).toBe(50);
  });

  it("clamps to minimum of 5", () => {
    expect(normalizeScore(-100)).toBe(5);
  });

  it("clamps to maximum of 99", () => {
    expect(normalizeScore(100)).toBe(99);
  });

  it("scales by 1.5", () => {
    expect(normalizeScore(10)).toBe(65); // 50 + 10*1.5 = 65
  });
});

// ─── getNetTagScore ─────────────────────────────────────────────────

describe("getNetTagScore", () => {
  it("combines liked*3 + saved*6 - rejected*5", () => {
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      likedTags: { romantic: 2 },
      savedTags: { romantic: 1 },
      rejectedTags: { romantic: 1 },
    };
    // 2*3 + 1*6 - 1*5 = 7
    expect(getNetTagScore("romantic", profile)).toBe(7);
  });

  it("returns 0 for unknown tags", () => {
    expect(getNetTagScore("nonexistent", { ...EMPTY_PROFILE })).toBe(0);
  });
});

// ─── getTopPositiveTags / getTopNegativeTags ────────────────────────

describe("getTopPositiveTags", () => {
  it("returns tags sorted by net score descending", () => {
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      likedTags: { romantic: 3, casual: 1 },
      savedTags: { upscale: 2 },
    };
    const top = getTopPositiveTags(profile, 3);
    // upscale: 0*3+2*6=12, romantic: 3*3+0*6=9, casual: 1*3=3
    expect(top[0]).toBe("upscale");
    expect(top[1]).toBe("romantic");
    expect(top[2]).toBe("casual");
  });
});

describe("getTopNegativeTags", () => {
  it("returns most rejected tags", () => {
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      rejectedTags: { loud: 3, crowded: 1 },
    };
    const neg = getTopNegativeTags(profile, 2);
    expect(neg[0]).toBe("loud"); // -15 vs -5
    expect(neg[1]).toBe("crowded");
  });
});

// ─── getPreferredNeighborhoods ──────────────────────────────────────

describe("getPreferredNeighborhoods", () => {
  it("returns only neighborhoods with positive scores, sorted", () => {
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      neighborhoods: { Downtown: 5, Gastown: -1, Kitsilano: 3 },
    };
    const hoods = getPreferredNeighborhoods(profile, 3);
    expect(hoods).toEqual(["Downtown", "Kitsilano"]);
  });
});

// ─── seededShuffle ──────────────────────────────────────────────────

describe("seededShuffle", () => {
  it("produces the same order for the same seed", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = seededShuffle(arr, 42);
    const b = seededShuffle(arr, 42);
    expect(a).toEqual(b);
  });

  it("produces different order for different seeds", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = seededShuffle(arr, 42);
    const b = seededShuffle(arr, 99);
    expect(a).not.toEqual(b);
  });

  it("does not mutate the original array", () => {
    const arr = [1, 2, 3];
    const copy = [...arr];
    seededShuffle(arr, 42);
    expect(arr).toEqual(copy);
  });
});
