"use client";

import { useCallback } from "react";
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
      onCameraChanged={handleCameraChanged}
      onIdle={handleIdle}
    >
      {shops.map((shop) => (
        <Marker
          key={shop.id}
          position={{ lat: shop.lat, lng: shop.lng }}
          title={shop.name}
          onClick={() => onSelect(shop)}
          opacity={selectedId === shop.id ? 1 : 0.85}
        />
      ))}
    </Map>
  );
}
