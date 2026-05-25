import type { Venue, LocationFilter } from "../types";

// ─── Haversine distance ───────────────────────────────────────────────

/** Returns distance in kilometers between two lat/lng points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ─── Time/distance conversions ────────────────────────────────────────

/** Average walking speed: ~5 km/h → 1 min ≈ 83m */
const WALK_SPEED_KM_PER_MIN = 5 / 60;

/** Average city driving speed: ~30 km/h → 1 min ≈ 500m */
const DRIVE_SPEED_KM_PER_MIN = 30 / 60;

/** Convert walk minutes to km radius. */
export function walkMinutesToKm(minutes: number): number {
  return minutes * WALK_SPEED_KM_PER_MIN;
}

/** Convert drive minutes to km radius. */
export function driveMinutesToKm(minutes: number): number {
  return minutes * DRIVE_SPEED_KM_PER_MIN;
}

/** Estimate walk time in minutes from km distance. */
export function kmToWalkMinutes(km: number): number {
  return Math.round(km / WALK_SPEED_KM_PER_MIN);
}

/** Estimate drive time in minutes from km distance. */
export function kmToDriveMinutes(km: number): number {
  return Math.round(km / DRIVE_SPEED_KM_PER_MIN);
}

// ─── Location filter logic ────────────────────────────────────────────

/**
 * Get the maximum radius in km from a LocationFilter.
 * Uses the most permissive constraint (largest radius) when multiple are set.
 * Returns null if mode is "anywhere" or no coordinates.
 */
export function getFilterRadiusKm(filter: LocationFilter): number | null {
  if (filter.mode === "anywhere" || filter.lat === null || filter.lng === null) {
    return null;
  }

  const radii: number[] = [];

  if (filter.walkMinutes !== null) {
    radii.push(walkMinutesToKm(filter.walkMinutes));
  }
  if (filter.driveMinutes !== null) {
    radii.push(driveMinutesToKm(filter.driveMinutes));
  }
  if (filter.radiusKm !== null) {
    radii.push(filter.radiusKm);
  }

  // Use largest radius (most permissive)
  return radii.length > 0 ? Math.max(...radii) : null;
}

/**
 * Filter venues by location. Returns all venues within the effective radius.
 * If location mode is "anywhere" or no radius set, returns all venues.
 */
export function filterVenuesByLocation(
  venues: Venue[],
  filter: LocationFilter
): Venue[] {
  const radiusKm = getFilterRadiusKm(filter);
  if (radiusKm === null || filter.lat === null || filter.lng === null) {
    return venues;
  }

  return venues.filter((v) => {
    const dist = haversineKm(filter.lat!, filter.lng!, v.lat, v.lng);
    return dist <= radiusKm;
  });
}

// ─── Browser geolocation wrapper ──────────────────────────────────────

export interface GeoPosition {
  lat: number;
  lng: number;
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        reject(new Error(err.message));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
