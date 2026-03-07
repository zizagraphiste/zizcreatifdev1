
-- Trigger: auto-close product when spots_taken >= max_spots
CREATE OR REPLACE FUNCTION public.auto_close_product()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.spots_taken >= NEW.max_spots AND NEW.status = 'active' THEN
    NEW.status := 'closed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_close_product
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.auto_close_product();

-- Add status column to access_grants for deferred access tracking
ALTER TABLE public.access_grants ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
