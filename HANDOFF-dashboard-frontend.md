# Saahvik — Dashboard / Wings / Expenses / Staff-permissions build — Handoff

Full-stack change: the frontend prompt depended on a companion backend chat that
**did not exist in this repo**, so (per your decision) the backend endpoints were
built here too. `frontend/src/api/types.ts` remains the shared wire contract; the
`frontend/src/api/*.api.ts` layer calls the real backend (it is no longer a mock).

Both sides are green: `backend` `npm run typecheck`, `frontend` `tsc -b` and
`vite build` all pass.

---

## ⚠ Before it runs: apply the migration + restart the backend

The new Prisma models need a migration applied and the client regenerated. During
this build `prisma generate` could only refresh the **TypeScript client** — the
runtime query-engine DLL was locked by your already-running dev server (PID on
:3000), so the running server still has the old client and an unmigrated DB. Do:

```bash
cd backend
# stop the running dev server first (it holds the prisma engine dll)
npx prisma generate
npx prisma migrate deploy      # applies 20260730000000_wings_expenses_staff_permissions
npm run dev
```

Then `cd frontend && npm run dev`. Live end-to-end was **not** exercised in-session
because that requires stopping your running dev processes — everything below is
verified by typecheck + production build only.

---

## New backend surface

### Migration
`prisma/migrations/20260730000000_wings_expenses_staff_permissions/` — additive
only: `Staff.permissions text[]` (default `{}`), `Room.wingId` (nullable, `ON
DELETE SET NULL`), and tables `Wing`, `ExpenseCategory`, `Expense`. No existing
rows mutated.

### Endpoints
| Method + path | Auth | Notes |
|---|---|---|
| `GET /dashboard?range=…` | any | **New response shape** (see below). `range` ∈ today, yesterday, last7, thisMonth (default), lastMonth, thisQuarter, thisYear |
| `GET /wings` | any (staff need it for the room picker) | `Wing[]` with `roomCount` |
| `POST /wings` | owner | `{ name, hostelId?, notes? }` |
| `PUT /wings/:id` | owner | `{ name?, notes? }` |
| `DELETE /wings/:id` | owner | detaches rooms (they survive, lose the wing) |
| `GET /expenses` | manageExpenses | `Paginated<Expense>`, filters `categoryId`, `method`, `from`, `to`, `search` |
| `POST /expenses` | manageExpenses | `{ categoryId, label, amountPaisa, method, spentAt, notes?, attachmentKey? }` |
| `GET /expense-categories` | manageExpenses | lazily seeds 6 defaults on first read |
| `POST /expense-categories` | manageExpenses | `{ name }` |
| `PUT /expense-categories/:id` | manageExpenses | `{ name?, active? }` (deactivate, never hard-delete) |
| `PUT /staff/:id` | owner | now also accepts `permissions: string[]` |

`manageExpenses` is enforced **in the service** (owners always pass; staff need the
permission), not via `@Roles`, because staff-with-permission must get through.

