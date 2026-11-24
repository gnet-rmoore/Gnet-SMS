import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Award, GraduationCap, Search } from "lucide-react";
import {
  CERTIFICATE_TEMPLATES,
  resolveCertificateTemplateKey,
  type CertificateDefaults,
} from "../../certificates";
import { TextField } from "../../../components/ui";
import type { StaffSignatureRef } from "../../../lib/documentSignatories";

type Props = {
  schoolId?: string;
  accessToken?: string | null;
  certificateTemplate: string;
  certificateDefaults: CertificateDefaults;
  staff: StaffSignatureRef[];
  saving: boolean;
  setCertificateTemplate: (id: string) => void;
  setCertificateDefaults: (next: CertificateDefaults) => void;
  onSave: () => void;
};

export function CertificateSettingsTab({
  schoolId,
  accessToken,
  certificateTemplate,
  certificateDefaults,
  staff,
  saving,
  setCertificateTemplate,
  setCertificateDefaults,
  onSave,
}: Props) {
  const { t } = useTranslation(["pages", "common"]);
  const [students, setStudents] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    if (!schoolId) return;
    void (async () => {
      try {
        const res = await fetch(`/api/schools/${schoolId}/students`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStudents(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setStudents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, accessToken]);

  const selectedIds = React.useMemo(
    () => new Set(certificateDefaults.certificateRoster.studentIds),
    [certificateDefaults.certificateRoster.studentIds]
  );
  const filtered = students.filter((student) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      String(student.name || "").toLowerCase().includes(q) ||
      String(student.email || "").toLowerCase().includes(q)
    );
  });

  const patchDefaults = (patch: Partial<CertificateDefaults>) =>
    setCertificateDefaults({ ...certificateDefaults, ...patch });

  const toggleStudent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    patchDefaults({
      certificateRoster: {
        ...certificateDefaults.certificateRoster,
        studentIds: [...next],
      },
    });
  };

  const setSlot = (slot: "sig1" | "sig2", userId: string) => {
    const prefix = slot === "sig1" ? "sig1" : "sig2";
    const user = staff.find((s) => s.id === userId);
    patchDefaults({
      [`${prefix}UserId`]: userId,
      [`${prefix}Name`]: userId ? user?.name || "" : "",
    } as Partial<CertificateDefaults>);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
          {t("pages:settings.certificateSettingsTitle")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {t("pages:settings.certificateSettingsHint")}
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-600" />
          {t("pages:settings.certificateWordingTitle")}
        </h3>
        <p className="text-xs text-slate-500">
          {t("pages:settings.certificateWordingHint")}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500">
              {t("pages:settings.certificateTitleField")}
            </span>
            <select
              value={resolveCertificateTemplateKey(certificateTemplate)}
              onChange={(e) => setCertificateTemplate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            >
              {CERTIFICATE_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label={t("pages:settings.certificateIdPrefix")}
            value={certificateDefaults.certificateIdPrefix}
            onChange={(e) => patchDefaults({ certificateIdPrefix: e.target.value })}
          />
          <TextField
            label={t("pages:settings.certificateIssueDateDefault")}
            value={certificateDefaults.issueDateDefault}
            onChange={(e) => patchDefaults({ issueDateDefault: e.target.value })}
          />
          <TextField
            label={t("pages:settings.certificateAcademicYearDefault")}
            value={certificateDefaults.academicYearDefault}
            onChange={(e) => patchDefaults({ academicYearDefault: e.target.value })}
          />
        </div>
        <div className="grid gap-4">
          <TextField
            label={t("pages:settings.certificateTitleField")}
            value={certificateDefaults.title}
            onChange={(e) => patchDefaults({ title: e.target.value })}
          />
          <TextField
            label={t("pages:settings.certificateLeadIn")}
            value={certificateDefaults.leadIn}
            onChange={(e) => patchDefaults({ leadIn: e.target.value })}
          />
          <label className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500">
              {t("pages:settings.certificateBody")}
            </span>
            <textarea
              value={certificateDefaults.body}
              onChange={(e) => patchDefaults({ body: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          {t("pages:settings.certificateDefaultsTitle")}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {(["sig1", "sig2"] as const).map((slot) => {
            const prefix = slot === "sig1" ? "sig1" : "sig2";
            const userId =
              (certificateDefaults as any)[`${prefix}UserId`] || "";
            const name = (certificateDefaults as any)[`${prefix}Name`] || "";
            const title = (certificateDefaults as any)[`${prefix}Title`] || "";
            return (
              <div key={slot} className="space-y-3 rounded-xl border border-slate-100 p-4">
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {t(`pages:certificates.${slot}Staff`)}
                  </span>
                  <select
                    value={userId}
                    onChange={(e) => setSlot(slot, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                  >
                    <option value="">—</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.role ? ` (${s.role})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <TextField
                  label={t(`pages:certificates.${slot}Name`)}
                  value={name}
                  onChange={(e) =>
                    patchDefaults({ [`${prefix}Name`]: e.target.value } as Partial<CertificateDefaults>)
                  }
                />
                <TextField
                  label={t(`pages:certificates.${slot}Title`)}
                  value={title}
                  onChange={(e) =>
                    patchDefaults({ [`${prefix}Title`]: e.target.value } as Partial<CertificateDefaults>)
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
        <div>
          <h3 className="text-sm font-extrabold tracking-tight text-slate-900">
            {t("pages:settings.certificateRosterTitle")}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {t("pages:settings.certificateRosterHint")}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={certificateDefaults.certificateRoster.enabled}
            onChange={(e) =>
              patchDefaults({
                certificateRoster: {
                  ...certificateDefaults.certificateRoster,
                  enabled: e.target.checked,
                },
              })
            }
          />
          {t("pages:settings.certificateRosterEnabled")}
        </label>
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("pages:settings.certificateRosterSearch")}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 ps-10 pe-3 text-sm text-slate-900"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500">
            {t("pages:settings.certificateRosterCount", {
              count: selectedIds.size,
            })}
          </p>
          <button
            type="button"
            onClick={() =>
              patchDefaults({
                certificateRoster: {
                  ...certificateDefaults.certificateRoster,
                  studentIds: [],
                },
              })
            }
            className="text-xs font-bold text-indigo-600"
          >
            {t("pages:settings.certificateRosterClear")}
          </button>
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50 p-2">
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">
              {t("pages:settings.certificateRosterEmpty")}
            </p>
          ) : (
            filtered.map((student) => (
              <label
                key={student.id}
                className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm text-slate-800"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(student.id)}
                  onChange={() => toggleStudent(student.id)}
                />
                <span className="min-w-0">
                  <span className="block font-bold truncate">{student.name}</span>
                  <span className="block text-xs text-slate-500 truncate">
                    {student.email || student.classLabel || "—"}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? t("common:loading") : t("common:save")}
        </button>
      </div>
    </motion.div>
  );
}
