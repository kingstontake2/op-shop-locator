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
  next_page_token?: string;
  error_message?: string;
};

type PlaceDetailsResult = {
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: { weekday_text?: string[] };
  photos?: { photo_reference: string }[];
};

/** Google Nearby Search returns at most 3 pages of 20 results. */
const MAX_NEARBY_PAGES = 3;
/** next_page_token is briefly invalid; Google recommends a short delay. */
const PAGE_TOKEN_DELAY_MS = 2_000;

export function getGoogleMapsServerKey(): string {
  const key = process.env.GOOGLE_MAPS_SERVER_KEY?.trim();
  if (!key) {
    throw new Error(
      "GOOGLE_MAPS_SERVER_KEY is not set. Server Places calls require a dedicated key (no HTTP referrer restriction).",
    );
  }
  return key;
}

export function hasGoogleMapsServerKey(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_SERVER_KEY?.trim());
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNearbyPage(
  lat: number,
  lng: number,
  radius: number,
  keyword: string,
  key: string,
  pageToken?: string,
): Promise<PlacesNearbyResponse> {
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
  );
  if (pageToken) {
    url.searchParams.set("pagetoken", pageToken);
  } else {
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("keyword", keyword);
  }
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`Places Nearby failed: ${res.status}`);
  }

  return (await res.json()) as PlacesNearbyResponse;
}

async function searchKeywordPages(
  lat: number,
  lng: number,
  radius: number,
  keyword: string,
  key: string,
  byId: Map<string, Shop>,
): Promise<{ status: string; errorMessage?: string }> {
  let pageToken: string | undefined;
  let lastStatus = "ZERO_RESULTS";
  let errorMessage: string | undefined;

  for (let page = 0; page < MAX_NEARBY_PAGES; page++) {
    if (pageToken) {
      await sleep(PAGE_TOKEN_DELAY_MS);
    }

    const data = await fetchNearbyPage(
      lat,
      lng,
      radius,
      keyword,
      key,
      pageToken,
    );
    lastStatus = data.status;
    if (data.error_message) {
      errorMessage = data.error_message;
    }

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      break;
    }

    for (const result of data.results ?? []) {
      const shop = normalizeShop(result);
      if (shop && !byId.has(shop.id)) {
        byId.set(shop.id, shop);
      }
    }

    if (!data.next_page_token) {
      break;
    }
    pageToken = data.next_page_token;
  }

  return { status: lastStatus, errorMessage };
}

export async function searchNearbyOpShops(
  lat: number,
  lng: number,
  radius: number,
): Promise<{ shops: Shop[]; status: string; errorMessage?: string }> {
  const key = getGoogleMapsServerKey();
  const keywords = ["op shop", "charity shop"];
  const byId = new Map<string, Shop>();
  let lastStatus = "ZERO_RESULTS";
  let errorMessage: string | undefined;

  for (const keyword of keywords) {
    const pageResult = await searchKeywordPages(
      lat,
      lng,
      radius,
      keyword,
      key,
      byId,
    );
    lastStatus = pageResult.status;
    if (pageResult.errorMessage) {
      errorMessage = pageResult.errorMessage;
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
  const key = getGoogleMapsServerKey();
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
  const key = getGoogleMapsServerKey();
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
