import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { surfaceClass } from "./tokens";

type SurfaceVariant = keyof typeof surfaceClass;

type SurfaceProps = {
  children?: ReactNode;
  variant?: SurfaceVariant;
  as?: "div" | "section" | "article";
} & HTMLAttributes<HTMLElement>;

export function Surface({
  children,
  variant = "primary",
  as: Tag = "section",
  className,
  ...rest
}: SurfaceProps) {
  return (
    <Tag className={cn(surfaceClass[variant], className)} {...rest}>
      {children}
    </Tag>
  );
}
