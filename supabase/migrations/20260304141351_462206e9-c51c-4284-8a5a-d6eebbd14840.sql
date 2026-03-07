
CREATE OR REPLACE FUNCTION public.auto_close_product()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.max_spots > 0 AND NEW.spots_taken >= NEW.max_spots AND NEW.status = 'active' THEN
    NEW.status := 'closed';
  END IF;
  RETURN NEW;
END;
$$;
