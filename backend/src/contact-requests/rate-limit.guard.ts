import { IpRateLimit } from "../common/ip-rate-limit.guard";

/**
 * Per-IP limiter for the unauthenticated contact form: 5 submissions per
 * 10 minutes. The mechanics (and their trade-offs) live in IpRateLimit.
 */
export class ContactRequestRateLimitGuard extends IpRateLimit({
  max: 5,
  windowMs: 10 * 60 * 1000,
}) {}
