
-- Table pour stocker le contenu éditable de la page d'accueil
CREATE TABLE public.site_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'textarea'
  label text, -- label affiché dans l'admin
  section text, -- pour regrouper : 'hero', 'value_props', 'cta', 'footer'
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire (page publique)
CREATE POLICY "Anyone can read site content"
ON public.site_content FOR SELECT
USING (true);

-- Seuls les admins peuvent modifier
CREATE POLICY "Admins can manage site content"
ON public.site_content FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed : contenu par défaut
INSERT INTO public.site_content (key, value, type, label, section, sort_order) VALUES
-- Hero
('hero_tag', 'Guides · Masterclass · Apps en avant-première', 'text', 'Tag (pill)', 'hero', 1),
('hero_line1', 'Apprends.', 'text', 'Ligne 1', 'hero', 2),
('hero_line2', 'Crée.', 'text', 'Ligne 2', 'hero', 3),
('hero_line3', 'Évolue.', 'text', 'Ligne 3', 'hero', 4),
('hero_subtitle', 'Des ressources exclusives pour les créatifs ambitieux — guides pratiques, masterclass en direct, et accès anticipé aux apps que je construis.', 'textarea', 'Sous-titre', 'hero', 5),
('hero_cta_primary', 'Voir le catalogue', 'text', 'Bouton principal', 'hero', 6),
('hero_cta_secondary', 'En savoir plus', 'text', 'Bouton secondaire', 'hero', 7),
-- Value props
('vp1_title', 'Guides complets', 'text', 'Titre bloc 1', 'value_props', 1),
('vp1_desc', 'Des guides PDF étape par étape pour maîtriser la création de produits digitaux.', 'textarea', 'Description bloc 1', 'value_props', 2),
('vp2_title', 'Masterclasses live', 'text', 'Titre bloc 2', 'value_props', 3),
('vp2_desc', 'Sessions en direct avec Q&A pour aller plus loin et poser tes questions.', 'textarea', 'Description bloc 2', 'value_props', 4),
('vp3_title', 'Apps & templates', 'text', 'Titre bloc 3', 'value_props', 5),
('vp3_desc', 'Des outils prêts à utiliser pour lancer plus vite sans repartir de zéro.', 'textarea', 'Description bloc 3', 'value_props', 6),
-- Catalogue
('catalogue_title', 'Produits disponibles', 'text', 'Titre catalogue', 'catalogue', 1),
('catalogue_subtitle', 'Des ressources concrètes pour passer à l''action et créer tes premiers revenus en ligne.', 'textarea', 'Sous-titre catalogue', 'catalogue', 2),
-- CTA
('cta_title', 'Prêt à lancer ton activité ?', 'text', 'Titre CTA', 'cta', 1),
('cta_subtitle', 'Rejoins la communauté Zizcreatif et accède à des ressources exclusives pour créer, vendre et scaler.', 'textarea', 'Sous-titre CTA', 'cta', 2),
('cta_button', 'Créer mon compte', 'text', 'Bouton CTA', 'cta', 3),
-- Footer
('footer_text', 'Tous droits réservés.', 'text', 'Texte footer', 'footer', 1);
