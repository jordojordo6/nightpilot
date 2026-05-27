#!/usr/bin/env node
/**
 * inject-og-images.mjs
 *
 * Fetches OG images from venue websites and injects ogImage + websiteUrl
 * into the venue data files.
 *
 * Modes:
 *   node scripts/inject-og-images.mjs --dry-run          (default)
 *     Fetches websites, detects og:image, prints proposed updates and failures.
 *     Does NOT write anything.
 *
 *   node scripts/inject-og-images.mjs --write
 *     Creates a backup of the target file, then updates venue entries.
 *
 * City targeting (default: vancouver only):
 *   --city=vancouver    (default)
 *   --city=dublin
 *   --city=amsterdam
 *   --city=slc
 *   --city=all
 *
 * Examples:
 *   node scripts/inject-og-images.mjs --dry-run --city=vancouver
 *   node scripts/inject-og-images.mjs --write --city=vancouver
 */

import { readFileSync, writeFileSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── CLI args ────────────────────────────────────────────────
const args = process.argv.slice(2);
const isWrite = args.includes("--write");
const isDryRun = !isWrite; // default

const cityArg = args.find((a) => a.startsWith("--city="))?.split("=")[1] ?? "vancouver";

const CITY_FILES = {
  vancouver: { path: "src/data/venues.ts", label: "Vancouver", ids: [1, 35] },
  dublin:    { path: "src/data/dublin.ts",  label: "Dublin",    ids: [36, 70] },
  amsterdam: { path: "src/data/amsterdam.ts", label: "Amsterdam", ids: [71, 105] },
  slc:       { path: "src/data/slc.ts",     label: "Salt Lake City", ids: [106, 140] },
};

const citiesToProcess = cityArg === "all"
  ? Object.keys(CITY_FILES)
  : [cityArg];

for (const c of citiesToProcess) {
  if (!CITY_FILES[c]) {
    console.error(`Unknown city: ${c}. Options: ${Object.keys(CITY_FILES).join(", ")}, all`);
    process.exit(1);
  }
}

console.log(`\n${"═".repeat(60)}`);
console.log(`  OG Image Injector — ${isDryRun ? "DRY RUN" : "WRITE MODE"}`);
console.log(`  Cities: ${citiesToProcess.map((c) => CITY_FILES[c].label).join(", ")}`);
console.log(`${"═".repeat(60)}\n`);

// ── Load venue-photos.json for websiteUrls ──────────────────
const venuePhotosPath = resolve(__dirname, "venue-photos.json");
let venuePhotos = {};
try {
  venuePhotos = JSON.parse(readFileSync(venuePhotosPath, "utf-8"));
} catch {
  console.warn("⚠ Could not load venue-photos.json — websiteUrls will come from existing data only\n");
}

// ── Image extraction helpers ────────────────────────────────

function resolveUrl(url, base) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  try { return new URL(url, base).href; } catch { return url; }
}

function looksLikeLogo(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes("logo") || lower.includes("favicon") ||
    lower.includes("icon") || lower.includes("brand") ||
    lower.endsWith(".svg") || lower.includes("96x96") || lower.includes("32x32")
  );
}

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

  // 5. Schema.org JSON-LD
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

  // 6. Hero/banner images
  const heroPatterns = [
    /<img[^>]*class=["'][^"']*(?:hero|banner|cover|featured|header-image|main-image)[^"']*["'][^>]*src=["']([^"']+)["']/gi,
    /style=["'][^"']*background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)[^"']*["']/gi,
  ];
  for (const pattern of heroPatterns) {
    const matches = html.matchAll(pattern);
    for (const m of matches) {
      const url = resolveUrl(m[1], baseUrl);
      if (url && !looksLikeLogo(url)) found.push({ url, source: "hero-image" });
    }
  }

  // 7. First substantial <img> (fallback)
  const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*/gi);
  let imgCount = 0;
  for (const m of imgMatches) {
    const url = resolveUrl(m[0].match(/src=["']([^"']+)["']/i)?.[1], baseUrl);
    if (url && !looksLikeLogo(url) && !url.includes("pixel") && !url.includes("spacer") && !url.includes("tracking")) {
      const widthMatch = m[0].match(/width=["']?(\d+)/i);
      const width = widthMatch ? parseInt(widthMatch[1]) : 0;
      if (width === 0 || width >= 200) {
        found.push({ url, source: "img-tag" });
        imgCount++;
        if (imgCount >= 3) break;
      }
    }
  }

  // Return best non-logo
  for (const f of found) {
    if (!looksLikeLogo(f.url)) return f;
  }
  return found.length > 0 ? found[0] : null;
}

async function fetchWithTimeout(url, timeoutMs = 10000, acceptHeader = "text/html,application/xhtml+xml") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: acceptHeader,
      },
    });
    clearTimeout(timeout);
    return res;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Validate that a discovered image URL actually resolves to a real image.
 * Uses HEAD first (lightweight), falls back to GET with Range header.
 * Returns { ok, error?, warning?, contentType?, contentLength? }
 */
