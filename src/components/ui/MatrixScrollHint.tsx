import { MoveHorizontal } from "lucide-react";
import { cn } from "../../lib/cn";

type MatrixScrollHintProps = {
  className?: string;
  label?: string;
};

/**
 * Tip for dense academic matrices (gradebook, timetable) that keep
 * intentional horizontal scroll on small screens (Phase 5).
 */
export function MatrixScrollHint({
  className,
  label = "Swipe sideways to see more columns",
}: MatrixScrollHintProps) {
  return (
    <p
      className={cn(
        "mb-2 flex items-center gap-2 text-xs font-medium text-slate-500 lg:hidden",
        className
      )}
      role="note"
    >
      <MoveHorizontal className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden />
      <span>{label}</span>
    </p>
  );
}
