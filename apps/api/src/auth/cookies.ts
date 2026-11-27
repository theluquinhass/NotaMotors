import type { Response } from 'express';
import { SESSION_COOKIE } from './session.constants.js';

/** Lê um cookie do cabeçalho, sem depender de cookie-parser. */
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function baseOptions() {
  return {
    httpOnly: true, // JavaScript da página não lê o cookie
    sameSite: 'lax' as const, // não vai em POST vindo de outro site
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, { ...baseOptions(), expires: expiresAt });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, baseOptions());
}
