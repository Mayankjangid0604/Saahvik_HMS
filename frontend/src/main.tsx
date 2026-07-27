import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";

import { AuthProvider } from "@/features/auth/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";

import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { TwoFactorPage } from "@/features/auth/TwoFactorPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { HostelSetupPage } from "@/features/hostel/HostelSetupPage";
import { RoomsPage } from "@/features/rooms/RoomsPage";
import { ResidentsPage } from "@/features/residents/ResidentsPage";
import { AddResidentPage } from "@/features/residents/AddResidentPage";
import { ResidentDetailPage } from "@/features/residents/ResidentDetailPage";
import { BulkImportPage } from "@/features/residents/BulkImportPage";
import { AlumniPage } from "@/features/residents/AlumniPage";
import { PaymentsPage } from "@/features/payments/PaymentsPage";
import { PaymentDetailPage } from "@/features/payments/PaymentDetailPage";
import { FeeStructuresPage } from "@/features/fees/FeeStructuresPage";
import { FeeAssignmentPage } from "@/features/fees/FeeAssignmentPage";
import { BulkFeeAssignPage } from "@/features/fees/BulkFeeAssignPage";
import { DuesPage } from "@/features/dues/DuesPage";
import { InvoicesPage } from "@/features/invoices/InvoicesPage";
import { InvoiceDetailPage } from "@/features/invoices/InvoiceDetailPage";
import { SecurityDepositsPage } from "@/features/deposits/SecurityDepositsPage";
import { ComplaintsPage } from "@/features/complaints/ComplaintsPage";
import { ComplaintDetailPage } from "@/features/complaints/ComplaintDetailPage";
import { DiscountsPage } from "@/features/discounts/DiscountsPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ReportDetailPage } from "@/features/reports/ReportDetailPage";
import { StaffPage } from "@/features/staff/StaffPage";
import { StaffDetailPage } from "@/features/staff/StaffDetailPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { NotificationPreferencesPage } from "@/features/notifications/NotificationPreferencesPage";
import { OrgSettingsPage } from "@/features/settings/OrgSettingsPage";
import { AdmissionFormConfigPage } from "@/features/settings/AdmissionFormConfigPage";
import { SubscriptionPage } from "@/features/settings/SubscriptionPage";
import { DataExportPage } from "@/features/export/DataExportPage";
import { ProfilePage } from "@/features/profile/ProfilePage";
import { ChangePasswordPage } from "@/features/profile/ChangePasswordPage";
import { TwoFactorSetupPage } from "@/features/profile/TwoFactorSetupPage";
import { NotFoundPage } from "@/features/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/2fa", element: <TwoFactorPage /> },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "setup", element: <HostelSetupPage /> },
      { path: "rooms", element: <RoomsPage /> },
      { path: "residents", element: <ResidentsPage /> },
      { path: "residents/new", element: <AddResidentPage /> },
      { path: "residents/import", element: <BulkImportPage /> },
      { path: "residents/alumni", element: <AlumniPage /> },
      { path: "residents/:id", element: <ResidentDetailPage /> },
      { path: "payments", element: <PaymentsPage /> },
      { path: "payments/:id", element: <PaymentDetailPage /> },
      { path: "fees", element: <FeeStructuresPage /> },
      { path: "fees/assign", element: <FeeAssignmentPage /> },
      { path: "fees/bulk-assign", element: <BulkFeeAssignPage /> },
      { path: "dues", element: <DuesPage /> },
      { path: "invoices", element: <InvoicesPage /> },
      { path: "invoices/:id", element: <InvoiceDetailPage /> },
      { path: "deposits", element: <SecurityDepositsPage /> },
      { path: "complaints", element: <ComplaintsPage /> },
      { path: "complaints/:id", element: <ComplaintDetailPage /> },
      { path: "discounts", element: <DiscountsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "reports/:type", element: <ReportDetailPage /> },
      { path: "staff", element: <StaffPage /> },
      { path: "staff/:id", element: <StaffDetailPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "notifications/preferences", element: <NotificationPreferencesPage /> },
      { path: "settings", element: <OrgSettingsPage /> },
      { path: "settings/admission-form", element: <AdmissionFormConfigPage /> },
      { path: "settings/subscription", element: <SubscriptionPage /> },
      { path: "settings/export", element: <DataExportPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "profile/password", element: <ChangePasswordPage /> },
      { path: "profile/2fa", element: <TwoFactorSetupPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
