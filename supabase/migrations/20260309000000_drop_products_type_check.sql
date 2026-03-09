-- Supprime la contrainte CHECK sur products.type
-- Les types sont désormais gérés dynamiquement via la table activity_types
-- (coaching, diner, weekend, masterclass, etc. peuvent tous être stockés)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
