import React from "react";

/** Portrait A4 sheet — matches `k-2_report_card_bifold (2).html` page canvas. */
export const A4_PORTRAIT_WIDTH_MM = 210;
export const A4_PORTRAIT_HEIGHT_MM = 297;

/** @deprecated use A4_PORTRAIT_* — kept for any lingering imports */
export const A4_LANDSCAPE_WIDTH_MM = A4_PORTRAIT_HEIGHT_MM;
export const A4_LANDSCAPE_HEIGHT_MM = A4_PORTRAIT_WIDTH_MM;
export const A4_PANEL_WIDTH_MM = A4_PORTRAIT_WIDTH_MM / 2;
export const A4_PANEL_HEIGHT_MM = A4_PORTRAIT_HEIGHT_MM;

/** Shared Liberian bifold panel chrome — serif, thick black border. */
export function BifPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`report-card-page bif-panel a4-panel box-border border-[3px] border-black bg-white text-black font-serif flex flex-col overflow-hidden h-full ${className}`}
      style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
    >
      {children}
    </section>
  );
}

export function UnderlineField({
  label,
  value,
  className = "",
  valueClassName = "flex-1",
}: {
  label?: string;
  value?: string | null;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <p className={`flex items-end gap-1.5 text-[11px] leading-none ${className}`}>
      {label ? <span className="shrink-0">{label}</span> : null}
      <span
        className={`border-b border-black min-h-[1.15em] px-1 font-bold ${valueClassName}`}
      >
        {value || "\u00a0"}
      </span>
    </p>
  );
}

export function SigLine({
  label,
  signatureUrl,
  name,
  className = "w-[70%] mx-auto",
}: {
  label: string;
  signatureUrl?: string | null;
  name?: string | null;
  className?: string;
}) {
  const url =
    signatureUrl?.trim()?.startsWith("data:image/") ? signatureUrl.trim() : null;
  return (
    <div className={`text-center ${className}`}>
      <div className="min-h-[2rem] flex items-end justify-center">
        {url ? (
          <img src={url} alt="" className="h-8 max-w-[90%] object-contain object-bottom" />
        ) : null}
      </div>
      <div className="border-t border-black pt-0.5 mt-1">
        {name?.trim() ? <p className="text-[10px] font-bold">{name.trim()}</p> : null}
        <p className="text-[10px]">{label}</p>
      </div>
    </div>
  );
}

export const PERIOD_ROMANS = ["I", "II", "III", "IV", "V", "VI"] as const;

export function PeriodSignatureTable({ tall = false }: { tall?: boolean }) {
  return (
    <table className="w-full border-collapse border border-black text-[9.5px] mt-1">
      <thead>
        <tr>
          <th className="border border-black py-0.5 px-1 w-[18%] font-bold text-center">
            Period
          </th>
          <th className="border border-black py-0.5 px-1 font-bold text-center">
            Class Teacher
          </th>
          <th className="border border-black py-0.5 px-1 font-bold text-center">
            Parent/Guardian
          </th>
        </tr>
      </thead>
      <tbody>
        {PERIOD_ROMANS.map((r) => (
          <tr key={r}>
            <td
              className={`border border-black text-left px-1 ${tall ? "py-2" : "py-1"}`}
            >
              {r}
            </td>
            <td className={`border border-black ${tall ? "py-2" : "py-1"}`}>&nbsp;</td>
            <td className={`border border-black ${tall ? "py-2" : "py-1"}`}>&nbsp;</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SchoolLogo({
  url,
  size = "md",
}: {
  url?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "lg" ? "w-[56px] h-[56px]" : size === "sm" ? "w-10 h-10" : "w-[40px] h-[40px]";
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${dim} object-contain shrink-0 mx-auto`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full border-2 border-[#b5651d] text-[#b5651d] flex items-center justify-center text-[6px] font-bold uppercase shrink-0 bg-white mx-auto text-center leading-tight px-0.5`}
    >
      Seal
    </div>
  );
}
