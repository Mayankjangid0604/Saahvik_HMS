/**
 * Fine-grained staff capabilities layered on top of the staff role. Owners
 * implicitly hold every permission; staff hold only what is in their
 * `permissions` array. Adding a new capability is a one-line change here plus a
 * human-readable label on the frontend (STAFF_PERMISSION_LABELS).
 */
export const STAFF_PERMISSIONS = ["manageExpenses"] as const;

export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

/** Drop anything not in STAFF_PERMISSIONS so unknown strings never persist. */
export function sanitizePermissions(input: readonly string[] | undefined): StaffPermission[] {
  if (!input) return [];
  return STAFF_PERMISSIONS.filter((p) => input.includes(p));
}
