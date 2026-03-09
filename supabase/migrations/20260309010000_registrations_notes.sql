-- Ajoute la colonne notes à registrations
-- Permet au client de décrire les points à aborder lors d'un coaching
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS notes TEXT;
