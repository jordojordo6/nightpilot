#!/usr/bin/env node
/**
 * fetch-venue-photos.mjs
 *
 * Fetches 2-3 photos + website URL for every NightPilot venue
 * using Google Places API (New).
 *
 * Usage:
 *   node scripts/fetch-venue-photos.mjs
 *
 * Requires .env with GOOGLE_PLACES_API_KEY
 * Outputs: scripts/venue-photos.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── Load API key from .env ──────────────────────────────────────
const envPath = resolve(ROOT, ".env");
const envContent = readFileSync(envPath, "utf-8");
const API_KEY = envContent
  .split("\n")
  .find((l) => l.startsWith("GOOGLE_PLACES_API_KEY="))
  ?.split("=")
  .slice(1)
  .join("=")
  .trim();

if (!API_KEY) {
  console.error("Missing GOOGLE_PLACES_API_KEY in .env");
  process.exit(1);
}

// ── Venue list (name + city for search) ─────────────────────────
// Extracted from the data files so we don't need to import TS
const CITY_MAP = {
  vancouver: { file: "venues.ts", export: "VENUES" },
  dublin: { file: "dublin.ts", export: "DUBLIN_VENUES" },
  amsterdam: { file: "amsterdam.ts", export: "AMSTERDAM_VENUES" },
  slc: { file: "slc.ts", export: "SLC_VENUES" },
};

const CITY_SEARCH_NAMES = {
  vancouver: "Vancouver, BC, Canada",
  dublin: "Dublin, Ireland",
  amsterdam: "Amsterdam, Netherlands",
  slc: "Salt Lake City, UT, USA",
};

/**
 * Parse venue names and IDs from the .ts data files using regex.
 * We avoid needing a TS compiler by just extracting what we need.
 */
function parseVenuesFromFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const venues = [];
  // Match: {id:NNN,name:"...",type:"...",cuisine:"..."
  const regex = /\{id:(\d+),name:"([^"]+)",type:"([^"]+)",cuisine:"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    venues.push({
      id: parseInt(match[1]),
      name: match[2],
      type: match[3],
      cuisine: match[4],
    });
  }
  return venues;
}

// Build full venue list
const allVenues = [];
for (const [city, { file }] of Object.entries(CITY_MAP)) {
  const filePath = resolve(ROOT, "src/data", file);
  const venues = parseVenuesFromFile(filePath);
  for (const v of venues) {
    allVenues.push({ ...v, city });
  }
}

console.log(`Found ${allVenues.length} venues across ${Object.keys(CITY_MAP).length} cities\n`);

// ── Google Places API (New) helpers ─────────────────────────────

const PLACES_BASE = "https://places.googleapis.com/v1/places";

/**
 * Search for a place by text query.
 * Returns the first matching place ID.
 */
async function searchPlace(name, type, city) {
  const searchCity = CITY_SEARCH_NAMES[city];
  const query = `${name} ${type} ${searchCity}`;

  const res = await fetch(`${PLACES_BASE}:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Search failed for "${query}": ${res.status} ${err}`);
  }

  const data = await res.json();
  if (!data.places || data.places.length === 0) {
    return null;
  }
  return data.places[0].id;
}

/**
 * Get place details: photos + website URL.
 */
async function getPlaceDetails(placeId) {
  const res = await fetch(`${PLACES_BASE}/${placeId}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": "id,photos,websiteUri",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Details failed for ${placeId}: ${res.status} ${err}`);
  }

  return await res.json();
}

/**
 * Get a photo URI from a photo resource name.
 * Returns a URL that can be used directly in <img> tags.
 */
function getPhotoUrl(photoName, maxWidth = 800) {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${API_KEY}`;
}

// ── Main fetch loop ─────────────────────────────────────────────

const PHOTOS_PER_VENUE = 3;
const DELAY_MS = 200; // be nice to the API

const results = {};
let successCount = 0;
let failCount = 0;

async function processVenue(venue) {
  const label = `[${venue.city}] ${venue.name}`;
  try {
    // Step 1: Find the place
    const placeId = await searchPlace(venue.name, venue.type, venue.city);
    if (!placeId) {
      console.log(`  ✗ ${label} — not found`);
      failCount++;
      return;
    }

    // Step 2: Get details
    const details = await getPlaceDetails(placeId);

    // Step 3: Extract photo URLs (up to PHOTOS_PER_VENUE)
    const photos = (details.photos || [])
      .slice(0, PHOTOS_PER_VENUE)
      .map((p) => getPhotoUrl(p.name));

    const websiteUrl = details.websiteUri || null;

    results[venue.id] = {
      id: venue.id,
      name: venue.name,
      city: venue.city,
      placeId,
      photos,
      websiteUrl,
    };

    console.log(`  ✓ ${label} — ${photos.length} photos${websiteUrl ? " + website" : ""}`);
    successCount++;
  } catch (err) {
    console.log(`  ✗ ${label} — ${err.message}`);
    failCount++;
  }
}

async function main() {
  console.log("Fetching venue photos from Google Places API...\n");

  for (const [city, cityName] of Object.entries(CITY_SEARCH_NAMES)) {
    const cityVenues = allVenues.filter((v) => v.city === city);
    console.log(`\n── ${cityName} (${cityVenues.length} venues) ──`);

    for (const venue of cityVenues) {
      await processVenue(venue);
      // Small delay between requests
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // Write results
  const outPath = resolve(__dirname, "venue-photos.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`\n${"═".repeat(50)}`);
  console.log(`Done! ${successCount} succeeded, ${failCount} failed`);
  console.log(`Results saved to: scripts/venue-photos.json`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
