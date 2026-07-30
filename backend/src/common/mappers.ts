import type { Organization, Owner, Staff } from "@prisma/client";
import { STAFF_PERMISSIONS } from "../staff/permissions";

/** Frontend `User` shape (frontend/src/api/types.ts). */
export function toUserDto(owner: Owner) {
  return {
    id: owner.id,
    orgId: owner.orgId,
    name: owner.name,
    email: owner.email,
    phone: owner.phone ?? "",
    role: "owner" as const,
    twoFactorEnabled: owner.twoFactorEnabled,
    // Owners implicitly hold every capability — the frontend gates staff-only
    // features on this array and always shows them to owners.
    permissions: [...STAFF_PERMISSIONS] as string[],
    createdAt: owner.createdAt.toISOString(),
  };
}

export function staffToUserDto(staff: Staff) {
  return {
    id: staff.id,
    orgId: staff.orgId,
    name: staff.name,
    email: staff.email,
    phone: staff.phone ?? "",
    role: "staff" as const,
    twoFactorEnabled: false,
    permissions: staff.permissions,
    createdAt: staff.createdAt.toISOString(),
  };
}

/** Frontend `Org` shape. `setupComplete` maps to Organization.onboardingCompleted. */
export function toOrgDto(org: Organization) {
  return {
    id: org.id,
    name: org.name,
    hostelName: org.hostelName ?? "",
    addressLine: org.addressLine ?? "",
    city: org.city ?? "",
    state: org.state ?? "",
    pincode: org.pincode ?? "",
    phone: org.phone ?? "",
    email: org.email ?? "",
    gstin: org.gstin ?? undefined,
    plan: org.plan,
    setupComplete: org.onboardingCompleted,
  };
}
