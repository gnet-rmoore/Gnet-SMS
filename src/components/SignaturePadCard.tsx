import React, { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, Upload, Trash2, RefreshCw, Check } from "lucide-react";
import {
  compressSignatureImage,
  exportSignatureCanvas,
  validateSignatureImageFile,
} from "../lib/signatureImage";

type Mode = "draw" | "upload";

type Props = {
  signatureUrl: string | null;
  busy?: boolean;
  onSave: (dataUrl: string | null) => Promise<void>;
  onError?: (message: string) => void;
};

/**
 * Official signature pad — draw with pointer or upload a scanned signature.
 */
export function SignaturePadCard({ signatureUrl, busy, onSave, onError }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<Mode>("draw");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const isBusy = busy || localBusy;

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.25;
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  };

  useEffect(() => {
    if (mode !== "draw") return;
    setupCanvas();
    const onResize = () => setupCanvas();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mode]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawing.current = true;
    canvas.setPointerCapture(e.pointerId);
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const clearDraw = () => setupCanvas();

  const handleUpload = async (file: File) => {
    try {
      const err = validateSignatureImageFile(file);
      if (err) throw new Error(err);
      const dataUrl = await compressSignatureImage(file);
      setUploadPreview(dataUrl);
    } catch (e: any) {
      onError?.(e?.message || "Could not read signature image");
    }
  };

  const saveDraw = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = exportSignatureCanvas(canvas);
    if (!dataUrl) {
      onError?.("Draw your signature first");
      return;
    }
    setLocalBusy(true);
    try {
      await onSave(dataUrl);
      clearDraw();
    } catch (e: any) {
      onError?.(e?.message || "Failed to save signature");
    } finally {
      setLocalBusy(false);
    }
  };

  const saveUpload = async () => {
    if (!uploadPreview) {
      onError?.("Choose a signature image first");
      return;
    }
    setLocalBusy(true);
    try {
      await onSave(uploadPreview);
      setUploadPreview(null);
    } catch (e: any) {
      onError?.(e?.message || "Failed to save signature");
    } finally {
      setLocalBusy(false);
    }
  };

  const remove = async () => {
    setLocalBusy(true);
    try {
      await onSave(null);
      setUploadPreview(null);
      if (mode === "draw") clearDraw();
    } catch (e: any) {
      onError?.(e?.message || "Failed to remove signature");
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)] space-y-5">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
          Official signature
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Draw or upload a signature the system can attach to school documents
          (transcripts, letters, receipts where applicable).
        </p>
      </div>

      {signatureUrl && (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Saved signature
            </p>
            <div className="bg-white rounded-xl border border-slate-100 p-3 inline-block max-w-full">
              <img
                src={signatureUrl}
                alt="Official signature"
                className="max-h-16 max-w-full object-contain"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void remove()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-100 text-rose-600 text-sm font-bold hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      )}

      <div className="flex gap-2 p-1 rounded-2xl bg-slate-100/80 border border-slate-100 w-fit">
        {(
          [
            { id: "draw" as const, label: "Draw", icon: PenLine },
            { id: "upload" as const, label: "Upload", icon: Upload },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              setUploadPreview(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              mode === id
                ? "bg-white text-slate-900 shadow-[0_1px_2px_rgb(15,23,42,0.04),0_8px_24px_rgb(15,23,42,0.06)]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === "draw" ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-[linear-gradient(to_bottom,transparent_95%,#e2e8f0_95%)] bg-[length:100%_28px] overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full h-40 touch-none cursor-crosshair bg-transparent"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy || !hasInk}
              onClick={clearDraw}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 disabled:opacity-40"
            >
              <Eraser className="w-4 h-4" />
              Clear
            </button>
            <button
              type="button"
              disabled={isBusy || !hasInk}
              onClick={() => void saveDraw()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
            >
              {isBusy ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Save signature
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void handleUpload(file).catch(() => undefined);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 hover:bg-indigo-50/40 hover:border-indigo-100 p-8 text-center transition-colors"
          >
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Upload signature image</p>
            <p className="text-xs text-slate-500 mt-1">PNG or JPEG · transparent background works best</p>
          </button>
          {uploadPreview && (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <img
                src={uploadPreview}
                alt="Preview"
                className="max-h-16 bg-white rounded-xl border border-indigo-100 p-2 object-contain mx-auto sm:mx-0"
              />
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-extrabold tracking-tight text-slate-900">
                  Ready to save
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Compressed for document use.
                </p>
              </div>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void saveUpload()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {isBusy ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save signature
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
