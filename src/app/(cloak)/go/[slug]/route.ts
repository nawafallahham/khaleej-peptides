import { NextResponse } from "next/server";
import {
  CLOAKED_LINKS,
  cloakedUrl,
  decorateDestination,
  detectSource,
  getCloakLabel,
  recordClick,
} from "@/lib/cloak";

export const dynamic = "force-dynamic";

/**
 * Cloaked landing wall — served as a Route Handler (NOT a page) so it is
 * completely isolated from the root src/app/layout.tsx. This guarantees the
 * Meta ad-review crawler sees ONLY this minimal, neutral HTML — no Header,
 * no Footer, no "Research Use Only" banner, no gtag, no AgeGate, and no
 * "peptide" wording in the <head> — while real ad-clickers (JS on) are
 * forwarded to the real product and JS-disabled crawlers get a <noscript>
 * redirect straight to the product.
 *
 * The real pages (root layout + Research-Use banner) still render for the
 * destination product URL, so legitimate users get the full, compliant site.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://khaleejpeptides.com").replace(/\/$/, "");

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wallHtml(opts: {
  destination: string;
  final: string;
  label: string;
  ogImage: string;
}): string {
  const { destination, final, label, ogImage } = opts;
  const labelHtml = esc(label);
  const finalJs = JSON.stringify(final);
  const dest = encodeURIComponent(destination);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Confirming your request — Khaleej</title>
<meta name="description" content="We're confirming your details and taking you to the Khaleej catalog. This only takes a moment." />
<meta property="og:title" content="Khaleej" />
<meta property="og:description" content="Confirming your request — you'll be taken to the Khaleej catalog in a moment." />
<meta property="og:type" content="website" />
<meta property="og:image" content="${esc(ogImage)}" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="Khaleej" />
<meta name="twitter:description" content="Confirming your request — you'll be taken to the Khaleej catalog in a moment." />
<link rel="icon" href="/favicon.ico" />
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:#f5efe4;color:#17140f;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
main{flex:1;display:flex;align-items:center;justify-content:center;padding:32px 24px}
.wrap{width:100%;max-width:420px;text-align:center}
.brand{display:flex;flex-direction:column;align-items:center;gap:10px;margin-bottom:28px}
.badge{width:48px;height:48px;border-radius:9999px;background:rgba(20,23,31,.1);display:flex;align-items:center;justify-content:center}
.badge svg{width:24px;height:24px;color:#14171f}
.word{font-size:20px;letter-spacing:.3em;font-weight:600;color:#14171f}
h1{font-size:32px;line-height:1.15;margin:0;font-weight:600;color:#0b0d12;letter-spacing:-.01em}
p.sub{margin:14px auto 0;max-width:340px;font-size:15px;line-height:1.55;color:#6b6355}
.spin-wrap{margin:36px auto 0;width:48px;height:48px;display:flex;align-items:center;justify-content:center}
.spin{width:40px;height:40px;border-radius:9999px;border:2px solid #ddd0b8;border-top-color:#7a431c;animation:spin .9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.cont{margin-top:24px;background:#14171f;color:#fff;border:none;border-radius:10px;padding:13px 26px;font-size:14px;font-weight:600;cursor:pointer}
.cont:hover{background:#0b0d12}
.mono{margin-top:22px;font-size:11px;text-transform:uppercase;letter-spacing:.18em;color:#6b6355}
.note{margin:26px auto 0;max-width:300px;font-size:11px;line-height:1.5;color:rgba(107,99,85,.8)}
</style>
</head>
<body>
<main>
<div class="wrap">
  <noscript><meta http-equiv="refresh" content="0;url=${dest}"><style>html,body{display:none !important}</style></noscript>
  <div class="brand">
    <div class="badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg></div>
    <span class="word">KHALEEJ</span>
  </div>
  <h1>You're all set.</h1>
  <p class="sub">We're confirming your details and taking you to the <strong>${labelHtml}</strong>. This only takes a moment.</p>
  <div class="spin-wrap"><div class="spin"></div></div>
  <button type="button" class="cont" id="go">Continue now</button>
  <p class="mono" id="status">Continuing in 4s</p>
  <p class="note">If you don't continue automatically in a few seconds, tap "Continue now".</p>
</div>
</main>
<script>
(function(){
  var final=${finalJs};
  var done=false;
  var n=4;
  function go(){ if(done) return; done=true; window.location.replace(final); }
  var t=setInterval(function(){
    n--;
    var el=document.getElementById('status');
    if(n<=0){ clearInterval(t); go(); }
    else if(el){ el.textContent='Continuing in '+n+'s'; }
  },1000);
  setTimeout(function(){ if(!done){ clearInterval(t); go(); } }, 4200);
  var b=document.getElementById('go');
  if(b) b.addEventListener('click', function(){ clearInterval(t); go(); });
})();
</script>
</body>
</html>`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.pathname.replace(/^\/go\//, "").replace(/\/+$/, "");

  const def = CLOAKED_LINKS[slug];
  if (!def) {
    // Unknown slug → bounce to the catalog (content-rich, safe).
    return NextResponse.redirect(new URL("/shop", SITE), 307);
  }

  const source = detectSource(url.searchParams);
  recordClick(slug, source);

  const final = decorateDestination(def.destination, url.searchParams);
  const ogImage = `${SITE}/khaleej-logo.webp`;
  const label = getCloakLabel(slug);

  const html = wallHtml({ destination: def.destination, final, label, ogImage });
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
