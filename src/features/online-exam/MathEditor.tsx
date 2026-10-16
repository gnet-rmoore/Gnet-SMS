/**
 * Question text editor with a formula palette, live KaTeX preview, image
 * insert (URL / upload / paste) and a drawing pad.
 *
 * Emits the plain-text grammar understood by `RichContent` (see richText.ts):
 * inline `$...$`, display `$$...$$`, and images `![alt](url)`.
 */
import React from "react";
import {
  Sigma,
  ImagePlus,
  PenTool,
  Eye,
  EyeOff,
  X,
  Upload,
  Link2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RichContent } from "./RichContent";
import { SketchPad } from "./SketchPad";
import { isSafeImageUrl } from "./richText";

type Item = { label: string; latex: string; display?: boolean };
type Group = { name: string; items: Item[] };

export const FORMULA_PALETTE: Group[] = [
  {
    name: "Fractions & powers",
    items: [
      { label: "a/b", latex: "\\frac{a}{b}" },
      { label: "x²", latex: "x^{2}" },
      { label: "x₁", latex: "x_{1}" },
      { label: "√", latex: "\\sqrt{x}" },
      { label: "ⁿ√", latex: "\\sqrt[n]{x}" },
      { label: "x̅", latex: "\\overline{x}" },
      { label: "x̂", latex: "\\hat{x}" },
      { label: "x⃗", latex: "\\vec{x}" },
      { label: "|x|", latex: "\\left| x \\right|" },
    ],
  },
  {
    name: "Operators",
    items: [
      { label: "×", latex: "\\times" },
      { label: "÷", latex: "\\div" },
      { label: "±", latex: "\\pm" },
      { label: "·", latex: "\\cdot" },
      { label: "≤", latex: "\\le" },
      { label: "≥", latex: "\\ge" },
      { label: "≠", latex: "\\ne" },
      { label: "≈", latex: "\\approx" },
      { label: "∞", latex: "\\infty" },
      { label: "°", latex: "^\\circ" },
    ],
  },
  {
    name: "Big operators",
    items: [
      { label: "Σ", latex: "\\sum_{i=1}^{n}" },
      { label: "∏", latex: "\\prod_{i=1}^{n}" },
      { label: "∫", latex: "\\int_{a}^{b} f(x)\\,dx", display: true },
      { label: "∂", latex: "\\frac{\\partial y}{\\partial x}", display: true },
      { label: "d/dx", latex: "\\frac{d}{dx}", display: true },
      { label: "lim", latex: "\\lim_{x \\to \\infty}" },
      { label: "√", latex: "\\sqrt{x}" },
    ],
  },
  {
    name: "Functions",
    items: [
      { label: "sin", latex: "\\sin" },
      { label: "cos", latex: "\\cos" },
      { label: "tan", latex: "\\tan" },
      { label: "log", latex: "\\log" },
      { label: "ln", latex: "\\ln" },
      { label: "log_b", latex: "\\log_{b}" },
      { label: "eˣ", latex: "e^{x}" },
    ],
  },
  {
    name: "Greek",
    items: [
      { label: "α", latex: "\\alpha" },
      { label: "β", latex: "\\beta" },
      { label: "γ", latex: "\\gamma" },
      { label: "π", latex: "\\pi" },
      { label: "θ", latex: "\\theta" },
      { label: "λ", latex: "\\lambda" },
      { label: "μ", latex: "\\mu" },
      { label: "σ", latex: "\\sigma" },
      { label: "ω", latex: "\\omega" },
      { label: "Δ", latex: "\\Delta" },
    ],
  },
  {
    name: "Geometry & sets",
    items: [
      { label: "∠", latex: "\\angle" },
      { label: "△", latex: "\\triangle" },
      { label: "AB", latex: "\\overline{AB}" },
      { label: "∥", latex: "\\parallel" },
      { label: "⊥", latex: "\\perp" },
      { label: "∈", latex: "\\in" },
      { label: "∪", latex: "\\cup" },
      { label: "∩", latex: "\\cap" },
      { label: "∅", latex: "\\emptyset" },
    ],
  },
  {
    name: "Structures",
    items: [
      {
        label: "matrix",
        latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
        display: true,
      },
      {
        label: "cases",
        latex: "\\begin{cases} a & x > 0 \\\\ b & x \\le 0 \\end{cases}",
        display: true,
      },
      { label: "a/b=c", latex: "\\frac{a}{b} = c", display: true },
      { label: "binomial", latex: "\\binom{n}{k}" },
    ],
  },
];

export type MathEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  /** Prevent the whole question block from shrinking; min height for preview. */
  minPreviewHeight?: number;
};

