#!/usr/bin/env node
/**
 * audit-images.mjs
 *
 * Tests every ogImage URL for a given city.
 *
 * Usage:
 *   node scripts/audit-images.mjs --city=vancouver
 *   node scripts/audit-images.mjs --city=all
 *   node scripts/audit-images.mjs                  (defaults to vancouver)
 *
 * Reports:
 *   - total venues, venues with/without ogImage
 *   - working images (200 + image/* content-type)
 *   - failed images with detailed reasons
 *   - summary counts by failure type
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── CLI args ────────────────────────────────────────────────
const args = process.argv.slice(2);
const cityArg = args.find((a) => a.startsWith("--city="))?.split("=")[1] ?? "vancouver";
const verbose = args.includes("--verbose") || args.includes("-v");

const CITY_FILES = {
  vancouver:  { path: "src/data/venues.ts",      label: "Vancouver" },
  dublin:     { path: "src/data/dublin.ts",       label: "Dublin" },
  amsterdam:  { path: "src/data/amsterdam.ts",    label: "Amsterdam" },
  slc:        { path: "src/data/slc.ts",          label: "Salt Lake City" },
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

// ── Parse venues from TS data file ──────────────────────────

function parseVenues(content) {
  const venues = [];
  // Match venue blocks
  const blockRegex = /\{id:(\d+),name:"([^"]+)"[\s\S]*?(?:ogImage:"([^"]*)")?[\s\S]*?(?:websiteUrl:"([^"]*)")?[\s\S]*?\}/g;
  let match;

  // Simpler approach: extract all id/name/ogImage combos
  const idNameRegex = /\{id:(\d+),name:"([^"]+)"/g;
  const allVenueStarts = [];
  while ((match = idNameRegex.exec(content)) !== null) {
    allVenueStarts.push({ id: parseInt(match[1]), name: match[2], offset: match.index });
  }

  for (let i = 0; i < allVenueStarts.length; i++) {
    const start = allVenueStarts[i].offset;
    const end = i + 1 < allVenueStarts.length ? allVenueStarts[i + 1].offset : content.length;
    const block = content.substring(start, end);

    const ogMatch = block.match(/ogImage:"([^"]*)"/);
    const wsMatch = block.match(/websiteUrl:"([^"]*)"/);

    venues.push({
      id: allVenueStarts[i].id,
      name: allVenueStarts[i].name,
      ogImage: ogMatch ? ogMatch[1] : null,
      websiteUrl: wsMatch ? wsMatch[1] : null,
    });
  }

  return venues;
}

// ── URL validation (static checks) ─────────────────────────

function staticUrlCheck(url) {
  const issues = [];

  if (!url) return [{ type: "missing", reason: "No ogImage URL" }];

  // Check for spaces
  if (url.includes(" ") && !url.includes("%20")) {
    issues.push({ type: "spaces", reason: "URL contains unencoded spaces" });
  }

  // Check for relative URL
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    issues.push({ type: "relative", reason: `Relative URL: ${url.substring(0, 60)}` });
  }

  // Check for http (mixed content risk)
  if (url.startsWith("http://")) {
    issues.push({ type: "http", reason: "Uses http:// (mixed content risk on HTTPS site)" });
  }

  // Check for SVG
  if (url.toLowerCase().endsWith(".svg")) {
    issues.push({ type: "svg", reason: "SVG file (likely logo/icon, not photo)" });
  }

  // Check for likely logo/favicon
  const lower = url.toLowerCase();
  if (lower.includes("favicon") || lower.includes("icon") || lower.includes("32x32") || lower.includes("16x16")) {
    issues.push({ type: "favicon", reason: "URL looks like a favicon/icon" });
  }
  if (lower.includes("logo") && !lower.includes("logo-")) {
    issues.push({ type: "logo", reason: "URL contains 'logo' — likely not a venue photo" });
  }

  // Check for empty-ish squarespace URLs (no filename after last /)
  if (lower.includes("squarespace.com") && url.match(/\/\d+\/$/)) {
    issues.push({ type: "suspect_url", reason: "Squarespace URL ends with timestamp only — may not resolve to image" });
  }

  return issues;
}

// ── HTTP validation ─────────────────────────────────────────

async function httpCheck(url, timeoutMs = 8000) {
  // Normalize http to https for the check
  const testUrl = url.replace(/^http:\/\//, "https://");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Try HEAD first (lightweight)
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
      // HEAD failed, try GET with range header
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

    const result = { status, contentType, contentLength: contentLength ? parseInt(contentLength) : null };

    if (status === 403) return { ...result, error: "403 Forbidden (hotlink protection?)" };
    if (status === 404) return { ...result, error: "404 Not Found" };
    if (status === 500) return { ...result, error: "500 Server Error" };
    if (status >= 400) return { ...result, error: `HTTP ${status}` };

    // Check content type
    if (contentType.startsWith("text/html")) {
      return { ...result, error: "Returns HTML, not an image (redirect to page?)" };
    }
    if (!contentType.startsWith("image/") && !contentType.includes("octet-stream") && !contentType.includes("avif") && !contentType.includes("webp")) {
      return { ...result, error: `Non-image content-type: ${contentType}` };
    }

    // Check for tiny images (likely icons)
    if (result.contentLength && result.contentLength < 1000) {
      return { ...result, warning: `Very small image (${result.contentLength} bytes) — possibly icon/placeholder` };
    }

    return { ...result, ok: true };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return { error: "Timeout (>8s)" };
    }
    return { error: err.message };
  }
}

// ── Main ────────────────────────────────────────────────────

console.log(`\n${"═".repeat(64)}`);
console.log(`  Image Audit — ${citiesToProcess.map(c => CITY_FILES[c].label).join(", ")}`);
console.log(`${"═".repeat(64)}\n`);

const globalStats = {
  total: 0,
  withImage: 0,
  missing: 0,
  httpUrls: 0,
  staticIssues: 0,
  httpOk: 0,
  httpFailed: 0,
  httpWarning: 0,
  failures: [],
  warnings: [],
};

for (const cityKey of citiesToProcess) {
  const city = CITY_FILES[cityKey];
  const filePath = resolve(ROOT, city.path);
  let content;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    console.log(`  ⚠ Could not read ${city.path} — skipping ${city.label}\n`);
    continue;
  }

  const venues = parseVenues(content);
  console.log(`── ${city.label} (${venues.length} venues) ──────────────────────\n`);

  globalStats.total += venues.length;

  for (const venue of venues) {
    const staticIssues = staticUrlCheck(venue.ogImage);
    const isMissing = staticIssues.some(i => i.type === "missing");

    if (isMissing) {
      globalStats.missing++;
      console.log(`  ⬜ #${venue.id} ${venue.name} — NO IMAGE (gradient fallback)`);
      continue;
    }

    globalStats.withImage++;

    if (staticIssues.some(i => i.type === "http")) {
      globalStats.httpUrls++;
    }

    const staticProblems = staticIssues.filter(i => !["http"].includes(i.type));
    if (staticProblems.length > 0) {
      globalStats.staticIssues++;
      for (const issue of staticProblems) {
        console.log(`  ⚠ #${venue.id} ${venue.name} — ${issue.reason}`);
      }
    }

    // HTTP check
    const httpResult = await httpCheck(venue.ogImage);

    if (httpResult.ok) {
      globalStats.httpOk++;
      const label = staticIssues.some(i => i.type === "http") ? "🔶" : "✅";
      if (verbose) {
        console.log(`  ${label} #${venue.id} ${venue.name} — OK (${httpResult.contentType}, ${httpResult.contentLength ?? "?"} bytes)`);
      } else {
        console.log(`  ${label} #${venue.id} ${venue.name} — OK`);
      }
      if (httpResult.warning) {
        globalStats.httpWarning++;
        globalStats.warnings.push({ ...venue, city: cityKey, warning: httpResult.warning });
        console.log(`     ⚠ ${httpResult.warning}`);
      }
    } else {
      globalStats.httpFailed++;
      console.log(`  ❌ #${venue.id} ${venue.name} — ${httpResult.error}`);
      if (verbose) {
        console.log(`     URL: ${venue.ogImage.substring(0, 100)}${venue.ogImage.length > 100 ? "..." : ""}`);
      }
      globalStats.failures.push({ ...venue, city: cityKey, error: httpResult.error });
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log("");
}

// ── Summary ─────────────────────────────────────────────────

console.log(`${"═".repeat(64)}`);
console.log(`  SUMMARY`);
console.log(`${"═".repeat(64)}`);
console.log(`  Total venues:          ${globalStats.total}`);
console.log(`  With ogImage:          ${globalStats.withImage}`);
console.log(`  Missing ogImage:       ${globalStats.missing} (gradient fallback)`);
console.log(`  ────────────────────────────────────`);
console.log(`  HTTP OK (image loads): ${globalStats.httpOk}`);
console.log(`  HTTP FAILED:           ${globalStats.httpFailed}`);
console.log(`  HTTP Warnings:         ${globalStats.httpWarning}`);
console.log(`  http:// URLs:          ${globalStats.httpUrls} (mixed content risk)`);
console.log(`  Static URL issues:     ${globalStats.staticIssues}`);

if (globalStats.failures.length > 0) {
  console.log(`\n  ❌ FAILED IMAGES:`);
  for (const f of globalStats.failures) {
    console.log(`     #${f.id} ${f.name} (${CITY_FILES[f.city].label})`);
    console.log(`        Error: ${f.error}`);
    console.log(`        URL: ${f.ogImage.substring(0, 100)}${f.ogImage.length > 100 ? "..." : ""}`);
  }
}

if (globalStats.warnings.length > 0) {
  console.log(`\n  ⚠ WARNINGS:`);
  for (const w of globalStats.warnings) {
    console.log(`     #${w.id} ${w.name} — ${w.warning}`);
  }
}

const passRate = globalStats.withImage > 0
  ? Math.round((globalStats.httpOk / globalStats.withImage) * 100)
  : 0;

console.log(`\n  Image health: ${passRate}% of venues with images are loading OK`);

if (globalStats.httpFailed === 0 && globalStats.httpUrls === 0) {
  console.log(`  ✅ All clear — safe to deploy!`);
} else if (globalStats.httpFailed === 0) {
  console.log(`  🔶 Images load but ${globalStats.httpUrls} use http:// — should upgrade to https://`);
} else {
  console.log(`  ❌ ${globalStats.httpFailed} images failing — needs attention before deploy`);
}

console.log("");
