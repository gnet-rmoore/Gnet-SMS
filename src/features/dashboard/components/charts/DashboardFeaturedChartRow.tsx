import React from "react";
import { cn } from "../../../../lib/cn";

type DashboardFeaturedChartRowProps = {
  children: React.ReactNode;
  className?: string;
};

/** Finance-style featured chart row: wide chart (2/3) + side chart (1/3). */
export function DashboardFeaturedChartRow({ children, className }: DashboardFeaturedChartRowProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6 lg:grid-cols-3", className)}>{children}</div>
  );
}

export function DashboardFeaturedChartWide({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("lg:col-span-2", className)}>{children}</div>;
}

export function DashboardFeaturedChartSide({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("lg:col-span-1", className)}>{children}</div>;
}
