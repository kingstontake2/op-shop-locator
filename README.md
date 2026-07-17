# Op Shop Locator

Find op shops and charity shops near you (NZ-focused MVP).

## Setup

1. Copy `.env.local.example` to `.env.local`
2. Add a Google Cloud API key with **Maps JavaScript API** and **Places API** enabled
3. For local + Vercel, restrict the key by HTTP referrer (`localhost:3000/*`, your Vercel domain)
4. `npm install && npm run dev`

Optional: set `GOOGLE_MAPS_SERVER_KEY` (no referrer restriction) if you want the `/api/nearby` server routes to work.

## Stack

Next.js App Router, Tailwind, `@vis.gl/react-google-maps`, Places Library (client-side).
