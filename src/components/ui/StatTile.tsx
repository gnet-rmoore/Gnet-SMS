import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { surfaceClass, typeClass } from "./tokens";

type StatTileProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function StatTile({
  label,
  value,
  icon,
  hint,
  className,
  ...rest
}: StatTileProps) {
  return (
    <div
      className={cn(surfaceClass.nested, "space-y-3", className)}
      {...rest}
    >
      <div className="flex justify-between items-start gap-3">
        <p className={typeClass.metaLabel}>{label}</p>
        {icon ? (
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            {icon}
          </div>
        ) : null}
      </div>
      <p className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">
        {value}
      </p>
      {hint ? <p className={typeClass.helper}>{hint}</p> : null}
    </div>
  );
}
