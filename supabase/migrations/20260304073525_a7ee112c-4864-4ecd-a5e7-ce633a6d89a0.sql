
-- Update products SELECT policy to include closed products (visible but disabled)
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active or closed products"
ON public.products
FOR SELECT
USING (status IN ('active', 'closed'));
