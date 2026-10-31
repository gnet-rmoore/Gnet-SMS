import React from "react";
import { clampScore } from "../lib/gradebookLocalStore";
import { gradebookInputClass, gradebookInputActiveClass } from "./gradebookUi";

export type GradebookScoreInputProps = {
  value: number | null;
  maxScore?: number;
  disabled?: boolean;
  active?: boolean;
  ariaLabel: string;
  className?: string;
  compact?: boolean;
  onFocus?: () => void;
  onChange: (value: number | null) => void;
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
};

export function GradebookScoreInput({
  value,
  maxScore = 100,
  disabled,
  active,
  ariaLabel,
  className = "",
  compact,
  onFocus,
  onChange,
  onMoveDown,
  onMoveUp,
  onMoveLeft,
  onMoveRight,
  inputRef,
}: GradebookScoreInputProps) {
  return (
    <input
      ref={inputRef}
      type="number"
      inputMode="decimal"
      min={0}
      max={maxScore}
      step={maxScore <= 10 ? 0.5 : 1}
      value={value ?? ""}
      disabled={disabled}
      aria-label={ariaLabel}
      title={`Points out of ${maxScore}`}
      onFocus={(e) => {
        onFocus?.();
        e.target.select();
      }}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "") {
          onChange(null);
          return;
        }
        const n = clampScore(v, maxScore);
        if (n === null && v !== "") return;
        onChange(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "ArrowDown") {
          e.preventDefault();
          onMoveDown?.();
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          onMoveUp?.();
        } else if (e.key === "ArrowLeft") {
          if (onMoveLeft) {
            e.preventDefault();
            onMoveLeft();
          }
        } else if (e.key === "ArrowRight") {
          if (onMoveRight) {
            e.preventDefault();
            onMoveRight();
          }
        }
      }}
      className={`${gradebookInputClass} ${active ? gradebookInputActiveClass : ""} ${
        compact ? "max-w-[4.5rem] text-center mx-auto" : "max-w-[5.5rem]"
      } ${className}`}
    />
  );
}
