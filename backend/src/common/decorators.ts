import {
  ExecutionContext,
  SetMetadata,
  createParamDecorator,
} from "@nestjs/common";
import type { AuthUser } from "./auth-user";

export const IS_PUBLIC_KEY = "isPublic";
/** Marks a route as reachable without a JWT (signup, login, 2FA verify…). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
/** Restricts a route to the given roles. "menu is hidden on frontend" is NOT a boundary. */
export const Roles = (...roles: Array<"owner" | "staff">) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return req.user;
  },
);
