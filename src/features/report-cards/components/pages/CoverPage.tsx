import React from "react";
import type { ReportCardPayload, ReportCardTemplateDef } from "../../types";
import {
  BifPanel,
  PeriodSignatureTable,
  SchoolLogo,
  UnderlineField,
} from "./BifoldChrome";
import { liberianProgressReportTitle } from "../../assembleClient";

type CoverProps = {
  payload: ReportCardPayload;
  def: ReportCardTemplateDef;
};

function progressTitle(payload: ReportCardPayload, def: ReportCardTemplateDef) {
  return liberianProgressReportTitle(
    payload.student.gradeLevelLabel || payload.student.classLabel,
    def.documentTitle
  );
}

/** Front cover panel — right half of outer landscape A4 bifold. */
export function LiberianCoverPage({ payload, def }: CoverProps) {
  const key = def.key;
  if (key === "LR_PUBLIC_MOE_TWO_SEM") return <PublicMoeCover payload={payload} def={def} />;
  if (key === "LR_PRIVATE_TWO_SEM_B") return <YmcaStyleCover payload={payload} def={def} />;
  if (key === "LR_PRIVATE_WITH_SCALE") return <MartyrsScaleCover payload={payload} def={def} />;
  return <MartyrsAeCover payload={payload} def={def} />;
}

function PublicMoeCover({ payload, def }: CoverProps) {
  const { school, student, academicYear } = payload;
  return (
    <BifPanel className="p-3 h-full">
      <div className="flex items-start gap-1.5 mb-3">
        <img
          src="/report-cards/LR/coat-of-arms.svg"
          alt="Coat of arms of Liberia"
          className="w-[52px] h-[52px] object-contain shrink-0"
        />
        <h1 className="flex-1 text-center text-[12px] font-bold uppercase leading-snug pt-2 px-0.5">
          {def.documentTitle || "PUBLIC SENIOR SECONDARY SCHOOL REPORT CARD"}
        </h1>
        <img
          src="/report-cards/LR/moe-seal.svg"
          alt="Ministry of Education seal"
          className="w-[52px] h-[52px] object-contain shrink-0"
        />
      </div>

      <div className="space-y-2.5 mb-3">
        <UnderlineField label="School:" value={school.name} />
        <UnderlineField label="Name:" value={student.name} />
        <div className="flex gap-2">
          <UnderlineField label="Sex:" value={student.sex} valueClassName="w-12" className="shrink-0" />
          <UnderlineField label="County:" value={school.county} className="flex-1" />
          <UnderlineField label="District:" value={school.district} className="flex-1" />
        </div>
        <div className="flex gap-3">
          <UnderlineField label="Grade:" value={student.gradeLevelLabel} className="flex-1" />
          <UnderlineField label="Academic Year:" value={academicYear.label} className="flex-1" />
        </div>
      </div>

      <div className="text-center mb-2">
        <h2 className="text-[13px] font-bold uppercase">Parents or Guardians</h2>
        <p className="text-[10px] leading-snug mt-1.5 text-left">
          Parents or Guardians should give special attention to the grades on this Report Card.
          These Grades represent a cumulative average of tests, homework assignments and class
          participation. They are not meant for comparison with other children, but rather to
          encourage each child for better performance.
        </p>
        <p className="text-[10px] font-bold mt-1">— The Ministry of Education —</p>
      </div>

      <PeriodSignatureTable />

      <p className="mt-auto pt-2 text-center text-[10px] italic">
        &ldquo;Accelerated Education For Accelerated Development&rdquo;
      </p>
    </BifPanel>
  );
}

function YmcaStyleCover({ payload, def }: CoverProps) {
  const { school, student, academicYear } = payload;
  return (
    <BifPanel className="p-3 h-full">
      <div className="flex items-start justify-between gap-1 mb-0.5">
        <SchoolLogo url={school.logoUrl} size="md" />
        <div className="flex-1 text-center px-0.5 pt-0.5">
          <h1 className="text-[11px] font-bold uppercase leading-tight">{school.name}</h1>
        </div>
        <SchoolLogo url={school.logoUrl} size="md" />
      </div>
      <p className="text-center text-[9px] leading-snug mb-2">
        {school.address || "Republic of Liberia"}
      </p>

      <h2 className="text-center text-[12px] font-bold uppercase underline underline-offset-2 decoration-2 mb-0.5">
        {def.documentTitle || "STUDENT'S YEARLY REPORT CARD"}
      </h2>
      {def.divisionTitle ? (
        <p className="text-center text-[11px] font-bold uppercase underline underline-offset-2 mb-3">
          {def.divisionTitle}
        </p>
      ) : null}

      <div className="space-y-2 mb-3">
        <UnderlineField label="Name:" value={student.name} />
        <div className="flex gap-3">
          <UnderlineField
            label="Class:"
            value={student.classLabel || student.gradeLevelLabel}
            className="flex-1"
          />
          <UnderlineField label="Academic Year:" value={academicYear.label} className="flex-1" />
        </div>
      </div>

      <div className="text-center mb-1.5">
        <h3 className="text-[13px] font-bold uppercase underline underline-offset-2">
          Parents or Guardians
        </h3>
        <p className="text-[10px] mt-1.5 leading-snug">
          It is required to examine this report card carefully and sign before returning this report
          card to the Sponsor.
        </p>
      </div>

      <PeriodSignatureTable />

      <p className="mt-auto pt-2 text-[9px] italic font-bold leading-snug">
        Note: When a student&apos;s work is 70% or below in any subject, the parent or Guardian should
        give special attention to see that the student does well in all work required by the school,
        otherwise the student will probably fail.
      </p>
    </BifPanel>
  );
}

