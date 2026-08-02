# Handoff — Phase BG-2: Guardian + Resident Self-Service Accounts

Branch: `claude/saahvik-beginner-phase-bg2-guardian-resident-auth`,
based on `claude/saahvik-beginner-phase-bg1-7kfl53`.

**Base-branch state:** BG-1 is **UNMERGED** into `origin/main` at the time of
this work (confirmed via `git merge-base --is-ancestor`). BG-2 is therefore
stacked on the BG-1 branch tip and must land after BG-1 (or be rebased if BG-1
merges first).

This phase adds a **new authentication trust boundary** (resident + guardian
login) alongside the existing owner/staff surface. It was treated as the
highest-risk phase: the boundary/negative tests are the point, not the happy path.

## Security posture (how the boundary is enforced)

1. **Default-deny in `RolesGuard`.** Previously "no `@Roles` ⇒ any authenticated
   user". That is now **staff-side only**: an un-annotated authenticated route
   admits ONLY `owner`/`staff`. Portal tokens are rejected everywhere unless a
   route explicitly declares `@Roles("resident","guardian")`. This is the single
   most important change — it closes every existing endpoint to the portal
   without needing to annotate each one, and it does not rely on the absence of
   a check.
2. **Explicit per-role checks in `JwtAuthGuard`.** owner/guardian/resident each
   get a tokenVersion + existence + orgId match check (a revoked, deleted, or
   moved subject's token dies at the guard). Staff behavior is unchanged.
3. **Resident scoping resolved server-side.** A guardian JWT carries `guardianId`
   in `sub`; a resident JWT carries its own `residentId`. Linked residents are
   resolved from `GuardianResident` on every request via
   `common/portal-scope.ts` → `assertResidentAccess()`. No endpoint trusts a
   client-supplied `residentId` without passing it through that chokepoint.
4. **File access hardened.** `FilesService.open` restricts portal roles to files
   attached to their OWN resident(s) (photo / idDoc / ResidentDocument);
   owner/staff keep org-level access.
5. **Rate-limiting** on the portal auth surface (`@nestjs/throttler`,
   5/min per IP on login).

## Verification (evidence, not claims)

- Backend `typecheck` clean; app boots; all portal routes map; no DI errors.
- Migration: additive-only (verified: no DROP / ALTER COLUMN), applied on the
  dev DB and re-applied cleanly on a fresh DB.
- **44/44 security E2E checks pass**, including:
  - **Cross-role rejection**: a RESIDENT token is rejected (403) by
    `GET /residents`, `GET /dashboard`, `GET /rooms`, `POST /payments`,
    `GET /staff`; a GUARDIAN token by the first four. (≥3 required — exceeded.)
  - Reverse: OWNER and STAFF tokens rejected (403) by `/portal/me`; portal token
    rejected by `/portal-admin`.
  - **Scope isolation**: resident/guardian cannot read another resident (B) or
    its dues (403).
  - **File scoping**: resident/guardian can fetch their own resident's file,
    not another's (403).
  - Token revocation: after `POST /portal/logout`, the old token is 401.
  - Rate-limit: 429 after a login burst.
  - **Regression**: owner signup/login, `/auth/me`, staff login, and owner/staff
    reads all still 200.
- **BG-1 E2E re-run green** after the guard changes (no regression from the
  high-blast-radius `RolesGuard`/`JwtAuthGuard` edits).

## Per-feature status

| # | Feature | Status |
|---|---------|--------|
| 1 | Guardian model + GuardianResident join | **Done** — additive; old `Resident.guardianName/guardianPhone` kept (deprecated, no backfill). |
| 2 | Guardian authentication | **Done** — invite-accept signup, phone+password login, Owner-pattern bcrypt/tokenVersion; JWT carries `guardianId`. |
| 3 | Resident self-service auth | **Done** — additive `passwordHash`/`tokenVersion`; invite-accept, phone+password login; JWT carries own `residentId`. |
| 4 | Portal-scoped read endpoints | **Done** — me / dues+history / documents / complaints (list+file). Minimal; no parallel API. No staff/other-resident/expense/vendor exposure. |
| 5 | Password reset | **Done (mechanism)** — mirrors Owner `passwordResetToken`/expiry/sha256 + tokenVersion bump. Delivery: email when present; **no email ⇒ can't deliver (SMS is a later phase)** — flagged. |

## Decisions recorded

- **Invite-only, NOT self-signup** (both guardian and resident). A phone-based
  self-signup can't verify that the caller is actually that resident or their
  guardian without OTP/SMS (out of scope — messaging is a separate phase).
  Owner/staff issue a resident-tied, one-time, 7-day, sha256-hashed invite token
  (`POST /portal-admin/residents/:id/invite`).
- **Siblings / existing guardians:** a guardian invite never attaches to an
  existing guardian account (that would let an invite set a password on someone
  else's account) — it 409s and staff link the existing guardian via
  `POST /portal-admin/guardians/:id/link`. That is the many-to-many path.
- **Login disambiguation:** phone is unique per org but not globally, and login
  has no org context, so login collects all accounts with that phone and
  requires **exactly one** to match the password (else a generic 401). Documented
  as a known edge (same phone + same password across two orgs → ambiguous, told
  to contact the hostel).

## Assumptions

- Guardians/residents may lack an email; medical fields are shown to the resident
  and their linked guardians (emergency rationale).
- `advanceBalancePaisa`/`duesPaisa` are surfaced **read-only** via the existing
  `effectiveDues()` — no dues math reimplemented, no financial writes.
- Old resident records have **empty guardian relations** until a guardian signs
  up via invite or staff link them (no backfill this phase).

## Flagged gaps / dependencies (not built — by instruction)

- **SMS/OTP delivery** for reset (and any phone verification) — later phase.
  Portal reset for accounts without email cannot be delivered yet.
- **Throttler storage is in-memory** (single-instance). Multi-node deploy needs a
  Redis `ThrottlerStorage` — follow-up. Owner/staff `/auth/login` remains
  un-throttled (out of this phase's scope; worth adding in a hardening pass).

## Untouched (out of scope, confirmed)

Payment/Invoice/Deposit/FeeAssignment write paths, `duesPaisa`/
`advanceBalancePaisa` logic, and the dues-accrual cron were not modified. Owner
and staff auth flows are behaviorally unchanged (regression-verified).
