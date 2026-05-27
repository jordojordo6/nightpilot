#!/usr/bin/env node
/**
 * fetch-og-images-v2.mjs
 *
 * Smarter OG image extraction with multiple fallbacks.
 * Only re-fetches venues that are missing or got logos.
 *
 * Usage:
 *   node scripts/fetch-og-images-v2.mjs
 *
 * Outputs: updates scripts/og-images.json
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load existing results
const ogPath = resolve(__dirname, "og-images.json");
const existing = JSON.parse(readFileSync(ogPath, "utf-8"));

// IDs that need re-fetching: missing image OR got a logo instead of a photo
const MISSING_IDS = [4, 8, 9, 11, 13, 19, 21, 25, 26, 29, 31, 34];
const LOGO_IDS = [2, 3, 10, 12, 16, 18, 22, 35]; // got logos, not venue photos
const REFETCH_IDS = new Set([...MISSING_IDS, ...LOGO_IDS]);

const venues = Object.values(existing).filter((v) => REFETCH_IDS.has(v.id));

console.log(`Re-fetching ${venues.length} venues with smarter extraction...\n`);

function resolveUrl(url, base) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/**
 * Check if a URL looks like a logo/icon rather than a venue photo.
 */
function looksLikeLogo(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes("logo") ||
    lower.includes("favicon") ||
    lower.includes("icon") ||
    lower.includes("brand") ||
    lower.endsWith(".svg") ||
    lower.includes("96x96") ||
    lower.includes("32x32")
  );
}

/**
 * Extract the best image from HTML using multiple strategies.
 */
function extractBestImage(html, baseUrl) {
  const found = [];

  // 1. og:image
  const ogMatch =
    html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
  if (ogMatch) found.push({ url: resolveUrl(ogMatch[1], baseUrl), source: "og:image" });

  // 2. twitter:image
  const twMatch =
    html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image["']/i);
  if (twMatch) found.push({ url: resolveUrl(twMatch[1], baseUrl), source: "twitter:image" });

  // 3. <link rel="image_src">
  const linkMatch = html.match(/<link[^>]*rel=["']image_src["'][^>]*href=["']([^"']+)["']/i);
  if (linkMatch) found.push({ url: resolveUrl(linkMatch[1], baseUrl), source: "image_src" });

  // 4. <meta name="image">
  const metaImg = html.match(/<meta[^>]*name=["']image["'][^>]*content=["']([^"']+)["']/i);
  if (metaImg) found.push({ url: resolveUrl(metaImg[1], baseUrl), source: "meta:image" });

  // 5. Schema.org JSON-LD "image" field
  const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const img = data.image || (Array.isArray(data["@graph"]) && data["@graph"].find(g => g.image)?.image);
      if (typeof img === "string") {
        found.push({ url: resolveUrl(img, baseUrl), source: "schema.org" });
      } else if (Array.isArray(img) && img.length > 0) {
        const first = typeof img[0] === "string" ? img[0] : img[0]?.url;
        if (first) found.push({ url: resolveUrl(first, baseUrl), source: "schema.org" });
      } else if (img && typeof img === "object" && img.url) {
        found.push({ url: resolveUrl(img.url, baseUrl), source: "schema.org" });
      }
    } catch { /* ignore bad JSON */ }
  }

  // 6. Hero/banner images — look for large images with common patterns
  const heroPatterns = [
    // Common hero image patterns
    /<img[^>]*class=["'][^"']*(?:hero|banner|cover|featured|header-image|main-image)[^"']*["'][^>]*src=["']([^"']+)["']/gi,
    // Background images in style attributes
    /style=["'][^"']*background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)[^"']*["']/gi,
    // srcset first entry (often the hero)
    /<img[^>]*srcset=["']([^\s"']+)/gi,
  ];

  for (const pattern of heroPatterns) {
    const matches = html.matchAll(pattern);
    for (const m of matches) {
      const url = resolveUrl(m[1], baseUrl);
      if (url && !looksLikeLogo(url)) {
        found.push({ url, source: "hero-image" });
      }
    }
  }

  // 7. First substantial <img> that's not a logo/icon (last resort)
  const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*/gi);
  let imgCount = 0;
  for (const m of imgMatches) {
    const url = resolveUrl(m[0].match(/src=["']([^"']+)["']/i)?.[1], baseUrl);
    if (url && !looksLikeLogo(url) && !url.includes("pixel") && !url.includes("spacer") && !url.includes("tracking")) {
      // Check if it has width/height hints suggesting it's substantial
      const widthMatch = m[0].match(/width=["']?(\d+)/i);
      const width = widthMatch ? parseInt(widthMatch[1]) : 0;
      if (width === 0 || width >= 200) {
        found.push({ url, source: "img-tag" });
        imgCount++;
        if (imgCount >= 3) break; // Don't go too deep
      }
    }
  }

  // Return the best non-logo image
  for (const f of found) {
    if (!looksLikeLogo(f.url)) return f;
  }
  // If all are logos, return the first one anyway
  return found.length > 0 ? found[0] : null;
}

async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

let improved = 0;
let stillMissing = 0;

for (const venue of venues) {
  if (!venue.websiteUrl) {
    console.log(`  ✗ ${venue.name} — no website URL`);
    stillMissing++;
    continue;
  }

  try {
    const res = await fetchWithTimeout(venue.websiteUrl);
    const html = await res.text();
    const result = extractBestImage(html, venue.websiteUrl);

    if (result && !looksLikeLogo(result.url)) {
      existing[venue.id] = {
        ...existing[venue.id],
        ogImage: result.url,
        source: result.source,
      };
      console.log(`  ✓ ${venue.name} — ${result.source}: ${result.url.substring(0, 80)}...`);
      improved++;
    } else if (result) {
      console.log(`  ~ ${venue.name} — only found logo: ${result.url.substring(0, 60)}...`);
      stillMissing++;
    } else {
      console.log(`  ✗ ${venue.name} — no images found in HTML`);
      stillMissing++;
    }
  } catch (err) {
    console.log(`  ✗ ${venue.name} — ${err.message}`);
    stillMissing++;
  }

  await new Promise((r) => setTimeout(r, 300));
}

writeFileSync(ogPath, JSON.stringify(existing, null, 2));

// Summary of all venues
const allVenues = Object.values(existing);
const withPhoto = allVenues.filter(v => v.ogImage && !looksLikeLogo(v.ogImage));
const withLogo = allVenues.filter(v => v.ogImage && looksLikeLogo(v.ogImage));
const noImage = allVenues.filter(v => !v.ogImage);

console.log(`\n${"═".repeat(50)}`);
console.log(`This pass: ${improved} improved, ${stillMissing} still need work`);
console.log(`\nOverall status (all 35 Vancouver venues):`);
console.log(`  ✓ ${withPhoto.length} have venue photos`);
console.log(`  ~ ${withLogo.length} have logos only: ${withLogo.map(v => v.name).join(", ")}`);
console.log(`  ✗ ${noImage.length} have no image: ${noImage.map(v => v.name).join(", ")}`);
