-- Migração escrita à mão: o Drizzle não gera constraints EXCLUDE.
-- Impede que uma loja tenha dois regimes tributários vigentes no mesmo dia.
-- valid_to é exclusivo e nulo enquanto o regime está vigente (intervalo '[)').
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "store_tax_regimes"
  ADD CONSTRAINT "store_tax_regimes_no_overlap_ex"
  EXCLUDE USING gist ("store_id" WITH =, daterange("valid_from", "valid_to", '[)') WITH &&);
