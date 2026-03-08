-- ─────────────────────────────────────────────────────────────
-- Coaching sessions : durées/tarifs + disponibilités calendrier
-- ─────────────────────────────────────────────────────────────

-- 1. Tarifs par durée (ex: 30min → 15000 FCFA, 60min → 25000 FCFA)
CREATE TABLE IF NOT EXISTS public.coaching_durations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  minutes     integer NOT NULL,          -- durée en minutes ex: 30, 60, 90
  label       text NOT NULL,             -- label affiché ex: "30 minutes"
  price       integer NOT NULL DEFAULT 0,
  currency    text NOT NULL DEFAULT 'FCFA',
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Disponibilités récurrentes (jours + plages horaires)
--    Ex: Lundi 09h–12h, Jeudi 14h–18h
CREATE TABLE IF NOT EXISTS public.coaching_availability (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dim, 1=Lun … 6=Sam
  start_time  time NOT NULL,   -- ex: 09:00
  end_time    time NOT NULL,   -- ex: 12:00
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Dates bloquées (congés, indisponibilités ponctuelles)
CREATE TABLE IF NOT EXISTS public.coaching_blocked_dates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, blocked_date)
);

-- RLS : lecture publique, écriture admin
ALTER TABLE public.coaching_durations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_availability    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_blocked_dates   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_durations_read"    ON public.coaching_durations    FOR SELECT USING (true);
CREATE POLICY "coaching_availability_read" ON public.coaching_availability FOR SELECT USING (true);
CREATE POLICY "coaching_blocked_read"      ON public.coaching_blocked_dates FOR SELECT USING (true);

CREATE POLICY "coaching_durations_admin"    ON public.coaching_durations    FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "coaching_availability_admin" ON public.coaching_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "coaching_blocked_admin"      ON public.coaching_blocked_dates FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. Stocker la durée choisie dans les inscriptions
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS coaching_duration_id uuid REFERENCES public.coaching_durations(id),
  ADD COLUMN IF NOT EXISTS session_date date,
  ADD COLUMN IF NOT EXISTS session_time time;
