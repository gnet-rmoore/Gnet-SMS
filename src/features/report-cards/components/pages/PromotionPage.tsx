import React from "react";
import type { ReportCardPayload, ReportCardTemplateDef } from "../../types";
import { BifPanel, SigLine, UnderlineField } from "./BifoldChrome";
import { signatureForLabel } from "../../signatureSlots";

type Props = {
  payload: ReportCardPayload;
  def: ReportCardTemplateDef;
};

function OfficialSigLine({
  label,
  payload,
  className,
}: {
  label: string;
  payload: ReportCardPayload;
  className?: string;
}) {
  const sig = signatureForLabel(label, payload.officialSignatures);
  return (
    <SigLine
      label={label}
      signatureUrl={sig?.signatureUrl}
      name={sig?.name}
      className={className}
    />
  );
}

function Line({
  value,
  className = "inline-block min-w-[8rem] px-1",
}: {
  value?: string | null;
  className?: string;
}) {
  return (
    <span className={`border-b border-black min-h-[1.15em] align-bottom ${className}`}>
      {value || "\u00a0"}
    </span>
  );
}

/** Back / left bifold leaf — promotion certification. */
export function LiberianPromotionPage({ payload, def }: Props) {
  const key = def.key;
  if (key === "LR_PUBLIC_MOE_TWO_SEM") return <PublicMoePromotion payload={payload} />;
  if (key === "LR_PRIVATE_TWO_SEM_B") return <YmcaPromotion payload={payload} />;
  if (key === "LR_PRIVATE_WITH_SCALE") return <MartyrsAePromotion payload={payload} stamp />;
  return <MartyrsAePromotion payload={payload} stamp />;
}

function PublicMoePromotion({ payload }: { payload: ReportCardPayload }) {
  const promo = payload.promotion;
  const grade = payload.student.gradeLevelLabel;
  return (
    <BifPanel className="p-3 h-full">
      <h1 className="text-center text-[18px] font-bold uppercase tracking-wide mb-5">
        Promotion Statement
      </h1>

      <p className="text-[14px] mb-1">This certifies that</p>
      <UnderlineField value={payload.student.name} className="mb-4" />
      <p className="text-[14px] leading-relaxed mb-6">
        Has/Has not Satisfactorily completed the work of grade{" "}
        <Line value={grade} className="inline-block min-w-[5rem] px-1" /> and is:
      </p>

      <div className="space-y-5 text-[13px] leading-relaxed mb-10">
        <p>
          <span className="font-bold">A.</span> Eligible for Promotion to Grade{" "}
          <Line value={promo?.outcome === "PROMOTED" ? promo.toGrade : null} className="inline-block min-w-[12rem] px-1" />
        </p>
        <p>
          <span className="font-bold">B.</span> Conditioned in{" "}
          <Line
            value={promo?.outcome === "CONDITIONED" ? promo.conditionedSubjects : null}
            className="inline-block min-w-[10rem] px-1"
          />{" "}
          and to be given a conditional examination in the subject at the opening of the next term.
        </p>
        <p>
          <span className="font-bold">C.</span> Required to repeat the Grade
        </p>
        <p>
          <span className="font-bold">D.</span> Asked not to enroll next year
        </p>
      </div>

      <div className="mt-auto space-y-8">
        <OfficialSigLine label="Registrar" payload={payload} />
        <OfficialSigLine label="Principal" payload={payload} />
        <p className="text-[13px] flex items-end justify-center gap-2 pt-2">
          <span className="font-bold">Date:</span>
          <Line className="inline-block min-w-[10rem]" />
          <span>20</span>
          <Line className="inline-block min-w-[3rem]" />
        </p>
        <p className="text-center text-[12px] font-bold italic pt-4">
          NOTE: Any erasure on this card makes it invalid
        </p>
      </div>
    </BifPanel>
  );
}

