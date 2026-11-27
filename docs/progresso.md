# Progresso

## 27/11/2026 · Sessão 4 · Bloco Base

**Horas:** ≈ 1 h (ajustar com o tempo real)

**Feito**

- Tabela `sessions` (migração `0002_sessions`), aprovada: token aleatório de 32 bytes no cookie, só o hash SHA-256 no banco, validade de 30 dias pelo relógio do banco, revogação por `revoked_at`.
- `SessionGuard` global, fechado por padrão; `@Public()` em cadastro, login e status; `@CurrentAuth()` para as rotas.
- `POST /api/auth/login` (200 + cookie), `POST /api/auth/logout` (204, revoga no servidor e apaga o cookie), `GET /api/auth/me`.
- O cadastro já abre sessão (`/cadastro` → `/app`).
- Login: mesma mensagem e mesmo tempo de resposta para senha errada e e-mail inexistente.
- Cookie `nm_session`: httpOnly, SameSite=Lax, Path=/, Secure em produção; lido sem dependência nova (só `@types/express` em dev).
- Helper de testes `test/http.ts` (API real em porta livre + cliente que guarda cookie).
- 9 testes e2e novos: cadastro já logado, login com e-mail em outra caixa, atributos do cookie, erro igual para senha errada e e-mail inexistente, rota protegida sem sessão, token inventado, status público, token guardado só como hash, logout com reaproveitamento do cookie antigo, sessão vencida.

**Pendências de segurança (antes de publicar)**

- Limite de tentativas no cadastro e no login (rate limit).
- Limpeza periódica de sessões vencidas ou revogadas.

**Próximo passo (sessão 5)**

RLS e teste de isolamento entre lojas: papel de banco sem privilégio para a API, `app.store_id` definido por transação a partir da sessão, políticas nas tabelas da loja e o teste modelo "loja A não vê dados da loja B".

## 26/11/2026 · Sessão 3 · Bloco Base

**Horas:** ≈ 1 h (ajustar com o tempo real)

**Feito**

- Dependências aprovadas: `zod` (em `packages/shared` e na API) e `argon2`.
- `packages/shared`: `signupInputSchema` (normaliza nome, e-mail em minúsculas, nome da loja; senha de 8 a 128 caracteres, sem alterar), mensagens em português; tipo `SignupResponse`.
- API: `DatabaseModule` global (fecha o pool ao desligar), `ZodValidationPipe` (400 com `fields` por campo), `createApp()` usado em produção e nos testes, `.env` carregado no `main.ts`.
- `POST /api/auth/signup`: numa transação cria usuário (argon2id), loja (`fiscal_status = incomplete`), vínculo `owner` e assinatura `trialing` com `trial_ends_at = now() + 14 dias` pelo relógio do banco. E-mail repetido → 409, sem loja órfã.
- Testes: 4 do schema compartilhado, 4 e2e do cadastro contra banco real (cadastro completo, e-mail repetido em outra caixa, dados inválidos, campos proibidos ignorados).
- Teste manual no servidor compilado: 201 no cadastro, 409 no e-mail repetido.

**Ainda não feito (de propósito)**

- O cadastro ainda não abre sessão: o usuário vai fazer login logo depois. Isso entra na sessão 4.

**Pendências de segurança (antes de publicar)**

- Limite de tentativas no cadastro e no login (rate limit).
- O 409 revela que o e-mail existe. Aceitável no cadastro por usabilidade; rever junto com o rate limit.

**Próximo passo (sessão 4)**

Login e sessão: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`; sessão em cookie httpOnly; o cadastro já abre sessão. Proposta: tabela `sessions` no Postgres (token aleatório, guardado só o hash), sem dependência nova. Mudança no modelo de dados: precisa de aprovação.

## 26/11/2026 · Sessão 2 · Bloco Base

**Horas:** ≈ 1 h (ajustar com o tempo real)

**Feito**

- `docker-compose.yml` com Postgres 18.7 em UTC, bancos `notamotors` e `notamotors_test`; `.env.example`.
- Drizzle (`drizzle-orm`, `pg`, `drizzle-kit`) com esquema em `apps/api/src/db/schema`.
- Migração `0000_init`: `users`, `stores`, `memberships`, `subscriptions`, `store_tax_regimes`.
- Migração `0001_store_tax_regimes_no_overlap` (escrita à mão): `btree_gist` + `EXCLUDE` contra regimes sobrepostos.
- Migrações aplicadas no banco de desenvolvimento.
- Testes de integração contra banco real (7): UUID v7, períodos consecutivos aceitos, sobreposição rejeitada, mesmo período em lojas diferentes, período invertido, formato do CNPJ alfanumérico, e-mail único sem diferenciar maiúsculas.
- `pnpm check` e `pnpm build` passando.

**Decisões tomadas na sessão**

- Banco local no Docker para desenvolvimento e testes; online só na publicação.
- UUID v7, enums do Postgres, sem exclusão em cascata, `created_by` opcional, índice em `memberships.user_id`.

**Próximo passo (sessão 3)**

Cadastro: rota `POST /api/auth/signup` que, numa única transação, cria usuário (senha com argon2), loja, vínculo `owner` e assinatura em teste de 14 dias. Validação com Zod em `packages/shared`. Dependências novas a aprovar: `argon2`, `zod`.

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
