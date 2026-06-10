// Canonical listing schema shared between main and renderer processes.
// Per-platform adapters map this canonical shape onto each marketplace's API.

export type Platform = "ebay" | "depop" | "vinted";

export const PLATFORMS: Platform[] = ["ebay", "depop", "vinted"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  ebay: "eBay",
  depop: "Depop",
  vinted: "Vinted",
};

// Photo limits per platform, used to validate before publishing.
export const PLATFORM_PHOTO_LIMITS: Record<Platform, number> = {
  ebay: 24,
  depop: 8,
  vinted: 20,
};

// A normalized condition vocabulary. Each adapter maps these to its own codes.
export type Condition = "new_with_tags" | "new_without_tags" | "very_good" | "good" | "satisfactory";

export const CONDITIONS: { value: Condition; label: string }[] = [
  { value: "new_with_tags", label: "New with tags" },
  { value: "new_without_tags", label: "New without tags" },
  { value: "very_good", label: "Very good" },
  { value: "good", label: "Good" },
  { value: "satisfactory", label: "Satisfactory / used" },
];

export interface ListingPhoto {
  // Local absolute file path on the user's machine.
  path: string;
  // Original filename, for display.
  name: string;
  // Optional data URL for preview in the renderer.
  previewDataUrl?: string;
}

export interface Listing {
  title: string;
  description: string;
  // Price in the smallest sensible major unit (e.g. 24.99). Currency is per-account.
  price: number;
  currency: string;
  condition: Condition;
  brand?: string;
  size?: string;
  color?: string;
  // Free-form category text; adapters resolve to platform category IDs.
  category?: string;
  // Style/hashtags used by Depop and Vinted.
  tags: string[];
  photos: ListingPhoto[];
  // Optional shipping/package descriptor; meaning is platform-specific.
  packageSize?: "small" | "medium" | "large";
}

export interface ConnectionStatus {
  platform: Platform;
  connected: boolean;
  // A human-readable identity, e.g. the connected username, when known.
  account?: string;
  // Reason for a disconnected/expired state.
  detail?: string;
}

export interface PublishResult {
  platform: Platform;
  ok: boolean;
  // Public listing URL or platform listing id on success.
  listingUrl?: string;
  listingId?: string;
  error?: string;
}

// Validation helper shared by renderer and main.
export function validateListing(listing: Listing, platforms: Platform[]): string[] {
  const errors: string[] = [];
  if (!listing.title.trim()) errors.push("Title is required.");
  if (!(listing.price > 0)) errors.push("Price must be greater than zero.");
  if (listing.photos.length === 0) errors.push("At least one photo is required.");
  for (const p of platforms) {
    const limit = PLATFORM_PHOTO_LIMITS[p];
    if (listing.photos.length > limit) {
      errors.push(`${PLATFORM_LABELS[p]} allows at most ${limit} photos.`);
    }
  }
  return errors;
}
