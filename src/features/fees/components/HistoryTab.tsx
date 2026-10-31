import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, History } from "lucide-react";
import { motion } from "motion/react";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { feesApi } from "../api";
import { FEE_TYPES, PAYMENT_METHODS, type FeePayment, type FeePaymentTxn } from "../types";
import { useAuthStore } from "../../../store/authStore";
import { formatMoney } from "../../../i18n/format";
import { MoneyInput } from "../../../components/MoneyInput";
import { ListFilterBar, ListPagination, DataTable, dataTableClass, Button } from "../../../components/ui";
import { useListFilters, type FilterFieldDef } from "../../list-filters";

export type HistoryTabProps = {
  schoolId: string;
  feeRecords: FeePayment[];
  setSelectedFee: (fee: FeePayment) => void;
  setIsDrawerOpen: (open: boolean) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
};

export function HistoryTab({
  schoolId,
  feeRecords,
  setSelectedFee,
  setIsDrawerOpen,
  showToast,
}: HistoryTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [items, setItems] = useState<FeePaymentTxn[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [minPayment, setMinPayment] = useState("1");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const feeTypeLabel = (type: string) =>
    t(`fees.feeTypes.${type}`, { defaultValue: type.replace(/_/g, " ") });

  const eventKindLabel = (kindVal: string) =>
    t(`fees.eventKinds.${kindVal}`, { defaultValue: kindVal.replace(/_/g, " ") });

  const paymentMethodLabel = (value: string) =>
    t(`fees.paymentMethods.${value}`, { defaultValue: value });

  const fields: FilterFieldDef[] = useMemo(
    () => [
      {
        key: "kind",
        label: t("fees.history.colEvent"),
        type: "enum",
        primary: true,
        allLabel: t("fees.history.allEventTypes"),
        options: (["PAYMENT", "INVOICE_CREATED", "VOID", "WRITE_OFF"] as const).map((k) => ({
          value: k,
          label: eventKindLabel(k),
        })),
      },
      {
        key: "method",
        label: t("fees.history.colMethod"),
        type: "enum",
        primary: true,
        allLabel: t("fees.history.allMethods"),
        options: [
          ...PAYMENT_METHODS.map((m) => ({
            value: m.value,
            label: paymentMethodLabel(m.value),
          })),
          { value: "CHECKOUT", label: paymentMethodLabel("CHECKOUT") },
        ],
      },
      {
        key: "feeType",
        label: t("fees.history.colFee"),
        type: "enum",
        allLabel: t("fees.history.allFeeTypes"),
        options: FEE_TYPES.map((ft) => ({
          value: ft.value,
          label: feeTypeLabel(ft.value),
        })),
      },
      {
        key: "from",
        label: t("common:from", { defaultValue: "From" }),
        type: "date",
      },
      {
        key: "to",
        label: t("common:to", { defaultValue: "To" }),
        type: "date",
      },
    ],
    // Labels are stable enough for the session; avoid re-creating options every render thrash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  );

  const filters = useListFilters({
    fields,
    defaultPageSize: 50,
    syncUrl: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await feesApi.fetchSchoolPaymentTxns(schoolId, filters.apiParams);
      setItems(Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : []);
      setTotal(Number(res?.total || 0));
    } catch (err: any) {
      console.error(err);
      setItems([]);
      setTotal(0);
      showToast(err?.message || t("fees.toast.loadHistoryFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, filters.apiParams, showToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s: any = await feesApi.fetchBillingSettings(schoolId);
        if (!cancelled && s?.minPaymentAmount != null) {
          setMinPayment(String(s.minPaymentAmount));
        }
      } catch {
        /* soft-fail */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  const saveMinPayment = async () => {
    setSettingsSaving(true);
    try {
      const s: any = await feesApi.updateBillingSettings(schoolId, {
        minPaymentAmount: Number(minPayment),
      });
      setMinPayment(String(s.minPaymentAmount ?? minPayment));
      showToast(t("fees.toast.minPaymentUpdated"), "success");
    } catch (err: any) {
      showToast(err?.message || t("fees.toast.minPaymentSaveFailed"), "error");
    } finally {
      setSettingsSaving(false);
    }
  };

  const runBackfill = async () => {
    setBackfilling(true);
    try {
      const result: any = await feesApi.backfillLegacyTxns(schoolId);
      showToast(
        t("fees.toast.backfillDone", {
          txns: result.txnsCreated || 0,
          fixed: result.amountPaidFixed || 0,
        }),
        "success"
      );
      await load();
    } catch (err: any) {
      showToast(err?.message || t("fees.toast.backfillFailed"), "error");
    } finally {
      setBackfilling(false);
    }
  };

  const openInvoice = (txn: FeePaymentTxn) => {
    const fee = feeRecords.find((f) => f.id === txn.feePaymentId);
    if (fee) {
      setSelectedFee(fee);
      setIsDrawerOpen(true);
    } else {
      showToast(t("fees.toast.invoiceNotInList"), "info");
    }
  };

  const exportCsv = async () => {
    try {
      const { page: _p, pageSize: _ps, ...rest } = filters.apiParams;
      const path = feesApi.exportSchoolPaymentTxnsUrl(
        schoolId,
        Object.fromEntries(
          Object.entries(rest).map(([k, v]) => [k, v == null ? undefined : String(v)])
        )
      );
      const token = useAuthStore.getState().accessToken;
      const res = await fetch(path, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || t("fees.toast.exportFailed"));
      }
      const text = await res.text();
      const blob = new Blob([text], { type: "text/csv" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "fee-transactions.csv";
      a.click();
      URL.revokeObjectURL(href);
      showToast(t("fees.toast.csvExported"), "success");
    } catch (e: any) {
      showToast(e?.message || t("fees.toast.exportFailed"), "error");
    }
  };

  const hasFilters = filters.hasActiveFilters;
  const emptyHint = hasFilters
    ? t("pages:listFilters.noMatchesHint")
    : t("fees.history.emptyHint");
  const emptyTitle = hasFilters
    ? t("pages:listFilters.noMatches")
    : t("fees.history.emptyTitle");

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className={`${cardShell} p-6 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              {t("fees.history.title")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t("fees.history.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => void runBackfill()}
              disabled={backfilling}
            >
              {backfilling ? t("fees.history.backfilling") : t("fees.history.backfillLegacy")}
            </Button>
            <Button type="button" variant="secondary" size="compact" onClick={() => void exportCsv()}>
              <Download className="w-4 h-4" />
              {t("fees.history.exportCsv")}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex-1 space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {t("fees.history.minInstallment")}
            </span>
            <MoneyInput
              value={minPayment}
              onValueChange={setMinPayment}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono bg-white"
            />
          </label>
          <Button
            type="button"
            size="compact"
            onClick={() => void saveMinPayment()}
            disabled={settingsSaving}
          >
            {settingsSaving ? t("common:saving") : t("fees.history.saveMinimum")}
          </Button>
          <p className="text-xs text-slate-500 sm:max-w-xs">{t("fees.history.minInstallmentHint")}</p>
        </div>

        <ListFilterBar
          fields={fields}
          q={filters.q}
          onSearchChange={filters.setQ}
          values={filters.values}
          onValueChange={filters.setValue}
          onClear={filters.clear}
          searchPlaceholder={t("fees.history.searchPlaceholder")}
          shownCount={items.length}
          totalCount={total}
          savedViewsScope={`${schoolId}:fees-history`}
        />
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        {loading ? (
          <p className="p-8 text-slate-400 text-sm">{t("fees.history.loading")}</p>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-bold text-slate-500">{emptyTitle}</p>
            <p className="text-sm mt-1">{emptyHint}</p>
            {hasFilters ? (
              <Button type="button" variant="secondary" size="compact" className="mt-4" onClick={filters.clear}>
                {t("pages:listFilters.clearAll")}
              </Button>
            ) : null}
          </div>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>{t("fees.history.colDateTime")}</th>
                  <th className={dataTableClass.th}>{t("fees.history.colEvent")}</th>
                  <th className={dataTableClass.th}>{t("fees.history.colStudent")}</th>
                  <th className={dataTableClass.th}>{t("fees.history.colFee")}</th>
                  <th className={dataTableClass.thEnd}>{t("fees.history.colAmount")}</th>
                  <th className={dataTableClass.thEnd}>{t("fees.history.colPrevBal")}</th>
                  <th className={dataTableClass.thEnd}>{t("fees.history.colOwing")}</th>
                  <th className={dataTableClass.th}>{t("fees.history.colMethod")}</th>
                  <th className={dataTableClass.th}>{t("fees.history.colRecordedBy")}</th>
                  <th className={dataTableClass.th}>{t("fees.history.colStatus")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {items.map((txn) => (
                  <tr
                    key={txn.id}
                    onClick={() => openInvoice(txn)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className={`${dataTableClass.td} whitespace-nowrap text-slate-600`}>
                      {new Date(txn.paidAt).toLocaleString()}
                      <div className="font-mono text-[11px] text-slate-400">
                        {txn.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className={`${dataTableClass.td} text-xs font-bold uppercase tracking-wider text-slate-500`}>
                      {eventKindLabel(txn.kind || "PAYMENT")}
                    </td>
                    <td className={`${dataTableClass.td} font-bold text-slate-800`}>
                      <span className="truncate block">{txn.studentName || t("common:student")}</span>
                    </td>
                    <td className={`${dataTableClass.td} text-slate-600`}>
                      <span className="truncate block">{feeTypeLabel(txn.feeType || "")}</span>
                    </td>
                    <td className={`${dataTableClass.td} text-end font-mono font-bold text-emerald-700`}>
                      {formatMoney(Number(txn.amount))}
                    </td>
                    <td className={`${dataTableClass.td} text-end font-mono text-slate-500`}>
                      {formatMoney(Number(txn.balanceBefore))}
                    </td>
                    <td className={`${dataTableClass.td} text-end font-mono text-slate-800`}>
                      {formatMoney(Number(txn.balanceAfter))}
                    </td>
                    <td className={`${dataTableClass.td} text-slate-600`}>
                      {paymentMethodLabel(txn.method)}
                    </td>
                    <td className={`${dataTableClass.td} text-slate-600`}>
                      <span className="truncate block">{txn.recordedByName || "—"}</span>
                      {txn.payerName ? (
                        <div className="text-[11px] text-slate-400 truncate">
                          {t("fees.history.payer", { name: txn.payerName })}
                        </div>
                      ) : null}
                    </td>
                    <td className={dataTableClass.td}>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {txn.invoiceStatusAfter || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
        <ListPagination
          total={total}
          page={filters.page}
          pageSize={filters.pageSize}
          onPageChange={filters.setPage}
          onPageSizeChange={filters.setPageSize}
        />
      </div>
    </motion.div>
  );
}
