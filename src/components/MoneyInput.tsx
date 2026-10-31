import { useState, type FocusEvent, type InputHTMLAttributes } from "react";
import {
  formatMoneyInputValue,
  normalizeMoneyInputValue,
} from "../lib/moneyInput";

type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string | number;
  onValueChange: (value: string) => void;
};

export function MoneyInput({
  value,
  onValueChange,
  onFocus,
  onBlur,
  ...inputProps
}: MoneyInputProps) {
  const [focused, setFocused] = useState(false);
  const rawValue = normalizeMoneyInputValue(value);

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    const finalizedValue = rawValue.replace(/\.$/, "");
    if (finalizedValue !== String(value)) onValueChange(finalizedValue);
    onBlur?.(event);
  };

  return (
    <input
      {...inputProps}
      type="text"
      inputMode="decimal"
      value={focused ? rawValue : formatMoneyInputValue(rawValue)}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={handleBlur}
      onChange={(event) =>
        onValueChange(normalizeMoneyInputValue(event.currentTarget.value))
      }
    />
  );
}
