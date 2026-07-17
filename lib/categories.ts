import type { Shop, ShopCategory } from "./types";

const CATEGORY_KEYWORDS: Record<Exclude<ShopCategory, "all">, string[]> = {
  clothing: ["clothing", "clothes", "apparel", "fashion", "wear", "op shop"],
  books: ["book", "library", "reading"],
  furniture: ["furniture", "homeware", "homewares", "household"],
  general: [],
};

export function categorizeShop(shop: Shop): ShopCategory {
  const haystack = `${shop.name} ${shop.types.join(" ")} ${shop.address}`.toLowerCase();

  if (CATEGORY_KEYWORDS.books.some((k) => haystack.includes(k))) {
    return "books";
  }
  if (CATEGORY_KEYWORDS.furniture.some((k) => haystack.includes(k))) {
    return "furniture";
  }
  if (CATEGORY_KEYWORDS.clothing.some((k) => haystack.includes(k))) {
    return "clothing";
  }
  return "general";
}

export function filterShopsByCategory(
  shops: Shop[],
  category: ShopCategory,
): Shop[] {
  if (category === "all") return shops;
  return shops.filter((shop) => categorizeShop(shop) === category);
}
