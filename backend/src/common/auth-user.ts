import type { StaffRole } from "@prisma/client";

/**
 * Role taxonomy. Two trust surfaces that must NEVER cross (BG-2):
 *  - STAFF-SIDE ("owner", "staff"): the management app.
 *  - PORTAL-SIDE ("guardian", "resident"): self-service, scoped to a single
 *    resident's own data.
 * The split is enforced explicitly in RolesGuard (default-deny for portal roles
 * on un-annotated routes) and JwtAuthGuard (per-role tokenVersion checks).
 */
export type StaffSideRole = "owner" | "staff";
export type PortalRole = "guardian" | "resident";
export type Role = StaffSideRole | PortalRole;

export const STAFF_SIDE_ROLES: readonly Role[] = ["owner", "staff"];
export const PORTAL_ROLES: readonly Role[] = ["guardian", "resident"];

/** Attached to req.user by JwtAuthGuard from verified JWT claims ONLY. */
export interface AuthUser {
  /** Subject id: Owner/Staff id for staff-side, Guardian/Resident id for portal. */
  userId: string;
  orgId: string;
  role: Role;
  /** Present when role === "staff". */
  staffRole?: StaffRole;
  name: string;
}

export interface JwtPayload {
  sub: string;
  orgId: string;
  role: Role;
  staffRole?: StaffRole;
  name: string;
  /**
   * Token version — compared against the subject's tokenVersion so password
   * changes/logout revoke old tokens. Set for owner, guardian, and resident
   * (all have a tokenVersion column). Absent for staff (no revocation column).
   */
  tv?: number;
}
