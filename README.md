# VANTA — App Next.js / Prisma

Ce projet fait suite au document d'architecture (`architecture-technique-plateforme.md`) et au
prototype HTML (`vanta-prototype.html`). Il contient du **vrai code fonctionnel** : le point
important est que **la landing page n'affiche plus aucun chiffre codé en dur**. Les statistiques
("Membres vérifiés", "Paiements confirmés à temps") sont calculées par `lib/stats.ts` à partir
de vraies requêtes PostgreSQL (`prisma.user.count(...)`, agrégation sur `PaymentSchedule`), et
recalculées automatiquement toutes les 5 minutes (ISR) — pas de texte statique dans le composant.

## ⚠️ Ce qui a été vérifié dans cet environnement, et ce qui ne l'a pas été

Ce sandbox n'a pas d'accès réseau à `binaries.prisma.sh` (téléchargement du moteur Prisma) ni à
une base PostgreSQL réelle. Concrètement :

- ✅ `npm install` a réussi (Next.js, Prisma, NextAuth, bcryptjs installés).
- ✅ Le schéma Prisma (`prisma/schema.prisma`) a été relu manuellement ligne par ligne.
- ❌ `npx prisma validate` / `generate` / `migrate` n'ont PAS pu s'exécuter ici (403 sur le
  téléchargement du moteur). **Vous devez lancer ces commandes vous-même** en local ou en CI.
- ❌ `npm run build` n'a pas été exécuté (nécessite le client Prisma généré, donc une vraie base).

Je préfère vous le dire clairement plutôt que d'affirmer que "tout fonctionne" sans l'avoir
vérifié.

## Sur la lenteur en développement

Deux choses différentes se cachent souvent derrière "c'est lent" :

