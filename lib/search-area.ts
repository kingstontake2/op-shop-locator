import {
  MAX_SEARCH_RADIUS_M,
  MIN_SEARCH_RADIUS_M,
  type MapBounds,
} from "./types";

const EARTH_RADIUS_M = 6_371_000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const latDelta = toRadians(to.lat - from.lat);
  const lngDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export function searchRadiusForBounds(
  center: { lat: number; lng: number },
  bounds: MapBounds,
): { radius: number; tooWide: boolean } {
  const corners = [
    { lat: bounds.north, lng: bounds.east },
    { lat: bounds.north, lng: bounds.west },
    { lat: bounds.south, lng: bounds.east },
    { lat: bounds.south, lng: bounds.west },
  ];
  const requested = Math.max(
    ...corners.map((corner) => distanceMeters(center, corner)),
  );

  return {
    radius: Math.round(
      Math.min(
        MAX_SEARCH_RADIUS_M,
        Math.max(MIN_SEARCH_RADIUS_M, requested),
      ),
    ),
    tooWide: requested > MAX_SEARCH_RADIUS_M,
  };
}
