# Progresso

## 27/11/2026 · Sessão 9 · Bloco Cadastros

**Horas:** ≈ 1,5 h (ajustar com o tempo real)

**Feito**

- Tabela `parties` aprovada (migração `0004_parties`, com RLS na mesma migração).
- `packages/shared`: validação de CPF; `partyInputSchema` (documento validado conforme PF/PJ, campos de PJ limpos em PF, regime limpo para MEI, vazios viram `null`, CEP e IBGE só números).
- API: `GET /api/parties` (busca por nome, nome fantasia ou início do CPF/CNPJ; curingas digitados são literais; 20 por página), `GET /api/parties/:id`, `POST /api/parties`, `PUT /api/parties/:id`. Documento repetido na loja → 409; id inválido ou de outra loja → 404. Dono e vendedor podem cadastrar.
- Front: menu **Pessoas**, lista com busca e paginação pela URL, formulário de nova/editar pessoa que muda conforme PF/PJ/MEI.
- Testes: 3 de CPF, 5 do schema, 11 e2e (inclusive isolamento: loja B não lista, não lê e não altera pessoas da loja A), 1 bloco novo no teste modelo de RLS, 9 de tela.

**Próximo passo (sessão 10)**

Cadastro de veículos (`vehicles`): chassi (17 caracteres), RENAVAM (11 dígitos com dígito verificador), placa (antiga e Mercosul), marca, modelo, versão, anos, cor, combustível, categoria. Chassi único por loja. Mostrar o esquema antes da migração.

## 27/11/2026 · Sessão 8 · Bloco Cadastros

**Horas:** ≈ 1,5 h (ajustar com o tempo real)

A publicação (fim do bloco Base) ficou para depois: depende da escolha de provedor e custo.

**Feito**

- `packages/shared/src/cnpj.ts`: normalização, dígito verificador do CNPJ alfanumérico e numérico (conferido com `11.222.333/0001-81` e com o exemplo da Receita `12.ABC.345/01DE-35`), rejeição de sequências repetidas, formatação.
- `storeFiscalInputSchema`: CNPJ, IE (só formato genérico), UF (27), regime e data de início, mensagens em português.
- API: `GET /api/stores/current/fiscal` e `PUT /api/stores/current/fiscal` (só o dono; vendedor recebe 403). Troca de regime encerra o período atual na data do novo, numa transação; mesmo regime não cria período; troca não pode começar antes do regime atual. CNPJ repetido em outra loja → 409.
- Lista "Para emitir nota fiscal" (CNPJ, IE, regime, certificado digital). `fiscal_status` continua `incomplete` até haver certificado (marco 2).
- Front: navegação Início/Empresa, tela **Dados da empresa** com formulário (só leitura para vendedor), lista de pendências e link no aviso do painel.
- Testes: 5 de CNPJ, 10 e2e (vazio, salvar e normalizar, histórico de regime, mesmo regime, data anterior, dígito inválido, CNPJ repetido, vendedor 403, não mexe em outra loja, exige login), 5 de tela.
- Pendência registrada: regra da IE por UF (`docs/pendencias-contador.md`, item 1).

**Próximo passo (sessão 9)**

Cadastro de pessoas (`parties`): clientes e fornecedores na mesma tabela (PF/PJ, CPF/CNPJ, IE, MEI, contato, endereço), com RLS e teste de isolamento. Mostrar o esquema antes da migração.

## 27/11/2026 · Sessão 7 · Bloco Base

**Horas:** ≈ 1,5 h (ajustar com o tempo real)

**Feito**

