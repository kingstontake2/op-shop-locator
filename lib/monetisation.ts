/**
 * Public monetisation config (safe for client components).
 * Leave unset to hide ads / tip link until you have accounts ready.
 */

export function adsenseClientId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return id || undefined;
}

export function adsenseListSlot(): string | undefined {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_LIST?.trim();
  return slot || undefined;
}

export function adsenseDetailSlot(): string | undefined {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_DETAIL?.trim();
  return slot || undefined;
}

/** Ko-fi, Buy Me a Coffee, Stripe Payment Link, etc. */
export function supportUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPPORT_URL?.trim();
  return url || undefined;
}
