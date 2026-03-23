"use client";

import * as React from "react";

import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed",
  secondary:
    "bg-white text-[var(--title)] border border-[var(--border)] hover:bg-black/[0.03] disabled:opacity-60 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-[var(--title)] hover:bg-black/[0.03] disabled:opacity-60 disabled:cursor-not-allowed",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export function Button({
  className,
  variant = "secondary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
