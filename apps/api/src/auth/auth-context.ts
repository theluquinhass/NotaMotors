import type { MembershipRole } from '@notamotors/shared';
import type { Request } from 'express';

/** Preenchido pelo SessionGuard em toda rota não pública. */
export interface AuthContext {
  sessionId: string;
  userId: string;
  storeId: string;
  role: MembershipRole;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}
