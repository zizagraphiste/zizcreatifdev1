-- Table des types d'activités (gérés dynamiquement depuis l'admin)
CREATE TABLE IF NOT EXISTS public.activity_types (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value      text UNIQUE NOT NULL,         -- clé technique ex: "masterclass"
  label      text NOT NULL,               -- nom affiché ex: "Masterclass"
  emoji      text NOT NULL DEFAULT '📅',  -- emoji associé
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Valeurs par défaut
INSERT INTO public.activity_types (value, label, emoji, sort_order) VALUES
  ('masterclass', 'Masterclass',           '🎤', 1),
  ('coaching',    'Coaching one-to-one',   '🎯', 2),
  ('diner',       'Dîner avec le mentor',  '🍽️', 3),
  ('weekend',     'Week-end Détox',        '🌿', 4)
ON CONFLICT (value) DO NOTHING;

-- RLS : lecture publique, écriture admin uniquement
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_types_read_all"
  ON public.activity_types FOR SELECT USING (true);

CREATE POLICY "activity_types_admin_write"
  ON public.activity_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
