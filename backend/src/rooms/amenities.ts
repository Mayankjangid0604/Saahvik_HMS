/**
 * Room amenity tags (feature 2). v1 ships a hardcoded starter set; an
 * org-configurable tag list is out of scope for now. Values are lowercase
 * snake_case, shared verbatim with the wire format (like the enum vocabulary).
 * Adding an amenity is a one-line change here plus a frontend label.
 *
 * Extensible later: when orgs can define their own tags, ROOM_AMENITIES becomes
 * the default seed and `sanitizeAmenities` starts consulting a per-org list.
 */
export const ROOM_AMENITIES = [
  "ac",
  "cooler",
  "attached_bathroom",
  "balcony",
  "geyser",
  "wifi",
  "study_table",
  "wardrobe",
  "fan",
  "window",
  "power_backup",
  "tv",
] as const;

export type RoomAmenity = (typeof ROOM_AMENITIES)[number];

/** Drop anything not in ROOM_AMENITIES so unknown tags never persist. */
export function sanitizeAmenities(input: readonly string[] | undefined): RoomAmenity[] {
  if (!input) return [];
  const set = new Set(input);
  return ROOM_AMENITIES.filter((a) => set.has(a));
}