### Contract additions surfaced through existing endpoints
- `Room` DTO now returns `wingId?`, `wingName?`; `POST /rooms` and `/rooms/bulk`
  accept `wingId?` (validated against the org's hostel).
- Staff DTO now includes `permissions`, `staffRole`, `status`. Owner rows report
  all permissions.
- `GET /auth/me` (and login/signup) `user` now carries `permissions` — owners get
  every `STAFF_PERMISSIONS` value; staff get their array. This is what the frontend
  gates on.

### New dashboard response shape (replaces the old one)
```
{ range, rangeLabel,
  occupancy: { totalBeds, occupiedBeds, vacantBeds, maintenanceBeds, occupancyPct, byProperty[] },
  dues: DuesSummary,
  collection: { totalPaisa, byMethod{cash,upi,bank_transfer,card,cheque} },
  netProfitPaisa, activeResidents, advanceCollectedPaisa, cashInflowPaisa,
  complaints: { total, active, resolved },
  expense: { totalPaisa, breakdown[] },
  collectionsChart[], recentPayments[], recentComplaints[], dueResidents[],
  thisMonthFixed: { collectionPaisa, advancePaisa, netProfitPaisa } }
```

---

## Judgement calls & assumptions (as requested)

1. **`byProperty` = per Hostel.** The schema allows many hostels per org but Basic
   seeds one, so the breakdown list auto-hides (spec's "skip if one property").
   Forward-compatible if multi-hostel ever ships.
2. **`thisMonthFixed` is bundled into the single dashboard response** rather than a
   second query or a new endpoint — the current-calendar-month card is always
   correct regardless of the selected range, at no extra round-trip.
3. **`advanceCollectedPaisa` = `deposit`-type payments** (net of refunds) in range;
   **`cashInflowPaisa` = cash-method net**; **`netProfitPaisa` = collection.total −
   expenses**. Complaint counts are point-in-time (active = open+in_progress,
   resolved = resolved+closed).
4. **Chart granularity:** hour (today/yesterday), day (last7/thisMonth/lastMonth),
   month (thisQuarter/thisYear). Date bucketing uses **server-local time** (single-
   timezone product).
5. **Wing UI = dedicated page** `/settings/wings` (not folded into OrgSettingsPage,
   which is a single form; wings are list-CRUD like rooms). A wing picker was added
   to Add-Room and Bulk-Add dialogs.
6. **Clock updates once per minute** (display has no seconds — a per-second interval
   would re-render every page every second for nothing), aligned to the minute
   boundary. Hidden below `md`.
7. **Theme toggle is a visual no-op by design** — it persists `light|dark|system`
   to `saahvik.theme` and toggles a `dark` class on `<html>`, but there are **zero**
   `dark:` styles anywhere (confirmed by the passing build). It's a hook for a
   future real-dark-mode chat.
8. **Sidebar collapse** persists to `saahvik.sidebar.collapsed`; dashboard range
   persists to **sessionStorage** `saahvik.dashboard.range` (resets to thisMonth on
   a fresh tab, per spec).

### Breadcrumb labels for routes without a clean nav.ts entry
Sourced from nav.ts `NavItem.label` when a route matches. Otherwise
(`components/layout/breadcrumb.ts`): `/setup`→"Hostel Setup",
`/residents/new`→"Add Resident", `/fees/assign`→"Assign Fee",
`/fees/bulk-assign`→"Bulk Assign Fees", `/notifications/preferences`→"Notification
Preferences", `/profile[/password|/2fa]`→literals. Detail routes `/{parent}/{id}`
get a singular label (Resident / Payment / Invoice / Complaint / Report / Staff
Member). Anything else → titleized last path segment.

---

## ⚑ Flags / things to verify

- **Expense attachments are intentionally NOT wired in the UI.** The backend
  `Expense` supports `attachmentKey` (served via authenticated `/files/:key`), but
  the frontend `FileUpload` is still blob-only ("the real API will get FormData
  later" — same unwired state as resident photos). Per your instruction I flagged it
  rather than shipping a non-functional upload control. Wire both together when a
  real upload endpoint exists.
- **The dashboard returns expense figures to any authenticated user** (it's an
  owner-centric page). The expense *pages* are permission-gated; if staff should not
  see expense totals on the dashboard either, add a gate server-side.
- Pre-existing unused imports remain in `rooms.controller.ts` (`Body`, `Query`) —
  left untouched since that file wasn't part of this change. Cleaned the equivalents
  in `staff.controller.ts` (which was edited).

---

## New routes (router + nav.ts)

| Route | Nav location | Gated by |
|---|---|---|
| `/expenses` | Finance › **Expenses** | `manageExpenses` |
| `/settings/wings` | Settings › **Wings** | — (owner sees mutations) |
| `/settings/expense-categories` | Settings › **Expense Categories** | `manageExpenses` |

Permission-gated nav items are hidden from staff who lack the permission (owners
always see them); `nav.ts` `NavItem` gained an optional `requires?: StaffPermission`.
