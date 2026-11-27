import { useId, type SelectHTMLAttributes } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  options: readonly { value: string; label: string }[];
  placeholder: string;
}

export function SelectField({
  label,
  registration,
  error,
  options,
  placeholder,
  ...select
}: SelectFieldProps) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...select}
        {...registration}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
