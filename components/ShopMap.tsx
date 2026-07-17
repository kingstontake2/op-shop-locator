"use client";

import { Map, Marker } from "@vis.gl/react-google-maps";
import type { Shop } from "@/lib/types";

type ShopMapProps = {
  shops: Shop[];
  center: { lat: number; lng: number };
  selectedId: string | null;
  onSelect: (shop: Shop) => void;
};

export function ShopMap({ shops, center, selectedId, onSelect }: ShopMapProps) {
  return (
    <Map
      key={`${center.lat},${center.lng}`}
      className="h-full w-full"
      defaultCenter={center}
      defaultZoom={14}
      gestureHandling="greedy"
      disableDefaultUI={false}
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
