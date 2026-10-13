import React, { useRef, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";

type FileDropzoneProps = {
  files: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  label?: string;
  hint?: string;
};

function mergeFiles(existing: File[], incoming: FileList | File[], multiple: boolean): File[] {
  const next = Array.from(incoming);
  if (!multiple) return next.slice(0, 1);
  const seen = new Set(existing.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
  const merged = [...existing];
  for (const f of next) {
    const key = `${f.name}:${f.size}:${f.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(f);
    }
  }
  return merged;
}

export function FileDropzone({
  files,
  onChange,
  multiple = true,
  accept,
  disabled = false,
  label = "Attachments",
  hint = "Drag and drop files here, or click to browse",
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (list: FileList | File[] | null) => {
    if (!list || disabled) return;
    onChange(mergeFiles(files, list, multiple));
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {label ? <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p> : null}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
          disabled
            ? "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
            : dragging
              ? "border-indigo-400 bg-indigo-50 cursor-pointer"
              : "border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-white cursor-pointer"
        }`}
      >
        <Upload
          className={`w-6 h-6 mx-auto mb-2 ${dragging ? "text-indigo-600" : "text-slate-400"}`}
        />
        <p className="text-sm font-bold text-slate-700">{hint}</p>
        <p className="text-xs text-slate-500 mt-1">
          {multiple ? "You can attach multiple files." : "One file only."}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-sm font-medium text-slate-800 truncate flex-1">{f.name}</span>
              <span className="text-xs font-mono text-slate-400 shrink-0">
                {f.size < 1024
                  ? `${f.size} B`
                  : f.size < 1024 * 1024
                    ? `${Math.round(f.size / 1024)} KB`
                    : `${(f.size / (1024 * 1024)).toFixed(1)} MB`}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(i);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
