const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Id de URL inválido é tratado como "não encontrado", sem erro de banco. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}
