# Handoff — Phase BG-1: Data Model & In-App Extensions (Beginner tier)

Branch: `claude/saahvik-beginner-phase-bg1-7kfl53` (off `main`).

Everything here is **additive** to the Basic-plan schema and introduces **no new
auth/trust boundary** (no guardian/resident login, payments, or messaging).
Frozen conventions were followed throughout: `wrapSuccess(data, apiVersion)` via
the global interceptor, explicit `@Inject()`, `orgId` sourced only from the
verified JWT, money as integer paisa, uploads served only through the
authenticated `/files/:key` endpoint, flat `src/{domain}/` module layout.

## Migration

Single migration `20260731125426_beginner_phase_bg1_data_model`. **Tested**:
applied on the dev DB, and the full chain re-applied cleanly on a fresh DB via
`prisma migrate deploy`. Strictly additive — only `ADD COLUMN` (nullable or
defaulted), `ADD CONSTRAINT`, `CREATE TABLE|TYPE|INDEX`. No existing column was
altered or dropped. Out-of-scope areas (auth, Payment, FeeAssignment, Invoice,
Deposit, advance/dues logic, dues-accrual cron) were not touched.

New tables: `ResidentDocument`, `Reservation`, `Vendor`, `PurchaseRecord`,
`SavedSearch`, `ReportSchedule`, `ReportRun`, `ApprovalRequest`.

## Verification

- `npm run typecheck` — clean.
- App boots; all new routes map; no DI errors.
- **32/32 end-to-end HTTP checks pass** (signup → rooms/amenities/floors/block →
  blocked-assignment 409 → resident medical+ID-expiry → expiring report → GST
  config → vendors/purchases → reservation create+**convert** (bed occupied,
  resident created) → approvals approve → global search → saved search → **xlsx
  export is a real zip** → staff report graceful attendance → report schedule +
  run-now artifact → role-based dashboard + expiring flag).
- **9/9 GST math checks pass** (exclusive/inclusive/disabled/rounding).

## Per-feature status

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Floor-level organization | **Done (BE)** | `GET /rooms/floors` grouping + per-floor occupancy; no Floor entity needed (derived from `Room.floor`). |
| 2 | Room amenities | **Done (BE)** | `Room.amenities String[]`; hardcoded starter set `ROOM_AMENITIES` sanitizes input; extensible later. |
| 3 | Room blocking / maintenance | **Done (BE)** | `Room.blocked`+`blockedReason`; `PUT /rooms/:id/block`; enforced in resident create **and** transfer (409 `ROOM_BLOCKED`). |
| 4 | Document expiry tracking | **Done (BE)** | `Resident.idDocExpiryDate` + per-doc expiry; `GET /residents/documents/expiring` report + dashboard `expiringDocumentsCount` flag. |
| 5 | Reservation management | **Done (BE)** | `Reservation` model; hold never occupies a bed; `convert()` is the only path that creates a Resident + occupies a bed. |
| 6 | Custom fields on Resident | **Done (BE)** | Reuses `AdmissionFieldDefinition`/`admissionData`; cap of **10** custom fields (`MAX_CUSTOM_ADMISSION_FIELDS`) enforced + documented. No second mechanism. |
| 7 | Medical / dietary info | **Done (BE)** | Nullable fields on `Resident` (bloodGroup, allergies, dietaryPreference, medicalNotes, emergency contact); same resident authorization, no new exposure. |
| 8 | GST configuration | **Done (BE)** | Org `gstEnabled/gstRatePercent/gstInclusive`; shared `computeGst()` (intra-state CGST/SGST) wired into the existing receipt PDF + invoice detail DTO — no forked path. |
| 9 | Vendor + purchase records | **Done (BE)** | `Vendor` + `PurchaseRecord` (paisa), kept **separate** from Expense with an optional 1:1 `expenseId` link. |
| 10 | Global search | **Done (BE)** | `GET /search`; org-scoped; **staff never receive `staff` results** (mirrors owner-only staff directory). |
| 11 | Saved searches | **Done (BE)** | `SavedSearch` scoped per-user (userId+userType), not shared across the org. |
| 12 | Document categories | **Done (BE)** | `ResidentDocument.category` enum + upload/list/delete under `/residents/:id/documents`. |
| 13 | Excel export | **Done (BE)** | `XlsxService` (exceljs); `format=xlsx` on every report; **reuses the same `*Data` builders** as PDF — no duplicated query logic. |
| 14 | Staff reports | **Done (BE)** | `GET /reports/staff` (json/pdf/xlsx). Attendance is Phase BG-3 → reports `attendanceTracking.available=false` ("not yet tracked"), never errors. |
| 15 | Role-based dashboards | **Done (BE)** | Extends `Staff.permissions` with `viewFinancials`; financial block present only for owners / permitted staff; payload carries `role`/`permissions`/`financialVisible`. |
| 16 | Report scheduling | **Done (BE)** | `ReportSchedule` CRUD + `@Cron` runner that **generates+stores** a `ReportRun` artifact. **No delivery** (email/WhatsApp is Phase BG-5). Manual run-now included. |
| 17 | Custom logo / theme | **Done (BE), scoped** | Org `logoKey`+theme colors; PDF/receipt reskinned with brand colors + GSTIN. **Full UI re-theming deferred** (flagged, per scope allowance). |
| 18 | Basic approval workflow | **Done (BE)** | `ApprovalRequest`; single-step owner sign-off; records the decision only (does not execute the payload). Not a generic engine. |
| 19 | Dynamic form builder | **Scoped down** | No second concrete form context in-repo + generalizing the unique constraint isn't cleanly additive, so **strengthened the admission builder** (safe-identifier keys, the feature-6 cap) and deferred speculative multi-context forms. No schema change. |

## Assumptions made (not specified in the brief)

- **GST**: v1 models an **intra-state** supply (CGST+SGST split evenly);
  inter-state IGST is a documented follow-up. `gstRatePercent` is a whole number
  (GST slabs are integers); `gstInclusive` toggles whether stored amounts already
  include tax.
- **Reservation conversion** creates a *minimal* Resident (name/phone/room/bed/
  fees) directly, deliberately **not** re-running the full admission flow
  (caps, form-number sequence, deposit record) to avoid a circular dependency on
  `ResidentsService`. Flagged in-code as a follow-up to route conversion through
  `ResidentsService` for full parity.
- **Feature 15** changes behavior for existing permission-less staff: they no
  longer see financial figures on the dashboard. That is the intent of
  role-based dashboards, but note it is a visible change for current staff users.
- **Document categories**: added a general `ResidentDocument` table (satisfies
  feature 12) *in addition to* keeping the primary ID on `Resident.idDocKey`/
  `idDocExpiryDate` (feature 4's literal ask).

## Dependencies flagged (out of scope — not built)

- **Attendance data** (feature 14) — belongs to Phase BG-3. Staff report renders
  a "not yet tracked" placeholder with a stable shape for BG-3 to fill in.
- **Report/notification delivery** (feature 16) — email/WhatsApp is Phase BG-5.
  Scheduling only generates+stores; it does not deliver.

## Frontend

API/type layer added under `frontend/src/api/` (types + `*.api.ts` clients) so
every new endpoint is consumable. Full net-new React **pages** (reservations,
vendors, approvals, saved-search/global-search UIs, schedule manager) and full
UI re-theming are the follow-up UI task for this phase.
