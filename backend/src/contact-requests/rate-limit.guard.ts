import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { ApiError } from "../common/api-error";

/** Requests allowed per IP inside one window. */
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;
/** Sweep interval for expired buckets, so the Map cannot grow unbounded. */
const SWEEP_MS = 15 * 60 * 1000;

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Minimal fixed-window, per-IP limiter for the unauthenticated contact form.
 * There is no throttling package or Redis in this codebase, and a lead form
 * does not justify introducing either — but it also cannot be left wide open,
 * since it writes a DB row and has no auth in front of it.
 *
 * Deliberate limitations, both acceptable at this volume:
 *  - In-memory, so the budget is per process. Multiple API instances multiply
 *    the effective limit. Move to a shared store if the API is ever scaled out.
 *  - State is lost on restart.
 */
@Injectable()
export class ContactRequestRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = Date.now();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    this.sweep(now);

    const key = clientIp(req);
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    if (bucket.count >= MAX_PER_WINDOW) {
      throw new ApiError(
        HttpStatus.TOO_MANY_REQUESTS,
        "RATE_LIMITED",
        "Too many requests. Please try again in a few minutes.",
        { retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) },
      );
    }

    bucket.count += 1;
    return true;
  }

  private sweep(now: number): void {
    if (now - this.lastSweep < SWEEP_MS) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

/**
 * In production the API sits behind nginx, which sets X-Forwarded-For; without
 * reading it every request would bucket under the proxy's own address and the
 * limiter would be pointless. `trust proxy` is not enabled on the Express
 * instance (that lives in main.ts, outside this module), so the first hop is
 * read directly here. It is client-controlled and therefore spoofable — which
 * only means a determined attacker can evade the limiter, not that they gain
 * anything else. Validation and the DTO are the real boundary.
 */
function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(",")[0]?.trim();
  return first || req.ip || req.socket.remoteAddress || "unknown";
}
