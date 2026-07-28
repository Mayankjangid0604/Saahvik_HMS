import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "./Input";

export interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

/**
 * Password field with hold-to-view: the plaintext is visible only while the
 * eye icon is actively pressed (mouse, touch, or a held Enter/Space key).
 * Releasing, leaving the button, or blurring hides it again.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, error, ...props }, ref) => {
    const [revealed, setRevealed] = useState(false);
    const show = () => setRevealed(true);
    const hide = () => setRevealed(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={revealed ? "text" : "password"}
          error={error}
          className={cn("pr-9", className)}
          {...props}
        />
        <button
          type="button"
          aria-label="Hold to show password"
          title="Hold to show password"
          className={cn(
            "absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 select-none",
            "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
            revealed ? "text-accent" : "text-slate-400 hover:text-ink",
          )}
          onMouseDown={(e) => {
            e.preventDefault(); // keep focus in the input
            show();
          }}
          onMouseUp={hide}
          onMouseLeave={hide}
          onTouchStart={(e) => {
            e.preventDefault();
            show();
          }}
          onTouchEnd={hide}
          onTouchCancel={hide}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
              e.preventDefault();
              show();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter" || e.key === " ") hide();
          }}
          onBlur={hide}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
