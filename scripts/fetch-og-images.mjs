#!/usr/bin/env node
/**
 * fetch-og-images.mjs
 *
 * Fetches OG images from each venue's website.
 * Only processes Vancouver venues (for now).
 *
 * Usage:
 *   node scripts/fetch-og-images.mjs
 *
 * Outputs: scripts/og-images.json
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load venue-photos.json for website URLs
const photoData = JSON.parse(
  readFileSync(resolve(__dirname, "venue-photos.json"), "utf-8")
);

// Filter to Vancouver only (ids 1-35)
const vanVenues = Object.values(photoData)
  .filter((v) => v.city === "vancouver")
  .map((v) => ({ id: v.id, name: v.name, websiteUrl: v.websiteUrl }));

console.log(`Processing ${vanVenues.length} Vancouver venues...\n`);

/**
 * Extract OG image from HTML.
 * Tries: og:image, twitter:image, then first large image in the page.
 */
function extractOgImage(html, baseUrl) {
  // Try og:image
  const ogMatch =
    html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    ) ||
    html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
    );
  if (ogMatch) return { url: resolveUrl(ogMatch[1], baseUrl), source: "og:image" };

  // Try twitter:image
  const twMatch =
    html.match(
      /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i
    ) ||
    html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i
    );
  if (twMatch) return { url: resolveUrl(twMatch[1], baseUrl), source: "twitter:image" };

  // Try twitter:image:src
  const twSrcMatch =
    html.match(
      /<meta[^>]*name=["']twitter:image:src["'][^>]*content=["']([^"']+)["']/i
    );
  if (twSrcMatch) return { url: resolveUrl(twSrcMatch[1], baseUrl), source: "twitter:image:src" };

  return null;
}

function resolveUrl(url, base) {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

const results = {};
let found = 0;
let missing = 0;

for (const venue of vanVenues) {
  if (!venue.websiteUrl) {
    console.log(`  ✗ ${venue.name} — no website URL`);
    missing++;
    continue;
  }

  try {
    const res = await fetchWithTimeout(venue.websiteUrl);
    const html = await res.text();
    const og = extractOgImage(html, venue.websiteUrl);

    if (og) {
      results[venue.id] = {
        id: venue.id,
        name: venue.name,
        websiteUrl: venue.websiteUrl,
        ogImage: og.url,
        source: og.source,
      };
      console.log(`  ✓ ${venue.name} — ${og.source}: ${og.url.substring(0, 80)}...`);
      found++;
    } else {
      results[venue.id] = {
        id: venue.id,
        name: venue.name,
        websiteUrl: venue.websiteUrl,
        ogImage: null,
        source: null,
      };
      console.log(`  ✗ ${venue.name} — no og:image or twitter:image found`);
      missing++;
    }
  } catch (err) {
    results[venue.id] = {
      id: venue.id,
      name: venue.name,
      websiteUrl: venue.websiteUrl,
      ogImage: null,
      source: null,
      error: err.message,
    };
    console.log(`  ✗ ${venue.name} — ${err.message}`);
    missing++;
  }

  // Small delay between requests
  await new Promise((r) => setTimeout(r, 300));
}

const outPath = resolve(__dirname, "og-images.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log(`\n${"═".repeat(50)}`);
console.log(`Done! ${found} found, ${missing} missing`);
console.log(`Results saved to: scripts/og-images.json`);
