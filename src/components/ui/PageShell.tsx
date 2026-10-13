import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { pageShellClass } from "./tokens";

type PageShellProps = {
  children: ReactNode;
  /** `wide` → max-w-7xl for dense tables / schedules */
  width?: keyof typeof pageShellClass;
} & HTMLAttributes<HTMLDivElement>;

export function PageShell({
  children,
  width = "default",
  className,
  ...rest
}: PageShellProps) {
  return (
    <div className={cn(pageShellClass[width], className)} {...rest}>
      {children}
    </div>
  );
}
