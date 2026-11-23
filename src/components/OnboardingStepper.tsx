import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

export type OnboardingNextAction =
  | "REVIEW"
  | "APPROVE"
  | "PAY_FEE"
  | "WAIT_DOCS"
  | "ENROLL"
  | "ASSIGN_CLASS"
  | "DONE"
  | "REJECTED"
  | "WITHDRAWN";

export type StepperStage = "SUBMITTED" | "REVIEW" | "APPROVED" | "FEE" | "ENROLLED";

export type OnboardingStepperProps = {
  status?: string | null;
  /** Optional server-derived next action (from `GET /api/applications/:id/next-action`). */
  nextAction?: OnboardingNextAction | string | null;
  blockedBy?: string[];
  className?: string;
  /** Explicit stage highlight; when provided it overrides nextAction/status mapping. */
  activeStage?: StepperStage | null;
  /** Completed stages that can be browsed. Enables button semantics on completed nodes. */
  browsableStages?: StepperStage[];
  onStageSelect?: (stage: StepperStage) => void;
};

const ORDER: readonly StepperStage[] = ["SUBMITTED", "REVIEW", "APPROVED", "FEE", "ENROLLED"];

function stepIndexForStatus(status: string): number {
  switch (status) {
    case "PENDING": return 0;
    case "UNDER_REVIEW":
    case "WAITLISTED": return 1;
    case "APPROVED": return 2;
    case "FEE_PENDING":
    case "DOCS_PENDING": return 3;
    case "ENROLLED": return 4;
    default: return 0;
  }
}

function stepIndexForAction(action: string | null | undefined, fallback: number): number {
  switch (action) {
    case "REVIEW": return 1;
    case "APPROVE": return 2;
    case "PAY_FEE":
    case "WAIT_DOCS": return 3;
    case "ENROLL":
    case "ASSIGN_CLASS":
    case "DONE": return 4;
    default: return fallback;
  }
}

export function OnboardingStepper({
  status,
  nextAction,
  blockedBy,
  className,
  activeStage,
  browsableStages,
  onStageSelect,
}: OnboardingStepperProps) {
  const { t } = useTranslation(["pages", "common"]);
  const normalized = String(status || "PENDING").toUpperCase();
  const terminal = normalized === "REJECTED" || normalized === "WITHDRAWN";
  const base = stepIndexForStatus(normalized);
  const resolvedIndex = terminal ? base : stepIndexForAction(nextAction, base);
  const explicitIndex = activeStage ? ORDER.indexOf(activeStage) : -1;
  const current = !terminal && explicitIndex >= 0 ? explicitIndex : resolvedIndex;
  const browsable = new Set(browsableStages || []);
  const interactive = Boolean(onStageSelect);

  const labels: Record<StepperStage, string> = {
    SUBMITTED: t("admissions.stepper.submitted", { defaultValue: "Submitted" }),
    REVIEW: t("admissions.stepper.review", { defaultValue: "Review" }),
    APPROVED: t("admissions.stepper.approved", { defaultValue: "Approved" }),
    FEE: t("admissions.stepper.fee", { defaultValue: "Entrance fee" }),
    ENROLLED: t("admissions.stepper.enrolled", { defaultValue: "Enrolled" }),
  };

  return (
    <div className={className} data-testid="onboarding-stepper">
      <div className="flex items-center">
        {ORDER.map((key, index) => {
          const done = !terminal && index < current;
          const active = !terminal && index === current;
          const future = !done && !active;
          const canBrowse = interactive && (active || (done && browsable.has(key)));
          const circleClass = done
            ? "bg-emerald-500 border-emerald-500 text-white"
            : active
              ? "bg-indigo-600 border-indigo-600 text-white"
              : "bg-white border-slate-200 text-slate-400";
          const labelClass = active
            ? "text-indigo-600"
            : done
              ? "text-emerald-600"
              : "text-slate-400";
          const nodeContent = (
            <>
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 ${circleClass}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : index + 1}
              </span>
              <span className={`text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${labelClass}`}>
                {labels[key]}
              </span>
            </>
          );
          const ariaLabel = active
            ? t("admissions.review.stage.currentStep", { stage: labels[key] })
            : done
              ? t("admissions.review.stage.viewCompleted", { step: index + 1, stage: labels[key] })
              : t("admissions.review.stage.lockedStep", { step: index + 1, stage: labels[key] });
          return (
            <div key={key} className="flex-1 flex items-center min-w-0">
              {canBrowse ? (
                <button
                  type="button"
                  onClick={() => onStageSelect?.(key)}
                  aria-label={ariaLabel}
                  className="flex flex-col items-center gap-1.5 shrink-0 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 hover:bg-emerald-50"
                >
                  {nodeContent}
                </button>
              ) : (
                <div
                  className={`flex flex-col items-center gap-1.5 shrink-0 rounded-xl px-1 py-1 ${active ? "bg-indigo-50/60" : ""}`}
                  aria-current={active ? "step" : undefined}
                  aria-disabled={future ? "true" : undefined}
                  aria-label={interactive ? ariaLabel : undefined}
                >
                  {nodeContent}
                </div>
              )}
              {index < ORDER.length - 1 && (
                <span className={`flex-1 h-0.5 mx-1 ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
              )}
            </div>
          );
        })}
      </div>
      {blockedBy && blockedBy.length > 0 && !terminal && (
        <p className="mt-2 text-[11px] font-semibold text-amber-600">
          {t("admissions.stepper.blockedBy", {
            defaultValue: "Waiting on: {{items}}",
            items: blockedBy.join(", "),
          })}
        </p>
      )}
    </div>
  );
}

export default OnboardingStepper;
