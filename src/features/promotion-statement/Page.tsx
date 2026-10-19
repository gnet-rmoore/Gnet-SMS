import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { PageShell, PageHeader } from "../../components/ui";
import { PageToast, usePageToast } from "../academics-shared/PageToast";
import { academicCalendarApi } from "../academics-shared/calendar/api";
import { periodsOf } from "../academics-shared/calendar/selectors";
import {
  PromotionStatementReport,
  type ReportPeriod,
} from "./components/PromotionStatementReport";

export function PromotionStatementPage() {
  const { t } = useTranslation("pages");
  const { school } = useAuthStore();
  const schoolId = school?.id || "";
  const slug = school?.slug || "";
  const [params, setParams] = useSearchParams();
  const { toast } = usePageToast();
  const [periods, setPeriods] = React.useState<ReportPeriod[]>([]);

  React.useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    academicCalendarApi
      .fetchCalendar(schoolId)
      .then((res) => {
        if (cancelled) return;
        setPeriods(
          periodsOf(res)
            .filter((p) => p.id)
            .map((p) => ({
              id: p.id as string,
              label: p.label || p.shortCode || "Period",
              shortCode: p.shortCode || p.label || "P",
            }))
        );
      })
      .catch(() => setPeriods([]));
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  return (
    <PageShell width="wide">
      <PageToast toast={toast} />
      <PageHeader
        title={t("promotionStatement.title")}
        subtitle={t("promotionStatement.subtitle")}
        actions={
          <div className="print:hidden">
            <Link
              to={`/${slug}/year-transition`}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              {t("promotionStatement.backToTransition")}
            </Link>
          </div>
        }
      />
      <PromotionStatementReport
        schoolId={schoolId}
        schoolName={school?.name}
        initialYearKey={params.get("schoolYearKey") || undefined}
        initialRunId={params.get("runId") || undefined}
        periods={periods}
        onNavigate={(next) => {
          const p = new URLSearchParams();
          p.set("schoolYearKey", next.schoolYearKey);
          if (next.scope === "TERM" && next.periodId) p.set("periodId", next.periodId);
          setParams(p, { replace: true });
        }}
      />
    </PageShell>
  );
}

export default PromotionStatementPage;