1. **Le bug corrigé ci-dessus** (page d'accueil mise en cache entière) pouvait donner une
   impression de lenteur/incohérence en plus du problème de session — c'est réglé.
2. **`npm run dev` compile chaque route à la demande**, au premier chargement — c'est normal et
   inhérent à Next.js en développement, pas quelque chose que je peux supprimer depuis le code.
   Si vous voulez juger la vraie vitesse de l'app (celle que vos utilisateurs auront), testez en
   mode production locale :
   ```bash
   npm run build
   npm run start
   ```
   Le premier chargement de chaque page sera nettement plus rapide qu'en `npm run dev`.

Si après ça certaines pages restent lentes, dites-moi lesquelles précisément (l'URL) — la cause
est probablement une requête DB spécifique qu'on peut optimiser (index manquant, requête N+1),
pas un problème général.

## Démarrage

```bash
npm install
cp .env.example .env        # renseignez DATABASE_URL (Postgres), NEXTAUTH_SECRET, etc.
npx prisma generate
npx prisma migrate dev --name init
npm run seed                 # crée rôles, comptes de test, produits, un achat en cours
npm run dev
```

## Comptes créés par le seed (mot de passe : `Password123!`)

| Rôle | Email |
|---|---|
| Super Admin | `admin@vanta.app` |
| Manager | `manager@vanta.app` |
| Client démo (achat en cours) | `amina@vanta.app` |

Le seed crée aussi 40 clients `VERIFIED` et 8 `PENDING`, pour que les statistiques de la
landing page affichent des chiffres réalistes dès le premier lancement.

## Upload de fichiers (S3) — erreur "Failed to fetch"

Les uploads (médias produits, avatar, documents, preuves de paiement) passent par un
**upload direct navigateur → S3** (presigned POST) : notre serveur génère juste une URL
signée, le fichier ne transite jamais par lui. Si vous voyez une erreur "Failed to fetch"
(ou, depuis ce correctif, un message explicite qui en parle), ce n'est **pas** un bug de
l'application : c'est que le bucket S3 refuse la requête du navigateur avant même qu'elle
n'atteigne S3, presque toujours parce que le **CORS du bucket n'est pas configuré**.

Ajoutez ceci à la configuration CORS de votre bucket `S3_BUCKET_PUBLIC` (Console AWS →
bucket → Permissions → Cross-origin resource sharing) :

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://votre-domaine-de-prod.com"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Faites la même chose sur `S3_BUCKET_PRIVATE` (documents d'identité, preuves de paiement,
pièces jointes de messagerie). Sans ce CORS, **aucun** upload direct-navigateur ne peut
fonctionner, quel que soit le compte ou la page — vérifiez donc ce point en premier si
plusieurs formulaires d'upload échouent en même temps.

## Ce qui est branché et fonctionnel

- **Inscription** (`/register`) → `POST /api/auth/register` → hash bcrypt, création réelle en base.
- **Connexion** (`/login`) → NextAuth Credentials (+ providers Google/Apple prêts, à configurer
  avec vos clés OAuth dans `.env`).
- **Landing page** (`/`) → stats et catalogue lus depuis PostgreSQL en Server Component.
- **Dashboard client** (`/dashboard`) → achat, progression, échéances, notifications : 100%
  dérivés de la session + de la base, aucune valeur statique.
- **Déclaration de paiement** → bouton client → `POST /api/schedules/:id/declare` → crée une
  vraie ligne `PaymentSubmission`, passe l'échéance en `AWAITING_VALIDATION`, notifie les
  admins/managers.
- **Zone Manager** (`/manager/verifications`, `/manager/payments`) → files d'attente réelles,
  actions Valider/Refuser/Demander infos qui écrivent en base et notifient le client.
  - Confirmer un **apport initial** génère automatiquement les 8 échéances (`addMonths` depuis
    la date de confirmation), active le plan et passe le produit en `IN_PROGRESS`.
  - Confirmer la **dernière échéance** clôture le plan, l'achat et passe le produit en `SOLD`.
  - Confirmer une échéance intermédiaire active automatiquement la suivante (`UPCOMING` → `DUE`).
- **Zone Super Admin** (`/admin/dashboard`, `/admin/managers`) :
  - Dashboard avec statistiques agrégées en direct (montant encaissé, reste à recevoir,
    répartition clients/offres) — même logique de calcul réel que la landing page.
  - Gestion des permissions Manager : grille de capacités, activables/désactivables
    individuellement, chaque changement journalisé dans `admin_logs`.
- **Middleware de rôle** (`middleware.ts`) → protège `/dashboard`, `/manager`, `/admin` côté
  serveur (pas seulement en cachant un lien dans l'UI).
- **Permissions Manager configurables** (`lib/permissions.ts`) → `hasCapability()` /
  `requireCapability()`, appelé dans chaque route sensible des modules Manager/Admin.
- **Journal d'audit** (`lib/admin-log.ts`) → chaque validation/refus (vérification, paiement,
  permission) écrit une ligne dans `admin_logs` avec acteur, action, ancienne/nouvelle valeur.
- **Page produit publique** (`/products/[slug]`) → CTA entièrement dynamique selon l'état
  (non connecté → connexion / non vérifié → vérification / vérifié → achat / réservé / vendu),
  conforme à la section 10 du cahier des charges.
- **Flux d'achat réel** → `POST /api/products/[slug]/purchase` crée l'achat + le plan de
  paiement en transaction, avec un verrou anti-double-réservation (voir commentaire dans le
  fichier sur le choix de réserver l'offre dès la création plutôt qu'à la confirmation admin).
- **Déclaration de l'apport initial** → `POST /api/purchases/[id]/deposit/declare`, avec un
  composant réutilisé à la fois sur la page produit et sur le dashboard.
- **Soumission de vérification d'identité** (`/verification`) → `POST /api/verification/submit`,
  crée la demande + un vrai document uploadé vers le bucket privé (voir module stockage cloud
  plus bas).
- **Gestion des offres côté admin** (`/admin/products`) — CRUD complet :
  - Création/édition avec caractéristiques eFootball (OVR, plateforme, coins, division),
    conditions financières, statut, mise en avant.
  - Gestion des médias par upload réel ou par URL (voir module stockage cloud plus bas).
  - Suppression bloquée si l'offre a un historique d'achats (protège l'intégrité des données
    financières) — le message invite à masquer l'offre à la place.
  - `manage_offers` est configurable par Manager ; `delete_offers` reste réservé au Super Admin
    par défaut, conformément à la matrice de permissions du document d'architecture.
- **Zone sécurisée de remise des informations d'accès** (`/admin/purchases`) — section 18 du
  cahier des charges :
  - Le Super Admin ajoute une information (titre + contenu) sur un achat — elle est créée
    **non visible** par défaut. La rendre visible est une action manuelle et distincte.
  - Au moment de la publication, le client reçoit une notification qui ne contient **jamais**
    le contenu sensible lui-même — juste une invitation à se connecter pour le consulter.
  - Le client voit ces informations dans son dashboard, uniquement celles marquées visibles,
    uniquement sur ses propres achats (filtré côté serveur par `purchase: { userId }`).
  - Réservé à `send_access_info`, capacité non éditable pour les Managers dans l'UI actuelle
    (cohérent avec "réservé au Super Admin par défaut" de la matrice de permissions).
- **Messagerie interne** (`/messages` côté client, `/manager/messages` côté staff) — section 19 :
  - Un seul point d'entrée d'envoi (`POST /api/messages/send`) : côté client, la conversation
    est retrouvée ou créée à la volée — aucun ID à connaître. Côté staff, `conversationId` est
    requis et `reply_messages` est vérifié côté serveur.
  - Marquage "lu" explicite (`POST /api/conversations/[id]/read`), déclenché à l'ouverture du
    fil — le compteur de non-lus du Manager (`prisma.message.groupBy`) ne compte que les
    messages clients non lus par le staff.
  - Le Manager peut archiver une conversation ou la marquer comme traitée
    (`PATCH /api/conversations/[id]/status`) ; tout nouveau message la repasse automatiquement
    en `OPEN`.
  - Dashboard client : aperçu des 3 derniers messages, alimenté par une vraie requête (plus le
    contenu statique du prototype HTML initial).
- **Job de retards/pénalités** (`lib/late-payment-job.ts`) — section 21 du cahier des charges :
  - Rappels d'échéance à J-3 et J-1 (voir limite de déduplication dans les commentaires du
    fichier — le job est prévu pour tourner une fois par jour).
  - Détection des échéances dépassant le délai de grâce configuré → statut `PENALIZED`,
    `daysLate` et `penaltyAmount` calculés (fixe ou pourcentage), notifications client + staff.
  - Escalade automatique : suspension du compte au-delà de `maxLateDaysBeforeSuspension`,
    annulation du contrat (achat + plan + réouverture de l'offre) au-delà de
    `maxLateDaysBeforeCancellation`. Les deux sont journalisées dans `admin_logs` avec
    `actorRole: "SYSTEM"` (l'acteur technique réutilise le compte du premier Super Admin trouvé,
    la contrainte de clé étrangère de `admin_logs` exigeant un utilisateur réel — voir
    commentaire dans le fichier).
  - Réglages configurables par le Super Admin sur `/admin/settings` (délai de grâce, type/valeur
    de pénalité, seuils de suspension/annulation), plus un bouton pour déclencher le job
    manuellement (utile ici en l'absence de vrai cron, et pour tester en développement).
  - Exposé via `POST /api/cron/late-payments`, protégé soit par un header
    `Authorization: Bearer $CRON_SECRET` (pour un vrai cron externe), soit par une session
    Super Admin (pour le bouton manuel). **En production**, configurez un cron Vercel
    (`vercel.json` → `crons`) ou tout autre scheduler pour appeler cette route une fois par
    jour avec le secret défini dans `.env`.
- **Stockage cloud (AWS S3)** (`lib/storage.ts`) — section 26 du cahier des charges :
  - Deux buckets distincts : **public** (images/vidéos de produits, avec support CDN via
    `S3_PUBLIC_BASE_URL`) et **privé** (documents d'identité — jamais d'URL publique).
  - Upload direct navigateur → S3 via POST présigné (`createPresignedPost`), avec contraintes
    de taille et de type MIME imposées **par S3 lui-même** (`Conditions`), pas seulement
    côté client — le fichier ne transite jamais par le serveur Next.js.
  - `/admin/products` (`ProductForm`) permet de téléverser un vrai fichier média en plus de
    coller une URL externe.
  - `/verification` téléverse réellement la pièce d'identité vers le bucket privé ; la base ne
    stocke que la clé S3, jamais le fichier.
  - `GET /api/admin/documents/[id]` régénère une URL de consultation à durée de vie courte
    (5 min) pour le staff autorisé (`view_id_documents`), et **journalise chaque consultation**
    dans `admin_logs` — les documents sensibles ne sont jamais exposés directement.
  - La file d'attente Manager (`/manager/verifications`) affiche maintenant un lien vers les
    documents soumis, ce qu'elle ne faisait pas avant ce module.

  ⚠️ **Comme pour Prisma, je n'ai pas pu tester ce module en conditions réelles dans ce
  sandbox** : les packages `@aws-sdk/*` s'installent bien depuis le registre npm (vérifié), mais
  le réseau du sandbox n'autorise pas les appels vers `amazonaws.com`, donc aucun vrai upload
  n'a été effectué ici. Le code suit le pattern standard AWS (POST présigné avec conditions de
  taille/type), mais testez-le vous-même avec un vrai bucket avant la mise en production.
- **Correctif : la déconnexion visuelle au clic sur "Accueil".** La cause réelle était
  `export const revalidate = 300` posé directement sur `app/page.tsx` : une page qui dépend de
  la session (via le layout) ne doit **jamais** avoir de `revalidate` au niveau page, sinon
  Next.js met en cache la page entière — navbar de connexion comprise — et sert la même version
  figée à tous les visiteurs pendant la durée du cache. Le correctif découple les deux
  préoccupations : la page reste dynamique (donc fidèle à la session de chaque visiteur), et
  les requêtes coûteuses (stats, catalogue) sont mises en cache séparément via
  `unstable_cache` (`lib/stats.ts`, `lib/catalog.ts`). Même performance, mais correct.
- **Compte utilisateur** (`AccountMenu`, `/account`) :
  - Vrai menu déroulant (avatar cliquable) avec **bouton de déconnexion fonctionnel**
    (`signOut()` de next-auth) — il n'y en avait pas avant ce module.
  - Page "Mon profil" dédiée : photo de profil (upload réel vers le bucket public, même
    pattern que les médias produits), prénom/nom/téléphone/pays éditables, changement de mot
    de passe (uniquement pour les comptes créés par email — masqué pour les comptes
    Google/Apple, qui n'ont pas de mot de passe local).
  - `PATCH /api/me` n'accepte jamais l'email, le rôle, ou le statut de vérification, même si
    le corps de la requête en contient — volontairement, pour qu'un client ne puisse jamais
    s'auto-promouvoir ou casser son propre statut de vérification via cette route.
- **Perf : mise en cache de la requête la plus répétée de l'app.** Le layout racine (donc
  chaque page, sans exception) interrogeait la base pour le nom/avatar de la nav à chaque
  navigation. Mise en cache 60s via `unstable_cache` (tag `nav-user`), invalidée immédiatement
  après une mise à jour de profil (`revalidateTag`) pour que le changement d'avatar/nom soit
  visible tout de suite dans le menu, pas seulement après 60 secondes.
- **UX : écrans de chargement** (`loading.tsx`) sur `/dashboard`, `/account`, `/messages`,
  `/admin/*`, `/manager/*` — Next.js les affiche automatiquement pendant que la page récupère
  ses données, plutôt qu'un écran blanc.
- **Page Admin "Clients"** (`/admin/clients`) :
  - Liste avec recherche (nom/email) et filtre par statut de vérification, chaque carte de
    stat du dashboard admin y renvoie directement (ex. clic sur "Clients en attente").
  - Fiche détail par client : infos, historique des demandes de vérification, achats, lien
    direct vers la zone de remise des informations d'accès pour ses achats en cours.
  - Suspendre/réactiver un compte (`suspend_client`, réservé au Super Admin par défaut,
    cohérent avec la matrice de permissions) — notifie le client et journalise l'action.
- **Emails transactionnels** (`lib/email.ts`, `lib/email-templates.ts`, via Resend) —
  section 17 du cahier des charges :
  - `sendEmail()` ne lève jamais d'exception : un échec ou une absence de configuration
    (`RESEND_API_KEY` non renseigné) n'interrompt jamais l'action métier qui l'a déclenché.
    Les notifications in-app restent la source de vérité, l'email est un canal en plus.
  - Branché sur les moments qui comptent : bienvenue à l'inscription, vérification
    approuvée/refusée, apport initial et mensualités confirmés/refusés (l'exemple donné
    littéralement en section 17), rappels d'échéance, retard + pénalité, suspension/
    réactivation de compte, annulation de contrat, information d'accès publiée (toujours un
    message générique, **jamais le contenu sensible** — même règle que la notification
    in-app), et réponse du staff dans la messagerie.
  - Volontairement **pas** d'email à chaque message client → staff (pour ne pas noyer les
    managers), ils restent avertis en in-app + dans la file `/manager/messages`.
  - ⚠️ Même limite que Prisma/S3 : `api.resend.com` n'est pas joignable depuis ce sandbox,
    donc aucun envoi réel n'a été testé ici. Créez un compte Resend, vérifiez un domaine
    d'envoi, et renseignez `RESEND_API_KEY` + `EMAIL_FROM` pour tester en conditions réelles.

