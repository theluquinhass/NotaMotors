-- Migração escrita à mão: separação por loja com Row Level Security.
--
-- A API conecta como notamotors_app, que não é dono das tabelas: o RLS sempre se aplica.
-- Cada transação da API define app.store_id e app.user_id com set_config(..., true).
-- Sem contexto, as funções abaixo retornam NULL e nenhuma linha é visível (falha fechada).

-- Papel da API. Em produção, o LOGIN e a senha são definidos fora do repositório.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'notamotors_app') THEN
    CREATE ROLE notamotors_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO notamotors_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO notamotors_app;
--> statement-breakpoint
-- Tabelas criadas por migrações futuras já nascem com os mesmos privilégios.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO notamotors_app;
--> statement-breakpoint

CREATE FUNCTION app_current_store_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.store_id', true), '')::uuid $$;
--> statement-breakpoint
CREATE FUNCTION app_current_user_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
--> statement-breakpoint

-- stores: só a loja do contexto.
ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "stores_tenant" ON "stores"
  USING ("id" = app_current_store_id())
  WITH CHECK ("id" = app_current_store_id());
--> statement-breakpoint

-- subscriptions: só a assinatura da loja do contexto.
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "subscriptions_tenant" ON "subscriptions"
  USING ("store_id" = app_current_store_id())
  WITH CHECK ("store_id" = app_current_store_id());
--> statement-breakpoint

-- store_tax_regimes: só os regimes da loja do contexto.
ALTER TABLE "store_tax_regimes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "store_tax_regimes_tenant" ON "store_tax_regimes"
  USING ("store_id" = app_current_store_id())
  WITH CHECK ("store_id" = app_current_store_id());
--> statement-breakpoint

-- memberships: vínculos da loja do contexto, ou os do próprio usuário
-- (o login precisa descobrir a loja do usuário antes de haver loja no contexto).
-- Gravar, só na loja do contexto.
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "memberships_tenant" ON "memberships"
  USING ("store_id" = app_current_store_id() OR "user_id" = app_current_user_id())
  WITH CHECK ("store_id" = app_current_store_id());

-- users e sessions ficam sem RLS de propósito: são dados de identidade, não da loja,
-- acessados só pelo módulo de autenticação (sessão buscada pelo hash do token).
