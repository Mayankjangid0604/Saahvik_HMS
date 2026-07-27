import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  placeholder?: string;
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border bg-white px-2.5 text-sm text-ink",
        "focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent",
        "disabled:bg-slate-50 disabled:text-slate-500",
        error ? "border-red-500" : "border-slate-300",
        className,
      )}
      {...props}
    >
      {placeholder != null && <option value="">{placeholder}</option>}
      {options?.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
      {children}
    </select>
  ),
);
Select.displayName = "Select";
