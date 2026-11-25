const normalizeParentAccessCode = (value: string) => value.replace(/\D/g, "").slice(0, 6);

export function formatParentAccessCode(value: string): string {
  const digits = normalizeParentAccessCode(value);
  return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
}

export function formatParentAccessCodeInput(value: string, caret: number) {
  const digitsBeforeCaret = normalizeParentAccessCode(value.slice(0, caret)).length;
  const digits = normalizeParentAccessCode(value);
  const formatted = formatParentAccessCode(digits);
  const nextCaret = Math.min(
    digitsBeforeCaret > 3 ? digitsBeforeCaret + 1 : digitsBeforeCaret,
    formatted.length
  );
  return { digits, formatted, caret: nextCaret };
}
