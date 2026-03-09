/* ── Constantes partagées pour les activités ── */

export const DURATION_PRESETS = [
  { minutes: 30,  label: "30 min" },
  { minutes: 45,  label: "45 min" },
  { minutes: 60,  label: "1 h" },
  { minutes: 90,  label: "1 h 30" },
  { minutes: 120, label: "2 h" },
];

// Note: Radix UI Select interdit value="" → on utilise "none" comme sentinelle
export const DRESS_CODES = [
  { value: "none",         label: "Aucun dress code" },
  { value: "casual",       label: "Décontracté" },
  { value: "smart_casual", label: "Smart casual" },
  { value: "formelle",     label: "Tenue formelle" },
  { value: "soiree",       label: "Tenue de soirée" },
];
