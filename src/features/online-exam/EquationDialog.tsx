/**
 * MathLive equation authoring dialog for online-exam questions.
 *
 * The visual field is for authoring only. Inserted content is plain LaTeX with
 * the existing `$...$` / `$$...$$` grammar so `RichContent` keeps rendering it
 * through KaTeX everywhere else.
 */
import React from "react";
import "mathlive";
import "mathlive/fonts.css";
import type { MathfieldElement } from "mathlive";
import { Check, Keyboard, X } from "lucide-react";
import { FeatureModalShell } from "../academics-shared/FeatureModalShell";
import { RichContent } from "./RichContent";
import { formatEquation, normalizeEquationLatex } from "./mathEquation";

export type EquationLabels = {
  title: string;
  editTitle: string;
  subtitle: string;
  insert: string;
  update: string;
  inline: string;
  block: string;
  latex: string;
  latexHint: string;
  preview: string;
  keyboard: string;
  cancel: string;
  empty: string;
  placeholder: string;
};

const DEFAULT_LABELS: EquationLabels = {
  title: "Insert equation",
  editTitle: "Edit equation",
  subtitle: "Build the formula visually, then insert it into the question.",
  insert: "Insert",
  update: "Update",
  inline: "Inline",
  block: "Block",
  latex: "LaTeX source",
  latexHint: "You can edit the LaTeX directly; the preview updates as you type.",
  preview: "Preview",
  keyboard: "Math keyboard",
  cancel: "Cancel",
  empty: "Start building an equation, or paste LaTeX.",
  placeholder: "Type or paste LaTeX",
};

export type EquationDialogProps = {
  initialLatex?: string;
  initialDisplay?: boolean;
  mode?: "insert" | "edit";
  onClose: () => void;
  onApply: (latex: string, display: boolean) => void;
  labels?: Partial<EquationLabels>;
};

export function EquationDialog({
  initialLatex = "",
  initialDisplay = false,
  mode = "insert",
  onClose,
  onApply,
  labels,
}: EquationDialogProps) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };
  const fieldRef = React.useRef<MathfieldElement>(null);
  const [latex, setLatex] = React.useState(() => normalizeEquationLatex(initialLatex));
  const [display, setDisplay] = React.useState(initialDisplay);
  const normalized = normalizeEquationLatex(latex);
  const previewToken = normalized ? formatEquation(normalized, display) : "";
  const sourceId = React.useId();

  React.useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    field.smartFence = true;
    field.smartMode = true;
    field.mathVirtualKeyboardPolicy = "manual";
    field.placeholder = L.placeholder;
    field.value = normalizeEquationLatex(initialLatex);

    const handleInput = () => setLatex(field.value);
    field.addEventListener("input", handleInput);
    field.focus();

    return () => {
      field.removeEventListener("input", handleInput);
      window.mathVirtualKeyboard?.hide();
    };
    // Mount-only: initial values identify the dialog instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const field = fieldRef.current;
    if (field && field.value !== latex) field.value = latex;
  }, [latex]);

  const apply = () => {
    const source = normalizeEquationLatex(latex);
    if (!source) return;
    onApply(source, display);
  };

  return (
    <FeatureModalShell
      title={mode === "edit" ? L.editTitle : L.title}
      subtitle={L.subtitle}
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50"
          >
            <X className="w-4 h-4" />
            {L.cancel}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!normalized}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold"
          >
            <Check className="w-4 h-4" />
            {mode === "edit" ? L.update : L.insert}
          </button>
        </div>
      }
    >
      <div className="p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-1 bg-slate-50">
            <button
              type="button"
              onClick={() => setDisplay(false)}
              aria-pressed={!display}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                !display ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white"
              }`}
            >
              {L.inline}
            </button>
            <button
              type="button"
              onClick={() => setDisplay(true)}
              aria-pressed={display}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                display ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-white"
              }`}
            >
              {L.block}
            </button>
          </div>
          <button
            type="button"
            onClick={() => fieldRef.current?.executeCommand("toggleVirtualKeyboard")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50"
          >
            <Keyboard className="w-4 h-4" />
            {L.keyboard}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <math-field
            ref={fieldRef}
            className="block w-full min-h-[5.5rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg"
            math-virtual-keyboard-policy="manual"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor={sourceId} className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            {L.latex}
          </label>
          <textarea
            id={sourceId}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                apply();
              }
            }}
            rows={3}
            spellCheck={false}
            placeholder={L.placeholder}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-slate-800 resize-y"
          />
          <p className="text-xs text-slate-500">{L.latexHint}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{L.preview}</p>
          <div className="min-h-[4.5rem] rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 overflow-x-auto">
            {previewToken ? (
              <RichContent content={previewToken} className="text-slate-800" />
            ) : (
              <p className="text-sm text-slate-400">{L.empty}</p>
            )}
          </div>
        </div>
      </div>
    </FeatureModalShell>
  );
}

export default EquationDialog;
