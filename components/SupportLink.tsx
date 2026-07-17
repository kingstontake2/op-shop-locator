"use client";

import { supportUrl } from "@/lib/monetisation";

type SupportLinkProps = {
  className?: string;
  /** Shorter label for tight header space */
  compact?: boolean;
};

/** Tip / donate link — framed as covering hosting and map API costs. */
export function SupportLink({ className = "", compact = false }: SupportLinkProps) {
  const url = supportUrl();
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ||
        "rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs text-teal-900 hover:bg-teal-100 sm:text-sm"
      }
    >
      {compact ? "Help keep free" : "Help cover map costs"}
    </a>
  );
}
