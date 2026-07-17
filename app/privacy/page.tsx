import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { adsenseClientId, supportUrl } from "@/lib/monetisation";

export const metadata: Metadata = {
  title: "Privacy · Op Shop Locator",
  description:
    "How Op Shop Locator handles location, map data, ads, and support links.",
};

export default function PrivacyPage() {
  const adsEnabled = Boolean(adsenseClientId());
  const tip = supportUrl();

  return (
    <ContentPage title="Privacy">
      <p>
        Op Shop Locator is a small New Zealand utility for finding nearby op
        shops. This notice explains what data is involved when you use the
        site.
      </p>

      <h2 className="pt-2 text-lg font-semibold text-stone-900">Location</h2>
      <p>
        If you tap <strong>Use my location</strong>, your browser may share
        your approximate coordinates with this app so we can search nearby.
        Location is used for that search request and is not stored as a
        long-term user profile. Suburb searches send the text you type to our
        server so we can look up a place.
      </p>

      <h2 className="pt-2 text-lg font-semibold text-stone-900">
        Maps and places
      </h2>
      <p>
        Map display and place results use Google Maps Platform. Google may
        process request data under its own{" "}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-800 underline"
        >
          privacy policy
        </a>
        . We cache some search and place results on our side (via Redis) to
        reduce repeated Google calls and cost.
      </p>

      <h2 className="pt-2 text-lg font-semibold text-stone-900">
        Rate limits and usage
      </h2>
      <p>
        To stay within free-tier limits, the server may apply per-network daily
        limits and monthly circuit breakers. That uses a coarse network
        identifier (typically an IP address) only for those limits and
        aggregate usage counters — not for advertising profiles.
      </p>

      {adsEnabled ? (
        <>
          <h2 className="pt-2 text-lg font-semibold text-stone-900">
            Advertising
          </h2>
          <p>
            When configured, this site shows Google AdSense ads in the shop
            list and shop detail panels (not on the map itself). Google and its
            partners may use cookies or similar technologies to serve and
            measure ads. See{" "}
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-800 underline"
            >
              how Google uses data for ads
            </a>
            .
          </p>
        </>
      ) : null}

      {tip ? (
        <>
          <h2 className="pt-2 text-lg font-semibold text-stone-900">
            Optional tips
          </h2>
          <p>
            The “Help cover map costs” link goes to a third-party tip or
            payment page. That provider handles payment details under their
            own terms; we do not receive your card number.
          </p>
        </>
      ) : null}

      <h2 className="pt-2 text-lg font-semibold text-stone-900">Contact</h2>
      <p>
        For privacy questions about this app, use the contact method listed on
        the tip or repository page for the maintainer, or open an issue on the
        project repository if one is linked from the deployment.
      </p>
    </ContentPage>
  );
}
