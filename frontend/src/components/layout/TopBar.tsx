import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronRight,
  KeyRound,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/Dropdown";
import { getUnreadCount } from "@/api/notification.api";
import { resolveBreadcrumbLabel } from "./breadcrumb";
import { Clock } from "./Clock";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({
  onMenuClick,
  collapsed,
  onToggleCollapse,
}: {
  onMenuClick: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pageLabel = resolveBreadcrumbLabel(pathname);

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  });

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3 sm:gap-3 sm:px-4">
      {/* Mobile: open the drawer. Desktop: collapse the sidebar. */}
      <button
        onClick={onMenuClick}
        className="rounded p-1.5 text-muted hover:bg-slate-100 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <button
        onClick={onToggleCollapse}
        className="hidden rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink md:inline-flex"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      {/* Breadcrumb: "Saahvik HMS" › current page. */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="hidden shrink-0 font-medium text-muted sm:inline">Saahvik HMS</span>
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-300 sm:inline" />
        <span className="truncate font-semibold text-ink">{pageLabel}</span>
      </nav>

      <div className="flex-1" />

      <Clock />

      <Link
        to="/notifications"
        className="relative rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </Link>

      <ThemeToggle />

      <Dropdown
        trigger={
          <span className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-slate-100">
            <Avatar name={user?.name ?? "User"} size="sm" />
            <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
          </span>
        }
      >
        {(close) => (
          <>
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="text-sm font-medium text-ink">{user?.name}</p>
              <p className="text-xs text-muted">{user?.email}</p>
            </div>
            <DropdownItem
              onClick={() => {
                close();
                navigate("/profile");
              }}
            >
              <UserRound className="h-4 w-4" /> Profile
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                close();
                navigate("/profile/password");
              }}
            >
              <KeyRound className="h-4 w-4" /> Change password
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                close();
                navigate("/profile/2fa");
              }}
            >
              <ShieldCheck className="h-4 w-4" /> Two-factor auth
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem
              danger
              onClick={() => {
                close();
                logout();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" /> Log out
            </DropdownItem>
          </>
        )}
      </Dropdown>
    </header>
  );
}
