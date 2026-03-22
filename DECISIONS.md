# DECISIONS.md — Journal des décisions

> À remplir à chaque fois qu'une décision s'écarte du plan initial ou mérite d'être tracée.
> Format : `[DATE] Décision — Pourquoi`

---

## Décisions techniques

**[2026-03] Paiement Wave uniquement (pas Stripe)**
Wave est le système de paiement dominant en Afrique de l'Ouest (Sénégal, Côte d'Ivoire). Stripe rejeté car trop complexe à mettre en place localement et non adapté au marché cible.

**[2026-03] `registrations.amount` stocké au moment du checkout**
On ne recalcule pas le prix au moment du paiement Wave. Le montant promo est capturé dans `amount` à la création de la registration. `wave-checkout` lit `reg.amount` — jamais `products.price`.

**[2026-03] `access_grants` avec UNIQUE + upsert**
Évite les erreurs de doublon quand un webhook est rejoué ou qu'un admin confirme manuellement une commande déjà payée. `.upsert({ onConflict: "user_id,product_id" })` partout.

**[2026-03] `send-email` retourne toujours HTTP 200**
Supabase `functions.invoke()` lève une erreur JS sur les status 4xx/5xx, ce qui empêchait de lire le message d'erreur. L'erreur est retournée dans le body JSON et lue via `data?.error`.

**[2026-03] TTL signed URLs : 600s au lieu de 3600s**
Réduit la fenêtre d'accès après révocation. Un utilisateur révoqué ne peut plus accéder au fichier après 10 minutes maximum.

**[2026-03] `increment_promo_usage` retourne boolean**
Remplace la version void (non atomique). La vérification + incrément se fait en une seule transaction SQL pour éviter la race condition (2 users appliquant le même code en simultané).

**[2026-03] Slugs produits pour les URLs publiques**
Les URLs `/p/nom-produit` sont plus propres pour le SEO et le partage que `/product/uuid`. Le slug est auto-généré depuis le titre mais personnalisable.

**[2026-03] Waiting list comme fonctionnalité centrale**
Raison d'être de la plateforme. Permet de valider l'intérêt avant de créer un produit. Les visiteurs s'inscrivent par email, sans nécessité d'avoir un compte.

---

## Décisions produit

**[2026-03] Commandes gratuites visibles dans l'espace membre**
Même les produits gratuits (price = 0) créent une `registration` + `access_grant` pour que le membre retrouve son accès dans son dashboard.

**[2026-03] Phone obligatoire à l'onboarding**
Requis pour le suivi client et les paiements Wave (qui utilisent le numéro de téléphone).

**[2026-03] Sidebar admin collapsible**
État persisté en localStorage. Permet à l'admin de gagner de l'espace sur petit écran.

---

## À décider / en suspens

- [ ] Système d'affiliation ?
- [ ] Accès par abonnement mensuel ?
- [ ] Multi-langues (français + anglais) ?
- [ ] Notifications SMS (en plus email) ?
