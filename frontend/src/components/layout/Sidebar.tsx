import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { navGroups } from "./nav";
import { useAuth } from "@/features/auth/AuthContext";

/** Navy sidebar. Champagne gold marks only the active item. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { org } = useAuth();
  return (
    <div className="flex h-full flex-col bg-primary text-slate-300">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-serif text-lg font-bold text-white">
          S
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Saahvik</p>
          <p className="truncate text-[11px] text-slate-400">{org?.hostelName ?? "Hostel"}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? gi} className={cn(gi > 0 && "mt-1 border-t border-white/5 pt-1")}>
            {group.label && (
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
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 border-l-2 px-4 py-1.5 text-[13px]",
                    isActive
                      ? "border-accent bg-white/5 font-medium text-accent"
                      : "border-transparent hover:bg-white/5 hover:text-white",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-white/10 px-4 py-2.5">
        <p className="text-[11px] text-slate-500">Basic Plan · Saahvik v0.1</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <div className="fixed inset-y-0 w-56">
        <SidebarContent />
      </div>
    </aside>
  );
}
