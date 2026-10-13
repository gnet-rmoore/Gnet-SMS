import React from "react";
import { useTranslation } from "react-i18next";
import { FeatureModalShell } from "../../academics-shared/FeatureModalShell";
import {
  isInternationalReportCardTemplate,
  isLiberianReportCardTemplate,
} from "../../report-cards";
import { getGradeSheetTemplateDef, resolveGradeSheetTemplateKey } from "../../gradesheets";
import {
  getCertificateTemplateDef,
  resolveCertificateTemplateKey,
} from "../../certificates";
import { renderTemplatePreview } from "./TemplatePreviewRenderer";
import { ReceiptTemplatePreview } from "./ReceiptTemplatePreview";
import {
  resolveReceiptTemplateId,
  getReceiptTemplateDef,
  type ReceiptTemplateId,
  type ReceiptTypeKey,
} from "../../receipts/registry";

const RECEIPT_TYPE_PREVIEW_LABEL: Record<ReceiptTypeKey, string> = {
  FEE_PAYMENT: "settings.receiptTypeFeePayment",
  PAYSLIP: "settings.receiptTypePayslip",
  EXPENSE: "settings.receiptTypeExpense",
  TRANSACTION: "settings.receiptTypeTransaction",
};

export type TemplatePreviewModalProps = {
  previewTemplate: string;
  previewType: "GRADE" | "REPORT" | "CERT" | "RECEIPT";
  schoolId?: string;
  schoolName?: string;
  address?: string;
  logoUrl?: string | null;
  brandColor?: string | null;
  setGradeSheetTemplate: (id: string) => void;
  setPreviewTemplate: (id: string | null) => void;
  setReportCardTemplate: (id: string) => void;
  setCertificateTemplate: (id: string) => void;
  setReceiptTemplateForType: (type: ReceiptTypeKey, id: string) => void;
  previewReceiptType?: ReceiptTypeKey;
};

export function TemplatePreviewModal({
  previewTemplate,
  previewType,
  schoolName = "",
  address = "",
  logoUrl = null,
  brandColor = null,
  setGradeSheetTemplate,
  setPreviewTemplate,
  setReportCardTemplate,
  setCertificateTemplate,
  setReceiptTemplateForType,
  previewReceiptType = "FEE_PAYMENT",
  schoolId = "",
}: TemplatePreviewModalProps) {
  const { t } = useTranslation(["pages", "common"]);
  const m = (key: string, opts?: Record<string, unknown>) =>
    t(`settings.templatePreviewModal.${key}`, opts);

  const a4Report =
    previewType === "REPORT" &&
    (isLiberianReportCardTemplate(previewTemplate) ||
      isInternationalReportCardTemplate(previewTemplate));

  const gradeDef =
    previewType === "GRADE"
      ? getGradeSheetTemplateDef(resolveGradeSheetTemplateKey(previewTemplate))
      : null;
  const certDef =
    previewType === "CERT"
      ? getCertificateTemplateDef(resolveCertificateTemplateKey(previewTemplate))
      : null;
  const receiptDef =
    previewType === "RECEIPT"
      ? getReceiptTemplateDef(resolveReceiptTemplateId(previewTemplate) as ReceiptTemplateId)
      : null;
  const widePrint = a4Report || gradeDef != null || certDef != null || receiptDef != null;
  const maxWidthClass = certDef
    ? "max-w-[min(98vw,calc(11in+3rem))]"
    : gradeDef?.pageSize === "legal"
      ? "max-w-[min(98vw,calc(8.5in+3rem))]"
      : widePrint
        ? "max-w-[min(98vw,calc(210mm+3rem))]"
        : "max-w-5xl";

  const templateName = previewTemplate.replace(/_/g, " ");
  const typeLabel =
    previewType === "GRADE"
      ? m("gradeSheet")
      : previewType === "CERT"
        ? m("certificate")
        : previewType === "RECEIPT"
          ? m("receipt")
          : m("reportCard");

  const receiptTypeLabel =
    previewType === "RECEIPT"
      ? t(RECEIPT_TYPE_PREVIEW_LABEL[previewReceiptType])
      : "";

  const subtitle =
    certDef != null
      ? `${certDef.name} · Letter landscape 11×8.5 in`
      : gradeDef != null
        ? `${gradeDef.name} · ${
            gradeDef.pageSize === "legal" ? "Legal 8.5×14 in" : "A4 portrait"
          }`
        : receiptDef != null
          ? `${receiptDef.name} · ${receiptTypeLabel} · A4 portrait`
          : a4Report
            ? m("a4Portrait", { name: templateName })
            : templateName;

  return (
    <FeatureModalShell
      wide
      maxWidthClass={maxWidthClass}
      eyebrow={m("eyebrow")}
      title={`${typeLabel} preview`}
      subtitle={subtitle}
      onClose={() => setPreviewTemplate(null)}
      footer={
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => setPreviewTemplate(null)}
            className="px-5 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl text-sm"
          >
            {m("close")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (previewType === "GRADE") {
                setGradeSheetTemplate(previewTemplate);
              } else if (previewType === "CERT") {
                setCertificateTemplate(previewTemplate);
              } else if (previewType === "RECEIPT") {
                setReceiptTemplateForType(previewReceiptType, previewTemplate);
              } else {
                setReportCardTemplate(previewTemplate);
              }
              setPreviewTemplate(null);
            }}
            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 text-sm"
          >
            {m("useTemplate")}
          </button>
        </div>
      }
    >
      <div className={previewType === "RECEIPT" ? "bg-slate-50 p-4 sm:p-6" : `bg-slate-50 ${widePrint ? "p-3 sm:p-4" : "p-6 sm:p-8"}`}>
        <div
          className={
            previewType === "RECEIPT"
              ? "w-full"
              : widePrint
                ? "w-full flex justify-center"
                : "max-w-3xl mx-auto"
          }
        >
          {previewType === "RECEIPT" && schoolId ? (
            <ReceiptTemplatePreview
              schoolId={schoolId}
              templateId={resolveReceiptTemplateId(previewTemplate) as ReceiptTemplateId}
              schoolName={schoolName}
              address={address}
              logoUrl={logoUrl}
              brandColor={brandColor}
            />
          ) : (
            renderTemplatePreview(previewTemplate, previewType as "GRADE" | "REPORT" | "CERT", schoolName, address, {
              logoUrl,
              brandColor,
            })
          )}
        </div>
      </div>
    </FeatureModalShell>
  );
}
