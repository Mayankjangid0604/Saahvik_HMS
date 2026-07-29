import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/** Official Google "G" in brand colors, sized to match lucide icons. */
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("h-4 w-4", className)}>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.27a12.02 12.02 0 0 0 0 10.78l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  );
}

/** Apple mark, single color. */
export function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("h-4 w-4 fill-current", className)}>
      <path d="M17.05 12.54c-.03-2.89 2.36-4.27 2.47-4.34-1.35-1.97-3.44-2.24-4.18-2.27-1.78-.18-3.47 1.05-4.37 1.05-.9 0-2.29-1.02-3.77-1-1.94.03-3.72 1.13-4.72 2.86-2.01 3.49-.51 8.66 1.45 11.49.96 1.39 2.1 2.94 3.6 2.89 1.44-.06 1.99-.93 3.73-.93s2.23.93 3.76.9c1.55-.03 2.53-1.41 3.48-2.8 1.1-1.61 1.55-3.17 1.57-3.25-.03-.02-3.01-1.16-3.02-4.6ZM14.17 4.06c.8-.96 1.33-2.3 1.18-3.64-1.14.05-2.53.76-3.35 1.72-.74.85-1.38 2.22-1.2 3.53 1.27.1 2.57-.65 3.37-1.61Z" />
    </svg>
  );
}

const socialButtonClass = cn(
  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white",
  "px-4 text-sm font-medium text-ink hover:bg-slate-50",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  "disabled:cursor-not-allowed disabled:text-slate-400",
);

/**
 * "Continue with Google" (mock flow) + "Continue with Apple" (placeholder,
 * intentionally not wired — Apple Sign-In is out of scope, so it is disabled
 * rather than given a fake flow).
 */
export function SocialButtons({
  onGoogle,
  googleLoading,
  googleLabel = "Continue with Google",
}: {
  onGoogle: () => void;
  googleLoading: boolean;
  googleLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        className={socialButtonClass}
        onClick={onGoogle}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {googleLoading ? "Waiting for Google…" : googleLabel}
      </button>
      {/* Placeholder only — no mock logic on purpose. */}
      <span title="Coming soon" className="block">
        <button
          type="button"
          className={socialButtonClass}
          disabled
          aria-label="Continue with Apple — coming soon"
          title="Coming soon"
        >
          <AppleIcon />
          Continue with Apple
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            Soon
          </span>
        </button>
      </span>
    </div>
  );
}

/** "or continue with email" style divider. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-slate-200" />
      <span className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
        {label}
      </span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
