import React from "react";
import { useTranslation } from "react-i18next";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useAuthStore } from "../../../store/authStore";
import {
  getReceiptTemplateDef,
  receiptPreviewUrl,
  type ReceiptTemplateId,
} from "../../receipts/registry";

/** A4 at 96dpi — used for consistent preview scaling. */
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

function A4PreviewFrame({
  label,
  resetKey,
  children,
}: {
  label: string;
  resetKey: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation(["pages", "common"]);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = React.useState(1);
  const [zoom, setZoom] = React.useState(1);

  React.useEffect(() => {
    setZoom(1);
  }, [resetKey]);

  React.useLayoutEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    const update = () => {
      const width = node.clientWidth;
      if (width <= 0) return;
      const widthScale = width / A4_WIDTH_PX;
      const maxHeight = Math.min(window.innerHeight * 0.58, A4_HEIGHT_PX);
      const heightScale = maxHeight / A4_HEIGHT_PX;
      setFitScale(Math.min(widthScale, heightScale, 1));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const effectiveScale = fitScale * zoom;
  const scaledWidth = A4_WIDTH_PX * effectiveScale;
  const scaledHeight = A4_HEIGHT_PX * effectiveScale;
  const zoomLabel = `${Math.round(zoom * 100)}%`;

  const m = (key: string) => t(`settings.templatePreviewModal.${key}`);

  return (
    <div ref={wrapRef} className="w-full max-w-full">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <div
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 self-start sm:self-auto"
          role="group"
          aria-label={m("zoomControls")}
        >
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
            disabled={zoom <= MIN_ZOOM}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            aria-label={m("zoomOut")}
            title={m("zoomOut")}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="min-w-[3.25rem] text-center text-xs font-bold font-mono text-slate-700 tabular-nums">
            {zoomLabel}
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
            disabled={zoom >= MAX_ZOOM}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
            aria-label={m("zoomIn")}
            title={m("zoomIn")}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            disabled={zoom === 1}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none border-l border-slate-100 ml-0.5 pl-2.5"
            aria-label={m("zoomFit")}
            title={m("zoomFit")}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-100/80 max-h-[min(62vh,720px)] p-4 sm:p-6">
        <div className="mx-auto" style={{ width: scaledWidth, height: scaledHeight }}>
          <div
            className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            style={{
              width: A4_WIDTH_PX,
              height: A4_HEIGHT_PX,
              transform: `scale(${effectiveScale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReceiptTemplatePreview({
  schoolId,
  templateId,
  schoolName = "",
  address = "",
  logoUrl = null,
  brandColor = null,
}: {
  schoolId: string;
  templateId: ReceiptTemplateId;
  schoolName?: string;
  address?: string;
  logoUrl?: string | null;
  brandColor?: string | null;
}) {
  const def = getReceiptTemplateDef(templateId);
  const [html, setHtml] = React.useState<string>("");
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);
    setHtml("");
    setPdfUrl(null);

    const url = receiptPreviewUrl(schoolId, templateId, {
      logoUrl,
      brandColor,
      schoolName,
      address,
    });

    fetch(url, { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const detail = data.error || res.statusText || `HTTP ${res.status}`;
          throw new Error(detail);
        }
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/pdf")) {
          const blob = await res.blob();
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) {
            setPdfUrl(objectUrl);
            setLoading(false);
          }
          return;
        }
        const text = await res.text();
        if (!cancelled) {
          setHtml(text);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || "Preview failed");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [schoolId, templateId, logoUrl, brandColor, schoolName, address]);

  const label = `A4 · 210 × 297 mm · ${def.name}`;

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-sm text-slate-500">Loading preview…</div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-rose-50 border border-rose-100 p-6 rounded-2xl text-sm text-rose-700">
        {error}
      </div>
    );
  }

  const frameProps = { label, resetKey: templateId };

  if (pdfUrl) {
    return (
      <A4PreviewFrame {...frameProps}>
        <iframe
          title={`Receipt preview ${def.name}`}
          src={`${pdfUrl}#view=FitH&toolbar=0&navpanes=0`}
          width={A4_WIDTH_PX}
          height={A4_HEIGHT_PX}
          scrolling="no"
          className="block border-0 bg-white"
        />
      </A4PreviewFrame>
    );
  }

  return (
    <A4PreviewFrame {...frameProps}>
      <iframe
        title={`Receipt preview ${def.name}`}
        srcDoc={html}
        width={A4_WIDTH_PX}
        height={A4_HEIGHT_PX}
        scrolling="no"
        className="block border-0 bg-white"
        sandbox=""
      />
    </A4PreviewFrame>
  );
}