function YmcaPromotion({ payload }: { payload: ReportCardPayload }) {
  const promo = payload.promotion;
  const grade = payload.student.gradeLevelLabel;
  return (
    <BifPanel className="p-3 h-full">
      <h1 className="text-center text-[18px] font-bold uppercase underline underline-offset-4 decoration-2 mb-5 tracking-wide">
        Promotion Statement
      </h1>

      <p className="text-[14px] mb-1">This certifies that</p>
      <UnderlineField value={payload.student.name} className="mb-4" />
      <p className="text-[14px] leading-relaxed mb-6">
        Has/Has not Satisfactorily completed the work of grade{" "}
        <Line value={grade} className="inline-block min-w-[5rem] px-1" /> and is:
      </p>

      <div className="space-y-5 text-[13px] leading-relaxed mb-10">
        <p>
          <span className="font-bold">A.</span> Eligible for Promotion to Grade{" "}
          <Line value={promo?.outcome === "PROMOTED" ? promo.toGrade : null} className="inline-block min-w-[12rem] px-1" />
        </p>
        <p>
          <span className="font-bold">B.</span> Conditioned in{" "}
          <Line
            value={promo?.outcome === "CONDITIONED" ? promo.conditionedSubjects : null}
            className="inline-block min-w-[10rem] px-1"
          />{" "}
          and to be given a conditional examination in the subject at the opening of the next term.
        </p>
        <p>
          <span className="font-bold">C.</span> Required to repeat the Grade
        </p>
        <p>
          <span className="font-bold">D.</span> Asked not to enroll next year
        </p>
      </div>

      <div className="mt-auto space-y-8">
        <OfficialSigLine label="Class Sponsor" payload={payload} />
        <OfficialSigLine label="Principal" payload={payload} />
        <p className="text-[13px] flex items-end justify-center gap-2 pt-2">
          <span className="font-bold">Date:</span>
          <Line className="inline-block min-w-[10rem]" />
          <span>20</span>
          <Line className="inline-block min-w-[3rem]" />
        </p>
        <p className="text-center text-[12px] font-bold italic pt-4">
          NOTE: Any erasure on this card makes it invalid
        </p>
      </div>
    </BifPanel>
  );
}

function MartyrsAePromotion({
  payload,
  stamp,
}: {
  payload: ReportCardPayload;
  stamp?: boolean;
}) {
  const promo = payload.promotion;
  const grade = payload.student.gradeLevelLabel;
  return (
    <BifPanel className="p-3 h-full">
      <h1 className="text-center text-[15px] font-bold mb-0.5">Promotion Statements</h1>
      <p className="text-center text-[11px] mb-2">This is to certify that</p>

      <UnderlineField label="Student:" value={payload.student.name} className="mb-1.5" />
      <p className="text-[11px] leading-snug mb-1">
        Has/Has not Satisfactorily completed the required
      </p>
      <p className="text-[11px] leading-snug mb-2">
        Academic work of Grade/Level{" "}
        <Line value={grade} className="inline-block min-w-[4rem] px-1 font-bold" /> and
      </p>

      <div className="space-y-1 text-[10.5px] leading-snug mb-3">
        <p>
          <span className="font-bold">A.</span> Is promoted to grade :{" "}
          <Line
            value={promo?.outcome === "PROMOTED" ? promo.toGrade : null}
            className="inline-block min-w-[5rem] px-1"
          />
          .
        </p>
        <p>
          <span className="font-bold">B.</span> Is promoted to grade :{" "}
          <Line
            value={promo?.outcome === "PROMOTED_PROBATION" ? promo.toGrade : null}
            className="inline-block min-w-[5rem] px-1"
          />{" "}
          on probationary
        </p>
        <p>
          period of{" "}
          <Line
            value={
              promo?.outcome === "PROMOTED_PROBATION" && promo.probationWeeks != null
                ? String(promo.probationWeeks)
                : null
            }
            className="inline-block min-w-[5rem] px-1"
          />{" "}
          weeks.
        </p>
        <p>
          <span className="font-bold">C.</span> Conditioned in :{" "}
          <Line
            value={promo?.outcome === "CONDITIONED" ? promo.conditionedSubjects : null}
            className="inline-block min-w-[3.5rem] px-1"
          />{" "}
          and to be given a conditional examination in these subjects at the opening of the next
          term.
        </p>
        <p>
          <span className="font-bold">D.</span> Has not Satisfactorily completed the work of Grade{" "}
          <Line
            value={promo?.outcome === "REPEAT" ? grade : null}
            className="inline-block min-w-[3.5rem] px-1"
          />{" "}
          and is required to repeat this class.
        </p>
        <p>
          <span className="font-bold">E.</span> Is asked not to return because of poor academic
          performance or unsatisfactory conduct{" "}
          <Line
            value={promo?.outcome === "DO_NOT_RETURN" ? promo.remarks : null}
            className="inline-block min-w-[5rem] px-1"
          />
          .
        </p>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between gap-4 mt-4">
          <OfficialSigLine label="Class Sponsor" payload={payload} className="w-[45%]" />
          <OfficialSigLine label="Registrar" payload={payload} className="w-[45%]" />
        </div>
        <OfficialSigLine label="Principal" payload={payload} className="w-[40%] mx-auto mt-2" />
        <div className="flex justify-between items-end gap-4 mt-4 text-[10px]">
          <div className="flex-1 border-t border-black pt-0.5">Date:</div>
          <div className="w-[70px] border-t border-black pt-0.5 text-center">20</div>
        </div>
        {stamp ? (
          <div className="flex justify-between text-[9px] mt-0.5">
            <span>STAMP</span>
            <span className="w-[70px] text-center">Year</span>
          </div>
        ) : null}
      </div>
    </BifPanel>
  );
}
