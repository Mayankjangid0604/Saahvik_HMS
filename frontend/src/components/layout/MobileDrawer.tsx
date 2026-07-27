import { SidebarContent } from "./Sidebar";

/** Slide-over sidebar for < 768px. */
export function MobileDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
