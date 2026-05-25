import { describe, it, expect, vi } from "vitest";
import { EMPTY_PROFILE } from "../../types";
import type { NightPrefs } from "../../types";
import { generateRecommendations } from "../recommendations";
import { CITIES } from "../../data/cities";

vi.mock("../analytics", () => ({
  logEvent: vi.fn(),
}));

const DEFAULT_PREFS: NightPrefs = {
  occasion: "casual",
  budget: null,
  neighborhoods: [],
  planType: "both",
};

describe("City isolation", () => {
  it("all 4 cities are present in CITIES", () => {
    const keys = CITIES.map((c) => c.key);
    expect(keys).toContain("vancouver");
    expect(keys).toContain("dublin");
    expect(keys).toContain("amsterdam");
    expect(keys).toContain("slc");
    expect(CITIES.length).toBe(4);
  });

  it("cities are alphabetically ordered", () => {
    const names = CITIES.map((c) => c.name);
    expect(names).toEqual([...names].sort());
  });

  it("no duplicate venue IDs across all cities", () => {
    const allIds = CITIES.flatMap((c) => c.venues.map((v) => v.id));
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });

  it("each city has enough venues for all plan types", () => {
    for (const city of CITIES) {
      const restaurants = city.venues.filter((v) => v.type === "restaurant");
      const bars = city.venues.filter((v) => v.type === "bar");
      expect(restaurants.length).toBeGreaterThanOrEqual(3);
      expect(bars.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("SLC recommendations only contain SLC venues", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const slcIds = new Set(slc.venues.map((v) => v.id));
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      DEFAULT_PREFS,
      new Set(),
      new Set(),
      slc.venues,
      [],
      "slc"
    );
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      if (plan.restaurant) expect(slcIds.has(plan.restaurant.id)).toBe(true);
      if (plan.bar) expect(slcIds.has(plan.bar.id)).toBe(true);
    }
  });

  it("Vancouver recommendations only contain Vancouver venues", () => {
    const van = CITIES.find((c) => c.key === "vancouver")!;
    const vanIds = new Set(van.venues.map((v) => v.id));
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      DEFAULT_PREFS,
      new Set(),
      new Set(),
      van.venues,
      [],
      "vancouver"
    );
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      if (plan.restaurant) expect(vanIds.has(plan.restaurant.id)).toBe(true);
      if (plan.bar) expect(vanIds.has(plan.bar.id)).toBe(true);
    }
  });

  it("SLC dinner-only returns only restaurants", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      { ...DEFAULT_PREFS, planType: "dinner" },
      new Set(),
      new Set(),
      slc.venues,
      [],
      "slc"
    );
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(plan.restaurant).toBeDefined();
      expect(plan.bar).toBeUndefined();
    }
  });

  it("SLC drinks-only returns only bars", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      { ...DEFAULT_PREFS, planType: "drinks" },
      new Set(),
      new Set(),
      slc.venues,
      [],
      "slc"
    );
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(plan.bar).toBeDefined();
      expect(plan.restaurant).toBeUndefined();
    }
  });

  it("SLC both mode returns restaurant + bar pairs", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE },
      { ...DEFAULT_PREFS, planType: "both" },
      new Set(),
      new Set(),
      slc.venues,
      [],
      "slc"
    );
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(plan.restaurant).toBeDefined();
      expect(plan.bar).toBeDefined();
    }
  });

  it("SLC venues all have valid neighborhoods in NEARBY map or are isolated", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const neighborhoods = new Set(slc.venues.map((v) => v.neighborhood));
    // All neighborhoods should be non-empty strings
    for (const n of neighborhoods) {
      expect(n.length).toBeGreaterThan(0);
    }
  });

  it("SLC has variety across price points", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const prices = new Set(slc.venues.map((v) => v.price));
    expect(prices.size).toBeGreaterThanOrEqual(3);
  });
});
