/*
 * Pricing data for the landing page — transcribed from the FROZEN plan
 * specifications (Saahvik_*_Plan_Spec + the four add-on catalogs).
 * Prices are the revised final figures from each spec's header, which the
 * cost-snapshot sections confirm (e.g. Business was raised ₹7,999 → ₹11,499).
 * Do not edit numbers here without a corresponding change to those documents.
 */

export type CycleId = "monthly" | "halfYearly" | "yearly";

export interface CycleOption {
  id: CycleId;
  label: string;
  shortLabel: string;
  badge?: string;
}

export const BILLING_CYCLES: readonly CycleOption[] = [
  { id: "monthly", label: "Monthly", shortLabel: "mo" },
  { id: "halfYearly", label: "Half-Yearly", shortLabel: "6 mo", badge: "Save ~10%" },
  { id: "yearly", label: "Yearly", shortLabel: "yr", badge: "Save ~15%" },
];

export interface PlanPricing {
  /** Display amount for the cycle, without the ₹ sign. */
  amount: string;
  /** What the amount covers, e.g. "/month", "/6 months". */
  per: string;
  /** Effective monthly rate for non-monthly cycles. */
  effective?: string;
}

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  pricing: Record<CycleId, PlanPricing>;
  limits: readonly string[];
  inheritsLabel?: string;
  features: readonly string[];
}

