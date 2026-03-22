# CLAUDE.md — Règles absolues pour l'IA

> Ces règles s'appliquent à **toutes les sessions**, sans exception.
> Lire ARCHITECTURE.md en complément pour le contexte projet.

---

## Règles non négociables

### Base de données
- **RLS obligatoire** sur toute nouvelle table créée.
- **Jamais de DELETE physique** sur `registrations`, `access_grants`, `products`. Utiliser `status = 'revoked'` ou `status = 'draft'`.
- **Toujours upsert** pour `access_grants` avec `onConflict: "user_id,product_id"` — jamais `.insert()` seul.
- **Utiliser `reg.amount`** pour les paiements Wave — jamais `products.price` directement.
- **Utiliser la RPC `increment_promo_usage`** pour les promos — elle est atomique et retourne `boolean`.
- Pour changer le type de retour d'une fonction SQL : `DROP FUNCTION` d'abord, puis `CREATE FUNCTION`.

### Stack — ne jamais changer
- Package manager : **bun** (pas npm, pas yarn)
- Icons : **lucide-react** uniquement
- Toast : **sonner** (`toast.success`, `toast.error`)
- Style : **Tailwind CSS** + **shadcn/ui** uniquement

### Git
- **Un commit par fonctionnalité** terminée et testée.
- Ne jamais commiter de secrets ou tokens.
- Format commit : `feat:`, `fix:`, `chore:` + description courte en français.

### Edge Functions
- `send-email` retourne toujours **HTTP 200** (erreur dans le body JSON).
- `wave-webhook` retourne **500** si `WAVE_WEBHOOK_SECRET` absent (pour que Wave retente).
- TTL des URLs signées : **600s** (pas 3600s).

### Sécurité
- Pas de `dangerouslySetInnerHTML` sans sanitisation.
- Pas de secrets dans le code frontend (`VITE_` seulement pour les clés publiques).
- Toujours vérifier `auth.uid()` côté serveur pour les données sensibles.

---

## Comportement attendu

- Lire le fichier concerné **avant** de le modifier.
- Toujours vérifier les migrations existantes avant d'en créer une nouvelle.
- En cas de doute sur le schéma DB : regarder `supabase/migrations/` ou demander.
- Ne pas créer de nouveaux fichiers si une modification d'existant suffit.
- Responses courtes et directes — pas de résumé en fin de réponse.
- Utiliser TodoWrite pour les tâches multi-étapes.

---

## Accès rapide aux fichiers critiques

| Fichier | Rôle |
|---------|------|
| `src/integrations/supabase/client.ts` | Client Supabase |
| `src/integrations/supabase/types.ts` | Types DB générés |
| `src/App.tsx` | Routes React |
| `src/components/GuestCheckoutDialog.tsx` | Achat / promo / accès gratuit |
| `src/components/admin/AdminLayout.tsx` | Layout + navigation admin |
| `supabase/functions/wave-webhook/index.ts` | Webhook paiement Wave |
| `supabase/functions/wave-checkout/index.ts` | Création lien Wave |
| `supabase/functions/send-email/index.ts` | Envoi email Resend |
