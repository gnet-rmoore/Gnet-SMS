import React from "react";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui";

export type SecurityLogModalProps = {
  checkpoints?: any;
  formData?: any;
  handleSubmit?: any;
  setFormData?: any;
  setShowModal?: any;
  submitting?: any;
  [key: string]: any;
};

export function SecurityLogModal({
  formData,
  handleSubmit,
  setFormData,
  setShowModal,
  submitting,
}: SecurityLogModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const m = (key: string) => t(`security.logModal.${key}`);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowModal(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 z-10"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white relative">
          <div className="absolute right-0 top-0 -translate-y-4 translate-x-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="z-10 space-y-1">
            <h2 className="text-2xl font-black">{m("title")}</h2>
            <p className="text-indigo-100 text-xs font-semibold">{m("subtitle")}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={m("close")}
            onClick={() => setShowModal(false)}
            className="z-10 text-indigo-100 hover:text-white hover:bg-white/10"
          >
            <Plus className="w-6 h-6 rotate-45 stroke-[2.5]" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 tracking-wider uppercase ml-1">
                {m("eventType")}
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-xs"
              >
                <option value="VISITOR">{m("typeVisitor")}</option>
                <option value="INCIDENT">{m("typeIncident")}</option>
                <option value="PATROL">{m("typePatrol")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 tracking-wider uppercase ml-1">
                {m("severity")}
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-xs"
              >
                <option value="LOW">{t("security.logs.severityLow")}</option>
                <option value="MEDIUM">{t("security.logs.severityMedium")}</option>
                <option value="HIGH">{t("security.logs.severityHigh")}</option>
                <option value="CRITICAL">{t("security.logs.severityCritical")}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-700 tracking-wider uppercase ml-1">
              {m("location")}
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-xs font-bold"
              placeholder={m("locationPlaceholder")}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-700 tracking-wider uppercase ml-1">
              {m("description")}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none h-24 text-xs font-semibold"
              placeholder={m("descriptionPlaceholder")}
              required
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="flex-1 text-xs uppercase tracking-wider"
            >
              {m("cancel")}
            </Button>
            <Button
              type="submit"
              loading={submitting}
              className="flex-1 text-xs uppercase tracking-wider"
            >
              {submitting ? m("logging") : m("commit")}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
