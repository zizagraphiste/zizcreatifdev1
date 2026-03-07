
-- New product columns: attendance_mode, venue, online_link, event_time, date_mode
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS attendance_mode text DEFAULT 'online',
  ADD COLUMN IF NOT EXISTS venue text,
  ADD COLUMN IF NOT EXISTS online_link text,
  ADD COLUMN IF NOT EXISTS event_time text,
  ADD COLUMN IF NOT EXISTS date_mode text DEFAULT 'fixed';

-- Add delivery_address fields on registrations
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_city text,
  ADD COLUMN IF NOT EXISTS delivery_location text;

-- Promo codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value integer NOT NULL DEFAULT 0,
  applies_to_type text,
  max_uses integer DEFAULT 0,
  times_used integer DEFAULT 0,
  active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read active promo codes" ON public.promo_codes
  FOR SELECT TO anon, authenticated
  USING (active = true);

-- Add promo_code_id to registrations
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id),
  ADD COLUMN IF NOT EXISTS discount_amount integer DEFAULT 0;
