import { useId, type InputHTMLAttributes } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'name'> {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  hint?: string;
}

export function Field({ label, registration, error, hint, ...input }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
        {...registration}
      />
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error.message}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
