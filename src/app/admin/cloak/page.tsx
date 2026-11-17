import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isValidSession } from "@/lib/adminAuth";
import { CLOAKED_LINKS, cloakedUrl, getStats } from "@/lib/cloak";
import SignOutButton from "@/components/admin/SignOutButton";
import CopyButton from "@/components/admin/CopyButton";

export const metadata = { title: "Link Cloaking — Khaleej Admin" };
export const dynamic = "force-dynamic";

export default async function CloakAdminPage() {
  const store = await cookies();
  if (!isValidSession(store.get(ADMIN_COOKIE)?.value)) {
    redirect("/admin/login");
  }

  const stats = getStats();
  const rows = Object.entries(CLOAKED_LINKS).map(([slug, def]) => ({
    slug,
    label: def.label,
    destination: def.destination,
    note: def.note,
    url: cloakedUrl(slug, {
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: "khaleej",
    }),
    clicks: stats[slug]?.total ?? 0,
    bySource: stats[slug]?.bySource ?? {},
  }));

  const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);

  return (
    <div className="py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-plum-deep">Link Cloaking</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Paste these short URLs into Meta / TikTok / Google. Ad clicks see a clean
            &ldquo;Khaleej&rdquo; wall then land on the real product; crawlers get a direct
            redirect.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-6 flex items-center gap-6 rounded-xl border border-line bg-white/70 px-5 py-4">
        <div>
          <div className="text-2xl font-semibold text-plum-deep">{totalClicks}</div>
          <div className="text-xs uppercase tracking-wide text-ink-soft">Total wall clicks</div>
        </div>
        <div className="h-10 w-px bg-line" />
        <p className="text-sm text-ink-soft">
          Tip: use <code className="rounded bg-plum/10 px-1.5 py-0.5 text-plum-deep">/go/offer</code>{" "}
          for broad campaigns and the product-specific links for single-product ads.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <div
            key={r.slug}
            className="rounded-xl border border-line bg-white/70 p-4 transition-colors hover:border-plum/40 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display text-lg font-medium text-ink">{r.label}</div>
                {r.note && <div className="mt-0.5 text-xs text-ink-soft">{r.note}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-semibold leading-none text-plum-deep">{r.clicks}</div>
                  <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-ink-soft">clicks</div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-soft">
              <span className="rounded bg-plum/10 px-1.5 py-0.5 font-medium text-plum-deep">
                goes to
              </span>
              <code className="break-all">{r.destination}</code>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 select-all break-all rounded-lg bg-ink/5 px-3 py-2.5 text-xs text-ink">
                {r.url}
              </code>
              <CopyButton value={r.url} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-ink-soft/80">
        Clicks are counted in-memory and reset on each deploy (Vercel serverless). For
        persistent ad-attribution, rely on UTM params in your analytics (GA4 / Meta Pixel).
      </p>
    </div>
  );
}
