import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { typeClass } from "./tokens";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "title">;

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
  ...rest
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        className,
      )}
      {...rest}
    >
      <div className="min-w-0 space-y-1">
        <h1 className={typeClass.pageTitle}>{title}</h1>
        {subtitle ? <p className={typeClass.subtitle}>{subtitle}</p> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}
