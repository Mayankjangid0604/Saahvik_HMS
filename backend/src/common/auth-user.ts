import type { StaffRole } from "@prisma/client";

/** Attached to req.user by JwtAuthGuard from verified JWT claims ONLY. */
export interface AuthUser {
  userId: string;
  orgId: string;
  role: "owner" | "staff";
  /** Present when role === "staff". */
  staffRole?: StaffRole;
  name: string;
}

export interface JwtPayload {
  sub: string;
  orgId: string;
  role: "owner" | "staff";
  staffRole?: StaffRole;
  name: string;
  /** Owner only — compared against Owner.tokenVersion so password changes revoke old tokens. */
  tv?: number;
}
