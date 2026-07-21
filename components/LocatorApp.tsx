"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { ShopMap, type MapViewport } from "@/components/ShopMap";
import { ShopList } from "@/components/ShopList";
import { ShopDetail } from "@/components/ShopDetail";
import { SupportLink } from "@/components/SupportLink";
import { BrandMark } from "@/components/BrandMark";
import Link from "next/link";
import { adsenseClientId, supportUrl } from "@/lib/monetisation";
import { filterShopsByCategory } from "@/lib/categories";
import { searchRadiusForBounds } from "@/lib/search-area";
import {
  AUCKLAND_CENTER,
  AUCKLAND_DEFAULT_ZOOM,
  DEFAULT_RADIUS_M,
  LOCAL_SEARCH_ZOOM,
  type GeocodeResponse,
  type NearbyResponse,
  type Shop,
  type ShopCategory,
} from "@/lib/types";

type ViewMode = "map" | "list";

const CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "clothing", label: "Clothing" },
  { id: "books", label: "Books" },
  { id: "furniture", label: "Furniture" },
  { id: "general", label: "General" },
];

type LocatorAppProps = {
  mapsApiKey: string;
};

type SearchArea = {
  center: { lat: number; lng: number };
  radius: number;
  label: string;
  zoom?: number;
  resetCamera?: boolean;
};

