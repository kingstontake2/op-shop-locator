"use client";

import { useEffect, useState } from "react";
import { AdSlot } from "@/components/AdSlot";
import { adsenseDetailSlot } from "@/lib/monetisation";
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
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}&destination_place_id=${encodeURIComponent(shop.id)}`;

  return (
    <div className="animate-sheet-in absolute inset-x-0 bottom-0 z-40 max-h-[55%] overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-lg sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-h-[70%] sm:w-96 sm:rounded-2xl">
      {photoReference ? (
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
      ) : (
        <div className="flex h-28 items-end bg-gradient-to-br from-brand/25 via-background to-open/15 px-4 pb-3">
          <span className="font-display text-sm text-brand-ink/70">Op shop</span>
        </div>
      )}

      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/70 bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h2 className="font-display text-lg leading-snug text-brand-ink">
            {shop.name}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{shop.address}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="focus-ring -mr-1 -mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground"
          aria-label="Close details"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 px-4 py-3 text-sm text-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {shop.openNow != null && (
            <span
              className={
                shop.openNow
                  ? "font-medium text-open"
                  : "font-medium text-muted"
              }
            >
              {shop.openNow ? "Open now" : "Closed now"}
            </span>
          )}
          {shop.rating != null && (
            <span className="text-muted">{shop.rating.toFixed(1)}★</span>
          )}
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-ink"
        >
          Get directions
        </a>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {phone && (
            <a
              className="focus-ring text-brand-ink underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
              href={`tel:${phone}`}
            >
              {phone}
            </a>
          )}
          {website && (
            <a
              className="focus-ring text-brand-ink underline decoration-brand/30 underline-offset-2 hover:decoration-brand"
              href={website}
              target="_blank"
              rel="noopener noreferrer"
            >
              Website
            </a>
          )}
        </div>

        {hours && hours.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-foreground">Hours</p>
            <ul className="space-y-0.5 text-muted">
              {hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {loading && <p className="text-muted">Loading shop details…</p>}
        {!loading && !hours && !phone && (
          <p className="text-muted">Limited details available for this shop.</p>
        )}
      </div>

      <AdSlot
        slot={adsenseDetailSlot()}
        className="border-t border-border"
        label="Sponsored"
      />
    </div>
  );
}
