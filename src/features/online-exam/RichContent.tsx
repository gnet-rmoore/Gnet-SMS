/**
 * Renders stored question text with inline/display math (KaTeX) and images.
 *
 * Safe by construction: text nodes are escaped by React, math is produced by
 * KaTeX (trust disabled), and only vetted image URLs are rendered. See
 * `richText.ts` for the grammar.
 */
import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { parseRichContent, type RichSegment } from "./richText";

function MathSpan({ latex, display }: { latex: string; display: boolean }) {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        errorColor: "#dc2626",
        strict: "ignore",
        trust: false,
        maxExpand: 1000,
      });
    } catch {
      return "";
    }
  }, [latex, display]);

  if (!html) {
    return <span className="font-mono text-rose-600">{latex}</span>;
  }
  return (
    <span
      className={display ? "block my-2 overflow-x-auto" : "inline-block align-middle"}
      // eslint-disable-next-line react/no-danger -- KaTeX output with trust disabled
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function TextSpan({ value }: { value: string }) {
  const lines = value.split("\n");
  return (
    <>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 ? <br /> : null}
          {line}
        </React.Fragment>
      ))}
    </>
  );
}

export function RichContent({
  content,
  className,
  segments,
}: {
  content?: string | null;
  className?: string;
  /** Optional pre-parsed segments (avoids re-parsing). */
  segments?: RichSegment[];
}) {
  const parts = React.useMemo(
    () => segments ?? parseRichContent(content ?? ""),
    [content, segments]
  );

  return (
    <span className={className}>
      {parts.map((seg, idx) => {
        if (seg.type === "math") {
          return <MathSpan key={idx} latex={seg.value} display={seg.display} />;
        }
        if (seg.type === "image") {
          return (
            <img
              key={idx}
              src={seg.src}
              alt={seg.alt}
              className="inline-block max-w-full h-auto my-2 rounded-lg border border-slate-200 bg-white"
              loading="lazy"
            />
          );
        }
        return <TextSpan key={idx} value={seg.value} />;
      })}
    </span>
  );
}

export default RichContent;
