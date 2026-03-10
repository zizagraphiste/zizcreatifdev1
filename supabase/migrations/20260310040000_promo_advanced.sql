-- Promotions avancées : par produit spécifique et par personne
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS applies_to_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allowed_email text;
