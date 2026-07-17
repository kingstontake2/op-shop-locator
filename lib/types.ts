export type Shop = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  openNow: boolean | null;
  rating: number | null;
  types: string[];
  photoReference: string | null; // photo URL from Places JS library
  phone: string | null;
  hours: string[] | null;
  website: string | null;
};

export type NearbyResponse = {
  shops: Shop[];
  center: { lat: number; lng: number };
  radius: number;
  status: string;
  source?: "cache" | "google";
};

export type GeocodeResponse = {
  lat: number;
  lng: number;
  formattedAddress: string;
};

export type ShopCategory = "all" | "clothing" | "books" | "furniture" | "general";

export const AUCKLAND_CENTER = {
  lat: -36.8485,
  lng: 174.7633,
} as const;

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export const MIN_SEARCH_RADIUS_M = 2_000;
export const DEFAULT_RADIUS_M = 35_000;
export const MAX_SEARCH_RADIUS_M = 50_000;
export const AUCKLAND_DEFAULT_ZOOM = 9;
export const LOCAL_SEARCH_ZOOM = 12;
