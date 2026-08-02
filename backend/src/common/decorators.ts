import {
  ExecutionContext,
  SetMetadata,
  createParamDecorator,
} from "@nestjs/common";
import type { AuthUser, Role } from "./auth-user";

export const IS_PUBLIC_KEY = "isPublic";
/** Marks a route as reachable without a JWT (signup, login, 2FA verify…). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
/**
 * Restricts a route to the given roles. "menu is hidden on frontend" is NOT a
 * boundary. NOTE (BG-2): an un-annotated authenticated route defaults to
 * staff-side only (owner/staff) — see RolesGuard. Portal routes MUST declare
 * `@Roles("resident", "guardian")` (or a subset) to admit portal tokens.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return req.user;
  },
);
