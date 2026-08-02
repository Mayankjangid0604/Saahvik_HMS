import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthUser, JwtPayload } from "./auth-user";
import { IS_PUBLIC_KEY } from "./decorators";

/**
 * Global JWT guard. Tenant scoping rule (Conflict 2.1 — RESOLVED):
 * orgId comes EXCLUSIVELY from the verified JWT claim below. If the client
 * sends an X-Org-Id header it is IGNORED for all authorization and query
 * filtering — it may be logged, but it never overrides what the JWT says.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(header.slice(7));
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // Per-role revocation via tokenVersion. Password changes / logout bump the
    // subject's tokenVersion; tokens minted before then die here. Also verifies
    // the subject still exists and its orgId matches the token's claim (defense
    // in depth — a signed token whose subject was deleted/moved must not pass).
    // Staff have no tokenVersion column, so they are not version-checked here
    // (unchanged from before BG-2 — do not alter existing staff behavior).
    switch (payload.role) {
      case "owner": {
        const owner = await this.prisma.owner.findUnique({
          where: { id: payload.sub },
          select: { tokenVersion: true, orgId: true },
        });
        if (!owner || owner.orgId !== payload.orgId || owner.tokenVersion !== (payload.tv ?? 0)) {
          throw new UnauthorizedException("Token has been revoked");
        }
        break;
      }
      case "guardian": {
        const guardian = await this.prisma.guardian.findUnique({
          where: { id: payload.sub },
          select: { tokenVersion: true, orgId: true },
        });
        if (!guardian || guardian.orgId !== payload.orgId || guardian.tokenVersion !== (payload.tv ?? 0)) {
          throw new UnauthorizedException("Token has been revoked");
        }
        break;
      }
      case "resident": {
        const resident = await this.prisma.resident.findUnique({
          where: { id: payload.sub },
          select: { tokenVersion: true, orgId: true, passwordHash: true },
        });
        // A resident whose portal access was never enabled / was revoked
        // (passwordHash cleared) cannot authenticate.
        if (
          !resident ||
          resident.orgId !== payload.orgId ||
          resident.passwordHash === null ||
          resident.tokenVersion !== (payload.tv ?? 0)
        ) {
          throw new UnauthorizedException("Token has been revoked");
        }
        break;
      }
      case "staff":
        break;
    }

    req.user = {
      userId: payload.sub,
      orgId: payload.orgId,
      role: payload.role,
      staffRole: payload.staffRole,
      name: payload.name,
    };
    return true;
  }
}
