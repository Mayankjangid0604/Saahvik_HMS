import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { navGroups } from "./nav";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission } from "@/features/staff/permissions";

/** Navy sidebar. Champagne gold marks only the active item. */
export function SidebarContent({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { org, user } = useAuth();
  // Hide permission-gated items from staff who lack them (owners see everything).
  const groups = (navGroups ?? [])
    .map((g) => ({
      ...g,
      items: (g.items ?? []).filter((i) => !i.requires || hasPermission(user, i.requires)),
    }))
    .filter((g) => (g.items?.length ?? 0) > 0);
  return (
    <div className="flex h-full flex-col bg-primary text-slate-300">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-white/10",
          collapsed ? "justify-center px-0" : "gap-2.5 px-4",
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent font-serif text-lg font-bold text-white">
          S
        </span>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Saahvik</p>
            <p className="truncate text-[11px] text-slate-400">{org?.hostelName ?? "Hostel"}</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((group, gi) => (
          <div key={group.label ?? gi} className={cn(gi > 0 && "mt-1 border-t border-white/5 pt-1")}>
            {group.label && !collapsed && (
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center border-l-2 py-1.5 text-[13px]",
                    collapsed ? "justify-center px-0" : "gap-2.5 px-4",
                    isActive
                      ? "border-accent bg-white/5 font-medium text-accent"
                      : "border-transparent hover:bg-white/5 hover:text-white",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      {!collapsed && (
        <div className="shrink-0 border-t border-white/10 px-4 py-2.5">
          <p className="text-[11px] text-slate-500">Basic Plan · Saahvik v0.1</p>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <aside className={cn("hidden shrink-0 md:block", collapsed ? "w-16" : "w-56")}>
      <div className={cn("fixed inset-y-0", collapsed ? "w-16" : "w-56")}>
        <SidebarContent collapsed={collapsed} />
      </div>
    </aside>
  );
}
