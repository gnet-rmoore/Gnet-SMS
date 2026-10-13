import React from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  Palette,
  Upload,
  Eye,
  Check,
  School as SchoolIcon,
  FileText,
  Award,
  GraduationCap,
  Receipt,
} from "lucide-react";
import {
  persistableReportCardKey,
  reportCardPickerGroups,
  type ReportCardTemplateDef,
} from "../../report-cards";
import { GRADE_SHEET_TEMPLATES, resolveGradeSheetTemplateKey } from "../../gradesheets";
import {
  CERTIFICATE_TEMPLATES,
  resolveCertificateTemplateKey,
  type CertificateDefaults,
} from "../../certificates";
import { TextField } from "../../../components/ui";
import {
  DOCUMENT_SIGNATORY_SLOTS,
  DOCUMENT_SIGNATORY_SLOT_LABELS,
  type DocumentSignatories,
  type DocumentSignatorySlot,
  type StaffSignatureRef,
} from "../../../lib/documentSignatories";
import { getOfficialSignatureUrl } from "../../../lib/userSignature";
import {
  RECEIPT_TEMPLATES,
  RECEIPT_TYPE_KEYS,
  type ReceiptTemplateId,
  type ReceiptTypeKey,
  type ReceiptTemplatesByType,
} from "../../receipts/registry";

/** Preset brand swatches for Settings → Appearance (16 total). */
const BRAND_COLORS = [
  { nameKey: "Blue", hex: "#2563eb" },
  { nameKey: "Indigo", hex: "#4f46e5" },
  { nameKey: "Navy", hex: "#1e3a8a" },
  { nameKey: "Sky", hex: "#0ea5e9" },
  { nameKey: "Cyan", hex: "#0891b2" },
  { nameKey: "Teal", hex: "#0d9488" },
  { nameKey: "Emerald", hex: "#10b981" },
  { nameKey: "Lime", hex: "#4d7c0f" },
  { nameKey: "Amber", hex: "#f59e0b" },
  { nameKey: "Orange", hex: "#ea580c" },
  { nameKey: "Crimson", hex: "#be123c" },
  { nameKey: "Rose", hex: "#f43f5e" },
  { nameKey: "Fuchsia", hex: "#c026d3" },
  { nameKey: "Violet", hex: "#7c3aed" },
  { nameKey: "Burgundy", hex: "#9f1239" },
  { nameKey: "Slate", hex: "#475569" },
] as const;

export type AppearanceSettingsTabProps = {
  logoPreview: string | null;
  brandColor: string;
  gradeSheetTemplate: string;
  reportCardTemplate: string;
  certificateTemplate: string;
  certificateDefaults: CertificateDefaults;
  documentSignatories: DocumentSignatories;
  staff: StaffSignatureRef[];
  handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo?: () => void;
  setBrandColor: (hex: string) => void;
  setGradeSheetTemplate: (id: string) => void;
  setReportCardTemplate: (id: string) => void;
  setCertificateTemplate: (id: string) => void;
  setCertificateDefaults: (next: CertificateDefaults) => void;
  setDocumentSignatories: (next: DocumentSignatories) => void;
  setPreviewType: (t: "GRADE" | "REPORT" | "CERT" | "RECEIPT") => void;
  setPreviewTemplate: (id: string | null) => void;
  setPreviewReceiptType: (type: ReceiptTypeKey) => void;
  receiptTemplates: ReceiptTemplatesByType;
  receiptTypeKeys?: ReceiptTypeKey[];
  setReceiptTemplateForType: (type: ReceiptTypeKey, id: ReceiptTemplateId) => void;
  schoolId?: string;
  schoolName?: string;
  address?: string;
  /** When true, only receipt template picker is shown (Registrar / Accountant / Principal). */
  receiptTemplateOnly?: boolean;
};

