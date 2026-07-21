"use client";

import { useEffect, useRef } from "react";
import { adsenseClientId } from "@/lib/monetisation";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

type AdSlotProps = {
  /** AdSense ad unit slot id */
  slot: string | undefined;
  className?: string;
  /** Accessible label for the region */
  label?: string;
};

/**
 * Discreet display unit. Renders nothing when client/slot env vars are unset
 * so local/dev stays clean until AdSense is configured.
 */
export function AdSlot({
  slot,
  className = "",
  label = "Advertisement",
}: AdSlotProps) {
  const client = adsenseClientId();
  const pushed = useRef(false);

  useEffect(() => {
    if (!client || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch (error) {
      console.error("AdSense push failed", error);
    }
  }, [client, slot]);

  if (!client || !slot) return null;

  return (
    <aside
      className={`overflow-hidden bg-background/80 ${className}`}
      aria-label={label}
    >
      <p className="px-3 pt-2 text-[10px] uppercase tracking-wide text-muted/70">
        Ad
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
