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
      <div className="flex h-full flex-col bg-background">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 pt-44 text-center sm:pt-40">
          <p className="font-display text-lg text-brand-ink">No op shops here</p>
          <p className="max-w-xs text-sm text-muted">
            Try another suburb, widen the map, or switch category filters.
          </p>
        </div>
        <AdSlot
          slot={adsenseListSlot()}
          className="shrink-0 border-t border-border"
          label="Sponsored"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <ul className="min-h-0 flex-1 overflow-y-auto pt-[11.5rem] sm:pt-44">
        {shops.map((shop) => {
          const selected = selectedId === shop.id;
          return (
            <li key={shop.id}>
              <button
                type="button"
                onClick={() => onSelect(shop)}
                className={`focus-ring relative w-full border-b border-border/70 px-4 py-3.5 text-left transition-colors hover:bg-surface ${
                  selected ? "bg-surface" : "bg-transparent"
                }`}
              >
                {selected && (
                  <span
                    className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand"
                    aria-hidden="true"
                  />
                )}
                <div className="font-medium text-foreground">{shop.name}</div>
                <div className="mt-0.5 text-sm text-muted">{shop.address}</div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  {shop.openNow != null && (
                    <span className={shop.openNow ? "text-open" : "text-muted"}>
                      {shop.openNow ? "Open now" : "Closed"}
                    </span>
                  )}
                  {shop.rating != null && (
                    <span className="text-muted">
                      {shop.rating.toFixed(1)}★
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <AdSlot
        slot={adsenseListSlot()}
        className="shrink-0 border-t border-border"
        label="Sponsored"
      />
    </div>
  );
}
