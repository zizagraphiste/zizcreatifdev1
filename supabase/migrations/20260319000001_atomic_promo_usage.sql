-- Remplacement de increment_promo_usage par une version atomique
-- Vérifie max_uses ET incrémente en une seule transaction
-- Retourne TRUE si ok, FALSE si limite atteinte (race-condition safe)
CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.promo_codes
  SET times_used = times_used + 1
  WHERE id = promo_id
    AND active = true
    AND (max_uses = 0 OR times_used < max_uses);

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Si 0 lignes mises à jour → limite atteinte ou code inactif
  RETURN updated_count > 0;
END;
$$;
