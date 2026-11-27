# NotaMotors

SaaS para quem vende veículos (seminovos, concessionárias 0 km e lojas de motos): estoque, vendas, métricas e NF-e nas regras da reforma tributária. Diferencial proposto: formalização guiada.

Situação em 27/11/2026: monorepo, banco, cadastro, login e sessão prontos. Um desenvolvedor, cerca de 2 horas por dia. Início do desenvolvimento: 30/11/2026. Responda em português do Brasil.

## Comandos

Requisitos: Node 22+, pnpm 10 e Docker. No Fedora o Node vem sem corepack; o pnpm foi instalado com `npm install -g pnpm@10 --prefix ~/.local`.

Primeira vez: `cp .env.example .env`, `docker compose up -d --wait`, `pnpm install`, `pnpm --filter @notamotors/api db:migrate`.

| Comando          | O que faz                                                                 |
| ---------------- | ------------------------------------------------------------------------- |
| `pnpm install`   | Instala todas as dependências do monorepo                                 |
| `pnpm dev`       | Sobe API (http://localhost:3000/api) e web (http://localhost:5173) juntas |
| `pnpm test`      | Roda os testes de todos os pacotes (Vitest)                               |
| `pnpm typecheck` | Confere os tipos de todos os pacotes                                      |
| `pnpm lint`      | ESLint em todo o repositório                                              |
| `pnpm format`    | Prettier em todo o repositório                                            |
| `pnpm build`     | Compila tudo, na ordem das dependências                                   |
| `pnpm check`     | lint + typecheck + test (rodar antes de encerrar a sessão)                |

## Stack (decidido em 26/11/2026)

- TypeScript em todo o projeto.
- Monorepo com pnpm workspaces (sem Turborepo por enquanto):
  - `apps/web`: React + Vite (depois: TanStack Query, React Hook Form, Zod).
  - `apps/api`: NestJS (compilado com SWC).
  - `apps/site` (marco 2): landing page em HTML pré-renderizado.
  - `packages/shared`: tipos e schemas Zod usados por web e API.
  - `packages/fiscal`: regras fiscais.
- Tudo em ESM (`"type": "module"`): o NestJS 12 só funciona como ESM. Imports relativos no backend e nos pacotes levam extensão `.js` (`./app.module.js`).
- Pacotes internos: o código-fonte é usado direto no front e nos testes (condição `@notamotors/source`); a API rodando em Node usa o `dist` compilado, por isso `pnpm dev` compila `packages/*` antes de subir.
- TypeScript fixo em 6.0 (`~6.0.3`): a 7.0 (versão em Go) ainda não é suportada pelo typescript-eslint.
- Versões instaladas na base: NestJS 12, Vite 8, Vitest 5, ESLint 10, React (última). Sem `jest-dom` (tipos incompatíveis com Vitest 5).
- PostgreSQL 18 + Drizzle (driver `pg`). Local no Docker para desenvolvimento e testes; Postgres gerenciado (região São Paulo) só na publicação. O código lê apenas `DATABASE_URL`.
- Banco: IDs UUID v7 (`uuidv7()` do Postgres 18); enums do Postgres para status, papéis e regimes; sem `ON DELETE CASCADE`; constraints que o Drizzle não gera (ex.: `EXCLUDE`) vão em migração SQL escrita à mão (`db:generate --custom`).
- RLS como segunda barreira de isolamento entre lojas (sessão 5).
- Login próprio: e-mail e senha com argon2id; sessão no Postgres (`sessions`), token no cookie `nm_session` (httpOnly, SameSite=Lax, Secure em produção).
- Guard global `SessionGuard` fechado por padrão: toda rota exige sessão; rotas abertas usam `@Public()`. O contexto de quem está logado vem de `@CurrentAuth()` (`userId`, `storeId`, `role`).
- Testes: Vitest; banco real via Docker Compose para testes de integração.
- Filas: adiar; tendência para pg-boss quando houver emissão.
- XML e DANFE em armazenamento compatível com S3.
- Publicação: decidir no fim do bloco Base.
- Código em inglês; telas e mensagens em português.

## Escopo atual: marco 1 (estoque e vendas, SEM nota)

Marcos em aberto como proposta. Horas são estimativas.

| Bloco                                                                                   | Horas   |
| --------------------------------------------------------------------------------------- | ------- |
| Base: projeto, banco, login, separação por loja, trava de acesso, publicação            | 30 a 50 |
| Cadastros: empresa (CNPJ, inscrição estadual, regime), clientes, fornecedores, veículos | 25 a 40 |
| Teste antecipado de NF-e de veículo em homologação (depende de certificado A1)          | 10 a 15 |
| Estoque com custos e crédito presumido por veículo                                      | 25 a 40 |
| Venda com veículo recebido na troca                                                     | 20 a 30 |

Ordem: Base → Cadastros → teste de NF-e (se houver certificado; senão desce na fila) → Estoque → Vendas.

Fluxo do produto:

1. Compra ou troca: o veículo entra com placa, chassi, RENAVAM, vendedor, valor e nota de entrada.
2. Estoque: custos de preparação somam ao veículo. Estados: disponível, reservado, vendido.
3. Venda: comprador, preço e pagamento. Veículo recebido na troca volta ao passo 1.

Loja sem cadastro fiscal completo usa estoque e vendas, mas não emite nota.

## Modelo de dados do marco 1 (aprovado em 26/11/2026)

- `stores`: uma loja = um CNPJ. Nome obrigatório; CNPJ, IE e UF opcionais (o cadastro inicial pede só o nome). `fiscal_status`: `incomplete` | `complete`.
- `store_tax_regimes`: regime (`simples` | `regular`) com `valid_from`/`valid_to`; sem períodos sobrepostos por loja.
- `users`, `memberships` (papel por loja: `owner`, `seller`).
- `sessions`: usuário, loja ativa, hash SHA-256 do token (o token só existe no cookie), `expires_at` (30 dias, pelo relógio do banco), `revoked_at`.
- `subscriptions` (uma por loja): `status` (`trialing` | `active` | `past_due` | `canceled`), `trial_ends_at`, `current_period_end`, `manual_grant` (loja piloto), campos do gateway nulos até o marco 2.
- `parties`: clientes e fornecedores na mesma tabela (PF/PJ, CPF/CNPJ, IE, MEI, endereço, contato).
- `vehicles`: identidade física (chassi, RENAVAM, placa, marca, modelo, versão, anos, cor, combustível, `category`). Chassi único por loja.
- `stock_entries`: cada passagem do veículo pelo estoque (status, reserva, data e km de entrada).
- `acquisitions`: compra ou troca; vendedor + cópia do tipo fiscal do vendedor na data (PF, MEI, PJ Simples, PJ regular); valor; nota de entrada (chave, número, série, emitente, arquivo). `presumed_credit_amount` nulo e marcado como não validado.
- `preparation_costs`: custos que somam ao veículo.
- `status_events`: histórico de status da entrada de estoque.
- `sales`: entrada de estoque, comprador, vendedor, data, preço, status (`draft` | `confirmed` | `cancelled`), `external_invoice_key` (nota emitida fora até o marco 2). No máximo uma venda confirmada por entrada de estoque.
- `sale_payments`: forma (pix, dinheiro, financiamento, cartão, transferência, `trade_in`) e valor; `trade_in` aponta para uma nova `acquisition`.
- `files`: referência a objetos no S3.
- Todas as tabelas: `store_id`, FKs compostas `(store_id, id)`, `created_at`, `updated_at`, `created_by`.
- CNPJ e IE sempre como texto (CNPJ alfanumérico, IN RFB 2.229/2024).
- Marco 2: `webhook_events` (único por `(gateway, event_id)`), contador de notas por loja e período.

## Entrada, teste grátis e pagamento (definido em 26/11/2026)

Caminho: landing page → cadastro curto → dashboard com 14 dias grátis → checkout.

| Rota        | Tela           | Quem acessa                          | O que tem                                              |
| ----------- | -------------- | ------------------------------------ | ------------------------------------------------------ |
| `/`         | Landing page   | todos                                | Produto, preço, botões de cadastro e de login          |
| `/cadastro` | Cadastro curto | visitante                            | Nome, e-mail, senha e nome da loja                     |
| `/login`    | Login          | visitante                            | E-mail e senha                                         |
| `/app`      | Dashboard      | conta com teste ou assinatura ativos | Estoque, vendas, guia de formalização; nota e métricas |
| `/checkout` | Assinatura     | conta logada                         | Pagamento no gateway                                   |

- Conta nova: `/` → `/cadastro` → `/app`. O cadastro não pede CNPJ nem cartão.
- Quem já tem conta: `/login` → `/app`.
- Teste vencido sem assinatura: `/login` ou `/app` levam a `/checkout`.
- A loja vai ao checkout quando o teste acaba, ou antes, se quiser emitir nota.
- Até existir a landing (marco 2), `/` redireciona para `/login`.

Regras do teste grátis:

- Dura 14 dias, sem cartão. Libera estoque, vendas e o guia de formalização. Não emite nota.
- Ao vencer, bloqueia o dashboard, mas os dados ficam guardados.
- A loja piloto é liberada manualmente (`manual_grant`), sem pagar.

Quem pode emitir nota (conferido no servidor): assinatura ativa **e** cadastro fiscal completo (CNPJ, IE e certificado digital).

Regras de implementação:

- O servidor decide o acesso (em teste, assinante, teste vencido) em toda rota da API do dashboard, por um guard global. Nunca confiar no navegador nem no relógio dele. A situação de acesso é calculada a cada requisição, nunca gravada.
- Datas salvas em UTC (`timestamptz`).
- Pagamento só é confirmado pelo webhook do gateway, com assinatura verificada, nunca pelo retorno do navegador.
- O mesmo webhook recebido duas vezes não muda o resultado.
- Nunca receber nem guardar dados de cartão: usar o checkout do próprio gateway.
- Landing page entregue como HTML pré-renderizado.
- Testes obrigatórios: teste ativo, teste vencido, assinatura ativa, nota bloqueada durante o teste, webhook repetido.

Ordem de construção:

- Marco 1: cadastro, login, trava de acesso (guard global) e dashboard (estoque e vendas). O modelo já guarda a data de fim do teste e a situação da assinatura.
- Marco 2: guia de formalização, nota, métricas, landing page, checkout e webhook.

Em aberto (perguntar antes de implementar): gateway de pagamento; preço (proposta: R$ 99,90 por loja ao mês com 50 notas, extras cobradas); pagamento atrasado e assinatura cancelada; contagem de notas por loja; como impedir teste repetido (sugestão: e-mail único e, ao preencher o CNPJ, conferir se ele já usou teste).

## Fora do marco 1 (não começar sem pedido)

- Marco 2: guia de formalização e certificado digital; cálculo de ICMS, IBS e CBS e imposto estimado; NF-e de entrada e saída por API fiscal; cancelamento, carta de correção, DANFE e XMLs; métricas e alerta de venda sem nota; landing, checkout e webhook.
- Etapas 2 e 3: motos, demais estados, veículos 0 km e Imposto Seletivo.
- Depois da versão 1: integração com RENAVE, consignação, NFS-e, financeiro.

## Regras de engenharia

- Dinheiro nunca em float: `NUMERIC(14,2)` no banco; centavos inteiros no código (tipo `Money`), conversão só na camada de repositório.
- Todo dado pertence a uma loja. Toda consulta filtra pela loja do usuário autenticado, e o RLS do Postgres bloqueia o resto. Cada recurso novo tem teste provando que uma loja não acessa dados de outra.
- Regras fiscais ficam em `packages/fiscal`, por estado, regime e data de vigência. Alíquotas e códigos em tabelas com vigência, nunca fixos no código.
- A API fiscal (candidatas: Focus NFe e NFE.io, ainda não testadas) fica atrás da interface `EmissorFiscal`. A emissão é idempotente: a mesma venda nunca gera duas notas.
- Certificados digitais e senhas criptografados; nunca em log, repositório ou teste.
- LGPD: dados de teste fictícios; XMLs de exemplo sem dados pessoais.
- Durante o desenvolvimento, emitir nota somente em homologação, nunca em produção.

## Regras fiscais

- NÃO inventar alíquota, CST, cClassTrib, CFOP, NCM ou prazo. Sem fonte oficial, parar, perguntar e anotar em `docs/pendencias-contador.md`.
- Cálculo sem validação de contador fica marcado como não validado e não vai para produção.

Contexto conferido em 26/11/2026 (reconferir antes de cada entrega):

- CBS substitui PIS e Cofins em 1/1/2027; IBS substitui ICMS e ISS aos poucos até 2033.
- IBS e CBS na NF-e: regime regular desde 3/8/2026; Simples Nacional a partir de 1/3/2027.
- Usado comprado de pessoa física ou MEI: a partir de 2027, o regime regular tem crédito presumido de IBS/CBS, só na revenda do mesmo veículo, vinculado ao RENAVAM. A nota de entrada usa `indBemMovelUsado`. Guardar tipo do vendedor, valor, RENAVAM e nota de entrada desde o marco 1. Não calcular o valor do crédito sem regra validada.
- Usados têm base reduzida de ICMS (Convênio 15/1981); a alíquota varia por estado.
- RENAVE é obrigatório (Res. Contran 1.026/2026) e cada registro pede NF-e autorizada.
- Revenda de carros ou motos usados não cabe no MEI.
- Marco 2, proposta: calculadora oficial da Receita (Java) como serviço separado, atrás de um adaptador. A versão 1.7.2 não emite NF-e e só tem as alíquotas de 2026.

## Pendências

- Certificado A1 para o teste de homologação: ainda sem definição.
- Estado piloto: decidir mais para frente.

## Como trabalhar

- Sessões de cerca de 2 horas: uma tarefa pequena por vez.
- Antes de codar, mostrar um plano curto. Mudança no modelo de dados ou dependência nova precisa de aprovação.
- Terminar com `pnpm check` passando e atualizar `docs/progresso.md`: o que foi feito, bloco, horas gastas e próximo passo.
- Perto de 28/12/2026, comparar horas previstas e reais e rever as datas.
- Quando uma decisão mudar, atualizar este arquivo.