async function validateImageUrl(url, timeoutMs = 8000) {
  if (!url) return { ok: false, error: "No URL" };

  // Normalize http → https
  const testUrl = url.replace(/^http:\/\//, "https://");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res;
    try {
      res = await fetch(testUrl, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "image/*,*/*;q=0.8",
        },
      });
    } catch {
      // HEAD failed — try GET with Range header
      const controller2 = new AbortController();
      const timeout2 = setTimeout(() => controller2.abort(), timeoutMs);
      try {
        res = await fetch(testUrl, {
          method: "GET",
          signal: controller2.signal,
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "image/*,*/*;q=0.8",
            Range: "bytes=0-1023",
          },
        });
        clearTimeout(timeout2);
      } catch (e2) {
        clearTimeout(timeout2);
        throw e2;
      }
    }

    clearTimeout(timeout);

    const status = res.status;
    const contentType = res.headers.get("content-type") || "unknown";
    const contentLength = res.headers.get("content-length");
    const size = contentLength ? parseInt(contentLength) : null;

    if (status === 403) return { ok: false, error: "403 Forbidden (hotlink protection?)", contentType };
    if (status === 404) return { ok: false, error: "404 Not Found", contentType };
    if (status >= 400) return { ok: false, error: `HTTP ${status}`, contentType };

    // Reject HTML responses masquerading as images (redirects to pages)
    if (contentType.startsWith("text/html")) {
      return { ok: false, error: "Returns HTML, not an image (redirect to page?)", contentType };
    }

    // Check content type is actually an image
    const isImage = contentType.startsWith("image/") ||
      contentType.includes("octet-stream") ||
      contentType.includes("avif") ||
      contentType.includes("webp");
    if (!isImage) {
      return { ok: false, error: `Non-image content-type: ${contentType}`, contentType };
    }

    // Reject tiny images (likely icons/favicons)
    if (size && size < 1000) {
      return { ok: false, error: `Tiny image (${size} bytes) — likely icon/placeholder`, contentType, contentLength: size };
    }

    // Warn about small images
    if (size && size < 5000) {
      return { ok: true, warning: `Small image (${size} bytes)`, contentType, contentLength: size };
    }

    return { ok: true, contentType, contentLength: size };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") return { ok: false, error: "Timeout (>8s)" };
    return { ok: false, error: err.message };
  }
}

// ── Parse venue IDs and names from a TS data file ───────────

function parseVenuesFromFile(content) {
  const venues = [];
  const regex = /\{id:(\d+),name:"([^"]+)".*?websiteUrl:"([^"]*)".*?\}/gs;
  let match;
  while ((match = regex.exec(content)) !== null) {
    venues.push({ id: parseInt(match[1]), name: match[2], websiteUrl: match[3] });
  }

  // Also match venues without websiteUrl
  const regex2 = /\{id:(\d+),name:"([^"]+)"[^}]*\}/gs;
  let match2;
  while ((match2 = regex2.exec(content)) !== null) {
    const id = parseInt(match2[1]);
    if (!venues.find((v) => v.id === id)) {
      // Try to get websiteUrl from venue-photos.json
      const vpData = venuePhotos[id];
      const websiteUrl = vpData?.websiteUrl || null;
      venues.push({ id, name: match2[2], websiteUrl });
    }
  }

  return venues.sort((a, b) => a.id - b.id);
}

// ── Main ────────────────────────────────────────────────────

const results = { updated: [], failed: [], skipped: [], logoOnly: [] };

