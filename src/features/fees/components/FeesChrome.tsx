import {
  Plus,
  TrendingUp,
  Receipt,
  RefreshCw,
  Layers,
  Printer,
  Wallet,
  Users,
  History,
  FileCheck2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { cardShell } from "../../academics-shared/FeatureModalShell";

export type FeesChromeProps = {
  activeTab?: string;
  handleExportLedgerPDF?: () => void;
  handleRefresh?: () => void;
  isAdminOrAccountant?: boolean;
  isPortalViewer?: boolean;
  refreshing?: boolean;
  setActiveTab?: (tab: any) => void;
  setShowInvoiceModal?: (open: boolean) => void;
  title?: string;
  subtitle?: string;
};

export function FeesChrome({
  activeTab,
  handleExportLedgerPDF,
  handleRefresh,
  isAdminOrAccountant,
  isPortalViewer,
  refreshing,
  setActiveTab,
  setShowInvoiceModal,
  title,
  subtitle,
}: FeesChromeProps) {
  const { t } = useTranslation("pages");

  const tabs = [
    { id: "overview", label: t("fees.tabs.overview"), icon: TrendingUp },
    { id: "ledger", label: t("fees.tabs.ledger"), icon: Receipt },
    { id: "history", label: t("fees.tabs.history"), icon: History },
    { id: "receipts", label: t("fees.tabs.receipts"), icon: FileCheck2 },
    { id: "templates", label: t("fees.tabs.templates"), icon: Layers },
    { id: "batch", label: t("fees.tabs.batch"), icon: Users },
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 ${cardShell}`}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            {t("fees.billingEyebrow")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2 font-dashboard">
            <Wallet className="w-7 h-7 text-indigo-600" />
            {title ||
              (isPortalViewer ? t("fees.myFeesTitle") : t("fees.feeManagementTitle"))}
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            {subtitle ||
              (isPortalViewer ? t("fees.portalSubtitle") : t("fees.adminSubtitle"))}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title={t("fees.refreshTitle")}
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          {!isPortalViewer && (
            <button
              type="button"
              onClick={handleExportLedgerPDF}
              className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm"
            >
              <Printer className="w-4 h-4" />
              {t("fees.exportPdf")}
            </button>
          )}

          {isAdminOrAccountant && (
            <button
              type="button"
              onClick={() => setShowInvoiceModal?.(true)}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("fees.newInvoice")}
            </button>
          )}
        </div>
      </motion.div>

      {!isPortalViewer && (
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab?.(tab.id)}
                className={`px-4 py-3 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
                  active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
