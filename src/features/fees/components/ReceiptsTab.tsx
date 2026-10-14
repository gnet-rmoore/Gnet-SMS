import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Receipt as ReceiptIcon, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { cardShell } from "../../academics-shared/FeatureModalShell";
import { receiptsApi, type ReceiptRecord } from "../../../services/receiptsApi";
import { formatMoney } from "../../../i18n/format";
import {
  ListPagination,
  DataTable,
  dataTableClass,
  Button,
} from "../../../components/ui";

const TYPE_OPTIONS = ["FEE_PAYMENT", "EXPENSE", "PAYSLIP", "TRANSACTION"] as const;
const STATUS_OPTIONS = ["ISSUED", "VOID"] as const;

export type ReceiptsTabProps = {
  schoolId: string;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
};

export function ReceiptsTab({ schoolId, showToast }: ReceiptsTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const [items, setItems] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const typeLabel = (value: string) =>
    t(`fees.receipts.types.${value}`, { defaultValue: value.replace(/_/g, " ") });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await receiptsApi.list(schoolId, {
        type: type || undefined,
        status: status || undefined,
      });
      setItems(Array.isArray(rows) ? rows : []);
      setPage(1);
    } catch (err: any) {
      console.error(err);
      setItems([]);
      showToast(err?.message || t("fees.receipts.loadFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [schoolId, type, status, showToast, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const download = async (record: ReceiptRecord) => {
    setDownloadingId(record.id);
    try {
      await receiptsApi.download(record.id, record.receiptNumber as string | undefined);
    } catch (err: any) {
      showToast(err?.message || t("fees.receipts.downloadFailed"), "error");
    } finally {
      setDownloadingId(null);
    }
  };

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
              <ReceiptIcon className="w-5 h-5 text-indigo-600" />
              {t("fees.receipts.title")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t("fees.receipts.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold bg-white"
            >
              <option value="">{t("fees.receipts.allTypes")}</option>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {typeLabel(opt)}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold bg-white"
            >
              <option value="">{t("fees.receipts.allStatuses")}</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`fees.receipts.status.${opt}`, { defaultValue: opt })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={`${cardShell} overflow-hidden`}>
        {loading ? (
          <p className="p-8 text-slate-400 text-sm">{t("common:loading")}</p>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ReceiptIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-bold text-slate-500">{t("fees.receipts.emptyTitle")}</p>
            <p className="text-sm mt-1">{t("fees.receipts.emptyHint")}</p>
          </div>
        ) : (
          <DataTable>
            <table className={dataTableClass.table}>
              <thead className={dataTableClass.thead}>
                <tr>
                  <th className={dataTableClass.th}>{t("fees.receipts.colNumber")}</th>
                  <th className={dataTableClass.th}>{t("fees.receipts.colType")}</th>
                  <th className={dataTableClass.th}>{t("fees.receipts.colPayer")}</th>
                  <th className={dataTableClass.th}>{t("fees.receipts.colIssued")}</th>
                  <th className={dataTableClass.thEnd}>{t("fees.receipts.colAmount")}</th>
                  <th className={dataTableClass.th}>{t("fees.receipts.colStatus")}</th>
                  <th className={dataTableClass.th}>{t("common:actions")}</th>
                </tr>
              </thead>
              <tbody className={dataTableClass.tbody}>
                {paged.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className={`${dataTableClass.td} font-mono text-xs text-slate-700`}>
                      {r.receiptNumber || r.id.slice(0, 8)}
                    </td>
                    <td className={`${dataTableClass.td} text-xs font-bold uppercase tracking-wider text-slate-500`}>
                      {typeLabel(String(r.type || ""))}
                    </td>
                    <td className={`${dataTableClass.td} text-slate-700`}>
                      <span className="truncate block">
                        {String(r.payerName || r.payeeName || "—")}
                      </span>
                    </td>
                    <td className={`${dataTableClass.td} text-xs text-slate-500`}>
                      {r.issuedAt ? new Date(String(r.issuedAt)).toLocaleString() : "—"}
                    </td>
                    <td className={`${dataTableClass.td} text-end font-mono font-bold text-slate-800`}>
                      {formatMoney(Number(r.amount || 0))}
                    </td>
                    <td className={dataTableClass.td}>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {String(r.status || "")}
                      </span>
                    </td>
                    <td className={dataTableClass.td}>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="compact"
                          disabled={downloadingId === r.id}
                          onClick={() => void download(r)}
                          className="px-2 py-1 min-h-0 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {t("fees.receipts.download")}
                        </Button>
                        {r.verifyCode ? (
                          <span
                            title={t("fees.receipts.verifyHint")}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {String(r.verifyCode).slice(0, 8)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
        <ListPagination
          total={items.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>
    </motion.div>
  );
}
