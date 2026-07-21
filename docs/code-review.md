# Op Shop Locator — code review

**Date:** 22 Jul 2026  
**Scope:** `app/`, `components/`, `lib/`, `next.config.ts`, `package.json`, tests  
**Canvas:** [code-review.canvas.tsx](/home/kingston/.cursor/projects/home-kingston-Documents-cursor-repos-op-shop-locator/canvases/code-review.canvas.tsx) (open beside chat in Cursor)

## Verdict

Cost-control scaffolding is thoughtful, but it **fails open**. That is the real ship-blocker — not missing features.

Rate limits and monthly circuit breakers both degrade to allow-all when Redis is missing or errors. Combined with an unlimited `/api/photo` path, **Google Places cost is the highest risk** in this codebase — not auth or SSRF.

| Severity | Count |
| -------- | ----- |
| Critical | 2 |
| High | 6 |
| Medium | 6 |
| Low | 2 |

## Priority fixes

1. **Fail closed without Redis in production** — removes unlimited Places spend on misconfig
2. **Rate-limit `/api/photo` and `/api/usage/map-load`** — closes the cheapest abuse vectors
3. **Align nearby cache key with search radius** — stops serving incomplete results as HIT
4. **Atomic quota reservation (+ multi-page nearby)** — stops breaker overshoot under concurrency
5. **Harden admin token; stop `GOOGLE_MAPS_API_KEY` client fallback** — key/admin hygiene
6. **Fix clothing categorization; add cache/API tests** — product correctness + regression safety

---

## Findings

### Critical

#### 1. Redis fail-open disables all spend brakes

- **Category:** Cost / reliability
- **Where:** `lib/rate-limit.ts`, `lib/usage.ts`, `lib/redis.ts`

Missing or broken Redis returns success for rate limits and `used=0` for circuit breakers. Production without Upstash (or with a bad token) has unlimited Google Places spend.

**Fix:** Fail closed in production: 503 when Redis is unavailable. Fail-open only for local dev.

#### 2. `/api/photo` has no per-IP rate limit

- **Category:** Cost abuse
- **Where:** `app/api/photo/route.ts`

Nearby/details/geocode are limited; photo is not. Only a racy monthly breaker stands between an attacker and Photos billing. `maxwidth` is also unsanitized.

**Fix:** Add `photos` to `RateLimitOperation`; clamp `maxwidth` (e.g. 100–1600); bound `ref` length.

---

### High

#### 3. Nearby cache key buckets radius; Google uses raw radius

- **Category:** Correctness
- **Where:** `lib/cache-keys.ts`, `app/api/nearby/route.ts`

`radius=20001` and `radius=35000` share bucket `35000`. First miss caches a ~20 km set; later 35 km requests get incomplete results as HIT.

**Fix:** Search with `radiusBucket(radius)`, or put exact radius in the key.

#### 4. Circuit breaker is check-then-act (TOCTOU)

- **Category:** Cost control
- **Where:** `lib/usage.ts` + all Google routes

Concurrent requests all see the same monthly count and all proceed. Nearby can burn up to 6 pages after one `canMakeGoogleCall` check.

**Fix:** Atomically reserve quota (`INCR` then compare). Reserve multi-page nearby up front.

#### 5. Unauthenticated `/api/usage/map-load` write amplification

- **Category:** Security
- **Where:** `app/api/usage/map-load/route.ts`

Anyone can POST and inflate `map_loads` / `redis_commands`. Client sessionStorage once-per-session is trivial to bypass.

**Fix:** Rate-limit by IP, or drop the endpoint and estimate map loads elsewhere.

#### 6. Admin token: plain `===` and sessionStorage

- **Category:** Security
- **Where:** `app/api/admin/usage/route.ts`, `app/admin/usage/page.tsx`

Bearer compare is not constant-time; token lives in `sessionStorage` (XSS steals it). Weak secrets make `/admin/usage` brute-forceable.

**Fix:** `timingSafeEqual`; ≥32-byte secret; httpOnly cookie after unlock; rate-limit auth failures.

#### 7. Server-named Maps key can leak to the browser

- **Category:** Key hygiene
- **Where:** `app/page.tsx`

Falls back from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `GOOGLE_MAPS_API_KEY` into client props. Easy to ship the unrestricted server key.

