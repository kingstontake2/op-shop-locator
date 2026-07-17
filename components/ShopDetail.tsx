"use client";

import { useEffect, useState } from "react";
import { photoUrl } from "@/lib/photo";
import type { Shop } from "@/lib/types";

type ShopDetailProps = {
  shop: Shop;
  onClose: () => void;
};

type DetailFields = {
  phone: string | null;
  website: string | null;
  hours: string[] | null;
  photoReference: string | null;
};

export function ShopDetail({ shop, onClose }: ShopDetailProps) {
  const [extras, setExtras] = useState<DetailFields | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (shop.phone && shop.hours) {
      queueMicrotask(() => {
        if (!cancelled) {
          setExtras({
            phone: shop.phone,
            website: shop.website,
            hours: shop.hours,
            photoReference: shop.photoReference,
          });
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const controller = new AbortController();
    queueMicrotask(() => {
      if (!cancelled) {
        setExtras(null);
        setLoading(true);
      }
    });

    void fetch(`/api/place-details?placeId=${encodeURIComponent(shop.id)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as DetailFields;
      })
      .then((result) => {
        if (cancelled) return;
        setExtras(
          result ?? {
            phone: shop.phone,
            website: shop.website,
            hours: shop.hours,
            photoReference: shop.photoReference,
          },
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Failed to load shop details", error);
        }
        setExtras({
          phone: shop.phone,
          website: shop.website,
          hours: shop.hours,
          photoReference: shop.photoReference,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [shop]);

  const phone = extras?.phone ?? shop.phone;
  const website = extras?.website ?? shop.website;
  const hours = extras?.hours ?? shop.hours;
  const photoReference = extras?.photoReference ?? shop.photoReference;

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

      {photoReference && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={
            photoReference.startsWith("http")
              ? photoReference
              : photoUrl(photoReference)
          }
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
        {phone && (
          <p>
            <a className="text-teal-800 underline" href={`tel:${phone}`}>
              {phone}
            </a>
          </p>
        )}
        {website && (
          <p>
            <a
              className="text-teal-800 underline"
              href={website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Website
            </a>
          </p>
        )}
        {hours && hours.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-stone-900">Hours</p>
            <ul className="space-y-0.5 text-stone-600">
              {hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {loading && <p className="text-stone-500">Loading shop details…</p>}
        {!loading && !hours && !phone && (
          <p className="text-stone-500">
            Limited details available for this shop.
          </p>
        )}
      </div>
    </div>
  );
}
