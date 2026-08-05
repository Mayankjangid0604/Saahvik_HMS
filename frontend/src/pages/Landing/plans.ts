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
      "1 property, 1 building/wing",
      "Owner + 3 staff logins",
      "100 active residents · 500 lifetime (active + alumni)",
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
      "Automatic email updates to parents and residents",
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
      "1 property, 2 buildings/wings",
      "Owner + 10 staff logins",
      "250 active residents · 1,500 lifetime (active + alumni)",
      "50 GB storage",
      "2,000 emails + 500 WhatsApp + 500 SMS/month",
    ],
    inheritsLabel: "Everything in Basic, plus",
    features: [
      "Parent/guardian login — one login covers multiple residents",
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
    tagline: "For operations spanning two properties, with automation and AI.",
    pricing: {
      monthly: { amount: "5,499", per: "/month" },
      halfYearly: { amount: "29,599", per: "/6 months", effective: "≈ ₹4,933/mo" },
      yearly: { amount: "55,999", per: "/year", effective: "≈ ₹4,667/mo" },
    },
    limits: [
      "2 properties, 2 buildings/wings each",
      "Owner + 25 staff logins",
      "600 active residents · 3,000 lifetime (active + alumni)",
      "150 GB storage",
      "10,000 emails + 1,500 WhatsApp + 1,000 SMS/month",
      "100,000 AI tokens/month",
    ],
    inheritsLabel: "Everything in Beginner, plus",
    features: [
      "Resident self-service login — residents see their own fees & receipts",
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
      "3 properties, 2 buildings/wings each",
      "Owner + 100 staff logins",
      "1,000 active residents + 1,000 parent logins (1:1 with residents)",
      "350 GB storage",
      "15,000 emails + 2,000 WhatsApp + 1,500 SMS/month",
      "250,000 AI tokens/month",
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
      { label: "Properties", values: ["1", "1", "2", "3"] },
      // Per property, so the figure reads the same way across all four plans.
      { label: "Buildings / wings (per property)", values: ["1", "2", "2", "2"] },
      { label: "Floor-level organization", values: [N, Y, Y, Y] },
      { label: "Staff logins", values: ["3", "10", "25", "100"] },
      { label: "Active residents", values: ["100", "250", "600", "1,000"] },
      {
        label: "Lifetime records (active + alumni)",
        values: ["500", "1,500", "3,000", "5,000"],
      },
      { label: "Parent logins", values: [N, "Included", "Included", "1,000 (1:1)"] },
      { label: "Storage", values: ["10 GB", "50 GB", "150 GB", "350 GB"] },
      { label: "Email notifications / month", values: ["1,000", "2,000", "10,000", "15,000"] },
      { label: "WhatsApp notifications / month", values: [N, "500", "1,500", "2,000"] },
      { label: "SMS notifications / month", values: [N, "500", "1,000", "1,500"] },
      { label: "AI tokens / month", values: [N, N, "100,000", "250,000"] },
    ],
  },
  {
    title: "Accounts & security",
    rows: [
      { label: "Owner + staff accounts with roles", values: [Y, Y, Y, Y] },
      { label: "Parent/guardian login", values: [N, Y, Y, Y] },
      { label: "Resident self-service login", values: [N, N, Y, Y] },
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

/**
 * An add-on is listed by name and billing unit only. Which tier needs which
 * add-on is deliberately not shown here — it depends on the plan you land on,
 * and pricing is quoted on contact anyway.
 */
export interface AddonRow {
  name: string;
  unit: string;
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
      { name: "Extra staff login", unit: "per login" },
      { name: "Extra active residents", unit: "block of 25" },
      { name: "Extra resident records (lifetime)", unit: "block of 250" },
      { name: "Extra storage", unit: "block of 10 GB" },
      { name: "Extra email volume", unit: "block of 1,000" },
      { name: "Extra WhatsApp volume", unit: "block of 100" },
      { name: "Extra SMS volume", unit: "block of 100" },
      { name: "Extra AI tokens", unit: "block of 50,000" },
      { name: "Extra building", unit: "per building" },
      { name: "Extra property", unit: "per property" },
    ],
  },
  {
    id: "feature",
    title: "Feature add-ons",
    blurb: "Unlock a specific capability without upgrading the whole subscription. Add-ons drop off your bill automatically when you move to a tier that includes them.",
    rows: [
      { name: "WhatsApp notification channel", unit: "flat + usage" },
      { name: "SMS notification channel", unit: "flat + usage" },
      { name: "Resident mobile app", unit: "flat" },
      { name: "Full workflow builder (no-code)", unit: "flat" },
      { name: "Custom report builder + advanced analytics", unit: "flat" },
      { name: "AI assistant (chat + drafts + narrator)", unit: "flat" },
      { name: "Custom domain", unit: "flat" },
      { name: "Full white-label (app + website)", unit: "flat" },
      { name: "Customer-owned notification provider", unit: "flat" },
      { name: "SSO (Google / Microsoft)", unit: "flat" },
      { name: "SAML / SCIM enterprise SSO", unit: "flat" },
      { name: "Biometric / smart lock integration", unit: "flat" },
    ],
  },
  {
    id: "support",
    title: "Support add-ons",
    blurb: "Raise your support level on any plan — up to a dedicated account manager and contractual SLAs.",
    rows: [
      { name: "Chat support", unit: "flat" },
      { name: "Call support (major issues)", unit: "flat" },
      { name: "Priority support (all issues)", unit: "flat" },
      { name: "Dedicated account manager", unit: "flat" },
      { name: "24×7 support", unit: "flat" },
      { name: "SLA guarantee", unit: "flat" },
    ],
    footnotes: [
      "Training sessions: live guided training for your staff, booked per session as needed.",
      "Custom development: scoped and quoted individually per project.",
    ],
  },
  {
    id: "backup",
    title: "Backup & compliance add-ons",
    blurb: "Enterprise-grade data protection, available on any plan that doesn't already bundle it.",
    rows: [
      { name: "Point-in-time recovery", unit: "flat" },
      { name: "Self-service restore", unit: "flat" },
      { name: "Compliance reports (GDPR / DPDP export)", unit: "flat" },
    ],
    footnotes: [
      "Extended audit log retention: billed annually, extends retention beyond your tier's default window.",
    ],
  },
];