export function MathEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
}: MathEditorProps) {
  const { t } = useTranslation(["pages", "common"]);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [imageOpen, setImageOpen] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState("https://");
  const [imageError, setImageError] = React.useState("");
  const [drawOpen, setDrawOpen] = React.useState(false);
  const [preview, setPreview] = React.useState(false);

  const m = (k: string) => t(`onlineExams.author.math.${k}`);

  const insertRaw = React.useCallback(
    (text: string, selectFrom?: number, selectTo?: number) => {
      const ta = taRef.current;
      const start = ta ? ta.selectionStart : value.length;
      const end = ta ? ta.selectionEnd : value.length;
      const next = value.slice(0, start) + text + value.slice(end);
      onChange(next);
      const from = start + (selectFrom ?? text.length);
      const to = start + (selectTo ?? text.length);
      requestAnimationFrame(() => {
        if (!ta) return;
        ta.focus();
        try {
          ta.setSelectionRange(from, to);
        } catch {
          /* ignore */
        }
      });
    },
    [onChange, value]
  );

  const insertFormula = (latex: string, display?: boolean) => {
    const delim = display ? "$$" : "$";
    const snippet = `${delim}${latex}${delim}`;
    insertRaw(snippet, delim.length, delim.length + latex.length);
    setPaletteOpen(false);
  };

  const insertImage = (url: string, alt = "diagram") => {
    if (!isSafeImageUrl(url)) {
      setImageError(m("imageInvalid"));
      return;
    }
    insertRaw(`\n![${alt}](${url})\n`);
    setImageOpen(false);
    setImageUrl("https://");
    setImageError("");
  };

  const handleFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      if (isSafeImageUrl(url)) insertImage(url, file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(file);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((it) => it.type.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    e.preventDefault();
    handleFile(file);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setPaletteOpen((v) => !v);
              setImageOpen(false);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${
              paletteOpen ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Sigma className="w-4 h-4" />
            {m("formula")}
          </button>
          {paletteOpen && (
            <div className="absolute top-10 left-0 z-50 w-[28rem] max-w-[85vw] max-h-80 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-xl p-3 space-y-3">
              {FORMULA_PALETTE.map((group) => (
                <div key={group.name}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    {group.name}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {group.items.map((item, i) => (
                      <button
                        key={`${group.name}-${i}`}
                        type="button"
                        title={item.latex}
                        onClick={() => insertFormula(item.latex, item.display)}
                        className="min-w-[2.25rem] px-2 py-1 rounded-md border border-slate-200 text-sm text-slate-800 hover:bg-indigo-50 hover:border-indigo-300"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            setImageOpen((v) => !v);
            setPaletteOpen(false);
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${
            imageOpen ? "bg-indigo-600 text-white" : "text-slate-700 hover:bg-slate-200"
          }`}
        >
          <ImagePlus className="w-4 h-4" />
          {m("image")}
        </button>

        <button
          type="button"
          onClick={() => setDrawOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-200"
        >
          <PenTool className="w-4 h-4" />
          {m("draw")}
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${
            preview ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-200"
          }`}
        >
          {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {m("preview")}
        </button>
      </div>

      {imageOpen && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white border-b border-slate-100">
          <Link2 className="w-4 h-4 text-slate-400" />
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setImageError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                insertImage(imageUrl.trim());
              }
            }}
            placeholder={m("imageUrl")}
            className="flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => insertImage(imageUrl.trim())}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            {m("insert")}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold"
          >
            <Upload className="w-3.5 h-3.5" />
            {m("upload")}
          </button>
          <button
            type="button"
            onClick={() => setImageOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label={m("close")}
          >
            <X className="w-4 h-4" />
          </button>
          {imageError ? <p className="w-full text-xs text-rose-600">{imageError}</p> : null}
        </div>
      )}

      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        rows={rows}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-white outline-none resize-y font-sans text-sm text-slate-800"
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {preview && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
            {m("preview")}
          </p>
          {value.trim() ? (
            <RichContent content={value} className="text-sm text-slate-800" />
          ) : (
            <p className="text-sm text-slate-400">{m("hint")}</p>
          )}
        </div>
      )}

      <SketchPad
        open={drawOpen}
        onClose={() => setDrawOpen(false)}
        onInsert={(dataUrl) => insertRaw(`\n![diagram](${dataUrl})\n`)}
        labels={{
          title: m("sketch.title"),
          hint: m("sketch.hint"),
          insert: m("sketch.insert"),
          clear: m("sketch.clear"),
          undo: m("sketch.undo"),
          pen: m("sketch.pen"),
          eraser: m("sketch.eraser"),
          line: m("sketch.line"),
          arrow: m("sketch.arrow"),
          rect: m("sketch.rect"),
          ellipse: m("sketch.ellipse"),
        }}
      />
    </div>
  );
}

export default MathEditor;