function GradeSheetPick({
  selected,
  onSelect,
  onPreview,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {GRADE_SHEET_TEMPLATES.map((template) => {
        const key = template.id;
        const active = resolveGradeSheetTemplateKey(selected) === key;
        return (
          <div
            key={template.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(key);
            }}
            className={`p-4 rounded-2xl border-2 text-start cursor-pointer transition-colors ${
              active
                ? "border-indigo-600 bg-indigo-50/50"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  active ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"
                }`}
              >
                <FileText className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(key);
                }}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 bg-white"
                title={t("preview")}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <h4 className="text-sm font-extrabold tracking-tight text-slate-900 mt-3">
              {template.name}
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {template.description}
            </p>
            {active && (
              <p className="mt-3 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
                <Check className="w-3.5 h-3.5" /> {t("selected")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CertificatePick({
  selected,
  onSelect,
  onPreview,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {CERTIFICATE_TEMPLATES.map((template) => {
        const key = template.id;
        const active = resolveCertificateTemplateKey(selected) === key;
        return (
          <div
            key={template.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(key);
            }}
            className={`p-4 rounded-2xl border-2 text-start cursor-pointer transition-colors ${
              active
                ? "border-indigo-600 bg-indigo-50/50"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  active ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(key);
                }}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 bg-white"
                title={t("preview")}
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            <h4 className="text-sm font-extrabold tracking-tight text-slate-900 mt-3">
              {template.name}
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {template.description}
            </p>
            {active && (
              <p className="mt-3 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
                <Check className="w-3.5 h-3.5" /> {t("selected")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReportCardPick({
  groups,
  selected,
  onSelect,
  onPreview,
}: {
  groups: ReturnType<typeof reportCardPickerGroups>;
  selected: string;
  onSelect: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const { t } = useTranslation("common");
  const isActive = (def: ReportCardTemplateDef) => {
    const key = persistableReportCardKey(def);
    return selected === key || selected === def.key;
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.region} className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {group.label}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {group.items.map((def) => {
              const key = persistableReportCardKey(def);
              const active = isActive(def);
              return (
                <div
                  key={def.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(key);
                  }}
                  className={`p-4 rounded-2xl border-2 text-start cursor-pointer transition-colors ${
                    active
                      ? "border-indigo-600 bg-indigo-50/50"
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        active ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(key);
                      }}
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 bg-white"
                      title={t("preview")}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="text-sm font-extrabold tracking-tight text-slate-900 mt-3">
                    {def.label}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{def.description}</p>
                  {active && (
                    <p className="mt-3 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
                      <Check className="w-3.5 h-3.5" /> {t("selected")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReceiptTemplatePick({
  selected,
  onSelect,
  onPreview,
}: {
  selected: ReceiptTemplateId;
  onSelect: (id: ReceiptTemplateId) => void;
  onPreview: (id: ReceiptTemplateId) => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {RECEIPT_TEMPLATES.map((template) => {
        const active = selected === template.id;
        return (
          <div
            key={template.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(template.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(template.id);
            }}
            className={`p-4 rounded-2xl border-2 text-start cursor-pointer transition-colors ${
              active
                ? "border-indigo-600 bg-indigo-50/50"
                : "border-slate-100 bg-white hover:border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl shrink-0 border border-slate-200"
                  style={{ backgroundColor: template.accent }}
                />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm">{template.name}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{template.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview(template.id);
                }}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 bg-white shrink-0"
                aria-label="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>
            {active && (
              <p className="mt-3 flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-indigo-600">
                <Check className="w-3.5 h-3.5" /> {t("selected")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const RECEIPT_TYPE_LABEL_KEYS: Record<ReceiptTypeKey, string> = {
  FEE_PAYMENT: "pages:settings.receiptTypeFeePayment",
  PAYSLIP: "pages:settings.receiptTypePayslip",
  EXPENSE: "pages:settings.receiptTypeExpense",
  TRANSACTION: "pages:settings.receiptTypeTransaction",
};

const RECEIPT_TYPE_HINT_KEYS: Record<ReceiptTypeKey, string> = {
  FEE_PAYMENT: "pages:settings.receiptTypeFeePaymentHint",
  PAYSLIP: "pages:settings.receiptTypePayslipHint",
  EXPENSE: "pages:settings.receiptTypeExpenseHint",
  TRANSACTION: "pages:settings.receiptTypeTransactionHint",
};

function ReceiptTemplatesByTypePick({
  values,
  typeKeys = [...RECEIPT_TYPE_KEYS],
  onSelect,
  onPreview,
}: {
  values: ReceiptTemplatesByType;
  typeKeys?: ReceiptTypeKey[];
  onSelect: (type: ReceiptTypeKey, id: ReceiptTemplateId) => void;
  onPreview: (type: ReceiptTypeKey, id: ReceiptTemplateId) => void;
}) {
  const { t } = useTranslation(["pages", "common"]);

  return (
    <div className="space-y-8">
      {typeKeys.map((typeKey) => (
        <div key={typeKey} className="space-y-3">
          <div>
            <h4 className="text-sm font-extrabold tracking-tight text-slate-900">
              {t(RECEIPT_TYPE_LABEL_KEYS[typeKey])}
            </h4>
            <p className="text-sm text-slate-500 mt-0.5">{t(RECEIPT_TYPE_HINT_KEYS[typeKey])}</p>
          </div>
          <ReceiptTemplatePick
            selected={values[typeKey]}
            onSelect={(id) => onSelect(typeKey, id)}
            onPreview={(id) => onPreview(typeKey, id)}
          />
        </div>
      ))}
    </div>
  );
}

export function AppearanceSettingsTab({
  logoPreview,
  brandColor,
  gradeSheetTemplate,
  reportCardTemplate,
  certificateTemplate,
  certificateDefaults,
  documentSignatories,
  staff,
  handleLogoChange,
  onRemoveLogo,
  setBrandColor,
  setGradeSheetTemplate,
  setReportCardTemplate,
  setCertificateTemplate,
  setCertificateDefaults,
  setDocumentSignatories,
  setPreviewType,
  setPreviewTemplate,
  setPreviewReceiptType,
  receiptTemplates,
  receiptTypeKeys,
  setReceiptTemplateForType,
  schoolId: _schoolId,
  schoolName: _schoolName,
  address: _address,
  receiptTemplateOnly = false,
}: AppearanceSettingsTabProps) {
  const { t } = useTranslation(["pages", "common"]);
  const reportGroups = reportCardPickerGroups();

  const setSlotUser = (slot: DocumentSignatorySlot, userId: string) => {
    const next = { ...documentSignatories };
    if (!userId) {
      delete next[slot];
    } else {
      next[slot] = { userId };
    }
    setDocumentSignatories(next);

    if (slot === "principal" && userId) {
      const u = staff.find((s) => s.id === userId);
      setCertificateDefaults({
        ...certificateDefaults,
        sig1UserId: userId,
        sig1Name: certificateDefaults.sig1Name || u?.name || "",
      });
    }
    if (slot === "secondary" && userId) {
      const u = staff.find((s) => s.id === userId);
      setCertificateDefaults({
        ...certificateDefaults,
        sig2UserId: userId,
        sig2Name: certificateDefaults.sig2Name || u?.name || "",
      });
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      {!receiptTemplateOnly && (
      <div>
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
          {t("pages:settings.appearance")}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t("pages:settings.appearanceSubtitle")}</p>
      </div>
      )}

      {!receiptTemplateOnly && (
      <>
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-600" />
          {t("pages:settings.schoolLogo")}
        </h3>
        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-28 h-28 bg-white rounded-2xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt={t("pages:settings.schoolLogo")}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <SchoolIcon className="w-10 h-10 text-slate-300" />
            )}
          </div>
          <div className="space-y-3 text-center sm:text-start">
            <div>
              <p className="font-extrabold tracking-tight text-slate-900">
                {t("pages:settings.uploadLogo")}
              </p>
              <p className="text-sm text-slate-500">{t("pages:settings.uploadLogoHint")}</p>
            </div>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50 transition-colors">
              <Upload className="w-4 h-4" />
              {t("common:chooseFile")}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
            </label>
            {logoPreview && onRemoveLogo && (
              <button
                type="button"
                onClick={onRemoveLogo}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-100 text-rose-600 text-sm font-bold hover:bg-rose-50"
              >
                {t("pages:settings.removeLogo")}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-600" />
          {t("pages:settings.brandColor")}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {BRAND_COLORS.map((color) => (
            <button
              key={color.hex}
              type="button"
              onClick={() => setBrandColor(color.hex)}
              className={`p-3 rounded-2xl border-2 transition-colors flex flex-col items-center gap-2 ${
                brandColor === color.hex
                  ? "border-indigo-600 bg-indigo-50"
                  : "border-slate-100 bg-white hover:border-slate-200"
              }`}
            >
              <div
                className="w-full h-9 rounded-xl"
                style={{ backgroundColor: color.hex }}
              />
              <p className="text-xs font-bold text-slate-600">{color.nameKey}</p>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t("pages:settings.customColor")}
          </label>
          <input
            type="color"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="h-10 w-14 rounded-xl border border-slate-200 cursor-pointer bg-white"
          />
          <span className="text-sm font-mono text-slate-600">{brandColor}</span>
        </div>
      </section>
      </>
      )}

      <section className="space-y-4">
        {!receiptTemplateOnly && (
          <>
            <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              {t("pages:settings.receiptTemplate")}
            </h3>
            <p className="text-sm text-slate-500">{t("pages:settings.receiptTemplateHint")}</p>
          </>
        )}
        <ReceiptTemplatesByTypePick
          values={receiptTemplates}
          typeKeys={receiptTypeKeys}
          onSelect={setReceiptTemplateForType}
          onPreview={(typeKey, id) => {
            setPreviewReceiptType(typeKey);
            setPreviewType("RECEIPT");
            setPreviewTemplate(id);
          }}
        />
      </section>

      {!receiptTemplateOnly && (
      <>
      <section className="space-y-4">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          {t("pages:settings.gradeSheetTemplate")}
        </h3>
        <GradeSheetPick
          selected={gradeSheetTemplate}
          onSelect={setGradeSheetTemplate}
          onPreview={(id) => {
            setPreviewType("GRADE");
            setPreviewTemplate(id);
          }}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-600" />
          {t("pages:settings.reportCardTemplate")}
        </h3>
        <p className="text-sm text-slate-500">
          {t("pages:settings.reportCardTemplateHint")}
        </p>
        <ReportCardPick
          groups={reportGroups}
          selected={reportCardTemplate}
          onSelect={setReportCardTemplate}
          onPreview={(id) => {
            setPreviewType("REPORT");
            setPreviewTemplate(id);
          }}
        />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          {t("pages:settings.certificateTemplate")}
        </h3>
        <p className="text-sm text-slate-500">
          {t("pages:settings.certificateTemplateHint")}
        </p>
        <CertificatePick
          selected={certificateTemplate}
          onSelect={setCertificateTemplate}
          onPreview={(id) => {
            setPreviewType("CERT");
            setPreviewTemplate(id);
          }}
        />
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {t("pages:settings.certificateDefaultsTitle")}
          </p>
          <p className="text-sm text-slate-500">
            {t("pages:settings.certificateDefaultsHint")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label={t("pages:certificates.sig1Name")}
              value={certificateDefaults.sig1Name}
              onChange={(e) =>
                setCertificateDefaults({ ...certificateDefaults, sig1Name: e.target.value })
              }
            />
            <TextField
              label={t("pages:certificates.sig1Title")}
              value={certificateDefaults.sig1Title}
              onChange={(e) =>
                setCertificateDefaults({ ...certificateDefaults, sig1Title: e.target.value })
              }
            />
            <TextField
              label={t("pages:certificates.sig2Name")}
              value={certificateDefaults.sig2Name}
              onChange={(e) =>
                setCertificateDefaults({ ...certificateDefaults, sig2Name: e.target.value })
              }
            />
            <TextField
              label={t("pages:certificates.sig2Title")}
              value={certificateDefaults.sig2Title}
              onChange={(e) =>
                setCertificateDefaults({ ...certificateDefaults, sig2Title: e.target.value })
              }
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          {t("pages:settings.documentSignaturesTitle")}
        </h3>
        <p className="text-sm text-slate-500">
          {t("pages:settings.documentSignaturesHint")}
        </p>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-4">
          {DOCUMENT_SIGNATORY_SLOTS.map((slot) => {
            const selectedId = documentSignatories[slot]?.userId || "";
            const selected = staff.find((s) => s.id === selectedId);
            const previewUrl = getOfficialSignatureUrl(selected);
            return (
              <div
                key={slot}
                className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end"
              >
                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    {DOCUMENT_SIGNATORY_SLOT_LABELS[slot]}
                  </span>
                  <select
                    value={selectedId}
                    onChange={(e) => setSlotUser(slot, e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  >
                    <option value="">
                      {t("pages:settings.documentSignaturesNone")}
                    </option>
                    {staff.map((s) => {
                      const hasSig = Boolean(getOfficialSignatureUrl(s));
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.role ? ` (${s.role})` : ""}
                          {hasSig
                            ? ""
                            : ` — ${t("pages:settings.documentSignaturesNoFile")}`}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <div className="h-14 w-36 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      className="max-h-12 max-w-[8rem] object-contain"
                    />
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t("pages:settings.documentSignaturesBlank")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </>
      )}
    </motion.div>
  );
}