## Comptes de test étendus

Le seed crée maintenant aussi :
- `client.attente1@vanta.app` avec une demande de vérification `PENDING` (visible dans
  `/manager/verifications`).
- `youssef@vanta.app` avec un achat en attente de validation de son apport initial (visible
  dans `/manager/payments`).
- L'échéance n°5 d'Amina déjà déclarée et en attente de validation (visible dans
  `/manager/payments`).

## Ce qui reste à construire (prochains modules)

- Validation de la config S3 et Resend en conditions réelles (voir avertissements ci-dessus).

## Deux derniers correctifs (relecture complète du cahier des charges)

- **Redirection intelligente après connexion** (section 6.14) — jusqu'ici, tout le monde
  atterrissait sur `/dashboard` après connexion, même un Manager ou un Super Admin. Corrigé :
  `getSession()` est appelé juste après `signIn()` pour lire le rôle, et la redirection suit
  la règle du cahier des charges (Client → `/dashboard`, Manager → `/manager/verifications`,
  Super Admin → `/admin/dashboard`). Les boutons Google/Apple restent sur `/dashboard` sans
  changement : un compte OAuth est toujours créé en tant que `CLIENT` (voir `lib/auth.ts`),
  donc pas d'ambiguïté de rôle possible pour ces boutons.
