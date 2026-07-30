# Follow-up fix — Advance balance + dashboard financial gating

Two gaps from PR `9113995` fixed. Nothing else touched (wings left exactly as-is).
Both sides green: backend `npm run typecheck`, frontend `tsc -b`, `vite build` — all pass.

## New field names shipped (cross-check against the prompt)

**Backend schema**
- `Resident.advanceBalancePaisa` `Int @default(0)` — prepaid rent credit.
- `Payment.advanceAppliedPaisa` `Int @default(0)` — the exact overpayment routed to advance, captured at write time.
- Migration: `prisma/migrations/20260731000000_advance_balance/` (additive; two columns default 0). **Listed, not run against your DB** — applied cleanly in the isolated test below.

**Backend DTO / dashboard**
- `Resident` DTO: `duesPaisa` is now **net of advance** (`effectiveDues`); new `advanceBalancePaisa` field.
- Dashboard `advanceCollectedPaisa` — **same key**, now = Σ `advanceAppliedPaisa` over payments in range (was: `deposit`-type intake, the mislabel).
- Dashboard `thisMonthFixed.advancePaisa` — **same key**, now = Σ `advanceAppliedPaisa` this calendar month.
- Dashboard `advanceBalanceTotalPaisa` — **new** live snapshot (Σ active residents' `advanceBalancePaisa`), not range-dependent. Exposed in the response but **not wired to any frontend card** (per your "check first" note — say the word and I'll surface it).
- Dashboard `expensesVisible: boolean` — **new** gate flag (Gap 2).

**Frontend**
- `types.ts` `Resident.advanceBalancePaisa`; `DashboardData` gains `expensesVisible`, `advanceBalanceTotalPaisa`, and makes `netProfitPaisa`, `expense`, `thisMonthFixed.netProfitPaisa` optional.

## Shared helpers (no per-consumer math)
- `backend/src/common/dues.ts` → `effectiveDues(duesPaisa, advanceBalancePaisa) = max(0, dues − advance)`. Called from **`buildDues()`** and **`toResidentDto()`** — that covers every dues consumer: the `/dues` page, the dashboard `dueResidents`, the dues report and residents report (both route through those two functions), the residents list, and the resident detail page. No third inline copy.
- `backend/src/common/permissions.ts` → `userHasPermission(prisma, user, perm)`. Reused by the dashboard gate **and** `ExpensesService.requireManageExpenses` (refactored to delegate — behavior identical).

## 1b reverse-direction (dues-increase drawdown): no call site exists yet
I grepped every `duesPaisa` write. The **only** write is the rent decrement at `payments.service.ts` `record()`. The other hits are non-writes: `residents.service.ts:95` is an `orderBy` sort field; `reports.service.ts` and `dashboard.module.ts` only read/sum. **Dues are never incremented anywhere** — confirming the known "dues accrual is event-driven only" gap. So the advance-drawdown-on-dues-increase logic has nothing to attach to until a monthly dues-accrual job exists (separately tracked). The payment-time excess→advance path (the real fix) is fully implemented and tested.

## 1c decision (stated): fully-covered residents disappear
A resident whose advance fully offsets dues is **filtered out of `buildDues()` entirely** (net > 0 filter) — your expected "former" behavior, not a 0-paisa row. Verified below.

## Gap 2 — how hiding works
`expensesVisible` = `userHasPermission(user, "manageExpenses")` (owners always true). When **false**, these keys are **absent from the JSON** (not zeroed/nulled):
- `netProfitPaisa`, `expense` (`{totalPaisa, breakdown}`), and `thisMonthFixed.netProfitPaisa`.

Frontend gates on the flag: Profit card (`LargeStatsGrid`), Expense-Breakdown card (`DashboardPage`/`DuesAndExpense`), the small **Expense total** card (`SmallStatsGrid`), and the monthly **Net Profit** stat (`MonthlyFixedCard`).

> Decision beyond the two literal names in 2a: I also hid the small "Expense" total card and the monthly Net Profit stat, because both leak expense figures (net profit ⇒ collection − expense). This makes dashboard visibility truly match CRUD permission, per the confirmed decision. Flagging it explicitly in case you wanted the small Expense total to stay visible.

## Verification performed
- **Isolated live DB test** (embedded Postgres on a free port, all 3 migrations applied cleanly incl. the new one) — 9/9 PASS: overpayment clamps dues→0 and routes the exact excess to advance; `advanceAppliedPaisa` equals the excess; a second payment on zero dues becomes entirely advance; underpayment reduces dues with no advance; a fully advance-covered resident is excluded from the dues list while an under-paid one stays with the correct net. (Test script was temporary; removed, not committed.)
- Backend + frontend typecheck and `vite build` all clean.

**Not run live:** the raw-HTTP check that a permission-lacking staff user receives a response with `netProfitPaisa`/`expense` **absent**. That needs the running dev server restarted with the migration applied, which would disrupt your running instance. The omission is verified by code review + typecheck (the keys are conditionally spread on `expensesVisible`, which is `false` for staff without the permission). To confirm live after `prisma migrate deploy` + restart: log in as such a staff user and inspect `GET /api/v1/dashboard`.

## Known limitation (unchanged, out of scope)
Rent **refunds** do not reverse `advanceBalancePaisa`/`duesPaisa` — the refund path is untouched. Flag for a future accounting pass if rent refunds need to unwind advance.
