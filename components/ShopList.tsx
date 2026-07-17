"use client";

import { AdSlot } from "@/components/AdSlot";
import { adsenseListSlot } from "@/lib/monetisation";
import type { Shop } from "@/lib/types";

type ShopListProps = {
  shops: Shop[];
  selectedId: string | null;
  onSelect: (shop: Shop) => void;
};

export function ShopList({ shops, selectedId, onSelect }: ShopListProps) {
  if (shops.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-stone-600">
          No op shops found near this location. Try another suburb or widen your
          search.
        </div>
        <AdSlot
          slot={adsenseListSlot()}
          className="shrink-0 border-t border-stone-200"
          label="Sponsored"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-stone-200">
        {shops.map((shop) => (
          <li key={shop.id}>
            <button
              type="button"
              onClick={() => onSelect(shop)}
              className={`w-full px-4 py-3 text-left transition-colors hover:bg-teal-50 ${
                selectedId === shop.id ? "bg-teal-50" : "bg-white"
              }`}
            >
              <div className="font-medium text-stone-900">{shop.name}</div>
              <div className="mt-0.5 text-sm text-stone-600">{shop.address}</div>
              <div className="mt-1 flex gap-3 text-xs text-stone-500">
                {shop.openNow != null && (
                  <span
                    className={shop.openNow ? "text-teal-700" : "text-stone-500"}
                  >
                    {shop.openNow ? "Open now" : "Closed"}
                  </span>
                )}
                {shop.rating != null && <span>{shop.rating.toFixed(1)}★</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <AdSlot
        slot={adsenseListSlot()}
        className="shrink-0 border-t border-stone-200"
        label="Sponsored"
      />
    </div>
  );
}
