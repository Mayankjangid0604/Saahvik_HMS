import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser, Role } from "./auth-user";
import { STAFF_SIDE_ROLES } from "./auth-user";
import { IS_PUBLIC_KEY, ROLES_KEY } from "./decorators";

/**
 * Enforces role access server-side. Runs after JwtAuthGuard.
 *
 * SECURITY (BG-2 — new portal trust boundary): the historical behavior was
 * "no @Roles ⇒ any authenticated user". With portal roles (guardian/resident)
 * now able to hold valid JWTs, that would silently expose EVERY un-annotated
 * owner/staff endpoint to the portal. So the default is now DEFAULT-DENY for
 * portal roles: an un-annotated authenticated route admits ONLY staff-side
 * roles (owner, staff). A portal route must explicitly opt in with
 * `@Roles("resident", "guardian")`. This preserves existing owner/staff access
 * exactly (they were always the only real callers) while closing the portal
 * off from everything it isn't explicitly granted.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Public routes have no authenticated subject — role checks don't apply.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const explicit = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Absence of @Roles = staff-side only (NOT "anyone"). This is the boundary.
    const allowed: readonly Role[] =
      explicit && explicit.length > 0 ? explicit : STAFF_SIDE_ROLES;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) return false; // authenticated route with no user ⇒ deny
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException("You do not have permission to do this");
    }
    return true;
  }
}
