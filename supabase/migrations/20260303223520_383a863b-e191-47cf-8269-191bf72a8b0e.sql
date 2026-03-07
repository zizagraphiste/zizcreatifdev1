
-- Create storage bucket for resources (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', false);

-- Admins can upload resources
CREATE POLICY "Admins can upload resources" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'));

-- Admins can update resources
CREATE POLICY "Admins can update resources" ON storage.objects FOR UPDATE USING (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete resources
CREATE POLICY "Admins can delete resources" ON storage.objects FOR DELETE USING (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'));

-- Users with access can download resources
CREATE POLICY "Users with access can download resources" ON storage.objects FOR SELECT USING (
  bucket_id = 'resources' AND (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.resources r
      JOIN public.access_grants ag ON ag.product_id = r.product_id
      WHERE r.file_path = name
      AND ag.user_id = auth.uid()
      AND (ag.available_at IS NULL OR ag.available_at <= now())
      AND (ag.expires_at IS NULL OR ag.expires_at > now())
    )
  )
);
