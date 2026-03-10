-- Allow 'revoked' as a valid registration status
ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_status_check;

ALTER TABLE public.registrations
  ADD CONSTRAINT registrations_status_check
  CHECK (status IN ('pending', 'paid', 'confirmed', 'rejected', 'revoked'));
