import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Centered card layout for login/signup/reset screens. */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-8">
      <Link to="/" className="mb-6 flex items-center gap-2.5 no-underline">
        <img src="/brand/saahvik-mark.png" alt="" className="h-10 w-10 rounded-lg" />
        <div>
          <p className="text-lg font-semibold text-primary">Saahvik</p>
          <p className="text-xs text-muted">Hostel Management</p>
        </div>
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-base font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
