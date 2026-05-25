import { describe, it, expect, vi } from "vitest";
import { EMPTY_PROFILE, EMPTY_LOCATION_FILTER } from "../../types";
import type { NightPrefs, LocationFilter } from "../../types";
import { generateRecommendations } from "../recommendations";
import { haversineKm, walkMinutesToKm, bikeMinutesToKm, driveMinutesToKm, filterVenuesByLocation } from "../geo";
import { CITIES } from "../../data/cities";

vi.mock("../analytics", () => ({
  logEvent: vi.fn(),
}));

const DEFAULT_PREFS: NightPrefs = {
  occasion: "casual",
  budget: null,
  neighborhoods: [],
  planType: "both",
  location: { ...EMPTY_LOCATION_FILTER },
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

  it("all venues have valid lat/lng", () => {
    for (const city of CITIES) {
      for (const v of city.venues) {
        expect(typeof v.lat).toBe("number");
        expect(typeof v.lng).toBe("number");
        expect(v.lat).not.toBeNaN();
        expect(v.lng).not.toBeNaN();
      }
    }
  });
});

describe("Location/radius filtering", () => {
  it("haversine returns 0 for same point", () => {
    expect(haversineKm(49.28, -123.12, 49.28, -123.12)).toBe(0);
  });

  it("walk < bike < drive for same minutes", () => {
    expect(walkMinutesToKm(10)).toBeLessThan(bikeMinutesToKm(10));
    expect(bikeMinutesToKm(10)).toBeLessThan(driveMinutesToKm(10));
  });

  it("tight walking radius filters more than driving radius", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const center = slc.venues[0];
    const walkFilter: LocationFilter = {
      mode: "current", lat: center.lat, lng: center.lng,
      walkMinutes: 5, bikeMinutes: null, driveMinutes: null, radiusKm: null,
    };
    const driveFilter: LocationFilter = {
      mode: "current", lat: center.lat, lng: center.lng,
      walkMinutes: null, bikeMinutes: null, driveMinutes: 15, radiusKm: null,
    };
    const walkFiltered = filterVenuesByLocation(slc.venues, walkFilter);
    const driveFiltered = filterVenuesByLocation(slc.venues, driveFilter);
    expect(walkFiltered.length).toBeLessThanOrEqual(driveFiltered.length);
  });

  it("anywhere mode returns all venues", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const result = filterVenuesByLocation(slc.venues, { ...EMPTY_LOCATION_FILTER });
    expect(result.length).toBe(slc.venues.length);
  });

  it("location filter does not pull cross-city venues", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const van = CITIES.find((c) => c.key === "vancouver")!;
    // Use SLC center coords with SLC venues — should find some
    const slcCenter: LocationFilter = {
      mode: "current", lat: 40.76, lng: -111.89,
      walkMinutes: null, bikeMinutes: null, driveMinutes: 30, radiusKm: null,
    };
    const slcResult = filterVenuesByLocation(slc.venues, slcCenter);
    const vanResult = filterVenuesByLocation(van.venues, slcCenter);
    expect(slcResult.length).toBeGreaterThan(0);
    expect(vanResult.length).toBe(0); // Vancouver venues thousands of km away
  });

  it("multi-neighborhood selection boosts matching venues", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const prefs: NightPrefs = {
      ...DEFAULT_PREFS,
      neighborhoods: ["Downtown", "Capitol Hill"],
    };
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE }, prefs, new Set(), new Set(), slc.venues, [], "slc"
    );
    expect(plans.length).toBeGreaterThan(0);
    // At least one venue in the top plan should be from a selected neighborhood
    const topPlan = plans[0];
    const inSelected =
      (topPlan.restaurant && prefs.neighborhoods.includes(topPlan.restaurant.neighborhood)) ||
      (topPlan.bar && prefs.neighborhoods.includes(topPlan.bar.neighborhood));
    expect(inSelected).toBe(true);
  });

  it("no results with impossibly tight radius returns empty plans", () => {
    const slc = CITIES.find((c) => c.key === "slc")!;
    const prefs: NightPrefs = {
      ...DEFAULT_PREFS,
      location: {
        mode: "current", lat: 0, lng: 0, // middle of ocean
        walkMinutes: 1, bikeMinutes: null, driveMinutes: null, radiusKm: null,
      },
    };
    const plans = generateRecommendations(
      { ...EMPTY_PROFILE }, prefs, new Set(), new Set(), slc.venues, [], "slc"
    );
    expect(plans.length).toBe(0);
  });
});
