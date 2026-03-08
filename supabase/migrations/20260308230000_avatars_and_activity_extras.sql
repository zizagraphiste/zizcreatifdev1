-- ─────────────────────────────────────────────────────────────────────
-- Photos de profil + extras activités (weekend/dîner) + icônes types
-- ─────────────────────────────────────────────────────────────────────

-- 1. Avatar URL pour les profils membres et admin
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Champs supplémentaires pour les activités
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS end_date date,           -- Date de fin (Week-end, multi-jour)
  ADD COLUMN IF NOT EXISTS extra_config jsonb DEFAULT '{}'; -- Config spécifique au type (dîner, weekend…)

-- 3. Icône Lucide pour les types d'activités (remplace l'emoji)
ALTER TABLE public.activity_types
  ADD COLUMN IF NOT EXISTS icon_name text;

-- Migrer les emojis existants vers les noms d'icônes
UPDATE public.activity_types SET icon_name = 'Mic'        WHERE value = 'masterclass';
UPDATE public.activity_types SET icon_name = 'Target'     WHERE value = 'coaching';
UPDATE public.activity_types SET icon_name = 'Utensils'   WHERE value = 'diner';
UPDATE public.activity_types SET icon_name = 'TreePine'   WHERE value = 'weekend';

-- 4. Tracker l'admin qui a répondu dans les messages mentor
ALTER TABLE public.mentor_messages
  ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id);

-- 5. Bucket de stockage pour les avatars (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 6. Politiques RLS pour le bucket avatars
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete" ON storage.objects;

CREATE POLICY "avatars_public_read"  ON storage.objects FOR SELECT TO public       USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_upload"  ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_update"  ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "avatars_auth_delete"  ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
