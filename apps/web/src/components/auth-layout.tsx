import { PRODUCT_NAME } from '@notamotors/shared';
import type { ReactNode } from 'react';

export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-card">
        <p className="brand">{PRODUCT_NAME}</p>
        <h1>{title}</h1>
        {children}
      </div>
    </main>
  );
}
