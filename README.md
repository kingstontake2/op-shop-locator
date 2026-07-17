# Op Shop Locator

Find op shops and charity shops near you across New Zealand.

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Set:
   - `GOOGLE_MAPS_API_KEY` — browser Maps JS (HTTP referrer restrictions OK)
   - `GOOGLE_MAPS_SERVER_KEY` — server Places (no referrer restriction)
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — cache + rate limits
   - `USAGE_DASHBOARD_TOKEN` — private `/admin/usage` page
3. `npm install && npm run dev`

## Usage monitoring

Open `/admin/usage` and unlock with `USAGE_DASHBOARD_TOKEN`.

See [docs/usage-monitoring.md](docs/usage-monitoring.md) for Google Cloud quota/budget alerts and Upstash free-tier monitoring.

## Stack

Next.js App Router, Tailwind, `@vis.gl/react-google-maps`, server Places + Upstash cache.