for (const cityKey of citiesToProcess) {
  const city = CITY_FILES[cityKey];
  const filePath = resolve(ROOT, city.path);
  const content = readFileSync(filePath, "utf-8");
  const venues = parseVenuesFromFile(content);

  console.log(`\n── ${city.label} (${venues.length} venues) ──────────────────────\n`);

  for (const venue of venues) {
    if (!venue.websiteUrl) {
      console.log(`  ✗ #${venue.id} ${venue.name} — no website URL`);
      results.failed.push({ ...venue, city: cityKey, reason: "no website URL" });
      continue;
    }

    try {
      const res = await fetchWithTimeout(venue.websiteUrl);
      const html = await res.text();
      const img = extractBestImage(html, venue.websiteUrl);

      if (img && !looksLikeLogo(img.url)) {
        // Validate the image URL actually resolves to a real image
        const validation = await validateImageUrl(img.url);

        if (validation.ok) {
          const extra = validation.warning ? ` ⚠ ${validation.warning}` : "";
          console.log(`  ✓ #${venue.id} ${venue.name}${extra}`);
          console.log(`    ${img.source}: ${img.url.substring(0, 90)}${img.url.length > 90 ? "..." : ""}`);
          results.updated.push({ ...venue, city: cityKey, ogImage: img.url, source: img.source });
        } else {
          console.log(`  ✗ #${venue.id} ${venue.name} — image found but failed validation: ${validation.error}`);
          console.log(`    ${img.source}: ${img.url.substring(0, 90)}${img.url.length > 90 ? "..." : ""}`);
          results.failed.push({ ...venue, city: cityKey, reason: `image validation: ${validation.error}`, ogImage: img.url });
        }
      } else if (img) {
        console.log(`  ~ #${venue.id} ${venue.name} — logo only: ${img.url.substring(0, 70)}...`);
        results.logoOnly.push({ ...venue, city: cityKey, ogImage: img.url, source: img.source });
      } else {
        console.log(`  ✗ #${venue.id} ${venue.name} — no images found in HTML`);
        results.failed.push({ ...venue, city: cityKey, reason: "no images in HTML" });
      }
    } catch (err) {
      const reason = err.name === "AbortError" ? "Timeout fetching website" : err.message;
      console.log(`  ✗ #${venue.id} ${venue.name} — ${reason}`);
      results.failed.push({ ...venue, city: cityKey, reason });
    }

    await new Promise((r) => setTimeout(r, 300));
  }
}

// ── Summary ─────────────────────────────────────────────────

console.log(`\n${"═".repeat(60)}`);
console.log(`  SUMMARY`);
console.log(`${"═".repeat(60)}`);
console.log(`  ✓ ${results.updated.length} venues with photos`);
console.log(`  ~ ${results.logoOnly.length} venues with logos only`);
console.log(`  ✗ ${results.failed.length} venues failed`);

if (results.failed.length > 0) {
  console.log(`\n  Failures:`);
  for (const f of results.failed) {
    console.log(`    #${f.id} ${f.name} — ${f.reason}`);
  }
}

if (results.logoOnly.length > 0) {
  console.log(`\n  Logo-only (may need Chrome manual extraction):`);
  for (const l of results.logoOnly) {
    console.log(`    #${l.id} ${l.name} — ${l.ogImage.substring(0, 70)}...`);
  }
}

// ── Write mode ──────────────────────────────────────────────

if (isDryRun) {
  console.log(`\n  Mode: DRY RUN — no files were modified.`);
  console.log(`  To apply changes, run with --write\n`);
} else {
  console.log(`\n  Mode: WRITE — applying changes...\n`);

  for (const cityKey of citiesToProcess) {
    const city = CITY_FILES[cityKey];
    const filePath = resolve(ROOT, city.path);
    const backupPath = filePath + ".backup";

    // Create backup
    copyFileSync(filePath, backupPath);
    console.log(`  📁 Backup: ${city.path}.backup`);

    let content = readFileSync(filePath, "utf-8");
    let writeCount = 0;

    const cityUpdates = results.updated.filter((u) => u.city === cityKey);

    for (const update of cityUpdates) {
      const id = update.id;
      const ogImageStr = `ogImage:"${update.ogImage}"`;
      const websiteStr = `websiteUrl:"${update.websiteUrl}"`;

      // Check if ogImage already exists for this venue
      const hasOgImage = new RegExp(`\\{id:${id},.*?ogImage:`, "s").test(content);
      const hasWebsite = new RegExp(`\\{id:${id},.*?websiteUrl:`, "s").test(content);

      if (hasOgImage) {
        // Update existing ogImage
        const ogRegex = new RegExp(`(\\{id:${id},[\\s\\S]*?)ogImage:"[^"]*"`, "");
        content = content.replace(ogRegex, `$1${ogImageStr}`);
        writeCount++;
      } else {
        // Insert ogImage before the closing }
        // Find the venue block and add ogImage + websiteUrl before closing
        const venueEnd = new RegExp(`(\\{id:${id},[\\s\\S]*?)(lng:[\\-\\d.]+)(\\})`, "");
        const match = content.match(venueEnd);
        if (match) {
          let replacement = `${match[1]}${match[2]},\n    ${ogImageStr}`;
          if (!hasWebsite && update.websiteUrl) {
            replacement += `,\n    ${websiteStr}`;
          }
          replacement += match[3];
          content = content.replace(venueEnd, replacement);
          writeCount++;
        }
      }
    }

    writeFileSync(filePath, content);
    console.log(`  ✏️  ${city.label}: updated ${writeCount} venues`);
  }

  console.log(`\n  Done! Run \`npx tsc --noEmit\` to verify.\n`);
}
