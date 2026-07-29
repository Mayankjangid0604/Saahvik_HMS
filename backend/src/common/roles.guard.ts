import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser } from "./auth-user";
import { ROLES_KEY } from "./decorators";

/** Enforces @Roles(...) server-side. Runs after JwtAuthGuard. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Array<"owner" | "staff">>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles || roles.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser }>();
    if (!user) return false; // public route with @Roles would be a bug — deny
    if (!roles.includes(user.role)) {
      throw new ForbiddenException("You do not have permission to do this");
    }
    return true;
  }
}
