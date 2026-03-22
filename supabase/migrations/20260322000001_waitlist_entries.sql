-- Colonne waitlist_mode sur les produits (admin peut activer la waiting list pour n'importe quel produit)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS waitlist_mode boolean NOT NULL DEFAULT false;

-- Waiting list : visiteurs s'inscrivent pour être notifiés quand un produit est disponible
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notified_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, email)
);

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut s'inscrire (même sans compte)
CREATE POLICY "anyone_insert_waitlist"
  ON public.waitlist_entries FOR INSERT
  WITH CHECK (true);

-- Un user connecté voit ses propres entrées
CREATE POLICY "user_reads_own_waitlist"
  ON public.waitlist_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Les admins voient tout
CREATE POLICY "admin_all_waitlist"
  ON public.waitlist_entries FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Index pour les lookups fréquents
CREATE INDEX IF NOT EXISTS waitlist_product_idx ON public.waitlist_entries (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS waitlist_email_idx   ON public.waitlist_entries (email);
