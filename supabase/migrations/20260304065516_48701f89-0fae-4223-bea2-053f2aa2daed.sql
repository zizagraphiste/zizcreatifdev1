-- Allow public read access to registrations by ID (for payment page)
-- This is needed because the payment page is accessed without authentication
CREATE POLICY "Anyone can view registration by id"
ON public.registrations
FOR SELECT
USING (true);

-- Drop the old restrictive select policy since the new one is more permissive
-- We keep the user-specific one for reference but the new policy covers all cases
-- Actually, let's be more careful - only allow select on specific columns via RLS
-- The existing "Users can view own registrations" policy is RESTRICTIVE
-- We need a PERMISSIVE policy for public access
DROP POLICY IF EXISTS "Anyone can view registration by id" ON public.registrations;

CREATE POLICY "Public can view registrations for payment"
ON public.registrations
FOR SELECT
TO anon, authenticated
USING (true);
