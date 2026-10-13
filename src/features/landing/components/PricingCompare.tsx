import React from "react";
import { Check, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Reveal } from "./Reveal";
import { TableScroll } from "../../../components/ui/TableScroll";
import {
  featuresByGroup,
  featureLabel,
} from "../../../constants/platformFeatures";
import type { PublicPlanCard } from "../content/plans";
import { PricingCardsSkeleton } from "./skeletons";

/** Curated keys shown in the marketing comparison matrix (grouped via catalog). */
const COMPARE_KEYS = new Set([
  "core",
  "roles_access",
  "reports",
  "api_access",
  "custom_domain",
  "admissions",
  "enrollment",
  "bulk_import",
  "transcripts",
  "curriculum",
  "classrooms",
  "classroom_workspace",
  "attendance",
  "schedules",
  "calendar",
  "lesson_plans",
  "gradebook",
  "exams",
  "online_exams",
  "report_cards",
  "finance",
  "expenses",
  "payroll",
  "receipts",
  "staff",
  "leave",
  "parent_portal",
  "communications",
  "documents",
  "notifications",
  "maintenance",
  "security",
  "procurement",
  "inventory",
  "library",
  "clinic",
  "counseling",
  "transport",
]);

function formatStorageMb(mb: number | null, unlimited: string): string {
  if (mb == null) return unlimited;
  if (mb >= 1024) return `${Math.round(mb / 1024)} GB`;
  return `${mb} MB`;
}

function formatSeats(n: number | null, unlimited: string): string {
  if (n == null) return unlimited;
  return n.toLocaleString();
}

type PricingCompareProps = {
  plans: PublicPlanCard[];
  loading?: boolean;
};

/**
 * Feature comparison matrix — one fetch shared with plan cards on `/pricing`.
 */
export function PricingCompare({ plans, loading }: PricingCompareProps) {
  const { t } = useTranslation("public");
  const groups = featuresByGroup()
    .map((g) => ({
      group: g.group,
      items: g.items.filter((i) => COMPARE_KEYS.has(i.key)),
    }))
    .filter((g) => g.items.length > 0);

  const unlimited = t("landing.pricingUnlimited");

  return (
    <section
      id="pricing-compare"
      className="relative overflow-hidden bg-slate-100 py-12 sm:py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {t("landing.pricingPageCompareEyebrow")}
          </p>
          <h2 className="mt-3 font-landing-display text-3xl tracking-tight text-slate-900 sm:text-4xl">
            {t("landing.pricingPageCompareTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-500">
            {t("landing.pricingPageCompareBody")}
          </p>
        </Reveal>

        {loading ? (
          <div className="mt-10">
            <PricingCardsSkeleton />
          </div>
        ) : (
          <div className="mt-10 overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] sm:p-6">
            <TableScroll hint={t("landing.pricingPageCompareHint")}>
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th
                      scope="col"
                      className="sticky start-0 z-10 bg-white py-3 pe-4 ps-1 text-xs font-bold uppercase tracking-wide text-slate-400"
                    >
                      {/* feature column */}
                    </th>
                    {plans.map((plan) => (
                      <th
                        key={plan.code}
                        scope="col"
                        className="px-3 py-3 text-center font-landing-display text-base font-normal tracking-tight text-slate-900"
                      >
                        {plan.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th
                      scope="row"
                      className="sticky start-0 z-10 bg-slate-50 py-3 pe-4 ps-1 text-sm font-semibold text-slate-700"
                    >
                      {t("landing.pricingPageCompareStudents")}
                    </th>
                    {plans.map((plan) => (
                      <td
                        key={plan.code}
                        className="px-3 py-3 text-center font-mono text-sm tabular-nums text-slate-700"
                      >
                        {formatSeats(plan.maxStudents, unlimited)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100">
                    <th
                      scope="row"
                      className="sticky start-0 z-10 bg-white py-3 pe-4 ps-1 text-sm font-semibold text-slate-700"
                    >
                      {t("landing.pricingPageCompareStaff")}
                    </th>
                    {plans.map((plan) => (
                      <td
                        key={plan.code}
                        className="px-3 py-3 text-center font-mono text-sm tabular-nums text-slate-700"
                      >
                        {formatSeats(plan.maxStaff, unlimited)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th
                      scope="row"
                      className="sticky start-0 z-10 bg-white py-3 pe-4 ps-1 text-sm font-semibold text-slate-700"
                    >
                      {t("landing.pricingPageCompareStorage")}
                    </th>
                    {plans.map((plan) => (
                      <td
                        key={plan.code}
                        className="px-3 py-3 text-center font-mono text-sm tabular-nums text-slate-700"
                      >
                        {formatStorageMb(plan.maxStorageMb, unlimited)}
                      </td>
                    ))}
                  </tr>

                  {groups.map((group) => (
                    <React.Fragment key={group.group}>
                      <tr>
                        <th
                          colSpan={plans.length + 1}
                          scope="colgroup"
                          className="bg-slate-50/80 px-1 pb-2 pt-6 text-xs font-bold uppercase tracking-[0.14em] text-blue-600"
                        >
                          {group.group}
                        </th>
                      </tr>
                      {group.items.map((item) => (
                        <tr key={item.key} className="border-b border-slate-100">
                          <th
                            scope="row"
                            className="sticky start-0 z-10 bg-white py-2.5 pe-4 ps-1 text-sm font-medium text-slate-700"
                          >
                            {featureLabel(item.key)}
                          </th>
                          {plans.map((plan) => {
                            const included = plan.features.includes(item.key);
                            return (
                              <td key={plan.code} className="px-3 py-2.5 text-center">
                                {included ? (
                                  <span className="inline-flex text-emerald-600" title={t("landing.pricingPageCompareIncluded")}>
                                    <Check className="mx-auto h-4 w-4" aria-hidden />
                                    <span className="sr-only">
                                      {t("landing.pricingPageCompareIncluded")}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex text-slate-300" title={t("landing.pricingPageCompareNotIncluded")}>
                                    <Minus className="mx-auto h-4 w-4" aria-hidden />
                                    <span className="sr-only">
                                      {t("landing.pricingPageCompareNotIncluded")}
                                    </span>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>
        )}
      </div>
    </section>
  );
}