- **Bouton afficher/masquer le mot de passe** (section 6.1) — absent de toutes les vraies pages
  de l'app (seul le prototype HTML initial l'avait). Nouveau composant partagé
  `components/PasswordField.tsx`, intégré sur `/login`, `/register`, `/reset-password`, et
  la section changement de mot de passe de `/account`.

## Cinq dernières améliorations

- **Protection anti-bruteforce** (`lib/auth.ts`, table `LoginAttempt`) — 5 échecs en 15
  minutes verrouillent temporairement les tentatives sur un email. Suivi par email plutôt
  que par IP (l'objet requête de `authorize()` en v4 n'expose pas l'IP de façon fiable dans
  tous les contextes de déploiement) — limite volontairement documentée dans le code. Chaque
  tentative (succès ou échec) est journalisée, y compris pour un email inexistant, pour ne pas
  laisser un attaquant distinguer les deux cas via le comportement de verrouillage.
- **Responsive mobile** — jamais vérifié sur la vraie app jusqu'ici (seul le prototype HTML
  initial l'avait). Corrections : tableaux scrollables horizontalement sous 700px plutôt que
  débordants, grilles de formulaires fixes (`ProductForm`, `AccountForm`, `LateRulesForm`,
  fiche produit) qui s'effondrent en une colonne, rangées de navigation secondaire
  Admin/Manager qui passent à la ligne (`flex-wrap`) au lieu de déborder, modales et cartes
  d'authentification qui prennent la largeur de l'écran sur petit format.
