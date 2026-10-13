import { cn } from "../../../lib/cn";
import type { ApiDocMethod } from "../catalog";

const METHOD_STYLE: Record<ApiDocMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  POST: "bg-indigo-500/15 text-indigo-700 border-indigo-200",
  PATCH: "bg-amber-500/15 text-amber-800 border-amber-200",
  PUT: "bg-amber-500/15 text-amber-800 border-amber-200",
  DELETE: "bg-rose-500/15 text-rose-700 border-rose-200",
};

type Props = {
  method: ApiDocMethod;
  className?: string;
};

export function MethodBadge({ method, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-lg border px-2.5 py-0.5 text-xs font-bold font-mono uppercase tracking-wide",
        METHOD_STYLE[method],
        className
      )}
    >
      {method}
    </span>
  );
}
