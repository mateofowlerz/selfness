import type { Condition } from "../../shared/types";

// Per-platform taxonomy mapping. Each marketplace has its own condition codes
// and category trees; resolving the canonical vocabulary onto them is the bulk
// of the real integration work. These tables are intentionally explicit so they
// are easy to extend as we map more of each platform's taxonomy.

// eBay ConditionEnum values (Inventory API `condition` field).
// https://developer.ebay.com/api-docs/sell/inventory/types/slr:ConditionEnum
export const EBAY_CONDITION: Record<Condition, string> = {
  new_with_tags: "NEW_WITH_TAGS",
  new_without_tags: "NEW_WITHOUT_TAGS",
  very_good: "USED_EXCELLENT",
  good: "USED_VERY_GOOD",
  satisfactory: "USED_GOOD",
};

// Depop condition slugs (Selling API). Confirm exact codes against the partner
// taxonomy endpoint once API access is granted.
export const DEPOP_CONDITION: Record<Condition, string> = {
  new_with_tags: "brand_new",
  new_without_tags: "new_other",
  very_good: "used_excellent",
  good: "used_good",
  satisfactory: "used_fair",
};

// Vinted numeric status ids used by the item-upload payload.
export const VINTED_STATUS_ID: Record<Condition, number> = {
  new_with_tags: 6,
  new_without_tags: 1,
  very_good: 2,
  good: 3,
  satisfactory: 4,
};

// Vinted package size ids.
export const VINTED_PACKAGE_SIZE_ID: Record<"small" | "medium" | "large", number> = {
  small: 1,
  medium: 2,
  large: 3,
};

// Placeholder category resolution. A production build resolves free-form
// category text against each platform's category-suggestion endpoint and
// caches the result. Until then we expose a single seam to override per call.
export function resolveCategoryId(_platform: string, _categoryText: string | undefined): string | undefined {
  return undefined;
}