- **Galerie produit** (`components/ProductGallery.tsx`) — les médias étaient déjà récupérés
  en base sur la page produit mais jamais affichés (juste un bloc décoratif fixe). Maintenant :
  image ou vidéo principale + bande de vignettes cliquables, lecteur vidéo natif si le média
  est une vidéo.
- **Notes internes sur un client** (`ClientNote`, `/admin/clients/[id]`) — section 23. Historique
  de notes horodatées et attribuées à leur auteur, jamais visibles par le client, réservées à
  la capacité `view_clients`.
- **Onboarding en plusieurs étapes** (`/verification`) — section 6.10. La page unique est
  devenue un vrai parcours en 4 étapes (Bienvenue → Profil → Vérification → Dossier en attente),
  avec la barre "rail" du design system réutilisée comme indicateur de progression — cohérent
  avec le principe déjà posé que cette barre segmentée est la signature visuelle de
  progression de toute l'app (paiements ET onboarding).

## Trois derniers compléments : mot de passe oublié, journal d'audit, graphiques

- **Mot de passe oublié / réinitialisation** (`/forgot-password`, `/reset-password`) —
  sections 6.11-6.12 du cahier des charges :
  - Nouvelle table `PasswordResetToken` (token à usage unique, expiration 1h, jamais stocké
    en clair — seul le hash SHA-256 est en base, le token brut ne vit que dans l'URL envoyée
    par email).
  - `POST /api/auth/forgot-password` renvoie **toujours** la même réponse générique, que
    l'email existe ou non — exigence explicite du cahier des charges pour ne pas révéler
    quels emails sont enregistrés.
  - Les comptes Google/Apple purs (sans mot de passe local) sont ignorés silencieusement.
  - Le lien "Mot de passe oublié ?" sur `/login` ne menait nulle part avant ce module — corrigé.