export const PLANS: readonly Plan[] = [
  {
    id: "basic",
    name: "Basic",
    tagline: "For a single small hostel — the full resident lifecycle, standalone.",
    pricing: {
      monthly: { amount: "999", per: "/month" },
      halfYearly: { amount: "5,299", per: "/6 months", effective: "≈ ₹883/mo" },
      yearly: { amount: "10,099", per: "/year", effective: "≈ ₹842/mo" },
    },
    limits: [
      "1 property",
      "Owner + 3 staff logins",
      "150 active residents · 500 lifetime records",
      "10 GB storage",
      "1,000 emails/month",
    ],
    features: [
      "Rooms, beds & bed-level occupancy dashboard",
      "Fee collection with PDF receipts, dues tracking & automated reminders",
      "Partial payments, refunds, late fees, discounts & security deposits",
      "Expense tracking & invoice generation",
      "Complaint logging with photos, assignment & status tracking",
      "4 standard reports (occupancy, dues, residents, collections) as PDF",
      "Admission form customization & bulk fee assignment",
      "Guardian logins — one login covers multiple residents",
      "2FA, login audit trail & automated daily backups",
      "Email support & self-serve onboarding",
    ],
  },
  {
    id: "beginner",
    name: "Beginner",
    tagline: "For a growing single-property hostel that wants the front desk covered too.",
    pricing: {
      monthly: { amount: "2,699", per: "/month" },
      halfYearly: { amount: "14,499", per: "/6 months", effective: "≈ ₹2,417/mo" },
      yearly: { amount: "27,499", per: "/year", effective: "≈ ₹2,292/mo" },
    },
    limits: [
      "1 property with floor-level organization",
      "Owner + 10 staff logins · extended roles",
      "200 active residents · 2,000 lifetime records",
      "100 GB storage",
      "5,000 emails + 500 WhatsApp + 500 SMS/month",
    ],
    inheritsLabel: "Everything in Basic, plus",
    features: [
      "Resident self-service logins",
      "WhatsApp & SMS notifications with announcement broadcasts",
      "Online fee collection from residents via Razorpay",
      "Visitor management with pre-approval & resident alerts",
      "Resident attendance, curfew tracking & leave workflows",
      "Parcel register with pickup confirmation",
      "Staff attendance, leave & shift scheduling",
      "Operations mobile app for staff, with push notifications",
      "GST configuration, vendor management & purchase records",
      "Excel exports, report scheduling & role-based dashboards",
      "Dynamic form builder, sandbox environment & custom branding",
      "Chat support + call support for major issues",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    tagline: "For operations spanning up to four buildings, with automation and AI.",
    pricing: {
      monthly: { amount: "5,499", per: "/month" },
      halfYearly: { amount: "29,599", per: "/6 months", effective: "≈ ₹4,933/mo" },
      yearly: { amount: "55,999", per: "/year", effective: "≈ ₹4,667/mo" },
    },
    limits: [
      "1 property · up to 4 buildings",
      "Owner + 25 staff logins · custom roles",
      "500 active residents · 5,000 lifetime records",
      "250 GB storage",
      "15,000 emails + 1,200 WhatsApp + 800 SMS/month",
      "150,000 AI tokens/month",
    ],
    inheritsLabel: "Everything in Beginner, plus",
    features: [
      "Multi-building hierarchy with per-building floors",
      "Custom role creation, delegation & multi-level approvals",
      "Double-entry accounting ledger, bank reconciliation & budgeting",
      "Petty cash management",
      "No-code workflow builder & business rules engine",
      "Custom report builder & advanced analytics dashboards",
      "Resident mobile app",
      "AI assistant, AI-drafted communication & report narrator",
      "SSO (Google / Microsoft) & device trust",
      "Public REST API, webhooks & accounting integrations (Tally, Zoho, QuickBooks)",
      "Occupancy forecasting, floor plan upload & visitor QR passes",
      "Full audit trail & priority support on every issue",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For small chains — true multi-property with enterprise-grade controls.",
    pricing: {
      monthly: { amount: "11,499", per: "/month" },
      halfYearly: { amount: "61,999", per: "/6 months", effective: "≈ ₹10,333/mo" },
      yearly: { amount: "1,17,199", per: "/year", effective: "≈ ₹9,767/mo" },
    },
    limits: [
      "3 properties · up to 4 buildings each",
      "Owner + 60 staff logins",
      "1,200 active residents · 12,000 lifetime records",
      "600 GB storage",
      "40,000 emails + 2,200 WhatsApp + 1,500 SMS/month",
      "350,000 AI tokens/month",
    ],
    inheritsLabel: "Everything in Professional, plus",
    features: [
      "True multi-property management with cross-property occupancy",
      "Cross-property analytics, benchmarking & executive dashboards",
      "Data warehouse access & multi-language support",
      "SAML / SCIM enterprise SSO, IP whitelisting & break-glass access",
      "Full staff payroll (deductions, TDS, payslips) & multi-currency",
      "AI occupancy forecasting, dues prediction & complaint classification",
      "Full white-label (app + website) & custom domain — bundled",
      "Customer-owned notification providers & self-hosted storage",
      "Biometric / smart lock & government compliance integrations",
      "Point-in-time recovery, self-service restore & compliance reports",
      "Dedicated account manager, 24×7 support, SLA guarantee & training",
    ],
  },
];

/* Enterprise — build-your-own model. */
export const ENTERPRISE = {
  baseFee: { monthly: "699", halfYearly: "3,999", yearly: "7,999" },
  floor: { monthly: "4,999", halfYearly: "29,999", yearly: "59,999" },
} as const;

/* ---------- Full plan comparison ---------- */

export interface CompareRow {
  label: string;
  /** Values for [Basic, Beginner, Professional, Business]. */
  values: readonly [string, string, string, string];
}

export interface CompareSection {
  title: string;
  rows: readonly CompareRow[];
}

const Y = "✓";
const N = "—";

export const COMPARISON: readonly CompareSection[] = [
  {
    title: "Limits",
    rows: [
      { label: "Properties", values: ["1", "1", "1", "3"] },
      { label: "Buildings", values: ["—", "1", "Up to 4", "4 per property"] },
      { label: "Floor-level organization", values: [N, Y, Y, Y] },
      { label: "Staff logins", values: ["3", "10", "25", "60"] },
      { label: "Active residents", values: ["150", "200", "500", "1,200"] },
      { label: "Lifetime resident records", values: ["500", "2,000", "5,000", "12,000"] },
      { label: "Storage", values: ["10 GB", "100 GB", "250 GB", "600 GB"] },
      { label: "Email notifications / month", values: ["1,000", "5,000", "15,000", "40,000"] },
      { label: "WhatsApp notifications / month", values: [N, "500", "1,200", "2,200"] },
      { label: "SMS notifications / month", values: [N, "500", "800", "1,500"] },
      { label: "AI tokens / month", values: [N, N, "150,000", "350,000"] },
    ],
  },
  {
    title: "Accounts & security",
    rows: [
      { label: "Owner + staff accounts with roles", values: [Y, Y, Y, Y] },
      { label: "Guardian logins", values: [Y, Y, Y, Y] },
      { label: "Resident self-service logins", values: [N, Y, Y, Y] },
      { label: "Extended roles (warden, accountant…)", values: [N, Y, Y, Y] },
      { label: "Custom roles & approval chains", values: [N, N, Y, Y] },
      { label: "Two-factor authentication & login audit trail", values: [Y, Y, Y, Y] },
      { label: "SSO (Google / Microsoft)", values: [N, N, Y, Y] },
      { label: "SAML / SCIM enterprise SSO", values: [N, N, N, Y] },
      { label: "IP whitelisting & break-glass access", values: [N, N, N, Y] },
    ],
  },
  {
    title: "Rooms & residents",
    rows: [
      { label: "Bed-level occupancy & dashboard", values: [Y, Y, Y, Y] },
      { label: "Allocation, transfer & immutable history", values: [Y, Y, Y, Y] },
      { label: "Bulk room setup", values: [Y, Y, Y, Y] },
      { label: "Room amenities & maintenance holds", values: [N, Y, Y, Y] },
      { label: "Occupancy forecast & floor plan upload", values: [N, N, Y, Y] },
      { label: "Full resident lifecycle (check-in → alumni)", values: [Y, Y, Y, Y] },
      { label: "Admission form customization", values: [Y, Y, Y, Y] },
      { label: "Reservations, custom fields & medical info", values: [N, Y, Y, Y] },
      { label: "Document expiry tracking & bulk operations", values: [N, Y, Y, Y] },
    ],
  },
  {
    title: "Money",
    rows: [
      { label: "Fees, receipts (PDF), dues & reminders", values: [Y, Y, Y, Y] },
      { label: "Partial payments, refunds, deposits, waivers", values: [Y, Y, Y, Y] },
      { label: "Expense tracking & invoices", values: [Y, Y, Y, Y] },
      { label: "Online fee collection (Razorpay)", values: [N, Y, Y, Y] },
      { label: "GST configuration, vendors & purchases", values: [N, Y, Y, Y] },
      { label: "Double-entry ledger & bank reconciliation", values: [N, N, Y, Y] },
      { label: "Budgeting & petty cash", values: [N, N, Y, Y] },
      { label: "Full payroll (TDS, payslips) & multi-currency", values: [N, N, N, Y] },
    ],
  },
  {
    title: "Daily operations",
    rows: [
      { label: "Complaints with photos & status tracking", values: [Y, Y, Y, Y] },
      { label: "Maintenance requests & scheduling", values: [N, Y, Y, Y] },
      { label: "Complaint SLA & escalation", values: [N, N, Y, Y] },
      { label: "Visitor management", values: [N, Y, "✓ + QR passes", Y] },
      { label: "Resident attendance & curfew", values: [N, Y, Y, Y] },
      { label: "Leave workflows with guardian alerts", values: [N, Y, Y, Y] },
      { label: "Parcel & mail register", values: [N, Y, Y, Y] },
      { label: "Staff attendance, leave & shifts", values: [N, Y, Y, Y] },
    ],
  },
  {
    title: "Communication",
    rows: [
      { label: "In-app + email notifications", values: [Y, Y, Y, Y] },
      { label: "WhatsApp, SMS & push notifications", values: [N, Y, Y, Y] },
      { label: "Broadcasts, templates & scheduling", values: [N, Y, Y, Y] },
      { label: "Campaigns, consent & delivery analytics", values: [N, N, Y, Y] },
      { label: "Bring-your-own provider (SMTP / Twilio)", values: [N, N, N, Y] },
    ],
  },
  {
    title: "Reports & automation",
    rows: [
      { label: "Standard reports pack + owner dashboard", values: [Y, Y, Y, Y] },
      { label: "Report export", values: ["PDF", "PDF + Excel", "PDF + Excel", "PDF + Excel"] },
      { label: "Role-based dashboards & report scheduling", values: [N, Y, Y, Y] },
      { label: "Custom report builder & advanced analytics", values: [N, N, Y, Y] },
      { label: "Executive dashboards & data warehouse", values: [N, N, N, Y] },
      { label: "Cross-property analytics & benchmarking", values: [N, N, N, Y] },
      { label: "Dynamic form builder", values: [N, Y, Y, Y] },
      { label: "No-code workflow builder & rules engine", values: [N, N, Y, Y] },
    ],
  },
  {
    title: "Apps, AI & integrations",
    rows: [
      { label: "Operations mobile app (staff)", values: [N, Y, Y, Y] },
      { label: "Resident mobile app", values: [N, N, Y, Y] },
      { label: "White-label mobile app & website", values: [N, N, N, "✓ bundled"] },
      { label: "AI assistant, drafts & report narrator", values: [N, N, Y, Y] },
      { label: "AI forecasting & dues prediction", values: [N, N, N, Y] },
      { label: "Public REST API & webhooks", values: [N, N, Y, Y] },
      { label: "Accounting integrations (Tally, Zoho, QuickBooks)", values: [N, N, Y, Y] },
      { label: "Biometric / smart lock integration", values: [N, N, N, Y] },
    ],
  },
  {
    title: "Data protection & support",
    rows: [
      { label: "Automated daily backups (managed database)", values: [Y, Y, Y, Y] },
      { label: "Basic audit log", values: [Y, Y, Y, Y] },
      { label: "Full audit trail", values: [N, N, Y, Y] },
      { label: "Point-in-time recovery & self-service restore", values: [N, N, N, Y] },
      { label: "Compliance reports (GDPR / DPDP)", values: [N, N, N, Y] },
      { label: "Sandbox / trial environment", values: [N, Y, Y, Y] },
      { label: "Email support", values: [Y, Y, Y, Y] },
      { label: "Chat + call support", values: [N, Y, Y, Y] },
      { label: "Priority support (all issues)", values: [N, N, Y, Y] },
      { label: "Dedicated account manager, 24×7 & SLA", values: [N, N, N, Y] },
    ],
  },
];

/* ---------- Add-on catalogs ---------- */

export interface AddonRow {
  name: string;
  unit: string;
  appliesTo: string;
}

export interface AddonGroup {
  id: string;
  title: string;
  blurb: string;
  rows: readonly AddonRow[];
  footnotes?: readonly string[];
}

export const ADDON_GROUPS: readonly AddonGroup[] = [
  {
    id: "capacity",
    title: "Capacity add-ons",
    blurb: "Extra headroom on any plan limit — grow inside your tier instead of jumping a tier.",
    rows: [
      { name: "Extra staff login", unit: "per login", appliesTo: "All plans" },
      { name: "Extra active residents", unit: "block of 25", appliesTo: "All plans" },
      { name: "Extra resident records (lifetime)", unit: "block of 250", appliesTo: "All plans" },
      { name: "Extra storage", unit: "block of 10 GB", appliesTo: "All plans" },
      { name: "Extra email volume", unit: "block of 1,000", appliesTo: "All plans" },
      { name: "Extra WhatsApp volume", unit: "block of 100", appliesTo: "Beginner+" },
      { name: "Extra SMS volume", unit: "block of 100", appliesTo: "Beginner+" },
      { name: "Extra AI tokens", unit: "block of 50,000", appliesTo: "Professional+" },
      { name: "Extra building", unit: "per building", appliesTo: "Professional+" },
      { name: "Extra property", unit: "per property", appliesTo: "Business+" },
    ],
  },
  {
    id: "feature",
    title: "Feature add-ons",
    blurb: "Unlock a specific capability without upgrading the whole subscription. Add-ons drop off your bill automatically when you move to a tier that includes them.",
    rows: [
      { name: "WhatsApp notification channel", unit: "flat + usage", appliesTo: "Basic only" },
      { name: "SMS notification channel", unit: "flat + usage", appliesTo: "Basic only" },
      { name: "Resident mobile app", unit: "flat", appliesTo: "Basic, Beginner" },
      { name: "Full workflow builder (no-code)", unit: "flat", appliesTo: "Basic, Beginner" },
      { name: "Custom report builder + advanced analytics", unit: "flat", appliesTo: "Basic, Beginner" },
      { name: "AI assistant (chat + drafts + narrator)", unit: "flat", appliesTo: "Basic, Beginner" },
      { name: "Custom domain", unit: "flat", appliesTo: "Basic – Professional" },
      { name: "Full white-label (app + website)", unit: "flat", appliesTo: "Basic – Professional" },
      { name: "Customer-owned notification provider", unit: "flat", appliesTo: "Basic – Professional" },
      { name: "SSO (Google / Microsoft)", unit: "flat", appliesTo: "Basic, Beginner" },
      { name: "SAML / SCIM enterprise SSO", unit: "flat", appliesTo: "Basic – Professional" },
      { name: "Biometric / smart lock integration", unit: "flat", appliesTo: "Basic – Professional" },
    ],
  },
  {
    id: "support",
    title: "Support add-ons",
    blurb: "Raise your support level on any plan — up to a dedicated account manager and contractual SLAs.",
    rows: [
      { name: "Chat support", unit: "flat", appliesTo: "Basic only" },
      { name: "Call support (major issues)", unit: "flat", appliesTo: "Basic only" },
      { name: "Priority support (all issues)", unit: "flat", appliesTo: "Basic, Beginner" },
      { name: "Dedicated account manager", unit: "flat", appliesTo: "Basic – Professional" },
      { name: "24×7 support", unit: "flat", appliesTo: "Basic – Professional" },
      { name: "SLA guarantee", unit: "flat", appliesTo: "Basic – Professional" },
    ],
    footnotes: [
      "Training sessions: live guided training for your staff, booked per session as needed.",
      "Custom development: scoped and quoted individually per project.",
    ],
  },
  {
    id: "backup",
    title: "Backup & compliance add-ons",
    blurb: "Enterprise-grade data protection on Basic through Professional — bundled natively from Business.",
    rows: [
      { name: "Point-in-time recovery", unit: "flat", appliesTo: "Basic – Professional" },
      { name: "Self-service restore", unit: "flat", appliesTo: "Basic – Professional" },
      { name: "Compliance reports (GDPR / DPDP export)", unit: "flat", appliesTo: "Basic – Professional" },
    ],
    footnotes: [
      "Extended audit log retention: billed annually, extends retention beyond your tier's default window.",
    ],
  },
];