function MartyrsAeCover({ payload, def }: CoverProps) {
  const { school, student, academicYear } = payload;
  const title = progressTitle(payload, def);
  /** Split long titles like the HTML reference (KINDERGARTEN PROGRESS / REPORT CARD). */
  const titleLines = title.replace(/\s+REPORT CARD$/i, "\nREPORT CARD").split("\n");
  return (
    <BifPanel className="p-3 h-full">
      <div className="text-center">
        <h1 className="text-[13px] font-bold uppercase leading-tight whitespace-pre-line">
          {school.name}
        </h1>
        <div className="my-1">
          <SchoolLogo url={school.logoUrl} size="md" />
        </div>
        <p className="text-[9px] leading-snug mb-2">
          {school.address || "Republic of Liberia"}
          {school.poBox ? (
            <>
              <br />
              {school.poBox}
            </>
          ) : null}
        </p>
        <h2 className="text-[12px] font-bold uppercase leading-tight my-1.5 whitespace-pre-line">
          {titleLines.join("\n")}
        </h2>
      </div>

      <div className="space-y-1.5 mb-2 text-left">
        <UnderlineField label="Student:" value={student.name} />
        <p className="flex items-end gap-2 text-[11px] leading-none flex-wrap">
          <span className="flex items-end gap-1.5 min-w-0">
            <span className="shrink-0">Grade:</span>
            <span className="border-b border-black min-h-[1.15em] px-1 font-bold min-w-[3rem]">
              {student.gradeLevelLabel || "\u00a0"}
            </span>
          </span>
          <span className="flex items-end gap-1.5 min-w-0">
            <span className="shrink-0">Academic Year:</span>
            <span className="font-bold px-1">{academicYear.label}</span>
          </span>
        </p>
      </div>

      <div className="text-center mb-1">
        <h3 className="text-[11.5px] font-bold underline underline-offset-2">Parent or Guardian</h3>
        <p className="text-[9px] mt-1.5 leading-snug text-left">
          Must sign against each period as evidence that he /she has seen the student&apos;s periodic
          report and is monitoring it for irregularities
        </p>
      </div>

      <PeriodSignatureTable />

      <p className="mt-auto pt-2 text-[8.5px] leading-snug">
        <span className="font-bold">Note:</span> When a student&apos;s work is 70% or below in any
        subject, the parent or Guardian should give special attention to see that the student does
        well in all work required by the school, otherwise the student will probably fail.
      </p>
    </BifPanel>
  );
}

function MartyrsScaleCover({ payload, def }: CoverProps) {
  const { school, student, academicYear } = payload;
  const title = progressTitle(payload, def);
  return (
    <BifPanel className="p-3 h-full">
      <h1 className="text-center text-[11px] font-bold uppercase leading-tight mb-0.5">
        {school.name}
      </h1>
      <p className="text-center text-[9px] leading-snug">
        {school.address || "Republic of Liberia"}
      </p>
      {school.poBox ? (
        <p className="text-center text-[9px] font-bold mb-1.5">{school.poBox}</p>
      ) : (
        <div className="mb-1.5" />
      )}

      <h2 className="text-center text-[13px] font-bold mt-1 mb-2">{title}</h2>

      <div className="flex justify-center mb-3">
        <SchoolLogo url={school.logoUrl} size="lg" />
      </div>

      <div className="space-y-2.5 mb-3">
        <UnderlineField label="Student:" value={student.name} />
        <UnderlineField label="Class:" value={student.classLabel || student.gradeLevelLabel} />
        <UnderlineField label="Year:" value={academicYear.label} />
      </div>

      <h3 className="text-center text-[14px] font-bold mb-1.5">Parent/Guardian</h3>
      <PeriodSignatureTable />

      <p className="mt-auto pt-2 text-[9px] leading-snug">
        Parent or Guardian must sign against each period as evidence that he/she has seen the
        student&apos;s periodic report and is monitoring it for irregularities.
      </p>
    </BifPanel>
  );
}
