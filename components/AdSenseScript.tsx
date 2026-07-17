import Script from "next/script";
import { adsenseClientId } from "@/lib/monetisation";

/** Loads the AdSense library once when a publisher client id is configured. */
export function AdSenseScript() {
  const client = adsenseClientId();
  if (!client) return null;

  return (
    <Script
      id="adsense"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
