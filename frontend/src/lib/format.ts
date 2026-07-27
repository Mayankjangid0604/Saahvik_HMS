/**
 * All money in Saahvik travels as PAISA (integer). These helpers are the only
 * place conversion to/from rupees happens.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 500000 paisa -> "₹5,000" */
export function formatMoney(paisa: number): string {
  const rupees = paisa / 100;
  // Drop trailing .00 but keep genuine fractions (e.g. ₹5,000.50)
  return Number.isInteger(rupees)
    ? inr.format(rupees).replace(/\.00$/, "")
    : inr.format(rupees);
}

/** Form input in rupees -> paisa integer for the API. */
export function rupeesToPaisa(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** Paisa -> rupees number for pre-filling forms. */
export function paisaToRupees(paisa: number): number {
  return paisa / 100;
}

/** ISO date string -> "12 Jan 2026" */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** ISO date string -> "12 Jan 2026, 4:30 pm" */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "2026-07" -> "Jul 2026" */
export function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/** Relative label for notifications: "2h ago", "3d ago" */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
