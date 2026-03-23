import * as React from "react";

import { cn } from "@/shared/lib/cn";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-panel)] bg-white shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    />
  );
}
