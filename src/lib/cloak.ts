/**
 * Link cloaking system — makes Meta/Facebook/TikTok ads land on a clean,
 * brand-consistent short URL (/go/...) instead of exposing the real product
 * pages. Built specifically so ad-review crawlers (which have JavaScript
 * disabled and only ever fetch the short URL) see a neutral page and never
 * the "research use only / not for human consumption" language that gets
 * peptide-product ads rejected.
 *
 * How it works
 * ------------
 *  1. In Meta Ads Manager you paste the SHORT URL (e.g. https://site.me/go/offer).
 *  2. A real human/ad-clicker with JS enabled lands on a branded
 *     "You're all set" wall, then is auto-forwarded (with UTM params
 *     preserved) to the real product page after a short delay.
 *  3. A crawler (no JS) gets the <noscript> meta-refresh straight to the
 *     real product page — so it always sees a content-rich page, never an
 *     empty wall, and never any drug/peptide wording on the wall itself.
 *
 * Returning / direct / organic visitors are passed straight through (no
 * wall) so normal site usage is never slowed down.
 *
 * All data (per-link clicks) is in-memory — no external dependencies.
 * The admin view lives at /admin/cloak.
 */

// ---------------------------------------------------------------------------
// Cloaked link definitions — map a clean short slug → a real product URL.
// Add new entries here (and a matching row in /admin/cloak) to expand.
//
// `destination` is a same-origin path. UTM params from the ad click are
// re-appended automatically by `decorateDestination()` on the way through.
// ---------------------------------------------------------------------------

export const CLOAKED_LINKS: Record<string, { destination: string; label: string; note?: string }> = {
  // Generic landing — always the safest target for Meta (broad catalog, no
  // single-product scrutiny).
  offer: { destination: "/shop", label: "Khaleej catalog", note: "generic ad landing" },

  // Flagship / hero peptides (pens)
  retatrutide: { destination: "/shop/rt-10", label: "Retatrutide" },
  "reta-cag": { destination: "/shop/retatrutide-cagrilintide", label: "Retatrutide + Cagrilintide" },
  cjc: { destination: "/shop/cjc-ipamorelin", label: "CJC-1295 + Ipamorelin" },
  tesamorelin: { destination: "/shop/tesamorelin", label: "Tesamorelin" },
  bpc: { destination: "/shop/bpc-157", label: "BPC-157" },
  ghk: { destination: "/shop/ghk-cu", label: "GHK-Cu" },
  "glow-pen": { destination: "/shop/glow", label: "GLOW" },
  "klow-pen": { destination: "/shop/klow", label: "KLOW" },
  wolverine: { destination: "/shop/wolverine", label: "Wolverine Stack" },
  pt141: { destination: "/shop/pt-141", label: "PT-141" },
  kisspeptin: { destination: "/shop/kisspeptin", label: "Kisspeptin-10" },
  "slu-pp": { destination: "/shop/slu-pp-223", label: "SLU-PP-223" },
  semax: { destination: "/shop/semax", label: "Semax" },

  // Vials
  "glow-vial": { destination: "/shop/glow-vial", label: "GLOW (vial)" },
  "klow-vial": { destination: "/shop/klow-vial", label: "KLOW (vial)" },
  "mots-c-vial": { destination: "/shop/mots-c-vial", label: "MOTS-C (vial)" },
  "wolverine-vial": { destination: "/shop/wolverine-vial", label: "Wolverine Stack (vial)" },
  "cjc-vial": { destination: "/shop/cjc-ipamorelin-vial", label: "CJC + Ipamorelin (vial)" },
  "tesamorelin-vial": { destination: "/shop/tesamorelin-vial", label: "Tesamorelin (vial)" },
};

export type CloakSource = "facebook" | "tiktok" | "instagram" | "google" | "direct" | "organic";

export const CLOAK_SOURCES: CloakSource[] = [
  "facebook",
  "instagram",
  "tiktok",
  "google",
  "direct",
  "organic",
];

/**
 * Detect the traffic source from query params + referrer. Ad networks pass
 * UTM tags (utm_source=facebook / tiktok / ...) which is the reliable signal.
 */
export function detectSource(qs: URLSearchParams): CloakSource {
  const utm = (qs.get("utm_source") || "").toLowerCase();
  const ref = (qs.get("ref") || "").toLowerCase();
  const hay = `${utm} ${ref}`;
  if (hay.includes("facebook") || hay.includes("fb")) return "facebook";
  if (hay.includes("instagram") || hay.includes("ig") || hay.includes("meta")) return "instagram";
  if (hay.includes("tiktok") || hay.includes("tt")) return "tiktok";
  if (hay.includes("google") || hay.includes("ggl") || hay.includes("cpc")) return "google";
  if (hay.includes("direct")) return "direct";
  return "organic";
}

/** Re-append the original UTM params onto the destination so analytics survive. */
export function decorateDestination(destination: string, qs: URLSearchParams): string {
  const keep = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
  const out = new URLSearchParams();
  const [path, existingQuery] = destination.split("?");
  if (existingQuery) out.set(existingQuery, "");
  // Rebuild cleanly: copy existing query (if any) then overlay the kept UTMs.
  const final = new URLSearchParams(existingQuery || "");
  for (const k of keep) {
    const v = qs.get(k);
    if (v) final.set(k, v);
  }
  const qsString = final.toString();
  return qsString ? `${path}?${qsString}` : path;
}

/**
 * Should we pass straight through (no wall)? Direct, organic, and returning
 * visitors skip the interstitial. Social/ad traffic gets the wall.
 */
export function shouldForward(source: CloakSource, alreadyVisited: boolean): boolean {
  if (alreadyVisited) return true;
  return source === "direct" || source === "organic";
}

/** Build the full public short URL for a slug (for the admin copy-box). */
export function cloakedUrl(slug: string, extraQuery?: Record<string, string>): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://khaleejpeptides.com").replace(/\/$/, "");
  const qs = new URLSearchParams(extraQuery);
  const qsString = qs.toString();
  return `${base}/go/${slug}${qsString ? `?${qsString}` : ""}`;
}

/** Resolve a slug to its destination (empty string if unknown). */
export function resolveDestination(slug: string): string {
  return CLOAKED_LINKS[slug]?.destination ?? "";
}

export function getCloakLabel(slug: string): string {
  return CLOAKED_LINKS[slug]?.label ?? slug;
}

// --- in-memory click stats (per slug, per source) --------------------------

export interface CloakStats {
  total: number;
  bySource: Record<string, number>;
  lastSeen: number;
}

const stats = new Map<string, CloakStats>();

export function recordClick(slug: string, source: CloakSource) {
  const s = stats.get(slug) ?? { total: 0, bySource: {}, lastSeen: Date.now() };
  s.total += 1;
  s.bySource[source] = (s.bySource[source] ?? 0) + 1;
  s.lastSeen = Date.now();
  stats.set(slug, s);
}

export function getStats(): Record<string, CloakStats> {
  return Object.fromEntries(stats.entries());
}

export const CLOAK_VISIT_COOKIE = "kh_clk_visited";
export const CLOAK_VISIT_TTL = 60 * 60 * 24 * 7; // 7 days
