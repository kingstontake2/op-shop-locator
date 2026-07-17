# Usage monitoring & free-tier guardrails

## In-app dashboard

1. Set `USAGE_DASHBOARD_TOKEN` in `.env.local` and Vercel (Production + Preview).
2. Open `/admin/usage` on the deployed site or locally.
3. Paste the token once; it stays in session storage (never put it in the URL).

The dashboard shows:

- Monthly Google SKU counters this app recorded
- Estimated Upstash `opshop:` Redis commands
- Cache hit rate and calls avoided
- Circuit-breaker status (pauses new Google lookups before free caps)
- Month-end projections and 70% / 85% / 95% warning colours

**Authoritative sources:** Google Cloud Console for Maps billing/SKUs; Upstash Console for the shared Redis database total (includes your other project).

## Optional env overrides

```bash
USAGE_DASHBOARD_TOKEN=
USAGE_CAP_NEARBY=5000
USAGE_BLOCK_NEARBY=4000
USAGE_CAP_TEXT_SEARCH=5000
USAGE_BLOCK_TEXT_SEARCH=4000
USAGE_CAP_DETAILS=1000
USAGE_BLOCK_DETAILS=800
USAGE_CAP_PHOTOS=1000
USAGE_BLOCK_PHOTOS=800
USAGE_CAP_MAP_LOADS=10000
USAGE_CAP_REDIS=500000
```

## Google Cloud (do this once)

1. Open [Maps metrics](https://console.cloud.google.com/google/maps-apis/metrics) and confirm Places Nearby, Text Search, Details, Photos, and Dynamic Maps are listed.
2. Open [Quotas](https://console.cloud.google.com/iam-admin/quotas) → filter Maps / Places.
3. Set **quota alerts** at **50%, 75%, 90%** where Google offers them.
4. Set conservative **daily request caps** so free monthly caps cannot be blown through in a burst (starting points):
   - Places Nearby Search: ~100 / day
   - Places Text Search: ~100 / day
   - Places Details: ~20 / day
   - Places Photo: ~20 / day
   - Dynamic Maps: ~250 / day
5. Open [Billing → Budgets](https://console.cloud.google.com/billing) and create a small budget (e.g. **NZD $5 / month**) with alerts at **1%, 50%, 90%**.
   - Budget emails **do not stop spend**. Quotas do.

Free-cap reference used by the app (legacy SKUs as of current Google pricing docs):

| SKU | Free / month | App blocks new Google calls at |
| --- | ---: | ---: |
| Places Nearby Search | 5,000 | 4,000 |
| Places Text Search | 5,000 | 4,000 |
| Places Details / Contact / Atmosphere | 1,000 (conservative) | 800 |
| Places Photo | 1,000 | 800 |
| Dynamic Maps | 10,000 | warn only (estimate) |

## Upstash

1. Keep the **Free** plan (500K commands / month, 256 MB).
2. Confirm email notifications are enabled in the Upstash account.
3. Watch the Console for the **combined** database usage (this app + any other shared project).
4. If attribution gets hard, create a separate free Redis DB for this app and swap the REST URL/token only.

## How circuit breakers behave

- Cache hits always continue.
- When a monthly block threshold is hit, new Google lookups for that SKU return **503** with a clear message.
- Counters reset conceptually with the Pacific-time month key used by Google’s free usage reset.
