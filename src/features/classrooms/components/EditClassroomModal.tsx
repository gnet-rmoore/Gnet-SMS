import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, School, ArrowLeftRight, Layers } from "lucide-react";
import {
  FeatureModalShell,
  fieldInput,
  fieldLabel,
} from "../../academics-shared/FeatureModalShell";
import type { OrganizationType } from "../utils";

const BANNER_COLORS = [
  { id: "bg-indigo-600", label: "Indigo" },
  { id: "bg-slate-800", label: "Slate" },
  { id: "bg-emerald-600", label: "Emerald" },
  { id: "bg-rose-600", label: "Rose" },
  { id: "bg-amber-600", label: "Amber" },
  { id: "bg-sky-600", label: "Sky" },
];

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
  const selectedTeacher = teachers.find((s) => s.id === formData.ownerTeacherId);

  const toggleList = (key: "teacherIds" | "assistantIds", id: string) => {
    const current = formData[key] || [];
    const next = current.includes(id) ? current.filter((x: string) => x !== id) : [...current, id];
    const otherKey = key === "teacherIds" ? "assistantIds" : "teacherIds";
    setFormData({
      ...formData,
      [key]: next,
      [otherKey]: (formData[otherKey] || []).filter((x: string) => x !== id),
    });
  };

  const supportOptions = teachers.filter((s) => s.id !== formData.ownerTeacherId);

  const orgOptions: Array<{ value: OrganizationType; icon: typeof School; label: string; hint: string }> = [
    {
      value: "SELF_CONTAINED",
      icon: School,
      label: t("classroomModals.orgSelfContained"),
      hint: t("classroomModals.orgSelfContainedHint"),
    },
    {
      value: "DEPARTMENTALIZED",
      icon: ArrowLeftRight,
      label: t("classroomModals.orgDepartmentalized"),
      hint: t("classroomModals.orgDepartmentalizedHint"),
    },
    {
      value: "MIXED",
      icon: Layers,
      label: t("classroomModals.orgMixed"),
      hint: t("classroomModals.orgMixedHint") || "",
    },
  ];

  return (
    <FeatureModalShell
      eyebrow={t("classrooms.editModal.eyebrow") || t("classrooms.createModal.title")}
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
          <label className={fieldLabel}>{t("classroomModals.organizationType")} <span className="text-rose-500">*</span></label>
          <div className="grid grid-cols-1 gap-2">
            {orgOptions.map((opt) => {
              const Icon = opt.icon;
              const selected = formData.organizationType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, organizationType: opt.value })}
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-bold text-slate-800">{opt.label}</span>
                    {opt.hint ? <p className="text-xs text-slate-500 mt-0.5">{opt.hint}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={fieldLabel}>
            {formData.organizationType === "SELF_CONTAINED"
              ? t("classroomModals.primaryTeacher")
              : t("classroomModals.homeroomTeacher")}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <select
              value={formData.ownerTeacherId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ownerTeacherId: e.target.value,
                  teacherIds: (formData.teacherIds || []).filter((id: string) => id !== e.target.value),
                  assistantIds: (formData.assistantIds || []).filter((id: string) => id !== e.target.value),
                })
              }
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

        {supportOptions.length > 0 && (
          <div className="space-y-2">
            <label className={fieldLabel}>
              {t("classroomModals.coTeachers")}{" "}
              <span className="text-slate-400 font-medium normal-case tracking-normal">{t("classroomModals.coTeachersOptional")}</span>
            </label>
            <div className="rounded-2xl border border-slate-100 max-h-36 overflow-y-auto divide-y divide-slate-50">
              {supportOptions.map((person) => {
                const checked = (formData.teacherIds || []).includes(person.id);
                return (
                  <label key={person.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? "bg-indigo-50/50" : "hover:bg-slate-50"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleList("teacherIds", person.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">{person.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {supportOptions.length > 0 && (
          <div className="space-y-2">
            <label className={fieldLabel}>
              {t("classroomModals.assistants")}{" "}
              <span className="text-slate-400 font-medium normal-case tracking-normal">{t("classroomModals.assistantsOptional")}</span>
            </label>
            <div className="rounded-2xl border border-slate-100 max-h-36 overflow-y-auto divide-y divide-slate-50">
              {supportOptions.map((person) => {
                const checked = (formData.assistantIds || []).includes(person.id);
                return (
                  <label key={`asst-${person.id}`} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checked ? "bg-slate-50" : "hover:bg-slate-50"}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleList("assistantIds", person.id)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">{person.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className={fieldLabel}>{t("classroomModals.bannerColor")}</label>
          <div className="flex flex-wrap gap-2">
            {(formData.bannerColor ? [...new Set([...BANNER_COLORS.map(c => c.id), formData.bannerColor])] : BANNER_COLORS.map(c => c.id)).map((colorId) => (
              <button
                key={colorId}
                type="button"
                onClick={() => setFormData({ ...formData, bannerColor: colorId })}
                className={`w-9 h-9 rounded-xl ${colorId} ${
                  formData.bannerColor === colorId
                    ? "ring-2 ring-offset-2 ring-indigo-500"
                    : "opacity-80 hover:opacity-100"
                }`}
                aria-label={colorId}
              />
            ))}
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
