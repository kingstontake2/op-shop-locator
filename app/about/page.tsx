import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { supportUrl } from "@/lib/monetisation";

export const metadata: Metadata = {
  title: "About · Op Shop Locator",
  description:
    "Find op shops and charity shops near you across New Zealand — free to use, kept online by light ads and optional tips.",
};

export default function AboutPage() {
  const tip = supportUrl();

  return (
    <ContentPage title="About">
      <p>
        Op Shop Locator helps you find op shops and charity shops near you
        across New Zealand. Search by suburb, use your location, or pan the map
        and search the area you are looking at.
      </p>
      <p>
        The app is free to use. Map and place lookups are provided by Google
        Maps Platform, which has real usage costs. Caching and monthly
        free-tier guardrails keep those costs under control; light advertising
        and optional tips help cover residual hosting and API spend so more
        people can use the tool without it becoming a bill for the maintainer.
      </p>
      <p>
        Revenue from ads or tips is intended to offset hosting and map API
        costs — not to turn a profit.
      </p>
      {tip ? (
        <p>
          If you find it useful, you can{" "}
          <a
            href={tip}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-800 underline"
          >
            help cover map costs
          </a>
          .
        </p>
      ) : null}
      <p>
        See also the{" "}
        <Link href="/privacy" className="text-teal-800 underline">
          privacy notice
        </Link>
        .
      </p>
    </ContentPage>
  );
}
