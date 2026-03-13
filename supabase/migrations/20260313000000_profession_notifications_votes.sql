-- ── 1. Profession sur le profil ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profession text;

-- ── 2. Table notifications membres (distincte des notifs admin) ──────────────
-- La table admin `notifications` existe déjà (20260310020000_notifications.sql)
-- On crée une table dédiée aux membres
CREATE TABLE IF NOT EXISTS public.member_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text NOT NULL DEFAULT 'general',
  -- Valeurs : 'message' | 'product' | 'coaching' | 'payment' | 'general'
  title       text NOT NULL,
  body        text,
  link        text,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS member_notif_user_idx
  ON public.member_notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.member_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_member_notifications" ON public.member_notifications
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Table masterclass_votes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.masterclass_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.masterclass_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_votes" ON public.masterclass_votes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Tout le monde peut lire les votes (pour afficher le compteur)
CREATE POLICY "anyone_reads_votes" ON public.masterclass_votes
  FOR SELECT USING (true);
