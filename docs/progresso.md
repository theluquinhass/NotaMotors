# Progresso

## 26/11/2026 · Sessão 1 · Bloco Base

**Horas:** ≈ 1 h (ajustar com o tempo real)

**Feito**

- `CLAUDE.md` com os três contextos (projeto, decisões de stack e modelo, fluxo de entrada e teste grátis).
- `docs/pendencias-contador.md` (vazio).
- Monorepo pnpm em ESM: `apps/api` (NestJS 12 + SWC, rota `GET /api/health`), `apps/web` (React + Vite, página inicial), `packages/shared`, `packages/fiscal` (vazio).
- TypeScript estrito, ESLint, Prettier, Vitest com um teste em cada pacote.
- `pnpm check` e `pnpm build` passando; a API compilada responde em `/api/health`.

**Decisões tomadas na sessão**

- Trava de acesso (guard global) entra no marco 1.
- Regime tributário com data de vigência (`store_tax_regimes`) desde o marco 1.
- Tudo em ESM, TypeScript fixo em 6.0 (ver `CLAUDE.md`).

**Não verificado**

- `pnpm dev` com recarga automática (só o build e a execução foram testados).

**Próximo passo (sessão 2)**

Docker Compose com Postgres, Drizzle (dependência aprovada) e a primeira migração: `users`, `stores`, `memberships`, `subscriptions`, `store_tax_regimes`. Mostrar o esquema antes de gerar a migração.

**Pendências**

- Certificado A1 para o teste de homologação.
- Estado piloto.
