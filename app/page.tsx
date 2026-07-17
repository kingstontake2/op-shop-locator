import { LocatorApp } from "@/components/LocatorApp";

export default function Home() {
  const mapsApiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    "";

  return <LocatorApp mapsApiKey={mapsApiKey} />;
}
