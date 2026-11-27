import { useId } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

export function CheckboxField({
  label,
  registration,
  hint,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field checkbox">
      <input id={id} type="checkbox" {...registration} />
      <label htmlFor={id}>
        {label}
        {hint ? <span className="field-hint"> {hint}</span> : null}
      </label>
    </div>
  );
}
