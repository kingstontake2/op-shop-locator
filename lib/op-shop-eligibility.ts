import type { Shop } from "./types";

/** Name phrases that strongly indicate a retail op/charity shop. */
const STRONG_KEEP_NAME_PATTERNS: RegExp[] = [
  /\bop\s*shop\b/i,
  /\bopportunity\s*shop\b/i,
  /\bcharity\s*shop\b/i,
  /\bthrift\b/i,
  /\bsecond[\s-]?hand\b/i,
  /\bpre[\s-]?loved\b/i,
  /\brestore\b/i,
];

/** Known NZ/AU charity retail brands (name substring match, case-insensitive). */
const STRONG_KEEP_BRANDS: string[] = [
  "salvation army",
  "salvos",
  "st vincent",
  "st. vincent",
  "vinnies",
  "hospice",
  "spca",
  "red cross",
  "habitat for humanity",
  "dress for success",
  "tearfund",
  "oxfam",
  "save the children",
  "barnardos",
  "salvation",
];

/** Name phrases that indicate non-retail / wrong place types. */
const STRONG_REJECT_NAME_PATTERNS: RegExp[] = [
  /\bhead\s*office\b/i,
  /\bheadquarters\b/i,
  /\badmin(?:istration)?\b/i,
  /\boffice\b/i,
  /\bdonation\s*bin\b/i,
  /\bdonation\s*cent(?:re|er)\b/i,
  /\bdrop[\s-]?off\b/i,
  /\bcollection\s*point\b/i,
  /\blibrary\b/i,
  /\bchurch\b/i,
  /\bmosque\b/i,
  /\btemple\b/i,
  /\bschool\b/i,
  /\bhospital\b/i,
  /\brecycling\b/i,
  /\btransfer\s*station\b/i,
  /\blandfill\b/i,
  /\btip\s*shop\b/i,
];

/** Google Places types that are clearly not op shops. */
const REJECT_TYPES = new Set([
  "place_of_worship",
  "library",
  "school",
  "hospital",
  "local_government_office",
  "travel_agency",
  "real_estate_agency",
  "bank",
  "atm",
  "parking",
  "gas_station",
]);

function hasStrongKeepName(name: string): boolean {
  const lower = name.toLowerCase();
  if (STRONG_KEEP_NAME_PATTERNS.some((re) => re.test(name))) {
    return true;
  }
  return STRONG_KEEP_BRANDS.some((brand) => lower.includes(brand));
}

function hasStrongRejectName(name: string): boolean {
  return STRONG_REJECT_NAME_PATTERNS.some((re) => re.test(name));
}

function hasRejectType(types: string[]): boolean {
  return types.some((t) => REJECT_TYPES.has(t));
}

/**
 * Balanced eligibility: keep Google Nearby results unless they look
 * clearly non-retail. Strong keep signals override strong rejects.
 */
export function isLikelyOpShop(shop: Pick<Shop, "name" | "types">): boolean {
  if (hasStrongKeepName(shop.name)) {
    return true;
  }
  if (hasStrongRejectName(shop.name)) {
    return false;
  }
  if (hasRejectType(shop.types)) {
    return false;
  }
  return true;
}
