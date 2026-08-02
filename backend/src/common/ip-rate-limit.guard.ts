import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { ApiError } from "./api-error";

/** Sweep interval for expired buckets, so the Map cannot grow unbounded. */
const SWEEP_MS = 15 * 60 * 1000;

interface Bucket {
  count: number;
  resetAt: number;
}

export interface IpRateLimitOptions {
  /** Requests allowed per IP inside one window. */
  max: number;
  windowMs: number;
  message?: string;
}

/**
 * Minimal fixed-window, per-IP limiter for unauthenticated endpoints. There is
 * no throttling package or Redis in this codebase, and the handful of public
 * routes here do not justify introducing either — but they write DB rows and
 * send email with no auth in front of them, so they cannot be left wide open.
 *
 * Deliberate limitations, both acceptable at this volume:
 *  - In-memory, so the budget is per process. Multiple API instances multiply
 *    the effective limit. Move to a shared store if the API is ever scaled out.
 *  - State is lost on restart.
 *
 * Use via `IpRateLimit({ max, windowMs })`, which returns a guard class.
 */
export function IpRateLimit(options: IpRateLimitOptions): new () => CanActivate {
  const message = options.message ?? "Too many requests. Please try again in a few minutes.";

  @Injectable()
  class IpRateLimitGuard implements CanActivate {
    private readonly buckets = new Map<string, Bucket>();
    private lastSweep = Date.now();

    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<Request>();
      const now = Date.now();
      this.sweep(now);

      const key = clientIp(req);
      const bucket = this.buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        this.buckets.set(key, { count: 1, resetAt: now + options.windowMs });
        return true;
      }

      if (bucket.count >= options.max) {
        throw new ApiError(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", message, {
          retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
        });
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

  return IpRateLimitGuard;
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
