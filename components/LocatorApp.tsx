"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { ShopMap } from "@/components/ShopMap";
import { ShopList } from "@/components/ShopList";
import { ShopDetail } from "@/components/ShopDetail";
import { filterShopsByCategory } from "@/lib/categories";
import {
  AUCKLAND_CENTER,
  DEFAULT_RADIUS_M,
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

function placeToShop(place: google.maps.places.PlaceResult): Shop | null {
  const loc = place.geometry?.location;
  if (!place.place_id || !place.name || !loc) return null;
  return {
    id: place.place_id,
    name: place.name,
    address: place.vicinity ?? place.formatted_address ?? "",
    lat: loc.lat(),
    lng: loc.lng(),
    openNow: (() => {
      if (typeof place.opening_hours?.isOpen === "function") {
        return place.opening_hours.isOpen() ?? null;
      }
      return (
        (place.opening_hours as { open_now?: boolean } | undefined)?.open_now ??
        null
      );
    })(),
    rating: place.rating ?? null,
    types: place.types ?? [],
    photoReference: place.photos?.[0]?.getUrl
      ? place.photos[0].getUrl({ maxWidth: 400 })
      : null,
    phone: place.formatted_phone_number ?? null,
    hours: place.opening_hours?.weekday_text ?? null,
    website: place.website ?? null,
  };
}

function LocatorInner() {
  const placesLib = useMapsLibrary("places");
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);
  const [view, setView] = useState<ViewMode>("map");
  const [shops, setShops] = useState<Shop[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number }>(
    AUCKLAND_CENTER,
  );
  const [selected, setSelected] = useState<Shop | null>(null);
  const [category, setCategory] = useState<ShopCategory>("all");
  const [suburb, setSuburb] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Auckland CBD");

  useEffect(() => {
    if (!placesLib) return;
    const attribution = document.createElement("div");
    serviceRef.current = new placesLib.PlacesService(attribution);
  }, [placesLib]);

  const loadNearby = useCallback(
    (lat: number, lng: number, label: string) => {
      if (!placesLib || !serviceRef.current) return;
      setLoading(true);
      setError(null);
      setSelected(null);

      const keywords = ["op shop", "charity shop"];
      const byId = new Map<string, Shop>();
      let remaining = keywords.length;

      const finish = () => {
        remaining -= 1;
        if (remaining > 0) return;
        const list = Array.from(byId.values());
        setShops(list);
        setCenter({ lat, lng });
        setStatusMessage(label);
        setLoading(false);
        if (list.length === 0) {
          setError("No op shops found near this location.");
        }
      };

      for (const keyword of keywords) {
        serviceRef.current.nearbySearch(
          {
            location: { lat, lng },
            radius: DEFAULT_RADIUS_M,
            keyword,
          },
          (results, status) => {
            if (
              status === placesLib.PlacesServiceStatus.OK &&
              results
            ) {
              for (const place of results) {
                const shop = placeToShop(place);
                if (shop && !byId.has(shop.id)) byId.set(shop.id, shop);
              }
            } else if (
              status !== placesLib.PlacesServiceStatus.ZERO_RESULTS &&
              status !== placesLib.PlacesServiceStatus.OK
            ) {
              setError(`Places search failed: ${status}`);
            }
            finish();
          },
        );
      }
    },
    [placesLib],
  );

  useEffect(() => {
    if (!placesLib || !serviceRef.current) return;
    loadNearby(AUCKLAND_CENTER.lat, AUCKLAND_CENTER.lng, "Auckland CBD");
  }, [placesLib, loadNearby]);

  const filtered = filterShopsByCategory(shops, category);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in this browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        loadNearby(
          pos.coords.latitude,
          pos.coords.longitude,
          "Your location",
        );
      },
      () => {
        setLoading(false);
        setError("Could not get your location. Showing Auckland instead.");
        loadNearby(AUCKLAND_CENTER.lat, AUCKLAND_CENTER.lng, "Auckland CBD");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function onSuburbSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = suburb.trim();
    if (!q || !placesLib || !serviceRef.current) return;
    setLoading(true);
    setError(null);
    const query = /new zealand|auckland|wellington|christchurch|\bnz\b/i.test(q)
      ? q
      : `${q}, New Zealand`;

    serviceRef.current.textSearch({ query }, (results, status) => {
      if (
        status === placesLib.PlacesServiceStatus.OK &&
        results?.[0]?.geometry?.location
      ) {
        const loc = results[0].geometry.location;
        loadNearby(
          loc.lat(),
          loc.lng(),
          results[0].formatted_address ?? results[0].name ?? q,
        );
      } else {
        setLoading(false);
        setError("Suburb not found. Try another name.");
      }
    });
  }

  async function enrichShop(shop: Shop): Promise<Shop> {
    if (!placesLib || !serviceRef.current) return shop;
    if (shop.hours && shop.phone) return shop;

    return new Promise((resolve) => {
      serviceRef.current!.getDetails(
        {
          placeId: shop.id,
          fields: [
            "formatted_phone_number",
            "website",
            "opening_hours",
            "photos",
            "vicinity",
            "formatted_address",
          ],
        },
        (place, status) => {
          if (status !== placesLib.PlacesServiceStatus.OK || !place) {
            resolve(shop);
            return;
          }
          resolve({
            ...shop,
            address:
              place.vicinity ?? place.formatted_address ?? shop.address,
            phone: place.formatted_phone_number ?? shop.phone,
            website: place.website ?? shop.website,
            hours: place.opening_hours?.weekday_text ?? shop.hours,
            photoReference: place.photos?.[0]
              ? place.photos[0].getUrl({ maxWidth: 400 })
              : shop.photoReference,
          });
        },
      );
    });
  }

  async function onSelect(shop: Shop) {
    setSelected(shop);
    const enriched = await enrichShop(shop);
    setSelected(enriched);
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

        <div className={view === "map" ? "h-full" : "hidden h-full"}>
          <ShopMap
            shops={filtered}
            center={center}
            selectedId={selected?.id ?? null}
            onSelect={onSelect}
          />
        </div>
        <div className={view === "list" ? "h-full" : "hidden h-full"}>
          <ShopList
            shops={filtered}
            selectedId={selected?.id ?? null}
            onSelect={onSelect}
          />
        </div>

        {selected && (
          <ShopDetail shop={selected} onClose={() => setSelected(null)} />
        )}
      </main>
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
    <APIProvider apiKey={mapsApiKey} libraries={["places"]}>
      <LocatorInner />
    </APIProvider>
  );
}
