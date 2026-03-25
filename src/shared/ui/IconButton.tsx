"use client";

import * as React from "react";

import { cn } from "@/shared/lib/cn";

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({ className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--card)] text-[var(--title)] shadow-[var(--shadow-soft)] transition-colors hover:bg-black/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        className,
      )}
      {...props}
    />
  );
}