/**
 * Plain-language explanations for plan features, aimed at non-IT hostel owners.
 * Keyed by the exact feature string used in PLANS[].features and PLANS[].limits.
 */
export const FEATURE_EXPLANATIONS: Record<string, string> = {
  // Basic
  "Rooms, beds & bed-level occupancy dashboard":
    "See exactly which beds are empty and which are taken, on one screen. Helps you fill vacancies faster.",
  "Fee collection with PDF receipts, dues tracking & automated reminders":
    "Collect rent, print receipts, and the system automatically reminds students who haven't paid.",
  "Partial payments, refunds, late fees, discounts & security deposits":
    "Accept part payment, charge late fees, apply discounts, and manage security deposits — all tracked automatically.",
  "Expense tracking & invoice generation":
    "Record hostel expenses (maintenance, electricity, supplies) and generate bills for residents.",
  "Complaint logging with photos, assignment & status tracking":
    "Students can submit complaints with photos. You assign them to staff and track until resolved.",
  "4 standard reports (occupancy, dues, residents, collections) as PDF":
    "Download ready-made reports on occupancy, pending payments, and collections as PDF files.",
  "Admission form customization & bulk fee assignment":
    "Design your own admission form fields and set fees for many students at once.",
  "Automatic email updates to parents and residents":
    "Fee reminders, receipts, and status updates go out by email automatically — no login needed on their side.",
  "2FA, login audit trail & automated daily backups":
    "Extra login security with OTP, a log of who logged in when, and automatic daily data backups.",
  "Email support & self-serve onboarding":
    "Get help via email and use guided setup to configure your hostel yourself.",
  // Beginner
  "Parent/guardian login — one login covers multiple residents":
    "Parents/guardians get their own login to check their child's fees and status. One parent with two children in the hostel still uses a single login.",
  "WhatsApp & SMS notifications with announcement broadcasts":
    "Send fee reminders and announcements directly to students via WhatsApp and SMS.",
  "Online fee collection from residents via Razorpay":
    "Students can pay fees online using UPI, cards, or net banking. Money goes to your bank account.",
  "Visitor management with pre-approval & resident alerts":
    "Track who visits the hostel. Residents get alerted when their visitor arrives.",
  "Resident attendance, curfew tracking & leave workflows":
    "Mark daily attendance, enforce curfew timings, and manage leave requests from students.",
  "Parcel register with pickup confirmation":
    "Log incoming parcels and notify the student. They confirm when they pick it up.",
  "Staff attendance, leave & shift scheduling":
    "Track your staff's attendance, manage their leaves, and schedule shifts.",
  "Operations mobile app for staff, with push notifications":
    "Your staff get a mobile app for their daily tasks — room checks, complaints, visitor logs.",
  "GST configuration, vendor management & purchase records":
    "Set up GST for billing, manage your suppliers, and track purchases.",
  "Excel exports, report scheduling & role-based dashboards":
    "Download data as Excel, schedule reports to email automatically, and give each staff role its own dashboard.",
  "Dynamic form builder, sandbox environment & custom branding":
    "Build custom forms, test changes in a safe sandbox, and add your hostel's logo and colors.",
  "Chat support + call support for major issues":
    "Get help via chat anytime, and phone support for urgent problems.",
  // Professional
  "Resident self-service login — residents see their own fees & receipts":
    "Students get their own login to check their fees, download receipts, and see room details themselves.",
  "Multi-building hierarchy with per-building floors":
    "Manage multiple buildings (boys hostel, girls hostel, etc.) each with their own floor structure.",
  "Custom role creation, delegation & multi-level approvals":
    "Create custom staff roles (e.g. floor warden, accountant) with different permissions and approval chains.",
  "Double-entry accounting ledger, bank reconciliation & budgeting":
    "Full accounting system — reconcile with your bank statement and set budgets.",
  "Petty cash management":
    "Track small daily cash expenses (chai, repairs, stationery) with proper records.",
  "No-code workflow builder & business rules engine":
    "Set up automatic rules like 'if rent is 15 days late, send reminder' — no coding needed.",
  "Custom report builder & advanced analytics dashboards":
    "Create your own reports and see trends and analytics on visual dashboards.",
  "Resident mobile app":
    "Students get their own mobile app to pay fees, submit complaints, and check notices.",
  "AI assistant, AI-drafted communication & report narrator":
    "AI helps draft messages to parents, explains reports in simple language, and answers your questions.",
  "SSO (Google / Microsoft) & device trust":
    "Staff and residents can sign in with their Google or Microsoft accounts. Trusted devices skip OTP.",
  "Public REST API, webhooks & accounting integrations (Tally, Zoho, QuickBooks)":
    "Connect with Tally, Zoho, or QuickBooks so your accountant sees hostel data in their own software.",
  "Occupancy forecasting, floor plan upload & visitor QR passes":
    "Predict future vacancies, upload your floor plans, and give visitors QR-code entry passes.",
  "Full audit trail & priority support on every issue":
    "Complete log of every action taken in the system. Every support request gets priority handling.",
  // Business
  "True multi-property management with cross-property occupancy":
    "Run multiple hostels from one account. See occupancy across all properties at a glance.",
  "Cross-property analytics, benchmarking & executive dashboards":
    "Compare performance across your hostels — which one collects faster, has lower vacancy, etc.",
  "Data warehouse access & multi-language support":
    "Access raw data for custom analysis. Interface available in multiple languages.",
  "SAML / SCIM enterprise SSO, IP whitelisting & break-glass access":
    "Enterprise-grade security — restrict logins to your office network, with emergency override access.",
  "Full staff payroll (deductions, TDS, payslips) & multi-currency":
    "Run complete payroll for your hostel staff including tax deductions and payslip generation.",
  "AI occupancy forecasting, dues prediction & complaint classification":
    "AI predicts which students might leave, who's likely to default on fees, and sorts complaints automatically.",
  "Full white-label (app + website) & custom domain — bundled":
    "Your hostel's own branded app and website (yourhostel.com) — included in the plan.",
  "Customer-owned notification providers & self-hosted storage":
    "Use your own SMS/WhatsApp provider and storage server for full data control.",
  "Biometric / smart lock & government compliance integrations":
    "Connect fingerprint scanners or smart locks. Auto-generate reports required by local authorities.",
  "Point-in-time recovery, self-service restore & compliance reports":
    "Restore your data to any point in time if something goes wrong. Generate compliance reports.",
  "Dedicated account manager, 24×7 support, SLA guarantee & training":
    "Your own account manager, round-the-clock support with guaranteed response times, plus staff training.",
};
