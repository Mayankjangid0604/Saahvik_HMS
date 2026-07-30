import {
  LayoutDashboard,
  BedDouble,
  Users,
  GraduationCap,
  FileUp,
  IndianRupee,
  ReceiptText,
  AlarmClock,
  FileText,
  ShieldCheck,
  BadgePercent,
  Wallet,
  Wrench,
  BarChart3,
  UserCog,
  Building2,
  LayoutGrid,
  Tags,
  Bell,
  ClipboardList,
  CreditCard,
  DatabaseBackup,
  type LucideIcon,
} from "lucide-react";
import type { StaffPermission } from "@/api/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Match nested paths too (e.g. /payments/:id) */
  end?: boolean;
  /** Owners always see it; staff only if they hold this permission. */
  requires?: StaffPermission;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Hostel",
    items: [{ label: "Rooms & Beds", to: "/rooms", icon: BedDouble }],
  },
  {
    label: "Residents",
    items: [
      { label: "All Residents", to: "/residents", icon: Users, end: true },
      { label: "Alumni", to: "/residents/alumni", icon: GraduationCap },
      { label: "Bulk Import", to: "/residents/import", icon: FileUp },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payments", to: "/payments", icon: IndianRupee },
      { label: "Expenses", to: "/expenses", icon: Wallet, requires: "manageExpenses" },
      { label: "Fees & Assignments", to: "/fees", icon: ReceiptText },
      { label: "Dues", to: "/dues", icon: AlarmClock },
      { label: "Invoices", to: "/invoices", icon: FileText },
      { label: "Security Deposits", to: "/deposits", icon: ShieldCheck },
      { label: "Discounts", to: "/discounts", icon: BadgePercent },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Complaints", to: "/complaints", icon: Wrench },
      { label: "Reports", to: "/reports", icon: BarChart3 },
    ],
  },
  {
    items: [{ label: "Staff", to: "/staff", icon: UserCog }],
  },
  {
    label: "Settings",
    items: [
      { label: "Organization", to: "/settings", icon: Building2, end: true },
      { label: "Wings", to: "/settings/wings", icon: LayoutGrid },
      {
        label: "Expense Categories",
        to: "/settings/expense-categories",
        icon: Tags,
        requires: "manageExpenses",
      },
      { label: "Notifications", to: "/notifications", icon: Bell },
      { label: "Admission Form", to: "/settings/admission-form", icon: ClipboardList },
      { label: "Subscription", to: "/settings/subscription", icon: CreditCard },
      { label: "Export Data", to: "/settings/export", icon: DatabaseBackup },
    ],
  },
];
