import type { AuthUser } from "./auth-user";
import type { PrismaService } from "../prisma/prisma.service";
import type { StaffPermission } from "../staff/permissions";

/**
 * True when the caller holds a staff permission. Owners implicitly hold every
 * permission; staff hold only what's in their `permissions` array (looked up
 * from the DB, since the JWT does not carry permissions). Single source of the
 * check — reused by ExpensesService gating and the dashboard financial gate.
 */
export async function userHasPermission(
  prisma: PrismaService,
  user: AuthUser,
  permission: StaffPermission,
): Promise<boolean> {
  if (user.role === "owner") return true;
  const staff = await prisma.staff.findFirst({
    where: { id: user.userId, orgId: user.orgId },
    select: { permissions: true },
  });
  return !!staff && staff.permissions.includes(permission);
}
