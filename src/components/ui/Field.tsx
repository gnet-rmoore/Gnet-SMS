import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../../lib/cn";
import { fieldControlClass, typeClass } from "./tokens";

export type FieldDensity = "default" | "compact";

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  density?: FieldDensity;
  required?: boolean;
  className?: string;
  /** Stable id; auto-generated when omitted */
  id?: string;
  children: (ids: {
    id: string;
    describedBy?: string;
    invalid: boolean;
    controlClassName: string;
  }) => ReactNode;
};

/** Label + hint/error wiring; pass control via render prop for full a11y. */
export function Field({
  label,
  hint,
  error,
  density = "default",
  required,
  className,
  id: idProp,
  children,
}: FieldShellProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  const describedBy = [
    hint ? hintId : null,
    error ? errorId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const controlClassName = cn(
    density === "compact" ? fieldControlClass.compact : fieldControlClass.default,
    invalid && fieldControlClass.invalid,
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}
        {required ? (
          <span className="text-rose-600" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {children({ id, describedBy, invalid, controlClassName })}
      {hint && !error ? (
        <p id={hintId} className={typeClass.helper}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={typeClass.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  density?: FieldDensity;
  containerClassName?: string;
  id?: string;
};

export function TextField({
  label,
  hint,
  error,
  density,
  containerClassName,
  id,
  required,
  className,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      density={density}
      required={required}
      className={containerClassName}
      id={id}
    >
      {({ id: controlId, describedBy, invalid, controlClassName }) => (
        <input
          id={controlId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(controlClassName, className)}
          {...inputProps}
        />
      )}
    </Field>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  density?: FieldDensity;
  containerClassName?: string;
  id?: string;
};

export function SelectField({
  label,
  hint,
  error,
  density,
  containerClassName,
  id,
  required,
  className,
  children,
  ...selectProps
}: SelectFieldProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      density={density}
      required={required}
      className={containerClassName}
      id={id}
    >
      {({ id: controlId, describedBy, invalid, controlClassName }) => (
        <select
          id={controlId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(controlClassName, className)}
          {...selectProps}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

type TextAreaFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id"
> & {
  label: string;
  hint?: string;
  error?: string;
  density?: FieldDensity;
  containerClassName?: string;
  id?: string;
};

export function TextAreaField({
  label,
  hint,
  error,
  density,
  containerClassName,
  id,
  required,
  className,
  ...areaProps
}: TextAreaFieldProps) {
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      density={density}
      required={required}
      className={containerClassName}
      id={id}
    >
      {({ id: controlId, describedBy, invalid, controlClassName }) => (
        <textarea
          id={controlId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(controlClassName, className)}
          {...areaProps}
        />
      )}
    </Field>
  );
}
