import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { Users, X, GraduationCap, School, ArrowLeftRight } from "lucide-react";
import { motion } from "motion/react";
import { UserAvatar } from "../../../components/UserAvatar";
import type { OrganizationType } from "../utils";

const BANNER_COLORS = [
  { id: "bg-indigo-600", label: "Indigo" },
  { id: "bg-slate-800", label: "Slate" },
  { id: "bg-emerald-600", label: "Emerald" },
  { id: "bg-rose-600", label: "Rose" },
  { id: "bg-amber-600", label: "Amber" },
  { id: "bg-sky-600", label: "Sky" },
];

export type CreateClassroomFormData = {
  name: string;
  gradeLevelId: string;
  ownerTeacherId: string;
  teacherIds: string[];
  assistantIds: string[];
  organizationType: OrganizationType;
  bannerColor: string;
};

export type CreateClassroomModalProps = {
  formData: CreateClassroomFormData;
  gradeLevels: Array<{ id: string; name: string }>;
  handleSubmit: (e: React.FormEvent) => void;
  isAdmin?: boolean;
  school?: { slug?: string } | null;
  setFormData: (v: CreateClassroomFormData) => void;
  setShowModal: (v: boolean) => void;
  staff: Array<{ id: string; name: string; role?: string; photoUrl?: string | null; email?: string }>;
  submitting?: boolean;
};

export function CreateClassroomModal({
  formData,
  gradeLevels,
  handleSubmit,
  isAdmin,
  school,
  setFormData,
  setShowModal,
  staff,
  submitting,
}: CreateClassroomModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const { slug: routeSlug } = useParams();
  const slug = school?.slug || routeSlug;
  const teachers = (staff || []).filter((s) => s.role === "TEACHER");
  const selectedTeacher = teachers.find((s) => s.id === formData.ownerTeacherId);
  const supportOptions = teachers.filter((s) => s.id !== formData.ownerTeacherId);
  const isSelfContained = formData.organizationType === "SELF_CONTAINED";

  const toggleList = (key: "teacherIds" | "assistantIds", id: string) => {
    const current = formData[key] || [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    const otherKey = key === "teacherIds" ? "assistantIds" : "teacherIds";
    setFormData({
      ...formData,
      [key]: next,
      [otherKey]: (formData[otherKey] || []).filter((x) => x !== id),
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={() => setShowModal(false)}
        className="absolute inset-0 bg-slate-900/40"
      />
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg bg-white rounded-[32px] border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.08)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-gradient-to-br from-slate-950 to-slate-900 px-8 py-6 text-white flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("classroomModals.homeroom")}
            </p>
            <h2 className="text-xl font-extrabold tracking-tight mt-0.5">
              {t("classroomModals.createClassGroup")}
            </h2>
            <p className="text-sm text-slate-300 font-medium mt-1">
              {t("classroomModals.createClassGroupSubtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t("common:close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto" noValidate>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("classroomModals.className")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("classroomModals.classNamePlaceholder")}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
              required
            />
            <p className="text-xs text-slate-500">{t("classroomModals.classNameHint")}</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("classroomModals.gradeLevel")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={formData.gradeLevelId}
                onChange={(e) => setFormData({ ...formData, gradeLevelId: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
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
            {gradeLevels && gradeLevels.length === 0 && (
              <p className="text-xs font-semibold text-rose-600">
                {t("classroomModals.noGradeLevelsBefore")}{" "}
                <Link to={`/${slug}/curriculum`} className="underline hover:text-rose-700">
                  {t("classroomModals.curriculum")}
                </Link>{" "}
                {t("classroomModals.noGradeLevelsAfter")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("classroomModals.organizationType")} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, organizationType: "SELF_CONTAINED" })}
                className={`text-left rounded-2xl border p-4 transition-colors ${
                  formData.organizationType === "SELF_CONTAINED"
                    ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <School className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold tracking-tight text-slate-900">
                      {t("classroomModals.orgSelfContained")}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                      {t("classroomModals.orgSelfContainedHint")}
                    </p>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, organizationType: "DEPARTMENTALIZED" })}
                className={`text-left rounded-2xl border p-4 transition-colors ${
                  formData.organizationType === "DEPARTMENTALIZED"
                    ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold tracking-tight text-slate-900">
                      {t("classroomModals.orgDepartmentalized")}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                      {t("classroomModals.orgDepartmentalizedHint")}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {isSelfContained
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
                    teacherIds: (formData.teacherIds || []).filter((id) => id !== e.target.value),
                    assistantIds: (formData.assistantIds || []).filter((id) => id !== e.target.value),
                  })
                }
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">{t("classroomModals.selectTeacher")}</option>
                {teachers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                {selectedTeacher ? (
                  <UserAvatar
                    userId={selectedTeacher.id}
                    name={selectedTeacher.name}
                    photoUrl={selectedTeacher.photoUrl}
                    size="md"
                    rounded="2xl"
                    className="!w-11 !h-11 !rounded-xl"
                  />
                ) : (
                  <Users className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>
            {teachers.length === 0 && (
              <p className="text-xs font-semibold text-rose-600">{t("classroomModals.noTeachers")}</p>
            )}
            {selectedTeacher?.email && (
              <p className="text-xs text-slate-500">{selectedTeacher.email}</p>
            )}
            {!isSelfContained && (
              <p className="text-xs text-slate-500">{t("classroomModals.homeroomTeacherDeptHint")}</p>
            )}
          </div>

          {supportOptions.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("classroomModals.coTeachers")}{" "}
                <span className="text-slate-400 font-medium normal-case tracking-normal">
                  {t("classroomModals.coTeachersOptional")}
                </span>
              </label>
              <div className="rounded-2xl border border-slate-100 max-h-36 overflow-y-auto divide-y divide-slate-50">
                {supportOptions.map((person) => {
                  const checked = (formData.teacherIds || []).includes(person.id);
                  return (
                    <label
                      key={person.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        checked ? "bg-indigo-50/50" : "hover:bg-slate-50"
                      }`}
                    >
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                {t("classroomModals.assistants")}{" "}
                <span className="text-slate-400 font-medium normal-case tracking-normal">
                  {t("classroomModals.assistantsOptional")}
                </span>
              </label>
              <div className="rounded-2xl border border-slate-100 max-h-36 overflow-y-auto divide-y divide-slate-50">
                {supportOptions.map((person) => {
                  const checked = (formData.assistantIds || []).includes(person.id);
                  return (
                    <label
                      key={`asst-${person.id}`}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        checked ? "bg-slate-50" : "hover:bg-slate-50"
                      }`}
                    >
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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              {t("classroomModals.bannerColor")}
            </label>
            <div className="flex flex-wrap gap-2">
              {BANNER_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, bannerColor: c.id })}
                  className={`w-9 h-9 rounded-xl ${c.id} ${
                    formData.bannerColor === c.id
                      ? "ring-2 ring-offset-2 ring-indigo-500"
                      : "opacity-80 hover:opacity-100"
                  }`}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 px-5 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
            >
              {t("common:cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm disabled:opacity-50"
            >
              {submitting ? t("classroomModals.creating") : t("classroomModals.createClassGroup")}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
