"use client";

import type { Shop } from "@/lib/types";

type ShopDetailProps = {
  shop: Shop;
  onClose: () => void;
};

export function ShopDetail({ shop, onClose }: ShopDetailProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 max-h-[55%] overflow-y-auto rounded-t-2xl border-t border-stone-200 bg-white shadow-lg sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-h-[70%] sm:w-96 sm:rounded-2xl sm:border">
      <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-stone-100 bg-white px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{shop.name}</h2>
          <p className="mt-0.5 text-sm text-stone-600">{shop.address}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-800"
          aria-label="Close details"
        >
          Close
        </button>
      </div>

      {shop.photoReference && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shop.photoReference}
          alt={shop.name}
          className="h-40 w-full object-cover"
        />
      )}

      <div className="space-y-3 px-4 py-3 text-sm text-stone-700">
        {shop.openNow != null && (
          <p className={shop.openNow ? "text-teal-700" : "text-stone-500"}>
            {shop.openNow ? "Open now" : "Closed now"}
          </p>
        )}
        {shop.rating != null && <p>Rating: {shop.rating.toFixed(1)}★</p>}
        {shop.phone && (
          <p>
            <a className="text-teal-800 underline" href={`tel:${shop.phone}`}>
              {shop.phone}
            </a>
          </p>
        )}
        {shop.website && (
          <p>
            <a
              className="text-teal-800 underline"
              href={shop.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Website
            </a>
          </p>
        )}
        {shop.hours && shop.hours.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-stone-900">Hours</p>
            <ul className="space-y-0.5 text-stone-600">
              {shop.hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {!shop.hours && !shop.phone && (
          <p className="text-stone-500">
            Limited details available for this shop.
          </p>
        )}
      </div>
    </div>
  );
}
