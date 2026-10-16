/**
 * Lightweight drawing pad for authoring diagrams in questions.
 *
 * Freehand + basic shapes, exported as a small PNG data URL that is embedded in
 * the question text as an image token (`![diagram](data:image/png;base64,...)`).
 * No upload backend required, so it works even when object storage is unset.
 */
import React from "react";
import {
  Pencil,
  Eraser,
  Minus,
  MoveUpRight,
  Square,
  Circle,
  Undo2,
  Trash2,
  Check,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { FeatureModalShell } from "../academics-shared/FeatureModalShell";

export type SketchLabels = {
  title: string;
  hint: string;
  insert: string;
  clear: string;
  undo: string;
  pen: string;
  eraser: string;
  line: string;
  arrow: string;
  rect: string;
  ellipse: string;
};

const DEFAULT_LABELS: SketchLabels = {
  title: "Draw a diagram",
  hint: "Sketch the figure, then insert it into the question.",
  insert: "Insert",
  clear: "Clear",
  undo: "Undo",
  pen: "Pen",
  eraser: "Eraser",
  line: "Line",
  arrow: "Arrow",
  rect: "Rectangle",
  ellipse: "Ellipse",
};

type Tool = "pen" | "eraser" | "line" | "arrow" | "rect" | "ellipse";

type Point = { x: number; y: number };

type Shape =
  | { tool: "pen" | "eraser"; color: string; width: number; points: Point[] }
  | {
      tool: "line" | "arrow" | "rect" | "ellipse";
      color: string;
      width: number;
      a: Point;
      b: Point;
    };

type FreehandShape = Extract<Shape, { points: Point[] }>;
type GeomShape = Extract<Shape, { a: Point }>;

function isFreehand(shape: Shape): shape is FreehandShape {
  return shape.tool === "pen" || shape.tool === "eraser";
}

const LOGICAL_W = 680;
const LOGICAL_H = 420;
const COLORS = ["#0f172a", "#dc2626", "#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#475569"];
const WIDTHS = [2, 4, 7];

function drawArrowHead(ctx: CanvasRenderingContext2D, a: Point, b: Point, width: number) {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const size = 8 + width * 1.6;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - size * Math.cos(angle - Math.PI / 7), b.y - size * Math.sin(angle - Math.PI / 7));
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x - size * Math.cos(angle + Math.PI / 7), b.y - size * Math.sin(angle + Math.PI / 7));
  ctx.stroke();
}

function renderShapes(ctx: CanvasRenderingContext2D, shapes: Shape[]) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const shape of shapes) {
    ctx.strokeStyle = shape.tool === "eraser" ? "#ffffff" : shape.color;
    ctx.lineWidth = shape.tool === "eraser" ? shape.width * 4 : shape.width;

    if (isFreehand(shape)) {
      if (shape.points.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      if (shape.points.length === 1) {
        ctx.lineTo(shape.points[0].x + 0.1, shape.points[0].y + 0.1);
      }
      ctx.stroke();
      continue;
    }

    const { a, b } = shape;
    if (shape.tool === "rect") {
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    } else if (shape.tool === "ellipse") {
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (shape.tool === "arrow") drawArrowHead(ctx, a, b, shape.width);
    }
  }
}

