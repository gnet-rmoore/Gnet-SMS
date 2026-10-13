import React from "react";
import { useTranslation } from "react-i18next";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import type { StaffMember, WorkOrderForm } from "../types";
import { PRIORITY_OPTIONS, formatRole } from "../utils";

export type CreateWorkOrderModalProps = {
  assignablePersonnel: StaffMember[];
  form: WorkOrderForm;
  handleSubmit: (e: React.FormEvent) => void;
  setForm: (v: WorkOrderForm) => void;
  setShowCreateModal: (open: boolean) => void;
  submitting: boolean;
};

export function CreateWorkOrderModal({
  assignablePersonnel,
  form,
  handleSubmit,
  setForm,
  setShowCreateModal,
  submitting,
}: CreateWorkOrderModalProps) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <FeatureModalShell
      eyebrow={t("workOrders.eyebrow")}
      title={t("workOrders.create.title")}
      subtitle={t("workOrders.create.subtitleExtended")}
      onClose={() => setShowCreateModal(false)}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowCreateModal(false)}
            className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-colors"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="create-work-order-form"
            disabled={submitting}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? t("workOrders.create.saving") : t("workOrders.create.submit")}
          </button>
        </div>
      }
    >
      <form
        id="create-work-order-form"
        onSubmit={handleSubmit}
        className="p-6 sm:p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("workOrders.create.titleLabel")}</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={t("workOrders.create.titlePlaceholderAlt")}
            className={fieldInput}
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("workOrders.create.locationLabel")}</label>
          <input
            type="text"
            required
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder={t("workOrders.create.locationPlaceholderAlt")}
            className={fieldInput}
          />
        </div>

        <div className="space-y-2">
          <p className={fieldLabel}>{t("workOrders.create.priorityLabel")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-2">
            {PRIORITY_OPTIONS.map((p) => {
              const active = form.priority === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p.key })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                    active
                      ? p.key === "URGENT"
                        ? "bg-rose-600 text-white border-rose-600"
                        : p.key === "HIGH"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t(`workOrders.priority.${p.key}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("workOrders.create.descriptionLabel")}</label>
          <textarea
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={t("workOrders.create.descriptionPlaceholderAlt")}
            rows={4}
            className={`${fieldInput} h-auto resize-none`}
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>{t("workOrders.create.assignLabel")}</label>
          <select
            value={form.assignedTo}
            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
            className={fieldInput}
          >
            <option value="">{t("workOrders.create.assignLater")}</option>
            {assignablePersonnel.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {formatRole(person.role)}
              </option>
            ))}
          </select>
          {assignablePersonnel.length === 0 && (
            <p className="text-xs text-slate-500 font-medium pt-1">
              {t("workOrders.create.noStaffHint")}
            </p>
          )}
        </div>
      </form>
    </FeatureModalShell>
  );
}
