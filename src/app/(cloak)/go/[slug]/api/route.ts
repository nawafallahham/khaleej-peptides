import { NextResponse } from "next/server";
import { CLOAKED_LINKS, decorateDestination } from "@/lib/cloak";

export const dynamic = "force-dynamic";

/**
 * Fast, no-HTML redirect target for the most paranoid crawlers.
 *
 * If you paste https://site.me/go/offer/api into an ad, a JS-disabled crawler
 * gets a plain 307 → /shop/... (no interstitial HTML, no wall text at all),
 * while a real browser follows the redirect straight to the product.
 *
 * UTM params from the ad are preserved onto the destination.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // /go/{slug}/api  →  slug is the path segment before "/api"
  const slug = url.pathname.split("/").filter(Boolean).pop()?.replace(/\/api$/, "") ?? "";
  const cleanSlug = url.pathname.replace(/^\/go\//, "").replace(/\/api$/, "");

  const destination = CLOAKED_LINKS[cleanSlug || slug]?.destination;
  if (!destination) {
    return NextResponse.redirect(new URL("/shop", url.origin), 307);
  }

  const final = decorateDestination(destination, url.searchParams);
  return NextResponse.redirect(new URL(final, url.origin), 307);
}
