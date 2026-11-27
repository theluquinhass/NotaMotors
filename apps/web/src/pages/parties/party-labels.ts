import { formatCnpj, formatCpf, type PartyResponse } from '@notamotors/shared';

export function formatDocument(p: Pick<PartyResponse, 'kind' | 'document'>): string {
  if (!p.document) return 'Sem documento';
  return p.kind === 'person' ? formatCpf(p.document) : formatCnpj(p.document);
}

export function partyTypeLabel(p: Pick<PartyResponse, 'kind' | 'isMei'>): string {
  if (p.kind === 'person') return 'Pessoa física';
  return p.isMei ? 'MEI' : 'Pessoa jurídica';
}
