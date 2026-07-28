# Saahvik Basic Plan Backend — Handoff Note

Build chat 2 deliverable. NestJS + Prisma + PostgreSQL in `backend/`,
serving the Chat 1 frontend in `frontend/`.

## ⚠ The repo did not match the build prompt

The prompt assumed an Nx monorepo (`apps/api`, `apps/web`) with a working
pilot v0.1 backend (7 models, 21 routes) to extend. **None of that exists in
this repo** — it contained only `frontend/` (standalone Vite + React) and a
README. Per the confirmed decision, the backend was built **from scratch** at
`backend/`, covering the pilot-equivalent surface *and* all nine new groups.

Consequences:

- **Conflict 2.2 resolved by inspection**: the frontend lives at `frontend/`
  in this repo. It calls `VITE_API_URL ?? http://localhost:3000/api/v1`.
  CORS allows `https://app.saahvik.com`, `http://localhost:5173`,
  `http://localhost:4200` (env `CORS_ORIGINS`, explicit list, never `*`).
- There was no pilot receipt-PDF generator or Noto Sans font to reuse. The
  frontend's `lib/pdf.ts` uses jsPDF + Helvetica and prints "Rs." (the
  documented bug). The backend bundles Noto Sans TTFs (`backend/assets/fonts`)
  and renders a real ₹ — verified by `test/pdf-smoke.ts`.
- The unresolved pilot Nginx `/uploads/` alias issue is moot here: this
  backend has **no static file route at all**. Uploads are stored under
  `UPLOADS_PATH/<orgId>/<uuid>` and served only via authenticated
  `GET /api/v1/files/:orgId/:name`, which rejects keys outside the JWT's org.
  Keep it that way in the Nginx config — do not add an `/uploads/` alias.

## Where the frontend contract overrode the prompt

The prompt's Prisma sketches conflicted with the shapes the Chat 1 frontend
already types against (`frontend/src/api/types.ts`). Real code took
precedence; DB enums use the frontend's lowercase vocabulary:

