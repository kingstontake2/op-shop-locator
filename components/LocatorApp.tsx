"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { ShopMap, type MapViewport } from "@/components/ShopMap";
import { ShopList } from "@/components/ShopList";
import { ShopDetail } from "@/components/ShopDetail";
import { SupportLink } from "@/components/SupportLink";
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
    <div className="relative flex h-dvh flex-col bg-stone-100 text-stone-900">
      <header className="z-10 border-b border-stone-200 bg-white/95 px-3 py-2 backdrop-blur sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-xl tracking-tight text-teal-900 sm:text-2xl">
              Op Shop Locator
            </h1>
            <p className="text-xs text-stone-500 sm:text-sm">{statusMessage}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SupportLink compact />
            <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => setView("map")}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  view === "map"
                    ? "bg-white text-teal-900 shadow"
                    : "text-stone-600"
                }`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  view === "list"
                    ? "bg-white text-teal-900 shadow"
                    : "text-stone-600"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <form onSubmit={onSuburbSearch} className="flex flex-1 gap-2">
            <input
              type="search"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              placeholder="Search suburb (e.g. Ponsonby)"
              className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600"
            />
            <button
              type="submit"
              className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white hover:bg-teal-900"
            >
              Search
            </button>
          </form>
          <button
            type="button"
            onClick={useMyLocation}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 hover:bg-stone-50"
          >
            Use my location
          </button>
        </div>

        <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`shrink-0 rounded-lg px-3 py-1 text-xs sm:text-sm ${
                category === c.id
                  ? "bg-teal-800 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        {loading && (
          <div className="absolute inset-x-0 top-0 z-10 bg-teal-900/90 px-3 py-2 text-center text-sm text-white">
            Finding op shops…
          </div>
        )}
        {error && (
          <div className="absolute inset-x-0 top-0 z-10 bg-amber-100 px-3 py-2 text-center text-sm text-amber-950">
            {error}
          </div>
        )}

        {view === "map" && viewportDirty && !loading && (
          <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-3 sm:top-4">
            <button
              type="button"
              onClick={searchThisArea}
              className="pointer-events-auto rounded-full bg-teal-800 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-teal-900"
            >
              {viewportTooWide ? "Zoom in to search this area" : "Search this area"}
            </button>
          </div>
        )}

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
        <div className={view === "list" ? "h-full" : "hidden h-full"}>
          <ShopList
            shops={filtered}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        </div>

        {selected && (
          <ShopDetail shop={selected} onClose={() => setSelected(null)} />
        )}
      </main>

      <footer className="z-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-stone-200 bg-white/90 px-3 py-1.5 text-[11px] text-stone-500 sm:text-xs">
        <Link href="/about" className="hover:text-teal-800">
          About
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/privacy" className="hover:text-teal-800">
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

export function LocatorApp({ mapsApiKey }: LocatorAppProps) {
  if (!mapsApiKey) {
    return (
      <div className="flex h-dvh items-center justify-center bg-stone-100 px-6 text-center text-stone-700">
        Set GOOGLE_MAPS_API_KEY in .env.local to run Op Shop Locator.
      </div>
    );
  }

  return (
    <APIProvider apiKey={mapsApiKey}>
      <LocatorInner />
    </APIProvider>
  );
}