**Fix:** Browser key only via `NEXT_PUBLIC_*`. Never fall back to the server var.

#### 8. No NZ / format bounds on expensive inputs

- **Category:** Input validation
- **Where:** nearby, geocode, place-details routes

Lat/lng only `Number.isFinite`; geocode `q` unbounded; `placeId` unvalidated. Product is NZ-scoped but APIs accept world-wide abuse.

**Fix:** Clamp coords; optional NZ bbox; cap `q` length; validate `place_id` pattern.

---

### Medium

#### 9. Details caches empty failures for 30 days

- **Category:** Correctness
- **Where:** `lib/places.ts`, `app/api/place-details/route.ts`

Non-OK Google responses become null fields and are still cached. Transient errors look like permanent empty details.

**Fix:** Cache only `status === OK`; short TTL or no-cache on failures.

#### 10. `openNow` frozen for up to 21 days

- **Category:** UX
- **Where:** nearby cache TTL + `ShopList` / `ShopDetail`

Nearby cache stores `openNow` from search time. UI shows Open/Closed from stale data for weeks.

**Fix:** Strip `openNow` from cache, or refresh via Details when panel opens.

#### 11. `"op shop"` keyword forces Clothing category

- **Category:** Product logic
- **Where:** `lib/categories.ts`

Haystack includes `"op shop"` under clothing. Almost every real shop named "… Op Shop" is Clothing; General filter excludes them.

**Fix:** Remove `"op shop"` from clothing keywords; categorize on specialty signals only.

#### 12. Brand keep overrides HQ/office reject

- **Category:** Product logic
- **Where:** `lib/op-shop-eligibility.ts`

Strong brand (incl. bare `"salvation"`) returns true before reject patterns. HQ/offices can appear as shops.

**Fix:** Apply reject even with brand unless retail/shop signals exist.

#### 13. Cache stampede on popular keys

- **Category:** Architecture
- **Where:** nearby / geocode / place-details

Concurrent misses all hit Google then write the same key. Cost spike under load.

**Fix:** Short `SET NX` lock or pending sentinel; coalesce waiters.

#### 14. Almost no automated tests

- **Category:** Testing
- **Where:** `package.json` test script

Only ~6 eligibility cases run. `usage-helpers.test.mjs` reimplements logic and is not wired into `npm test`. Cache, radius, rate-limit, and API validation untested.

**Fix:** Import real modules; add cache-key + route tests; wire or delete orphan scripts.

---

### Low

#### 15. No error boundaries or security headers

- **Category:** Prod readiness
- **Where:** `next.config.ts` empty; no `error.tsx`

Client crash takes down the page. No CSP / Referrer-Policy. Exception messages returned to clients.

**Fix:** `error.tsx` + headers in `next.config`; generic 500 bodies.

#### 16. Main UI accessibility gaps

- **Category:** a11y
- **Where:** `LocatorApp`, `ShopDetail`, `ShopMap`

Search lacks label; toggles lack `aria-pressed`; detail sheet lacks dialog semantics / focus trap / Escape.

**Fix:** Labels, live regions, dialog pattern for detail panel.

---

## What is working

| Area | Notes |
| ---- | ----- |
| Cost awareness (when Redis works) | Sliding-window IP limits on nearby/details/geocode, monthly `USAGE_BLOCK_*` breakers, long-lived Redis cache, and an admin usage dashboard show intentional free-tier design. |
| Key split documented | README correctly separates browser Maps JS key vs server Places key. Photo proxy avoids putting the server key in image URLs — good pattern once rate-limited. |
| Server-only boundaries | `redis`, `rate-limit`, and `usage` modules use `server-only`. Google calls hardcode `maps.googleapis.com` (no classic SSRF via user URLs). |
| Lean UI data flow | Details and photos load on demand per shop; list does not N+1. Monetisation and ads are env-gated rather than always-on. |

## Architecture snapshot

| Concern | Assessment |
| ------- | ---------- |
| Places cost control | Designed well; fails open without Redis; photo under-protected; nearby multiplies SKUs |
| Caching | Good TTLs, but radius bucket mismatch corrupts hits; `openNow` goes stale |
| Auth | Bearer token only for usage API; no middleware; weak compare |
| Tests | Eligibility only — cost/cache/auth logic untested |

---

*No production deploy config inspected beyond repo defaults.*