| Area | Prompt said | Built (frontend contract) |
|---|---|---|
| Complaint categories | MAINTENANCE/HYGIENE/SECURITY/NOISE/OTHER | electrical, plumbing, cleaning, food, wifi, furniture, security, other (+ title, priority, ticketNo, timeline, attachments) |
| Complaint status | OPEN/IN_PROGRESS/RESOLVED | open, in_progress, resolved, **closed** |
| Invoice status | DRAFT/ISSUED/PAID/VOID | unpaid, partially_paid, paid, cancelled; **overdue is derived** (unpaid + past due), never stored |
| Deposit status | FULLY_REFUNDED | `refunded` (plus held, partially_refunded, forfeited) |
| Discounts | per-resident rows | org-level catalog (name/kind/value/active/validTill) + `DiscountApplication` join rows; appliedCount is derived |
| Admission fields | id-keyed, TEXT/NUMBER/DATE/DROPDOWN | key-keyed (`candidateName`, …), types text/number/date/phone/select/textarea/file/auto + `validation` (aadhaar/pincode) + `autoFill`; `admissionData` keyed by field **key** |
| Admission field CRUD | POST/PUT/DELETE/reorder endpoints | `GET`/`PUT` full-config replace + `POST …/reset` (subsumes create/update/delete/reorder; matches the frontend's updateAdmissionFormConfig) |
| NotificationPreference | 4 booleans | frontend's 7 toggles (duesReminder, paymentReceived, newComplaint, complaintResolved, weeklySummary, channelInApp, channelEmail) |
| Notification model | type/message | kind (payment/complaint/due/system), title, body, link |
| Staff roles | MANAGER/RECEPTIONIST/MAINTENANCE required on create | kept in DB (lowercase) but frontend's AddStaffInput has no role — defaults to `manager`; API exposes `role: "staff"` plus `staffRole` |

Additions the prompt didn't list but the frontend requires: `FeeStructure`,
`FeeAssignment`, `DiscountApplication`, `ComplaintEvent`,
`ComplaintAttachment`, `Hostel` (one per org), `SequenceCounter`,
`AuthChallenge`, and receipt sequencing (`RCP-YYYY-####`).

## Response envelope — frontend change needed

Every JSON response is wrapped by `wrapSuccess(data, apiVersion)`:

```json
{ "success": true, "apiVersion": "v1", "data": … }
```

Errors: `{ "success": false, "apiVersion": "v1", "error": { "code", "message", … } }`.
The mock returned bare objects, so when swapping `frontend/src/api/*.api.ts`
to `apiClient`, unwrap `response.data.data`. Structured error codes the
frontend should branch on: `STAFF_CAP_EXCEEDED` (`{plan:'BASIC',limit:3}`),
`RESIDENT_CAP_EXCEEDED` (`{type:'active'|'lifetime'}`), `FEE_LOCKED_BY_ROOM`
(`{expectedPaisa}`), `BED_OCCUPIED`, `DEPOSIT_SETTLED`,
`TWO_FACTOR_SESSION_EXPIRED`, `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`.

## Endpoints that behave differently from the mock

1. **2FA login**: `POST /auth/login` returns
   `{ requiresTwoFactor: true, tempSessionId }`. The mock kept the pending
   email server-side; the real `POST /auth/2fa/verify` **requires
   `{ tempSessionId, token }`** — the frontend must store `tempSessionId`
   from the login response and send it (one-line change in `auth.api.ts`).
2. **Add staff** returns a one-time `tempPassword` field when no password is
   supplied — surface it to the owner once; it is never retrievable again.
3. **2FA verify-setup** returns `{ enabled, backupCodes: string[8] }` —
   plain text exactly once, stored bcrypt-hashed.
4. **Fixed-fee rooms**: the mock silently overrode a mismatched fee; the API
   **rejects** with `FEE_LOCKED_BY_ROOM` (business rule 3). The UI already
   locks the field, so send the room's amount or omit the field. Exception:
   bulk import silently uses the room's fixed fee rather than failing rows.
5. **Fee assignment** to a resident in a fixed-fee room whose structure
   amount ≠ the room's fixed fee is rejected (`FEE_LOCKED_BY_ROOM`).
6. **File URLs** (`photoUrl`, attachment `url`) are relative API paths
   (`/api/v1/files/…`) that require the bearer token — fetch as blobs
   (the prompt's `useAuthImage` hook pattern; the hook doesn't exist in
   `frontend/src/hooks` yet and must be added).
7. **Reports** support `?format=pdf` streamed inline; the mock only had JSON
   (frontend rendered PDFs client-side with the Rs. bug — switch to these).
8. **`GET /auth/me`** exists for session restore; the mock had none.
9. **`POST /auth/reset-password`** added (`{token,newPassword}`) — the reset
   link needs a target; frontend has no page for it yet.
10. **Complaint update** is `PUT /complaints/:id` with
    `{ status?, note?, assignedToStaffId? }` (mock's updateComplaintStatus
    maps onto it directly).

## Business rules implemented (all server-side)

1. **Staff cap** — owners + active staff hard-capped at 3; HTTP 422
   `STAFF_CAP_EXCEEDED`; re-activation counts against the cap too.
2. **Resident caps** — 150 active / 500 lifetime; first over-cap check-in
   stamps `graceActiveStartedAt`/`graceLifetimeStartedAt` on Organization and
   is allowed; >5 days later it blocks; dropping under a cap clears its stamp.
3. **Room fixed-fee lock** — create/update/transfer/fee-assignment paths.
4. **Role guards** — global `JwtAuthGuard` + `RolesGuard`; owner-only:
   staff management, resident delete, room delete, fee-structure delete,
   audit log, all reports, subscription, org settings write, admission-form
   write, room fee-settings, 2FA endpoints. Staff retain complaints,
   notifications (own), resident view, payment recording.
5. **Admission validation** — unknown keys rejected, required enforced,
   select options checked, aadhaar/pincode/number/date/phone formats.
6. **Audit log** — `AuditService.log()` threaded through every mutating
   service method (transactional where the mutation is transactional);
   read-only `GET /audit-log?page&limit&actor&action&from&to` (owner only).
7. **Invoice numbering** — `SequenceCounter` row locked with
   `SELECT … FOR UPDATE` in the same transaction as the insert
   (`src/common/sequence.service.ts`); also used for receipts and complaint
   tickets. Verified by `npm run test:invoice-concurrency` (25 parallel
   creates → dense, duplicate-free sequence).
8. **Uploads** — 5 MB max, image/jpeg, image/png, application/pdf only,
   enforced in `FilesService` regardless of what the frontend claims.

Tenant scoping: `orgId` comes exclusively from the verified JWT
(`src/common/jwt-auth.guard.ts` documents this); the `X-Org-Id` header the
frontend sends is ignored. JWTs carry `{sub, orgId, role, staffRole?, name,
tv}`; `tv` (tokenVersion) revokes owner tokens on password change/reset.

## Migrations

- `prisma/migrations/20260728000000_init/migration.sql` — full schema,
  generated from `schema.prisma`. Greenfield, so "safe defaults" is trivially
  met (no pre-existing rows). **Rollback**: drop the affected objects or
  restore the DB; nothing here mutates pre-existing data.
- Apply with `npm run prisma:migrate` (uses `DATABASE_URL`).
- Future migrations: keep additive; new non-null columns need defaults.

## Runbook

```
cd backend
cp .env.example .env        # set JWT_SECRET, DATABASE_URL
docker compose up -d        # dev Postgres on 5432
npm install
npm run prisma:migrate
npm run dev                 # http://localhost:3000/api/v1
```

Env vars: `DATABASE_URL`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
`CORS_ORIGINS`, `UPLOADS_PATH`, `TOTP_ISSUER`, `AWS_SES_FROM_EMAIL`,
`AWS_SES_REGION`, `APP_URL`.

## Verification performed (real DB, not the mock — Conflict 2.3)

Because Docker wasn't available on this machine, verification ran against an
embedded UTF-8 Postgres (`test/dev-db.ts`, dev-only). Results:

- `npx tsc` — clean, no errors, no `@ts-ignore` anywhere.
- `npm run test:invoice-concurrency` — 25 parallel invoice creates through
  the SELECT FOR UPDATE path: dense sequence INV-2026-0001…0025, 0 duplicates.
- `test/api-smoke.ts` — 38 end-to-end checks, all passing: envelope shape,
  seeded admission fields, fee lock, caps, staff cap + temp password, role
  guards (staff blocked from reports/audit/resident-delete but allowed to
  record payments), complaint timeline + notifications, receipt/report PDF
  streaming, audit coverage of every mutating action, cross-org isolation,
  hostile `X-Org-Id` header ignored, full 2FA loop incl. backup codes, and
  token revocation on password change.
- `test/pdf-smoke.ts` — visual check of receipt + report PDFs: ₹ renders.

Two real-world bugs the mock could never catch, found and fixed:

1. **esbuild runtimes silently skip DTO validation.** Under tsx,
   `design:paramtypes` metadata is stripped, so the global ValidationPipe
   had no metatype and passed query/body straight through (`?limit=100`
   reached Prisma as the string `"100"` → 500). Fix mirrors frozen decision
   5: `ValidatedBody(Dto)` / `ValidatedQuery(Dto)` decorators
   (`src/common/validated.ts`) name the DTO class explicitly on **every**
   DTO parameter. Rule for future endpoints: never use bare
   `@Body()`/`@Query()` with a DTO class.
2. **Database encoding must be UTF8.** A WIN1252-encoded Postgres rejects
   ₹ in notification text (`22P05`). Noted in `.env.example`; the official
   Docker image is UTF8 by default.

## Known gaps / follow-ups

- **SES transport not wired** — password-reset links are logged
  (`src/auth/email.service.ts` is the integration point; add
  `@aws-sdk/client-ses` when credentials exist).
- **Dues accrual is event-driven only** (rent payments reduce
  `Resident.duesPaisa`); there is no monthly cron that raises dues yet.
- Frontend swap work: unwrap the envelope, store `tempSessionId`, add a
  `useAuthImage` hook, add a reset-password page, adopt server receipts/PDFs.
- `@Inject()` is explicit on every constructor parameter (frozen decision 5),
  so the app survives esbuild-style runtimes (dev runs under tsx).
