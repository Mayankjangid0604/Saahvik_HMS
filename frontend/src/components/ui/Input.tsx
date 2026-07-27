import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border bg-white px-3 text-sm text-ink placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent",
        "disabled:bg-slate-50 disabled:text-slate-500",
        error ? "border-red-500" : "border-slate-300",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-md border bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent",
        "disabled:bg-slate-50 disabled:text-slate-500",
        error ? "border-red-500" : "border-slate-300",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
