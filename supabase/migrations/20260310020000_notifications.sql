-- Table notifications persistantes admin
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,          -- 'registration' | 'payment_proof' | 'message' | 'coaching'
  title text NOT NULL,
  body text,
  link text,                   -- route admin cible
  read_at timestamptz,         -- NULL = non traité
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins only" ON public.notifications
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Index pour les non-lues
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications (read_at) WHERE read_at IS NULL;
