import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileDrawer } from "./MobileDrawer";
import { TopBar } from "./TopBar";

const COLLAPSE_KEY = "saahvik.sidebar.collapsed";

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Desktop sidebar collapse — persisted so it survives reloads.
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSE_KEY) === "1",
  );

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar collapsed={collapsed} />
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenuClick={() => setDrawerOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
        />
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