- **Journal d'audit** (`/admin/logs`) — section 28. La table `admin_logs` était alimentée
  depuis le tout premier module (chaque validation, paiement, suppression, consultation de
  document...) mais il n'existait aucun écran pour la consulter. Recherche par action, type de
  cible, ou email de l'acteur ; les actions automatiques du job de retards apparaissent avec
  `SYSTÈME (job auto)`.
- **Graphiques du dashboard Super Admin** (`recharts`, ajouté au projet et vérifié à
  l'installation) — section 22 :
  - Revenu mensuel sur les 6 derniers mois, calculé en additionnant les échéances payées
    (`paidAt`) et les apports initiaux validés (`startDate` du plan) groupés par mois — pas de
    données simulées.
  - Répartition des paiements (payés / en attente / en retard) en barres.

## Compléments : pièces jointes (preuves de paiement + messagerie)

- **Preuves de paiement** — `ProofUploadField` (composant partagé) ajouté aux trois formulaires
  de déclaration (`DeclarePaymentButton`, `DeclareDepositButton`, `PurchaseButton`). Le fichier
  va dans le bucket privé (`lib/storage.ts` → `createPaymentProofUploadPost`), la clé S3 est
  stockée sur `PaymentSubmission.proofUrl`. Le staff la consulte via un lien "Voir →" dans
  `/manager/payments`, qui passe par `GET /api/admin/payment-proofs/[submissionId]` — vérifie
  `confirm_payment`/`reject_payment`, régénère une URL signée de 5 min, et journalise l'accès.
- **Pièces jointes dans la messagerie** — bouton 📎 dans `MessageThread`, upload vers le bucket
  privé (`createMessageAttachmentUploadPost`), clé stockée sur `Message.attachmentUrl`.
  Consultation via `GET /api/attachments/message/[messageId]`, réservée aux deux participants
  de la conversation (le client concerné, ou un membre du staff avec `reply_messages`).
- `lib/storage.ts` a été réorganisé : les trois uploads vers le bucket privé (documents
  d'identité, preuves de paiement, pièces jointes) partagent maintenant une seule fonction
  interne (`createPrivateUploadPost`) au lieu de dupliquer la logique trois fois.

## UX : messagerie moins imposante

Sur retour direct : la fenêtre de conversation (`MessageThread`) était trop grande et les
bulles de message trop marquées visuellement. Ajustements :
- Hauteur réduite (520px → 380px).
- Bulles avec coins arrondis classiques plutôt que le style biseauté anguleux utilisé pour les
  panneaux — un fil de discussion se lit mieux avec une esthétique plus neutre que les
  panneaux HUD du reste de l'app.
- Couleurs de fond et bordures largement adoucies (opacité divisée par ~2), tailles de police
  et espacements resserrés.

## Refonte back-office + correctifs (session en cours)

Voir `CHANGELOG-refonte-backoffice.md` pour le détail de la refonte visuelle admin/manager.
Correctifs supplémentaires apportés sur retour utilisateur :

- **Bug corrigé — double barre de navigation sur l'admin/manager, et "déconnexion" au clic
  sur "Accueil"** : le layout racine (`app/layout.tsx`) affiche la barre de navigation de la
  vitrine publique (logo, "Accueil", "Offres"...) sur **toutes** les pages, y compris
  `/admin/*` et `/manager/*`, qui ont pourtant leur propre sidebar. Résultat : deux
  navigations superposées, et le lien "Accueil" de la vitrine renvoyait vers `/` — ce qui,
  vu depuis une page admin, donnait l'impression trompeuse d'être déconnecté (perte du
  contexte admin, retour à une page publique). La navbar de la vitrine est maintenant
  masquée automatiquement dès qu'une page utilise la sidebar back-office
  (`body:has(.bo-shell) nav { display: none; }` dans `globals.css`). Le lien "Retour au
  site" de la sidebar pointe maintenant vers `/` (la vitrine) plutôt que `/dashboard`
  (l'espace client, qui n'a pas de sens pour un compte admin/manager).
- **Fiabilisé** : le layout `/manager` important dynamiquement le layout `/admin`
  (`await import("@/app/admin/layout")`) a été remplacé par une configuration de
  navigation partagée dans `lib/backoffice-nav.ts` — pattern plus robuste avec le App
  Router.
- **Upload "Failed to fetch"** : voir la section "Upload de fichiers (S3)" plus haut —
  c'est presque toujours un CORS manquant sur le bucket S3, pas un bug applicatif. Le
  message d'erreur affiché à l'utilisateur est maintenant explicite à ce sujet au lieu
  d'afficher l'erreur brute du navigateur.
- **Ajouter image + vidéo pour une même offre** : déjà possible (`ProductForm` accepte
  plusieurs lignes de médias, chacune avec son propre type) — le texte d'aide au-dessus du
  bloc "Médias" a été clarifié pour que ce soit évident (cliquer "+ Ajouter un média" une
  fois par fichier).
- **Sur la lenteur** : je n'ai trouvé aucune requête N+1 ni configuration anormale côté
  serveur (Prisma est bien en singleton, les index nécessaires existent). La suppression
  de la double navbar réduit un peu le travail de rendu sur les pages admin/manager. Pour
  le reste, voir la section "Sur la lenteur en développement" plus haut : `npm run dev` est
  intrinsèquement plus lent que la production — testez avec `npm run build && npm run
  start` pour juger de la vitesse réelle. Si des pages précises restent lentes en
  production, indiquez-moi lesquelles.
