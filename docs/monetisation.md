# Monetisation (cover hosting & Maps API)

Goal: keep Op Shop Locator **free for users** and offset residual **Vercel + Google Maps/Places + Upstash** cost — not to maximise profit.

## What actually costs money

| Service | Scales with | Notes |
| --- | --- | --- |
| Google Places (Nearby / Text / Details / Photos) | Cache misses & detail opens | Main cost driver |
| Google Dynamic Maps | Map JS loads | Tracked via `/api/usage/map-load` |
| Upstash Redis | Cache, rate limits, usage counters | Stay on free plan while possible |
| Vercel | Requests / bandwidth | Usually smaller than Maps at growth |

See [usage-monitoring.md](./usage-monitoring.md) for caps, `/admin/usage`, and circuit breakers. **Do not raise block thresholds** unless ads/tips (or a cash buffer) can cover the extra Google spend.

## What’s in the app

1. **AdSense slots** (optional) — list footer and shop detail bottom only; never on the map.
2. **Tip / donate link** (optional) — “Help cover map costs” via Ko-fi, Buy Me a Coffee, Stripe Payment Link, etc.
3. **About / Privacy** pages — needed for AdSense review and transparency.

All of the above are **env-gated**. With no AdSense/support env vars set, the UI stays ad-free and tip-free.

## Env vars

```bash
# Google AdSense publisher id (ca-pub-…)
NEXT_PUBLIC_ADSENSE_CLIENT=

# Ad unit slot ids from AdSense
NEXT_PUBLIC_ADSENSE_SLOT_LIST=
NEXT_PUBLIC_ADSENSE_SLOT_DETAIL=

# External tip page (Ko-fi / BMC / Stripe Payment Link)
NEXT_PUBLIC_SUPPORT_URL=
```

Set these in `.env.local` and in Vercel (Production + Preview as appropriate).

## Setup checklist

1. Confirm burn via `/admin/usage` + Google Cloud / Upstash consoles.
2. Create an AdSense account, add the site, create two **display** units (list + detail).
3. Create a tip link; paste into `NEXT_PUBLIC_SUPPORT_URL`.
4. Deploy with the env vars; open `/about` and `/privacy` so AdSense reviewers see real content.
5. Keep circuit breakers on. Treat ad revenue as coffee money toward the bill until proven otherwise.

## Cost levers already in code

- Nearby results cached ~21 days; details ~30 days; geocode ~1 hour.
- Place Details / Photos load only when a shop is opened (lazy).
- Per-IP daily limits + monthly SKU circuit breakers.

Longer-term (not required for ads): a curated/seeded NZ op-shop catalog would cut Places dependency further for “lots of users.”
