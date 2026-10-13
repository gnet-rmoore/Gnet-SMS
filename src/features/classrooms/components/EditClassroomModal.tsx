import React from "react";
import { useTranslation } from "react-i18next";
import { Users, School, ArrowLeftRight, Layers } from "lucide-react";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import type { OrganizationType } from "../utils";

export type EditClassroomModalProps = {
  formData: {
    name: string;
    gradeLevelId: string;
    ownerTeacherId: string;
    organizationType: OrganizationType;
    teacherIds?: string[];
    assistantIds?: string[];
    bannerColor?: string;
  };
  gradeLevels: any[];
  handleUpdateClassroom: (e: React.FormEvent) => void;
  setFormData: (v: any) => void;
  setShowEditModal: (v: boolean) => void;
  staff: any[];
  submitting?: boolean;
};

export function EditClassroomModal({
  formData,
  gradeLevels,
  handleUpdateClassroom,
  setFormData,
  setShowEditModal,
  staff,
  submitting,
}: EditClassroomModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const teachers = (staff || []).filter((s) => s.role === "TEACHER");

  const orgOptions: Array<{ value: OrganizationType; icon: typeof School; label: string }> = [
    {
      value: "SELF_CONTAINED",
      icon: School,
      label: t("classroomModals.orgSelfContained"),
    },
    {
      value: "DEPARTMENTALIZED",
      icon: ArrowLeftRight,
      label: t("classroomModals.orgDepartmentalized"),
    },
    {
      value: "MIXED",
      icon: Layers,
      label: t("classroomModals.orgMixed"),
    },
  ];

  return (
    <FeatureModalShell
      eyebrow={t("classrooms.createModal.title")}
      title={t("classrooms.editModal.title")}
      subtitle={t("classrooms.editModal.subtitle")}
      onClose={() => setShowEditModal(false)}
    >
      <form id="edit-classroom-form" onSubmit={handleUpdateClassroom} className="p-8 space-y-5">
        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("classroomModals.className")} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={fieldInput}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("classroomModals.gradeLevel")} <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.gradeLevelId}
            onChange={(e) => setFormData({ ...formData, gradeLevelId: e.target.value })}
            className={fieldInput}
            required
          >
            <option value="">{t("classroomModals.selectGradeLevel")}</option>
            {gradeLevels.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className={fieldLabel}>{t("classroomModals.organizationType")}</label>
          <div className="grid grid-cols-1 gap-2">
            {orgOptions.map((opt) => {
              const Icon = opt.icon;
              const selected = formData.organizationType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, organizationType: opt.value })}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-sm font-bold text-slate-800">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {t("classroomModals.homeroomTeacher")} <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <select
              value={formData.ownerTeacherId}
              onChange={(e) => setFormData({ ...formData, ownerTeacherId: e.target.value })}
              className={`${fieldInput} flex-1`}
              required
            >
              <option value="">{t("classroomModals.selectTeacher")}</option>
              {teachers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </div>
      </form>
      <div className="px-8 pb-8 flex gap-3">
        <button
          type="button"
          onClick={() => setShowEditModal(false)}
          className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
        >
          {t("common:cancel")}
        </button>
        <button
          type="submit"
          form="edit-classroom-form"
          disabled={submitting}
          className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
        >
          {submitting ? t("classrooms.editModal.saving") : t("common:save")}
        </button>
      </div>
    </FeatureModalShell>
  );
}