export function SketchPad({
  open,
  onClose,
  onInsert,
  labels,
}: {
  open: boolean;
  onClose: () => void;
  onInsert: (dataUrl: string) => void;
  labels?: Partial<SketchLabels>;
}) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const shapesRef = React.useRef<Shape[]>([]);
  const draftRef = React.useRef<Shape | null>(null);
  const drawingRef = React.useRef(false);
  const [tool, setTool] = React.useState<Tool>("pen");
  const [color, setColor] = React.useState(COLORS[0]);
  const [width, setWidth] = React.useState(WIDTHS[1]);
  const [version, setVersion] = React.useState(0);

  const redraw = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const all = draftRef.current ? [...shapesRef.current, draftRef.current] : shapesRef.current;
    renderShapes(ctx, all);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    shapesRef.current = [];
    draftRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = LOGICAL_W * dpr;
      canvas.height = LOGICAL_H * dpr;
    }
    setVersion((v) => v + 1);
  }, [open]);

  React.useEffect(() => {
    redraw();
  }, [redraw, version]);

  if (!open) return null;

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * LOGICAL_W,
      y: ((e.clientY - rect.top) / rect.height) * LOGICAL_H,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const p = pos(e);
    if (tool === "pen" || tool === "eraser") {
      draftRef.current = { tool, color, width, points: [p] };
    } else {
      draftRef.current = { tool, color, width, a: p, b: p };
    }
    setVersion((v) => v + 1);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !draftRef.current) return;
    const p = pos(e);
    const d = draftRef.current;
    if (isFreehand(d)) {
      d.points.push(p);
    } else {
      d.b = p;
    }
    setVersion((v) => v + 1);
  };

  const onUp = () => {
    if (draftRef.current) shapesRef.current.push(draftRef.current);
    draftRef.current = null;
    drawingRef.current = false;
    setVersion((v) => v + 1);
  };

  const undo = () => {
    shapesRef.current.pop();
    setVersion((v) => v + 1);
  };

  const clear = () => {
    shapesRef.current = [];
    draftRef.current = null;
    setVersion((v) => v + 1);
  };

  const handleInsert = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const off = document.createElement("canvas");
    off.width = LOGICAL_W;
    off.height = LOGICAL_H;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    renderShapes(ctx, shapesRef.current);
    onInsert(off.toDataURL("image/png"));
    onClose();
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "pen", icon: <Pencil className="w-4 h-4" />, label: L.pen },
    { id: "eraser", icon: <Eraser className="w-4 h-4" />, label: L.eraser },
    { id: "line", icon: <Minus className="w-4 h-4" />, label: L.line },
    { id: "arrow", icon: <MoveUpRight className="w-4 h-4" />, label: L.arrow },
    { id: "rect", icon: <Square className="w-4 h-4" />, label: L.rect },
    { id: "ellipse", icon: <Circle className="w-4 h-4" />, label: L.ellipse },
  ];

  return (
    <AnimatePresence>
      <FeatureModalShell
        title={L.title}
        subtitle={L.hint}
        onClose={onClose}
        wide
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={undo}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50"
              >
                <Undo2 className="w-4 h-4" /> {L.undo}
              </button>
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-rose-600 text-sm font-bold hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" /> {L.clear}
              </button>
            </div>
            <button
              type="button"
              onClick={handleInsert}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold"
            >
              <Check className="w-4 h-4" /> {L.insert}
            </button>
          </div>
        }
      >
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 bg-slate-50">
              {tools.map((tl) => (
                <button
                  key={tl.id}
                  type="button"
                  title={tl.label}
                  aria-label={tl.label}
                  onClick={() => setTool(tl.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    tool === tl.id
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {tl.icon}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 bg-slate-50">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  aria-label={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg border-2 ${
                    color === c ? "border-slate-900 scale-110" : "border-white"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 bg-slate-50">
              {WIDTHS.map((w) => (
                <button
                  key={w}
                  type="button"
                  title={`${w}px`}
                  aria-label={`${w}px`}
                  onClick={() => setWidth(w)}
                  className={`p-2 rounded-lg ${
                    width === w ? "bg-indigo-600" : "hover:bg-white"
                  }`}
                >
                  <span
                    className={`block rounded-full ${width === w ? "bg-white" : "bg-slate-700"}`}
                    style={{ width: 18, height: w }}
                  />
                </button>
              ))}
            </div>
          </div>

          <canvas
            ref={canvasRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
            className="w-full h-auto rounded-2xl border border-slate-200 bg-white touch-none cursor-crosshair"
            style={{ aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}` }}
          />
        </div>
      </FeatureModalShell>
    </AnimatePresence>
  );
}

export default SketchPad;
