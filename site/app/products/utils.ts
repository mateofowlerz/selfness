import fs from "node:fs";
import path from "node:path";

interface WishlistItem {
  id: string;
  title: string;
  url: string;
  image: string;
  brand?: string;
  category?: string;
  price?: string;
  note?: string;
  badge?: string;
  addedAt?: string;
}

export function getWishlist(): WishlistItem[] {
  const wishlistPath = path.join(process.cwd(), "..", "wishlist.json");
  try {
    const data = fs.readFileSync(wishlistPath, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function getWishlistItem(id: string): WishlistItem {
  const wishlist = getWishlist();
  const item = wishlist.find((item) => item.id === id);
  if (!item) {
    throw new Error("Wishlist item not found");
  }

  return item;
}
