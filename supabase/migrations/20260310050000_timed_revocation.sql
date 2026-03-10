-- Durée de révocation et expiration d'accès
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS revoked_until date;

ALTER TABLE public.access_grants
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
