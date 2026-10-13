import React from "react";
import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui";

export type VisitorPassModalProps = {
  handleAddVisitor?: any;
  newVisitor?: any;
  setNewVisitor?: any;
  setShowVisitorModal?: any;
  [key: string]: any;
};

export function VisitorPassModal({
  handleAddVisitor,
  newVisitor,
  setNewVisitor,
  setShowVisitorModal,
}: VisitorPassModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const m = (key: string) => t(`security.visitorModal.${key}`);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowVisitorModal(false)}
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
            onClick={() => setShowVisitorModal(false)}
            className="z-10 text-indigo-100 hover:text-white hover:bg-white/10"
          >
            <Plus className="w-6 h-6 rotate-45 stroke-[2.5]" />
          </Button>
        </div>

        <form onSubmit={handleAddVisitor} className="p-8 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-700 tracking-wider uppercase ml-1">
              {m("fullName")}
            </label>
            <input
              type="text"
              value={newVisitor.name}
              onChange={(e) => setNewVisitor({ ...newVisitor, name: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-xs font-bold"
              placeholder={m("fullNamePlaceholder")}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 tracking-wider uppercase ml-1">
                {m("hostContact")}
              </label>
              <input
                type="text"
                value={newVisitor.host}
                onChange={(e) => setNewVisitor({ ...newVisitor, host: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-xs font-bold"
                placeholder={m("hostPlaceholder")}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 tracking-wider uppercase ml-1">
                {m("badgeOptional")}
              </label>
              <input
                type="text"
                value={newVisitor.badge}
                onChange={(e) => setNewVisitor({ ...newVisitor, badge: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-xs font-bold"
                placeholder={m("badgePlaceholder")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 tracking-wider uppercase ml-1">
                {m("checkpoint")}
              </label>
              <select
                value={newVisitor.gate}
                onChange={(e) => setNewVisitor({ ...newVisitor, gate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-xs"
              >
                <option value="Main Reception">{m("gateMain")}</option>
                <option value="North Gate A">{m("gateNorth")}</option>
                <option value="South Gate B">{m("gateSouth")}</option>
                <option value="Service Gate C">{m("gateService")}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 tracking-wider uppercase ml-1">
                {m("purpose")}
              </label>
              <input
                type="text"
                value={newVisitor.purpose}
                onChange={(e) => setNewVisitor({ ...newVisitor, purpose: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-xs font-bold"
                placeholder={m("purposePlaceholder")}
                required
              />
            </div>
          </div>

          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-950 font-bold leading-normal">
            🛡️ {m("protocol")}
          </div>

          <div className="flex gap-4 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowVisitorModal(false)}
              className="flex-1 text-xs uppercase tracking-wider"
            >
              {m("cancel")}
            </Button>
            <Button type="submit" className="flex-1 text-xs uppercase tracking-wider">
              {m("authorize")}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
