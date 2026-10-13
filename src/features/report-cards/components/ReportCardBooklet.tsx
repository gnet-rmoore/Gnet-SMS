import React from "react";
import { getReportCardTemplateDef } from "../registry";
import type { ReportCardPayload } from "../types";
import { LiberianCoverPage } from "./pages/CoverPage";
import { LiberianGradesMatrixPage } from "./pages/GradesMatrixPage";
import { LiberianGradingSystemPage } from "./pages/GradingSystemPage";
import { LiberianPromotionPage } from "./pages/PromotionPage";
import { A4_PORTRAIT_HEIGHT_MM, A4_PORTRAIT_WIDTH_MM } from "./pages/BifoldChrome";

type Props = {
  payload: ReportCardPayload;
  /** Same A4 layout as print; preview only changes chrome around the sheets. */
  preview?: boolean;
};

/**
 * Liberian two-semester report cards — true portrait A4 pages (210×297mm)
 * matching `k-2_report_card_bifold (2).html`:
 *   Page 1 (outer): Promotion | Cover
 *   Page 2 (inside): First Semester | Second Semester (same panel design)
 */
export function LiberianReportCardBooklet({ payload, preview = false }: Props) {
  const def = getReportCardTemplateDef(payload.templateKey);
  const hasGrading = def.pages.includes("GRADING_SYSTEM");

  return (
    <div
      id="report-card"
      className={`liberian-report-booklet space-y-6 ${preview ? "preview-mode" : ""}`}
      data-page-size="A4-portrait"
    >
      {/* PAGE 1 — OUTER: Promotion | Cover */}
      <div className="a4-portrait-sheet outer-spread flex gap-[0.3in] overflow-hidden p-[0.3in] mx-auto">
        {def.pages.includes("PROMOTION") && (
          <div className="bifold-leaf a4-panel-wrap w-1/2 min-w-0 min-h-0">
            <LiberianPromotionPage payload={payload} def={def} />
          </div>
        )}
        {def.pages.includes("COVER") && (
          <div className="bifold-leaf a4-panel-wrap w-1/2 min-w-0 min-h-0">
            <LiberianCoverPage payload={payload} def={def} />
          </div>
        )}
      </div>

      {/* PAGE 2 — INSIDE: First | Second semester (identical design) */}
      {def.pages.includes("GRADES") && (
        <div className="grades-sheet mx-auto">
          <div className="a4-portrait-sheet p-[0.3in]">
            <LiberianGradesMatrixPage payload={payload} def={def} />
          </div>
        </div>
      )}

      {/* Optional grading-system page (LR_PRIVATE_WITH_SCALE) */}
      {hasGrading && (
        <div className="a4-portrait-sheet grading-spread flex gap-[0.3in] p-[0.3in] mx-auto">
          <div className="w-1/2 min-w-0">
            <LiberianGradingSystemPage payload={payload} />
          </div>
          <div className="w-1/2 min-w-0 border-[3px] border-black p-4 flex items-center justify-center text-[11px] text-slate-500 italic font-serif">
            (Fold / blank leaf)
          </div>
        </div>
      )}

      <style>{`
        .liberian-report-booklet .a4-portrait-sheet {
          width: ${A4_PORTRAIT_WIDTH_MM}mm;
          height: ${A4_PORTRAIT_HEIGHT_MM}mm;
          min-width: ${A4_PORTRAIT_WIDTH_MM}mm;
          min-height: ${A4_PORTRAIT_HEIGHT_MM}mm;
          max-width: none;
          box-sizing: border-box;
          background: #fff;
          flex-shrink: 0;
        }
        .liberian-report-booklet .a4-panel-wrap .a4-panel {
          width: 100%;
          height: 100%;
          box-shadow: none !important;
        }
        .liberian-report-booklet .grades-inside-spread {
          width: 100%;
          height: 100%;
        }
        .liberian-report-booklet .outer-spread,
        .liberian-report-booklet .grades-sheet .a4-portrait-sheet,
        .liberian-report-booklet .grading-spread {
          box-shadow: 0 4px 20px rgb(0 0 0 / 0.06);
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          .liberian-report-booklet {
            margin: 0 !important;
            padding: 0 !important;
          }
          .a4-portrait-sheet {
            width: ${A4_PORTRAIT_WIDTH_MM}mm !important;
            height: ${A4_PORTRAIT_HEIGHT_MM}mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            break-after: page;
            page-break-after: always;
          }
          .grading-spread:last-child,
          .grades-sheet:last-child {
            break-after: auto;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
