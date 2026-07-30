import { navGroups, type NavItem } from "./nav";

const NAV_ITEMS: NavItem[] = navGroups.flatMap((g) => g.items);

/**
 * Labels for routes that have no direct nav.ts entry. Exact-path matches win
 * over the prefix fallback below. Kept here (not a second copy of page titles)
 * only for routes nav.ts intentionally doesn't list.
 */
const EXTRA_LABELS: { path: string; label: string }[] = [
  { path: "/setup", label: "Hostel Setup" },
  { path: "/residents/new", label: "Add Resident" },
  { path: "/fees/assign", label: "Assign Fee" },
  { path: "/fees/bulk-assign", label: "Bulk Assign Fees" },
  { path: "/notifications/preferences", label: "Notification Preferences" },
  { path: "/profile", label: "Profile" },
  { path: "/profile/password", label: "Change Password" },
  { path: "/profile/2fa", label: "Two-Factor Auth" },
];

/**
 * For `/{parent}/{id}` detail routes, show a singular label rather than the
 * plural nav label (e.g. /residents/res_1 → "Resident", not "All Residents").
 */
const DETAIL_SINGULAR: Record<string, string> = {
  "/residents": "Resident",
  "/payments": "Payment",
  "/invoices": "Invoice",
  "/complaints": "Complaint",
  "/reports": "Report",
  "/staff": "Staff Member",
};

function titleize(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolve the current page's breadcrumb label from the route.
 * Priority: exact nav/extra match → detail singular → nearest parent nav label
 * → titleized last segment.
 */
export function resolveBreadcrumbLabel(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  const candidates = [
    ...EXTRA_LABELS.map((e) => ({ to: e.path, label: e.label })),
    ...NAV_ITEMS.map((n) => ({ to: n.to, label: n.label })),
  ];

  const exact = candidates.find((c) => c.to === path);
  if (exact) return exact.label;

  for (const [parent, singular] of Object.entries(DETAIL_SINGULAR)) {
    if (path.startsWith(`${parent}/`)) {
      const rest = path.slice(parent.length + 1);
      if (rest && !rest.includes("/")) return singular;
    }
  }

  const prefixMatch = candidates
    .filter((c) => c.to !== "/" && path.startsWith(`${c.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
  if (prefixMatch) return prefixMatch.label;

  const last = path.split("/").filter(Boolean).pop();
  return last ? titleize(last) : "Dashboard";
}
