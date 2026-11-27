import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../api/client';

/** Mostra os erros do servidor nos campos certos; o resto vai para o topo do formulário. */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fieldFor: Partial<Record<number, Path<T>>> = {},
) {
  if (!(error instanceof ApiError)) {
    setError('root', { message: 'Algo deu errado. Tente de novo.' });
    return;
  }
  const fields = error.body.fields;
  if (error.status === 400 && fields) {
    for (const [name, messages] of Object.entries(fields)) {
      if (messages?.[0]) setError(name as Path<T>, { message: messages[0] });
    }
    return;
  }
  const target = fieldFor[error.status];
  setError(target ?? 'root', { message: error.message });
}
