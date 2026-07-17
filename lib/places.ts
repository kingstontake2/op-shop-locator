import type { Shop } from "./types";

type PlacesNearbyResult = {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry?: { location?: { lat: number; lng: number } };
  opening_hours?: { open_now?: boolean };
  rating?: number;
  types?: string[];
  photos?: { photo_reference: string }[];
};

type PlacesNearbyResponse = {
  status: string;
  results?: PlacesNearbyResult[];
  error_message?: string;
};

type PlaceDetailsResult = {
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: { weekday_text?: string[] };
  photos?: { photo_reference: string }[];
};

function getServerKey(): string {
  const key =
    process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY is not set");
  }
  return key;
}

export function normalizeShop(result: PlacesNearbyResult): Shop | null {
  const lat = result.geometry?.location?.lat;
  const lng = result.geometry?.location?.lng;
  if (lat == null || lng == null || !result.place_id || !result.name) {
    return null;
  }

  return {
    id: result.place_id,
    name: result.name,
    address: result.vicinity ?? result.formatted_address ?? "",
    lat,
    lng,
    openNow: result.opening_hours?.open_now ?? null,
    rating: result.rating ?? null,
    types: result.types ?? [],
    photoReference: result.photos?.[0]?.photo_reference ?? null,
    phone: null,
    hours: null,
    website: null,
  };
}

export async function searchNearbyOpShops(
  lat: number,
  lng: number,
  radius: number,
): Promise<{ shops: Shop[]; status: string; errorMessage?: string }> {
  const key = getServerKey();
  const keywords = ["op shop", "charity shop"];
  const byId = new Map<string, Shop>();
  let lastStatus = "ZERO_RESULTS";
  let errorMessage: string | undefined;

  for (const keyword of keywords) {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    );
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("keyword", keyword);
    url.searchParams.set("key", key);

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Places Nearby failed: ${res.status}`);
    }

    const data = (await res.json()) as PlacesNearbyResponse;
    lastStatus = data.status;
    if (data.error_message) {
      errorMessage = data.error_message;
    }

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      continue;
    }

    for (const result of data.results ?? []) {
      const shop = normalizeShop(result);
      if (shop && !byId.has(shop.id)) {
        byId.set(shop.id, shop);
      }
    }
  }

  return {
    shops: Array.from(byId.values()),
    status: byId.size > 0 ? "OK" : lastStatus,
    errorMessage,
  };
}

export async function fetchPlaceDetails(placeId: string): Promise<{
  phone: string | null;
  website: string | null;
  hours: string[] | null;
  photoReference: string | null;
}> {
  const key = getServerKey();
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json",
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "formatted_phone_number,website,opening_hours,photos",
  );
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Place Details failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    status: string;
    result?: PlaceDetailsResult;
    error_message?: string;
  };

  if (data.status !== "OK" || !data.result) {
    return {
      phone: null,
      website: null,
      hours: null,
      photoReference: null,
    };
  }

  return {
    phone: data.result.formatted_phone_number ?? null,
    website: data.result.website ?? null,
    hours: data.result.opening_hours?.weekday_text ?? null,
    photoReference: data.result.photos?.[0]?.photo_reference ?? null,
  };
}

export async function geocodeSuburb(
  query: string,
): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const key = getServerKey();
  // Text Search keeps suburb lookup on Places API (no separate Geocoding enablement).
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json",
  );
  const q = /auckland|wellington|christchurch|nz|new zealand/i.test(query)
    ? query
    : `${query}, New Zealand`;
  url.searchParams.set("query", q);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Geocode failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    status: string;
    results?: {
      formatted_address?: string;
      name?: string;
      geometry: { location: { lat: number; lng: number } };
    }[];
  };

  const first = data.results?.[0];
  if (data.status !== "OK" || !first) {
    return null;
  }

  return {
    lat: first.geometry.location.lat,
    lng: first.geometry.location.lng,
    formattedAddress: first.formatted_address ?? first.name ?? query,
  };
}
