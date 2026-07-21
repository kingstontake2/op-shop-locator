Here's the order — each step should be a working, visible thing before you move to the next, so you never get stuck debugging three unknowns at once.

**Step 1: Scaffold + API keys (30 min)**
- `npx create-next-app@latest` — Pages Router since you already know it from Little Fox, no reason to context-switch
- Get a Google Cloud project, enable **Places API** and **Maps JavaScript API**, generate a key
- Restrict the key to your domain (or leave unrestricted for local dev, just don't commit it)
- Drop it in `.env.local`, confirm it loads with a console.log — don't touch UI yet

**Step 2: Prove the API call works (30-60 min)**
- One API route (`/api/nearby`) that takes lat/lng, calls Places API "nearby search" with keyword `op shop` or `charity shop`, returns raw JSON
- Test it by hitting the route directly in browser / Postman. No frontend yet.
- This is the riskiest unknown (data quality, quota limits) — get it working before you build anything visual on top

**Step 3: Get the map rendering (1-2 hrs)**
- Basic page, load Google Maps JS, center on a hardcoded Auckland coordinate
- Once it renders, wire it to Step 2's API route and drop pins for the returned shops
- This is the "wow it's real" milestone — good place to commit and maybe screenshot for later

**Step 4: List view + toggle (1-2 hrs)**
- Same data, rendered as cards instead of pins
- Toggle button between map/list — this is mostly UI state, Cursor will move fast here

**Step 5: Geolocation + search by suburb (1-2 hrs)**
- "Use my location" button using browser geolocation API
- Fallback text search box (suburb name → geocode → re-run Step 2's query)

**Step 6: Category filter (1 hr)**
- Filter client-side on the results you already have, or refine the Places keyword per category
- Client-side is faster to ship — only refine if results look bad

**Step 7: Shop detail view (1-2 hrs)**
- Click pin/card → hours, address, maybe photo if Places returns one
- This is where it stops looking like a demo and starts looking like a product

**Step 8: Polish pass**
- Empty states, loading states, mobile responsiveness, deploy to Vercel

Steps 1-3 are the load-bearing ones — once your API route and map are both proven working, everything after is mostly UI assembly that Cursor handles well. Want to start on Step 1-2 now, or do you want to sanity-check the Places API response for op-shops in Auckland first so you know the data's actually good before building on it?