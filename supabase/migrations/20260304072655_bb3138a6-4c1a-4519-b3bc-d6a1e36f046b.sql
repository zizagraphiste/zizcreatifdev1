
-- Allow guest registrations (no account needed)
CREATE POLICY "Anyone can create guest registrations"
ON public.registrations
FOR INSERT
WITH CHECK (user_id IS NULL);