- Dependências aprovadas no front: `react-router` 8, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers` 7, `zod`.
- Rotas: `/` → `/login`; `/cadastro`, `/login` (só visitante); `/app` (exige acesso liberado); `/checkout` (exige login); 404.
- Formulários de cadastro e login com os mesmos schemas Zod da API; erros do servidor no campo certo (e-mail repetido no campo e-mail, senha errada no topo).
- Dashboard inicial: loja, usuário, aviso "Teste grátis: N dias restantes" (singular para 1), aviso de cadastro fiscal incompleto, cartões de Estoque e Vendas "em breve", botão Sair.
- Checkout provisório: motivo do bloqueio, aviso de que os dados continuam guardados, "assinatura online em breve".
- Mensagens de bloqueio movidas para `packages/shared` (`ACCESS_BLOCK_MESSAGES`), usadas pela API e pela tela.
- Correção encontrada pelos testes: campo vazio agora diz "Informe seu nome/e-mail/senha/nome da loja" em vez de "muito curto".
- 13 testes de tela: proteção de rotas (sem sessão, teste ativo, teste vencido, 402 no meio do uso, logado abrindo /login, raiz), cadastro (validação sem chamar a API, sucesso com e-mail normalizado, e-mail repetido), login (erro genérico, teste vencido → checkout), logout.
- Fluxo real pelo proxy do Vite (`pnpm dev`): cadastro 201 → `/auth/me` em teste com 14 dias → `/stores/current` 200 → teste vencido → 402 e `/auth/me` bloqueado.

**Não verificado**

- Aparência das telas no navegador (testado só pelos testes de tela e pela API). Abrir http://localhost:5173 e conferir.

**Próximo passo (sessão 8)**

Fechar o bloco Base com a publicação: escolher onde hospedar API, front e Postgres (região São Paulo), variáveis de ambiente, papel `notamotors_app` em produção, migrações no deploy, HTTPS e rate limit no cadastro e no login. Decisão do responsável: provedor e custo.

## 27/11/2026 · Sessão 6 · Bloco Base

**Horas:** ≈ 1 h (ajustar com o tempo real)

**Feito**

- `packages/shared/src/access.ts`: `AccessInfo` (situação, liberado, motivo, fim do teste, dias restantes), erro `ACCESS_BLOCKED`, `CurrentStoreResponse`.
- `computeAccess()` (função pura): liberação manual → liberado; `active` só com período vigente (sem data de fim, bloqueia); `trialing` até `trial_ends_at`; `past_due` e `canceled` bloqueiam. O horário vem sempre do `now()` do banco.
- `AccessGuard` global depois do `SessionGuard`; bloqueio responde 402 com código, motivo e mensagem em português. `@AllowBlocked()` em `/auth/me` e `/auth/logout`.
- `/auth/me` e `/auth/login` devolvem `access`.
- Primeira rota do dashboard: `GET /api/stores/current` (sob RLS).
- Testes: 9 da regra pura (inclusive bordas: termina exatamente agora, menos de 1 dia, ativa sem data de fim) e 9 e2e — os obrigatórios **teste ativo, teste vencido, assinatura ativa, liberação manual** — mais dados mantidos após o bloqueio, recálculo a cada requisição, 401 antes do 402 e relógio do cliente ignorado.
- Teste de mutação: sem o `AccessGuard`, 5 testes falham (confirmado e revertido).

**Decisão pendente**

- Pagamento atrasado (`past_due`): hoje bloqueia na hora. Definir carência junto com o gateway (marco 2).
- Loja piloto (`manual_grant`) poderá emitir nota no marco 2? A regra atual diz "assinatura ativa e cadastro fiscal completo".

**Próximo passo (sessão 7)**

Front: telas de cadastro e login, rota `/app` protegida (redireciona para `/login` sem sessão e para `/checkout` quando bloqueada), dias restantes do teste vindos do servidor. Dependências a aprovar: `react-router`, `@tanstack/react-query`, `react-hook-form` (+ `@hookform/resolvers`) — já previstas no stack.

## 27/11/2026 · Sessão 5 · Bloco Base

**Horas:** ≈ 1 h (ajustar com o tempo real)

**Feito**

- Papel `notamotors_app` para a API (sem superusuário, sem `bypassrls`, não é dono das tabelas); `notamotors` fica para migrações. `.env` com `DATABASE_URL` e `DATABASE_ADMIN_URL` (e as versões `_TEST`).
- Migração `0003_row_level_security` (escrita à mão): privilégios da API, privilégios padrão para tabelas futuras, funções `app_current_store_id()`/`app_current_user_id()`, RLS e políticas em `stores`, `subscriptions`, `store_tax_regimes` e `memberships`.
- `withTenant()`/`setTenant()` em `apps/api/src/db/tenant.ts`: contexto da loja por transação (`set_config(..., true)`).
- Cadastro, login, `/auth/me` e validação de sessão passaram a rodar sob o RLS.
- Teste modelo `src/db/tenant-isolation.test.ts` (9 testes) com o papel da API: papel sem privilégios, falha fechada sem contexto, leitura só da própria loja, nem por id, sem alterar/apagar/gravar na outra loja, sem se incluir em outra loja, contexto não vaza entre transações do pool, sem alterar o esquema.
- Teste de mutação: com o RLS de `subscriptions` desligado, 4 testes falham (confirmado e revertido).
- Servidor compilado testado com o papel sem privilégios: cadastro e `/auth/me` funcionando.

**Próximo passo (sessão 6)**

Trava de acesso: guard global que calcula a situação (em teste, assinante, liberação manual, teste vencido) a cada requisição pelo relógio do banco; rotas do dashboard bloqueadas com teste vencido; `/auth/me` informa a situação e os dias restantes. Testes obrigatórios: teste ativo, teste vencido, assinatura ativa, liberação manual.

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
