# ARCHITECTURE.md — ZizCreatif Platform

> Ce fichier est lu intégralement par l'IA au début de chaque session.
> Il contient tout ce que l'IA doit savoir pour travailler sans poser de questions inutiles.

---

## 1. Vision produit

Plateforme e-commerce de ressources digitales (guides, masterclass, apps, books, formations) pour créatifs africains.
L'élément central : **la waiting list** — les visiteurs s'inscrivent avant même qu'un produit soit disponible.

**Flux business principal :**
1. L'admin crée un produit en `draft` ou `active`
2. Visiteurs s'inscrivent sur la **waiting list** (email, même sans compte)
3. Quand le produit passe à `active`, les inscrits reçoivent un email automatique
4. Ils achètent → paiement Wave → `access_grant` créé → accès membre

---

## 2. Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Paiement | Wave CI/SN (wave-checkout + wave-webhook) |
| Email | Resend (via Edge Function `send-email`) |
| Deploy | Vercel (auto-deploy sur push `main`) |
| Package manager | **bun** (ne jamais utiliser npm/yarn) |

---

## 3. Supabase

- **Project ref** : `zlflqehckdwnglrusjmr`
- **URL** : `https://zlflqehckdwnglrusjmr.supabase.co`
- **Client** : `src/integrations/supabase/client.ts` (lit `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)
- **Secrets configurés** : `RESEND_API_KEY`, `WAVE_WEBHOOK_SECRET`

---

## 4. Base de données — Tables

### `profiles`
Profil utilisateur lié à `auth.users`. Champs : `full_name`, `email`, `phone`, `avatar_url`, `profession`, `mentor_credits`.

### `user_roles`
Rôles par utilisateur. Valeurs : `admin` | `member`. Fonction helper : `public.has_role(uid, role)`.

### `products`
Produits vendus. Champs clés :
- `type` : `guide` | `masterclass` | `app` | `book` | `formation`
- `status` : `draft` | `active` | `closed`
- `price` (XOF), `max_spots`, `spots_taken`
- `slug` (unique, URL-friendly)
- `delivery_mode` : `auto` | `scheduled`

### `registrations`
Commandes/inscriptions. Champs clés :
- `status` : `pending` | `confirmed` | `paid` | `revoked`
- `amount` : montant réel payé (respecte les promos — NE PAS utiliser `products.price`)
- `payment_method` : `wave` | `manual` | `free`

### `access_grants`
Accès produit débloqué. Contrainte UNIQUE `(user_id, product_id)`.
**Toujours utiliser `.upsert({ onConflict: "user_id,product_id" })` — jamais `.insert()` seul.**

### `waitlist_entries`
Liste d'attente par produit. Champs : `product_id`, `email`, `full_name`, `user_id` (nullable), `notified_at`.
Un même email ne peut s'inscrire qu'une fois par produit.

### `resources`
Fichiers liés aux produits (stockés dans le bucket `resources`).
URLs signées via Edge Function `resource-signed-url` (TTL 600s).

### `promo_codes`
Codes promo. Champs : `code`, `discount_percent`, `max_uses`, `times_used`, `active`, `applies_to_product_id`, `allowed_email`.
**Toujours utiliser la RPC `increment_promo_usage(promo_id)` — retourne `boolean` (false = limite atteinte).**

### `email_logs`
Logs de tous les emails envoyés via Resend.

### `mentor_messages`
Messagerie entre membres et admin.

### `member_notifications`
Notifications push pour les membres (Realtime Supabase).

### `site_content`
Contenu éditable de la homepage (admin).

### `masterclass_votes`
Votes/avis sur les masterclass.

---

## 5. Storage buckets

| Bucket | Accès | Usage |
|--------|-------|-------|
| `resources` | Privé | Fichiers produits (PDF, ZIP...) |
| `product-covers` | Public | Images/covers produits |
| `payment-proofs` | Privé | Preuves de paiement manuels |

---

## 6. Edge Functions

| Fonction | Rôle |
|----------|------|
| `wave-checkout` | Crée un lien de paiement Wave. Utilise `reg.amount` (pas `products.price`) |
| `wave-webhook` | Reçoit la confirmation Wave, upsert `access_grant`. Échoue si `WAVE_WEBHOOK_SECRET` absent |
| `resource-signed-url` | URL signée (TTL 600s) après vérification `access_grants` + `expires_at` |
| `free-resource-url` | URL pour ressources gratuites |
| `upload-payment-proof` | Upload preuve paiement manuel |
| `unlock-access` | Débloque accès manuellement |
| `send-email` | Envoi email via Resend. Toujours HTTP 200 (erreur dans le body JSON) |

---

## 7. Structure des pages

### Publiques
- `/` — Homepage (site_content éditable)
- `/product/:id` ou `/p/:slug` — Page produit (SEO, share buttons, QR, waiting list)
- `/login` — Auth
- `/reset-password` — Reset mot de passe

### Membre (auth requise)
- `/member` — Dashboard membre (accès, commandes, messages, profil)
- `/member/product/:id` — Contenu produit débloqué
- `/member/profile` — Profil membre

### Admin (rôle admin requis)
- `/admin` — Dashboard (KPIs, À traiter)
- `/admin/products` — Gestion produits (slug, QR code)
- `/admin/registrations` — Commandes (confirm, revoke, restore)
- `/admin/users` — Utilisateurs
- `/admin/waitlist` — **Waiting list par produit**
- `/admin/resources` — Fichiers/ressources
- `/admin/emails` — Emails Resend
- `/admin/promo-codes` — Codes promo
- `/admin/formations` — Formations
- `/admin/coaching` — Paramètres coaching
- `/admin/comptabilite` — Revenus
- `/admin/site-content` — Contenu homepage
- `/admin/messages` — Messages membres
- `/admin/activites` — Journal d'activité

---

## 8. Sécurité & règles RLS

- **RLS activé sur toutes les tables** sans exception.
- Les membres ne voient que leurs propres données.
- Les admins ont accès total via `has_role(auth.uid(), 'admin')`.
- **Jamais de DELETE physique** sur `registrations` ou `access_grants` — utiliser `status = 'revoked'`.
- La politique produits : seuls les produits `status = 'active'` sont visibles publiquement.

---

## 9. Conventions code

- **Composants** : PascalCase, un composant par fichier
- **Hooks** : `use` prefix, dans `src/hooks/`
- **Types Supabase** : générés dans `src/integrations/supabase/types.ts`
- **Toast** : toujours `toast.success()` / `toast.error()` de `sonner`
- **Formulaires** : react-hook-form + zod pour la validation
- **Dates** : `date-fns` avec locale `fr`
- **Icons** : `lucide-react` uniquement

---

## 10. Workflows métier critiques

### Achat payant (Wave)
1. `GuestCheckoutDialog` → crée `registration` (status: pending, amount stocké)
2. → `wave-checkout` → lien Wave
3. → Wave callback → `wave-webhook` → status: paid + `access_grant` upsert
4. → Email confirmation envoyé

### Achat gratuit (price = 0)
1. `GuestCheckoutDialog` → crée `registration` (status: confirmed)
2. → `access_grant` upsert immédiat (si user connecté)
3. → Redirect `/member`

### Waiting list
1. Visiteur clique "M'avertir" sur un produit draft/closed
2. Email enregistré dans `waitlist_entries`
3. Quand admin passe produit à `active` → email automatique à tous les inscrits
4. `notified_at` renseigné pour éviter les doublons

### Confirmation manuelle (admin)
- `AdminRegistrations` ou `AdminDashboard` → `upsert access_grant` + email
