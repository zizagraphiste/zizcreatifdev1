-- Add cover image URL column to products
ALTER TABLE public.products ADD COLUMN cover_image_url text;

-- Create public bucket for product cover images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-covers', 'product-covers', true);

-- Anyone can view product cover images
CREATE POLICY "Public read access for product covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-covers');

-- Admins can upload/update/delete product cover images
CREATE POLICY "Admins can upload product covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-covers' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-covers' AND public.has_role(auth.uid(), 'admin'));
