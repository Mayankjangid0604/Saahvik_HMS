import { ForbiddenException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuthUser } from "./auth-user";

/**
 * The set of resident ids a portal subject may act on, resolved SERVER-SIDE
 * from the authenticated subject — never from client input:
 *  - resident: exactly their own id.
 *  - guardian: the residents linked via GuardianResident, scoped to their org.
 * Staff-side roles must never reach these helpers (they are for portal routes
 * only); if they do, an empty set is returned so nothing is authorized.
 */
export async function resolvePortalResidentIds(
  prisma: PrismaService,
  user: AuthUser,
): Promise<string[]> {
  if (user.role === "resident") return [user.userId];
  if (user.role === "guardian") {
    const links = await prisma.guardianResident.findMany({
      where: { guardianId: user.userId, orgId: user.orgId },
      select: { residentId: true },
    });
    return links.map((l) => l.residentId);
  }
  return [];
}

/**
 * Assert the portal subject may act on `residentId`, and return it. Throws 403
 * otherwise. This is the single chokepoint that turns a client-supplied
 * residentId into an authorized one — no portal endpoint should trust a
 * residentId without passing it through here.
 */
export async function assertResidentAccess(
  prisma: PrismaService,
  user: AuthUser,
  residentId: string,
): Promise<string> {
  const allowed = await resolvePortalResidentIds(prisma, user);
  if (!allowed.includes(residentId)) {
    throw new ForbiddenException("You do not have access to this resident");
  }
  return residentId;
}
