import { describe, it, expect, vi } from "vitest";
import type { Venue, TasteProfile, NightPrefs } from "../../types";
import { EMPTY_PROFILE } from "../../types";
import { generateRecommendations, generateExplanation } from "../recommendations";

// Mock analytics to avoid localStorage in tests
vi.mock("../analytics", () => ({
  logEvent: vi.fn(),
}));

// ─── Test fixtures ──────────────────────────────────────────────────

const makeVenue = (overrides: Partial<Venue> = {}): Venue => ({
  id: 1,
  name: "Test Restaurant",
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

function makeTestVenues(): Venue[] {
  return [
    makeVenue({ id: 1, name: "R1", type: "restaurant", tags: ["romantic", "upscale"], neighborhood: "Downtown", price: 3, vibe: ["intimate", "upscale"] }),
    makeVenue({ id: 2, name: "R2", type: "restaurant", tags: ["casual", "fun", "patio"], neighborhood: "Gastown", price: 2, vibe: ["casual", "lively"] }),
    makeVenue({ id: 3, name: "R3", type: "restaurant", tags: ["creative", "trendy"], neighborhood: "Main Street", price: 3, vibe: ["trendy", "creative"] }),
    makeVenue({ id: 4, name: "R4", type: "restaurant", tags: ["budget", "comfort-food"], neighborhood: "Downtown", price: 1, vibe: ["casual", "warm"], dietary: ["vegetarian", "vegan"] }),
    makeVenue({ id: 11, name: "B1", type: "bar", tags: ["craft-cocktails", "intimate"], neighborhood: "Downtown", price: 3, vibe: ["intimate", "cozy"] }),
    makeVenue({ id: 12, name: "B2", type: "bar", tags: ["lively", "casual", "craft-beer"], neighborhood: "Gastown", price: 2, vibe: ["lively", "fun"] }),
    makeVenue({ id: 13, name: "B3", type: "bar", tags: ["date-night", "romantic"], neighborhood: "Downtown", price: 3, vibe: ["intimate", "romantic"] }),
    makeVenue({ id: 14, name: "B4", type: "bar", tags: ["dive", "budget", "late-night"], neighborhood: "Main Street", price: 1, vibe: ["casual", "lively"] }),
  ];
}

const makePrefs = (overrides: Partial<NightPrefs> = {}): NightPrefs => ({
  occasion: null,
  budget: null,
  neighborhood: null,
  planType: "both",
  ...overrides,
});

// ─── generateRecommendations ────────────────────────────────────────

describe("generateRecommendations", () => {
  it("returns up to 3 plans in 'both' mode", () => {
    const venues = makeTestVenues();
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs({ planType: "both" }),
      new Set(),
      new Set(),
      venues
    );
    expect(plans.length).toBeLessThanOrEqual(3);
    expect(plans.length).toBeGreaterThan(0);
  });

  it("each 'both' plan has both a restaurant and a bar", () => {
    const venues = makeTestVenues();
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs({ planType: "both" }),
      new Set(),
      new Set(),
      venues
    );
    for (const plan of plans) {
      expect(plan.restaurant).toBeDefined();
      expect(plan.bar).toBeDefined();
      expect(plan.planType).toBe("both");
    }
  });

  it("'dinner' mode plans have restaurant only", () => {
    const venues = makeTestVenues();
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs({ planType: "dinner" }),
      new Set(),
      new Set(),
      venues
    );
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(plan.restaurant).toBeDefined();
      expect(plan.bar).toBeUndefined();
      expect(plan.planType).toBe("dinner");
    }
  });

  it("'drinks' mode plans have bar only", () => {
    const venues = makeTestVenues();
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs({ planType: "drinks" }),
      new Set(),
      new Set(),
      venues
    );
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(plan.restaurant).toBeUndefined();
      expect(plan.bar).toBeDefined();
      expect(plan.planType).toBe("drinks");
    }
  });

  it("respects budget filter", () => {
    const venues = makeTestVenues();
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs({ planType: "dinner", budget: 1 }),
      new Set(),
      new Set(),
      venues
    );
    for (const plan of plans) {
      if (plan.restaurant) {
        expect(plan.restaurant.price).toBeLessThanOrEqual(1);
      }
    }
  });

  it("respects dietary restrictions", () => {
    const venues = makeTestVenues();
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs({ planType: "dinner" }),
      new Set(),
      new Set(),
      venues,
      ["vegan"]
    );
    for (const plan of plans) {
      if (plan.restaurant) {
        expect(plan.restaurant.dietary).toContain("vegan");
      }
    }
  });

  it("ranks saved venues higher", () => {
    const venues = makeTestVenues();
    const saved = new Set([2]); // R2 is saved
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs({ planType: "dinner" }),
      new Set(),
      saved,
      venues
    );
    // R2 should get a +10 boost, likely making it the top pick
    expect(plans[0]?.restaurant?.id).toBe(2);
  });

  it("produces valid match scores (5-99)", () => {
    const venues = makeTestVenues();
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs(),
      new Set(),
      new Set(),
      venues
    );
    for (const plan of plans) {
      expect(plan.matchScore).toBeGreaterThanOrEqual(5);
      expect(plan.matchScore).toBeLessThanOrEqual(99);
    }
  });

  it("does not reuse the same restaurant or bar across plans", () => {
    const venues = makeTestVenues();
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs({ planType: "both" }),
      new Set(),
      new Set(),
      venues
    );
    const rIds = plans.map((p) => p.restaurant?.id).filter(Boolean);
    const bIds = plans.map((p) => p.bar?.id).filter(Boolean);
    expect(new Set(rIds).size).toBe(rIds.length);
    expect(new Set(bIds).size).toBe(bIds.length);
  });

  it("returns empty array when no venues available", () => {
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      makePrefs({ planType: "dinner" }),
      new Set(),
      new Set(),
      [] // no venues
    );
    expect(plans).toEqual([]);
  });

  it("profile-influenced scoring puts preferred venues first", () => {
    const venues = makeTestVenues();
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      likedTags: { romantic: 3, upscale: 2 },
      savedTags: { romantic: 1 },
    };
    const plans = generateRecommendations(
      profile,
      makePrefs({ planType: "dinner" }),
      new Set(),
      new Set(),
      venues
    );
    // R1 has romantic+upscale tags, should be ranked first
    expect(plans[0]?.restaurant?.name).toBe("R1");
  });
});

// ─── generateExplanation ────────────────────────────────────────────

describe("generateExplanation", () => {
  it("produces a wildcard explanation for zero-match venues", () => {
    const venue = makeVenue({ tags: ["obscure", "niche"] });
    const explanation = generateExplanation(venue, { ...EMPTY_PROFILE }, null);
    // Should be one of the wildcard templates
    expect(explanation.length).toBeGreaterThan(10);
  });

  it("produces a taste-driven explanation for matching venues", () => {
    const venue = makeVenue({ tags: ["romantic", "upscale"] });
    const profile: TasteProfile = {
      ...EMPTY_PROFILE,
      likedTags: { romantic: 2, upscale: 1 },
    };
    const explanation = generateExplanation(venue, profile, null);
    expect(explanation.length).toBeGreaterThan(10);
    // Should reference at least one of the matching tags
    const mentionsTags =
      explanation.includes("romantic") || explanation.includes("upscale");
    expect(mentionsTags).toBe(true);
  });
});
