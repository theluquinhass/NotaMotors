CREATE TYPE "public"."party_kind" AS ENUM('person', 'company');--> statement-breakpoint
CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"store_id" uuid NOT NULL,
	"kind" "party_kind" NOT NULL,
	"document" text,
	"name" text NOT NULL,
	"trade_name" text,
	"is_mei" boolean DEFAULT false NOT NULL,
	"company_tax_regime" "tax_regime",
	"state_registration" text,
	"email" text,
	"phone" text,
	"postal_code" char(8),
	"street" text,
	"number" text,
	"complement" text,
	"district" text,
	"city" text,
	"city_ibge_code" char(7),
	"uf" char(2),
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parties_store_id_uq" UNIQUE("store_id","id"),
	CONSTRAINT "parties_store_document_uq" UNIQUE("store_id","document"),
	CONSTRAINT "parties_document_format_ck" CHECK ("parties"."document" is null
        or ("parties"."kind" = 'person' and "parties"."document" ~ '^[0-9]{11}$')
        or ("parties"."kind" = 'company' and "parties"."document" ~ '^[0-9A-Z]{12}[0-9]{2}$')),
	CONSTRAINT "parties_mei_company_ck" CHECK (not "parties"."is_mei" or "parties"."kind" = 'company'),
	CONSTRAINT "parties_regime_company_ck" CHECK ("parties"."company_tax_regime" is null or ("parties"."kind" = 'company' and not "parties"."is_mei")),
	CONSTRAINT "parties_postal_code_ck" CHECK ("parties"."postal_code" ~ '^[0-9]{8}$'),
	CONSTRAINT "parties_city_ibge_ck" CHECK ("parties"."city_ibge_code" ~ '^[0-9]{7}$'),
	CONSTRAINT "parties_uf_ck" CHECK ("parties"."uf" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "parties_store_name_idx" ON "parties" USING btree ("store_id","name");--> statement-breakpoint
-- Separação por loja (RLS), na mesma migração da tabela: ver CLAUDE.md.
ALTER TABLE "parties" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "parties_tenant" ON "parties"
  USING ("store_id" = app_current_store_id())
  WITH CHECK ("store_id" = app_current_store_id());
