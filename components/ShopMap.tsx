"use client";

import { useCallback, useMemo } from "react";
import {
  Map,
  Marker,
  type MapCameraChangedEvent,
  type MapEvent,
} from "@vis.gl/react-google-maps";
import {
  AUCKLAND_DEFAULT_ZOOM,
  type MapBounds,
  type Shop,
} from "@/lib/types";

export type MapViewport = {
  center: { lat: number; lng: number };
  bounds: MapBounds;
  zoom: number;
};

type ShopMapProps = {
  shops: Shop[];
  /** Camera center used on mount and whenever `cameraKey` changes. */
  center: { lat: number; lng: number };
  /** Camera zoom used on mount and whenever `cameraKey` changes. */
  zoom?: number;
  /**
   * Change this value to force a camera reset to `center`/`zoom`
   * (suburb search, geolocation). Omit or keep stable while panning so the
   * user's camera is preserved.
   */
  cameraKey?: string | number;
  selectedId: string | null;
  onSelect: (shop: Shop) => void;
  /** Fired when the map settles or the camera moves; does not trigger search. */
  onViewportChange?: (viewport: MapViewport) => void;
};

/** Muted linen-friendly map palette so teal pins and glass chrome read clearly. */
const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#ebe6dc" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5c564c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f3f0e8" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d4cdc0" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#e3ddd2" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#d5dbc8" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#f7f4ee" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d9d2c5" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#e8dfcf" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#cfc5b4" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c5d5d3" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b8582" }],
  },
];

function pinIcon(selected: boolean): google.maps.Icon {
  const fill = selected ? "#134e4a" : "#0f766e";
  const size = selected ? 40 : 32;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
      <path d="M16 2.5C10.2 2.5 5.5 7.2 5.5 13c0 7.4 8.2 15.1 9.9 16.6a.9.9 0 0 0 1.2 0C18.3 28.1 26.5 20.4 26.5 13 26.5 7.2 21.8 2.5 16 2.5Z" fill="${fill}"/>
      <circle cx="16" cy="13" r="5.25" fill="#f3f0e8"/>
      <circle cx="16" cy="13" r="2.4" fill="${selected ? "#0f766e" : "#134e4a"}"/>
    </svg>
  `.trim();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: { width: size, height: size } as google.maps.Size,
    anchor: { x: size / 2, y: size } as google.maps.Point,
  };
}

function viewportFromCameraDetail(
  detail: MapCameraChangedEvent["detail"],
): MapViewport {
  return {
    center: { lat: detail.center.lat, lng: detail.center.lng },
    bounds: {
      north: detail.bounds.north,
      south: detail.bounds.south,
      east: detail.bounds.east,
      west: detail.bounds.west,
    },
    zoom: detail.zoom,
  };
}

function viewportFromMap(map: google.maps.Map): MapViewport | null {
  const mapCenter = map.getCenter();
  const mapBounds = map.getBounds();
  const mapZoom = map.getZoom();
  if (!mapCenter || !mapBounds || mapZoom == null) return null;

  const ne = mapBounds.getNorthEast();
  const sw = mapBounds.getSouthWest();

  return {
    center: { lat: mapCenter.lat(), lng: mapCenter.lng() },
    bounds: {
      north: ne.lat(),
      south: sw.lat(),
      east: ne.lng(),
      west: sw.lng(),
    },
    zoom: mapZoom,
  };
}

export function ShopMap({
  shops,
  center,
  zoom = AUCKLAND_DEFAULT_ZOOM,
  cameraKey = "default",
  selectedId,
  onSelect,
  onViewportChange,
}: ShopMapProps) {
  const defaultIcon = useMemo(() => pinIcon(false), []);
  const selectedIcon = useMemo(() => pinIcon(true), []);

  const reportViewport = useCallback(
    (viewport: MapViewport | null) => {
      if (!viewport || !onViewportChange) return;
      onViewportChange(viewport);
    },
    [onViewportChange],
  );

  const handleCameraChanged = useCallback(
    (event: MapCameraChangedEvent) => {
      reportViewport(viewportFromCameraDetail(event.detail));
    },
    [reportViewport],
  );

  const handleIdle = useCallback(
    (event: MapEvent) => {
      reportViewport(viewportFromMap(event.map));
    },
    [reportViewport],
  );

  return (
    <Map
      key={cameraKey}
      className="h-full w-full"
      defaultCenter={center}
      defaultZoom={zoom}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      styles={MAP_STYLES}
      onCameraChanged={handleCameraChanged}
      onIdle={handleIdle}
    >
      {shops.map((shop) => {
        const selected = selectedId === shop.id;
        return (
          <Marker
            key={shop.id}
            position={{ lat: shop.lat, lng: shop.lng }}
            title={shop.name}
            onClick={() => onSelect(shop)}
            icon={selected ? selectedIcon : defaultIcon}
            zIndex={selected ? 1000 : undefined}
          />
        );
      })}
    </Map>
  );
}
