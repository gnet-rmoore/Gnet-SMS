import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import type { PayrollTemplate, PayrollTemplateLineInput, StaffMember } from "../types";
import { computeNet, formatMoney, getCurrencySymbol } from "../utils";

export type TemplateEditorModalProps = {
  template?: PayrollTemplate | null;
  staffList: StaffMember[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    lines: PayrollTemplateLineInput[];
    isActive?: boolean;
  }) => void;
};

type LineDraft = PayrollTemplateLineInput & { id: string };

export function TemplateEditorModal({
  template,
  staffList,
  submitting,
  onClose,
  onSubmit,
}: TemplateEditorModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const isEdit = Boolean(template?.id);
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [isActive, setIsActive] = useState(template?.isActive ?? true);
  const [lines, setLines] = useState<LineDraft[]>(
    (template?.items || []).map((item, idx) => ({
      id: item.id || `${Date.now()}-${idx}`,
      userId: item.userId,
      basicSalary: Number(item.basicSalary || 0),
      allowances: Number(item.allowances || 0),
      deductions: Number(item.deductions || 0),
      notes: item.notes || "",
    }))
  );

  const activeStaff = useMemo(
    () => staffList.filter((s) => s.isActive !== false),
    [staffList]
  );
  const used = new Set(lines.map((l) => l.userId).filter(Boolean));
  const availableStaff = activeStaff.filter((s) => !used.has(s.id));

  const addLine = () => {
    const next = availableStaff[0];
    if (!next) return;
    setLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        userId: next.id,
        basicSalary: 0,
        allowances: 0,
        deductions: 0,
        notes: "",
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((line) => line.id !== id));
  };

  const symbol = getCurrencySymbol(template?.currency || "USD");
  const totals = lines.reduce(
    (acc, line) => {
      const net = computeNet(line.basicSalary, line.allowances, line.deductions);
      return {
        basic: acc.basic + Number(line.basicSalary || 0),
        allowances: acc.allowances + Number(line.allowances || 0),
        deductions: acc.deductions + Number(line.deductions || 0),
        net: acc.net + net,
      };
    },
    { basic: 0, allowances: 0, deductions: 0, net: 0 }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description,
      isActive,
      lines: lines
        .filter((line) => line.userId)
        .map((line) => ({
          userId: line.userId,
          basicSalary: Number(line.basicSalary || 0),
          allowances: Number(line.allowances || 0),
          deductions: Number(line.deductions || 0),
          notes: line.notes?.trim() || null,
        })),
    });
  };

  return (
    <FeatureModalShell
      wide
      eyebrow={t("pages:payroll.templates.editorEyebrow")}
      title={isEdit ? t("pages:payroll.templates.editTitle") : t("pages:payroll.templates.createTitle")}
      subtitle={t("pages:payroll.templates.editorSubtitle")}
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="template-editor-form"
            disabled={submitting || lines.length === 0 || !name.trim()}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? t("common:saving") : t("pages:payroll.templates.saveTemplate")}
          </button>
        </div>
      }
    >
      <form id="template-editor-form" onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className={fieldLabel}>{t("pages:payroll.templates.templateName")}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldInput}
              placeholder={t("pages:payroll.templates.templateNamePlaceholder")}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className={fieldLabel}>{t("pages:payroll.templates.description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${fieldInput} h-auto resize-none`}
              rows={3}
              placeholder={t("pages:payroll.templates.descriptionPlaceholder")}
            />
          </div>
          {isEdit && (
            <div className="space-y-1.5 sm:col-span-2">
              <label className={fieldLabel}>{t("common:status")}</label>
              <select
                value={isActive ? "active" : "inactive"}
                onChange={(e) => setIsActive(e.target.value === "active")}
                className={fieldInput}
              >
                <option value="active">{t("pages:payroll.templates.active")}</option>
                <option value="inactive">{t("pages:payroll.templates.inactive")}</option>
              </select>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                {t("pages:payroll.templates.roster")}
              </p>
              <p className="text-xs text-slate-500 font-medium">
                {t("pages:payroll.templates.rosterHint")}
              </p>
            </div>
            <button
              type="button"
              onClick={addLine}
              disabled={availableStaff.length === 0}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("pages:payroll.templates.addStaff")}
            </button>
          </div>

          {lines.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 font-medium">
              {t("pages:payroll.templates.noLines")}
            </div>
          ) : (
            <div className="space-y-2">
              {lines.map((line) => {
                const staff = staffList.find((s) => s.id === line.userId);
                return (
                  <div
                    key={line.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                  >
                    <div className="md:col-span-4">
                      <p className="text-sm font-bold text-slate-900">{staff?.name}</p>
                      <p className="text-xs text-slate-500">{staff?.role}</p>
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.basicSalary}
                        onChange={(e) => updateLine(line.id, { basicSalary: Number(e.target.value) })}
                        className={`${fieldInput} font-mono text-sm`}
                        placeholder="Basic"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.allowances}
                        onChange={(e) => updateLine(line.id, { allowances: Number(e.target.value) })}
                        className={`${fieldInput} font-mono text-sm`}
                        placeholder="Allowances"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.deductions}
                        onChange={(e) => updateLine(line.id, { deductions: Number(e.target.value) })}
                        className={`${fieldInput} font-mono text-sm`}
                        placeholder="Deductions"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 text-white px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t("pages:payroll.templates.basicTotal")}
            </p>
            <p className="font-mono font-bold mt-0.5">{formatMoney(totals.basic, symbol)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t("pages:payroll.templates.allowancesTotal")}
            </p>
            <p className="font-mono font-bold mt-0.5">{formatMoney(totals.allowances, symbol)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t("pages:payroll.templates.deductionsTotal")}
            </p>
            <p className="font-mono font-bold mt-0.5">{formatMoney(totals.deductions, symbol)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t("pages:payroll.templates.monthlyNet")}
            </p>
            <p className="font-mono font-extrabold mt-0.5">{formatMoney(totals.net, symbol)}</p>
          </div>
        </div>
      </form>
    </FeatureModalShell>
  );
}
