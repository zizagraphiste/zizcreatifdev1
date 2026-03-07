
-- Add sort_order and is_free columns to resources
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;

-- Allow anyone to view free resources (public access)
CREATE POLICY "Anyone can view free resources"
ON public.resources
FOR SELECT
TO anon, authenticated
USING (is_free = true);
