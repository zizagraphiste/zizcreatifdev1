-- ═══════════════════════════════════════════════════════
--  Migration: onboarding + auto-link guest registrations
-- ═══════════════════════════════════════════════════════

-- 1. Add onboarding columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS phone text;

-- 2. Function: link guest registrations to account on signup
CREATE OR REPLACE FUNCTION public.link_guest_registrations()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS NOT NULL THEN
    UPDATE public.registrations
    SET user_id = NEW.id
    WHERE LOWER(email) = LOWER(v_email)
      AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Trigger: fires after each new profile insert (= after signup)
DROP TRIGGER IF EXISTS on_new_profile_link_registrations ON public.profiles;
CREATE TRIGGER on_new_profile_link_registrations
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.link_guest_registrations();
