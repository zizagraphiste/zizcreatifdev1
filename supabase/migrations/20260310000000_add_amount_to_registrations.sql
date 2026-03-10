-- Stocke le montant réel payé au moment du checkout
-- Évite de dépendre de products.price qui est 0 pour le coaching (prix par durée)
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS amount integer NOT NULL DEFAULT 0;

-- Backfill pour les inscriptions existantes non-coaching
UPDATE public.registrations r
SET amount = COALESCE(
  (SELECT p.price FROM public.products p WHERE p.id = r.product_id AND p.price > 0),
  0
)
WHERE r.amount = 0;
