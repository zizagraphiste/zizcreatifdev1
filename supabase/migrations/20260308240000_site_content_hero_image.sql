-- Ajoute les champs image hero dans site_content s'ils n'existent pas déjà

INSERT INTO public.site_content (key, value, type, label, section, sort_order)
VALUES
  ('hero_cover_image', '', 'image_upload', 'Image de couverture hero', 'hero', 5),
  ('hero_focal_point', '50 50', 'focal_point', 'Point focal de l''image', 'hero', 6)
ON CONFLICT (key) DO UPDATE
  SET type = EXCLUDED.type,
      label = EXCLUDED.label,
      section = EXCLUDED.section,
      sort_order = EXCLUDED.sort_order;
