-- Atomic increment of promo code usage counter
-- Prevents race conditions where two simultaneous purchases could both read
-- the same count and write the same incremented value
CREATE OR REPLACE FUNCTION public.increment_promo_usage(promo_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.promo_codes
  SET times_used = times_used + 1
  WHERE id = promo_id;
$$;
