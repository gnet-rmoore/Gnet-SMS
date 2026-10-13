import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { typeClass } from "./tokens";

type SectionTitleProps = {
  children: ReactNode;
  as?: "h2" | "h3";
} & HTMLAttributes<HTMLHeadingElement>;

export function SectionTitle({
  children,
  as: Tag = "h2",
  className,
  ...rest
}: SectionTitleProps) {
  return (
    <Tag className={cn(typeClass.sectionTitle, className)} {...rest}>
      {children}
    </Tag>
  );
}
