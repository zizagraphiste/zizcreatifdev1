-- Ajoute ON DELETE CASCADE sur toutes les FK qui référencent products(id)
-- Permet de supprimer un produit/activité sans erreur de contrainte

-- 1. resources
ALTER TABLE public.resources
  DROP CONSTRAINT IF EXISTS resources_product_id_fkey;
ALTER TABLE public.resources
  ADD CONSTRAINT resources_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- 2. access_grants
ALTER TABLE public.access_grants
  DROP CONSTRAINT IF EXISTS access_grants_product_id_fkey;
ALTER TABLE public.access_grants
  ADD CONSTRAINT access_grants_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- 3. registrations (garder les inscriptions même si le produit est supprimé → SET NULL)
ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_product_id_fkey;
ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

-- 4. coaching_durations (si la table existe)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coaching_durations'
  ) THEN
    ALTER TABLE public.coaching_durations
      DROP CONSTRAINT IF EXISTS coaching_durations_product_id_fkey;
    ALTER TABLE public.coaching_durations
      ADD CONSTRAINT coaching_durations_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. coaching_availability
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coaching_availability'
  ) THEN
    ALTER TABLE public.coaching_availability
      DROP CONSTRAINT IF EXISTS coaching_availability_product_id_fkey;
    ALTER TABLE public.coaching_availability
      ADD CONSTRAINT coaching_availability_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. coaching_blocked_dates
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coaching_blocked_dates'
  ) THEN
    ALTER TABLE public.coaching_blocked_dates
      DROP CONSTRAINT IF EXISTS coaching_blocked_dates_product_id_fkey;
    ALTER TABLE public.coaching_blocked_dates
      ADD CONSTRAINT coaching_blocked_dates_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;