function LocatorInner() {
  const [view, setView] = useState<ViewMode>("map");
  const [shops, setShops] = useState<Shop[]>([]);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(
    AUCKLAND_CENTER,
  );
  const [mapZoom, setMapZoom] = useState(AUCKLAND_DEFAULT_ZOOM);
  const [cameraKey, setCameraKey] = useState(0);
  const [selected, setSelected] = useState<Shop | null>(null);
  const [category, setCategory] = useState<ShopCategory>("all");
  const [suburb, setSuburb] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Wider Auckland");
  const [viewportDirty, setViewportDirty] = useState(false);
  const [viewportTooWide, setViewportTooWide] = useState(false);

  const viewportRef = useRef<MapViewport | null>(null);
  const searchedAreaRef = useRef<{
    center: { lat: number; lng: number };
    radius: number;
  } | null>(null);
  const searchGenerationRef = useRef(0);

  const loadNearby = useCallback(async (area: SearchArea) => {
    const generation = ++searchGenerationRef.current;
    setLoading(true);
    setError(null);
    setSelected(null);

    try {
      const params = new URLSearchParams({
        lat: String(area.center.lat),
        lng: String(area.center.lng),
        radius: String(area.radius),
      });
      const response = await fetch(`/api/nearby?${params.toString()}`);
      const data = (await response.json()) as NearbyResponse & {
        error?: string;
      };

      if (generation !== searchGenerationRef.current) return;

      if (response.status === 429) {
        throw new Error(
          data.error ??
            "Daily search limit reached for your network. Try again tomorrow or use a cached area.",
        );
      }
      if (response.status === 503) {
        throw new Error(
          data.error ??
            "Monthly free-tier Google guard is active. Cached areas still work.",
        );
      }
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load shops");
      }

      setShops(data.shops);
      setMapCenter(area.center);
      if (area.zoom != null) setMapZoom(area.zoom);
      if (area.resetCamera) setCameraKey((key) => key + 1);

      searchedAreaRef.current = {
        center: area.center,
        radius: area.radius,
      };
      setViewportDirty(false);
      setViewportTooWide(false);

      const sourceNote =
        data.source === "cache" ? " · cached" : data.source === "google" ? "" : "";
      setStatusMessage(
        `${area.label} · ${Math.round(area.radius / 1000)} km${sourceNote}`,
      );

      if (data.shops.length === 0) {
        setError("No op shops found in this area. Try zooming or moving the map.");
      }
    } catch (err) {
      if (generation !== searchGenerationRef.current) return;
      setShops([]);
      setError(err instanceof Error ? err.message : "Failed to load shops");
    } finally {
      if (generation === searchGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const mapLoadKey = "opshop:map-load-recorded";
    if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(mapLoadKey)) {
      sessionStorage.setItem(mapLoadKey, "1");
      void fetch("/api/usage/map-load", { method: "POST" }).catch(() => {
        // Usage telemetry must never block the UI.
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const aucklandFallback = {
      center: AUCKLAND_CENTER,
      radius: DEFAULT_RADIUS_M,
      label: "Wider Auckland",
      zoom: AUCKLAND_DEFAULT_ZOOM,
      resetCamera: true,
    } as const;

    function startDefaultSearch() {
      if (cancelled) return;

      if (!navigator.geolocation) {
        void loadNearby(aucklandFallback);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          void loadNearby({
            center: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            },
            radius: DEFAULT_RADIUS_M,
            label: "Your location",
            zoom: LOCAL_SEARCH_ZOOM,
            resetCamera: true,
          });
        },
        () => {
          if (cancelled) return;
          void loadNearby(aucklandFallback);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }

    queueMicrotask(startDefaultSearch);
    return () => {
      cancelled = true;
    };
  }, [loadNearby]);

  const filtered = filterShopsByCategory(shops, category);

  const onViewportChange = useCallback((viewport: MapViewport) => {
    viewportRef.current = viewport;
    const { radius, tooWide } = searchRadiusForBounds(
      viewport.center,
      viewport.bounds,
    );
    setViewportTooWide(tooWide);

    const searched = searchedAreaRef.current;
    if (!searched) {
      setViewportDirty(true);
      return;
    }

    const moved =
      Math.abs(viewport.center.lat - searched.center.lat) > 0.01 ||
      Math.abs(viewport.center.lng - searched.center.lng) > 0.01 ||
      Math.abs(radius - searched.radius) > 2_500;

    setViewportDirty(moved || tooWide);
  }, []);

  function searchThisArea() {
    const viewport = viewportRef.current;
    if (!viewport) {
      setError("Move the map a little, then try Search this area again.");
      return;
    }

    const { radius, tooWide } = searchRadiusForBounds(
      viewport.center,
      viewport.bounds,
    );
    if (tooWide) {
      setViewportTooWide(true);
      setError("Zoom in a bit — Google searches are limited to about 50 km.");
      return;
    }

    void loadNearby({
      center: viewport.center,
      radius,
      label: "This map area",
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void loadNearby({
          center: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
          radius: DEFAULT_RADIUS_M,
          label: "Your location",
          zoom: LOCAL_SEARCH_ZOOM,
          resetCamera: true,
        });
      },
      () => {
        setLoading(false);
        setError("Could not get your location. Showing Auckland instead.");
        void loadNearby({
          center: AUCKLAND_CENTER,
          radius: DEFAULT_RADIUS_M,
          label: "Wider Auckland",
          zoom: AUCKLAND_DEFAULT_ZOOM,
          resetCamera: true,
        });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onSuburbSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = suburb.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = (await response.json()) as GeocodeResponse & {
        error?: string;
      };

      if (response.status === 429) {
        throw new Error(
          data.error ?? "Daily suburb-search limit reached. Try again tomorrow.",
        );
      }
      if (!response.ok) {
        throw new Error(data.error ?? "Suburb not found");
      }

      await loadNearby({
        center: { lat: data.lat, lng: data.lng },
        radius: DEFAULT_RADIUS_M,
        label: data.formattedAddress,
        zoom: LOCAL_SEARCH_ZOOM,
        resetCamera: true,
      });
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Suburb search failed");
    }
  }

  return (
    <div className="relative flex h-dvh flex-col bg-background text-foreground">
      <main className="relative min-h-0 flex-1">
        <div className={view === "map" ? "h-full" : "hidden h-full"}>
          <ShopMap
            shops={filtered}
            center={mapCenter}
            zoom={mapZoom}
            cameraKey={cameraKey}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onViewportChange={onViewportChange}
          />
        </div>
        <div
          className={
            view === "list" ? "h-full bg-background" : "hidden h-full bg-background"
          }
        >
          <ShopList
            shops={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>

        {loading && (
          <div className="absolute inset-x-0 top-0 z-40 h-1 overflow-hidden">
            <div className="loading-shimmer h-full w-full" />
          </div>
        )}

        {/* Floating chrome */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            <div className="pointer-events-auto glass-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2.5 sm:px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <BrandMark className="h-8 w-8 shrink-0" />
                <div className="min-w-0">
                  <h1 className="font-display text-lg leading-tight tracking-tight text-brand-ink sm:text-xl">
                    Op Shop Locator
                  </h1>
                  <p className="truncate text-xs text-muted">{statusMessage}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SupportLink compact />
                <div
                  className="flex rounded-xl bg-background/80 p-1"
                  role="group"
                  aria-label="View mode"
                >
                  <button
                    type="button"
                    onClick={() => setView("map")}
                    className={`focus-ring rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      view === "map"
                        ? "bg-surface text-brand-ink shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={`focus-ring rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      view === "list"
                        ? "bg-surface text-brand-ink shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto glass-panel rounded-2xl px-3 py-2.5 sm:px-4">
              <form
                onSubmit={onSuburbSearch}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 gap-2">
                  <input
                    type="search"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    placeholder="Search suburb (e.g. Ponsonby)"
                    className="focus-ring min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted/80 focus:border-brand"
                  />
                  <button
                    type="submit"
                    className="focus-ring shrink-0 rounded-xl bg-brand px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-ink"
                  >
                    Search
                  </button>
                </div>
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:bg-background"
                  aria-label="Use my location"
                >
                  <LocationIcon />
                  <span className="sm:inline">Near me</span>
                </button>
              </form>

              <div
                className="mt-2 flex gap-1 overflow-x-auto pb-0.5"
                role="group"
                aria-label="Category filters"
              >
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`focus-ring shrink-0 rounded-lg px-3 py-1 text-xs transition-colors sm:text-sm ${
                      category === c.id
                        ? "bg-brand-ink text-white"
                        : "bg-background/70 text-muted hover:bg-background hover:text-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {loading && (
              <div className="flex justify-center">
                <div className="animate-fade-up glass-panel rounded-full px-3.5 py-1.5 text-xs font-medium text-brand-ink sm:text-sm">
                  Finding op shops…
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="flex justify-center">
                <div className="animate-fade-up pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/95 px-3.5 py-2.5 text-sm text-amber-950 shadow-sm backdrop-blur">
                  <p className="min-w-0 flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-amber-800/70 hover:bg-amber-100 hover:text-amber-950"
                    aria-label="Dismiss error"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {view === "map" && viewportDirty && !loading && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={searchThisArea}
                  className="animate-fade-up focus-ring pointer-events-auto rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-brand-ink"
                >
                  {viewportTooWide
                    ? "Zoom in to search this area"
                    : "Search this area"}
                </button>
              </div>
            )}
          </div>
        </div>

        {selected && (
          <ShopDetail shop={selected} onClose={() => setSelected(null)} />
        )}
      </main>

      <footer className="z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border/60 bg-surface-elevated px-3 py-1.5 text-[11px] text-muted backdrop-blur sm:text-xs">
        <Link href="/about" className="hover:text-brand-ink">
          About
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className="hover:text-brand-ink">
          Privacy
        </Link>
        {(adsenseClientId() || supportUrl()) && (
          <>
            <span aria-hidden="true">·</span>
            <span>
              {adsenseClientId()
                ? "Ads help cover map costs"
                : "Tips help cover map costs"}
            </span>
          </>
        )}
      </footer>
    </div>
  );
}

function LocationIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export function LocatorApp({ mapsApiKey }: LocatorAppProps) {
  if (!mapsApiKey) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
        <BrandMark className="h-12 w-12" />
        <div>
          <p className="font-display text-xl text-brand-ink">Op Shop Locator</p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Set GOOGLE_MAPS_API_KEY in .env.local to run Op Shop Locator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={mapsApiKey}>
      <LocatorInner />
    </APIProvider>
  );
}
