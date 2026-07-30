import type { StaffPermission } from "@/api/types";

export interface StaffPermissionMeta {
  key: StaffPermission;
  label: string;
  description: string;
}

/**
 * Human-readable metadata for each staff capability. Mirrors the backend's
 * STAFF_PERMISSIONS — a new permission added server-side shows up in the staff
 * editor as soon as a label is added here (no other frontend change needed).
 */
export const STAFF_PERMISSIONS: StaffPermissionMeta[] = [
  {
    key: "manageExpenses",
    label: "Manage expenses",
    description: "Record expenses and add, rename, or deactivate expense categories.",
  },
];

/** True when the user (owner or staff) holds the given capability. */
export function hasPermission(
  user: { role: string; permissions?: StaffPermission[] } | null | undefined,
  permission: StaffPermission,
): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  return user.permissions?.includes(permission) ?? false;
}
