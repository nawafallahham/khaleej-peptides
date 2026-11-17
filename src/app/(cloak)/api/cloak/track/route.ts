import { NextResponse } from "next/server";
import {
  CLOAKED_LINKS,
  CLOAK_SOURCES,
  cloakedUrl,
  detectSource,
  getStats,
  recordClick,
  type CloakSource,
} from "@/lib/cloak";

// Fire-and-forget tracking pixel. Always returns 200 + tiny payload so the
// <img> request is cheap and never blocks the interstitial.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug") || "";
  const source = (url.searchParams.get("source") || "organic") as CloakSource;
  const validSource = CLOAK_SOURCES.includes(source) ? source : "organic";

  if (CLOAKED_LINKS[slug]) {
    recordClick(slug, validSource);
  }

  // Track even if source wasn't pre-known (referrer fallback).
  const ref = url.searchParams.get("ref");
  if (ref && !CLOAK_SOURCES.includes(source)) {
    recordClick(slug, detectSource(new URLSearchParams({ ref })));
  }

  const body = { ok: true };
  const res = NextResponse.json(body);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export function POST(req: Request) {
  // Same handler for completeness (some clients POST).
  return GET(req);
}

// Re-export helpers so a future server-side dashboard can use them.
export { CLOAKED_LINKS, cloakedUrl, getStats, detectSource };
