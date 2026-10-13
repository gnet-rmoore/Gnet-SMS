import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";
import { buttonClass } from "./tokens";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "compact" | "icon";

type ButtonProps = {
  variant?: ButtonVariant;
  /** `compact` for tables/toolbars; `icon` for square icon-only (≥40px) */
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function sizeClasses(variant: ButtonVariant, size: ButtonSize): string {
  if (size === "icon") return buttonClass.sizeIcon;
  if (size === "compact") return buttonClass.sizeCompact;
  if (variant === "secondary") return buttonClass.sizeSecondary;
  if (variant === "ghost") return buttonClass.sizeGhost;
  return buttonClass.sizeDefault;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "default",
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    const variantClass =
      variant === "primary"
        ? buttonClass.primary
        : variant === "secondary"
          ? buttonClass.secondary
          : variant === "danger"
            ? buttonClass.danger
            : buttonClass.ghost;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          buttonClass.base,
          variantClass,
          sizeClasses(variant, size),
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
        ) : null}
        {children}
      </button>
    );
  },
);
