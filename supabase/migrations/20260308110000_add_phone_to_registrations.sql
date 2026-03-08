-- Add phone number to registrations for guest checkout contact
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS phone text;
