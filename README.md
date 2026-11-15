# ANTI-DOTES DZ — Disponibilité des antidotes (pharmacies hospitalières)

Application web de recensement : chaque pharmacien hospitalier crée un compte (identifiant + mot de passe),
renseigne les antidotes disponibles dans son établissement (lots, quantités, péremptions) et transmet sa fiche.
La coordination (Centre Antipoison) consolide les fiches et les exporte au format d'intégration de la plateforme
nationale ANTI-DOTES DZ (table `STOCK_LOTS`).

## Contenu du dossier

```
public/            interface (HTML, CSS, JS — aucune dépendance externe hors polices)
  index.html
  style.css
  app.js
api/               fonctions serverless Vercel (Node.js 20+)
  _lib.js          base de données, sessions, sécurité (non exposé comme route)
  _schema.js       schéma et contrôle des fiches (non exposé comme route)
  register.js      POST  création de compte
  login.js         POST  connexion
  logout.js        POST  déconnexion
  me.js            GET   session en cours
  password.js      POST  changement de mot de passe
  submission.js    GET / POST  fiche du compte connecté
  admin/submissions.js  GET   toutes les fiches (coordination)
  admin/users.js        GET / POST  gestion des comptes (coordination)
vercel.json        en-têtes de sécurité (CSP, HSTS…)
.env.example       variables d'environnement à définir
```

## Mise en ligne sur Vercel (environ 15 minutes)

1. **Déposer le code** : créez un dépôt GitHub (privé) et poussez-y ce dossier,
   ou utilisez la ligne de commande : `npm i -g vercel` puis `vercel` dans ce dossier.
2. **Créer le projet** : sur vercel.com → *Add New… → Project* → importez le dépôt.
   Aucun réglage de build : Vercel sert `public/` et transforme `api/` en fonctions.
3. **Ajouter la base de données** : dans le projet → onglet *Storage* (ou *Marketplace*) →
   **Upstash for Redis** → *Create* → *Connect to project*. Les variables `KV_REST_API_URL`
   et `KV_REST_API_TOKEN` sont ajoutées automatiquement.
4. **Variables d'environnement** (*Settings → Environment Variables*) :
   | Variable | Valeur | Obligatoire |
   |---|---|---|
   | `SESSION_SECRET` | chaîne aléatoire de 32+ caractères (`openssl rand -hex 32`) | oui |
   | `ADMIN_USERNAMES` | identifiant(s) de la coordination, séparés par des virgules (ex. `coordination.cap`) | oui |
   | `REGISTRATION_CODE` | code à communiquer aux pharmaciens pour pouvoir créer un compte | recommandé |
   | `REQUIRE_APPROVAL` | `true` : chaque nouveau compte doit être activé par la coordination | recommandé |
5. **Redéployer** (*Deployments → Redeploy*) pour prendre en compte les variables.
6. **Créer le compte de coordination** : ouvrez le site, onglet *Créer un compte*, avec l'identifiant
   exact indiqué dans `ADMIN_USERNAMES`. Ce compte est actif immédiatement et voit les onglets
   *Consolidation* et *Comptes*.
7. **Diffuser** l'adresse du site et le code d'inscription aux pharmaciens hospitaliers.
   Activez leurs comptes dans l'onglet *Comptes*.

## Fonctionnement

- **Pharmacien** : création de compte, connexion, fiche (établissement, 23 antidotes, lots), brouillon
  conservé sur l'appareil, transmission versionnée (les 20 dernières versions sont gardées), changement
  de mot de passe. Il ne voit que sa propre fiche.
- **Coordination** : tableau de consolidation (établissements, wilayas couvertes, fiches de plus de 30 jours,
  antidotes sans détenteur, lots périmant sous 3 mois), détail par établissement, exports CSV/JSON,
  activation / désactivation des comptes, attribution du rôle coordination, mot de passe provisoire.

## Sécurité mise en place

- Mots de passe hachés (bcrypt), jamais stockés en clair ; 8 caractères minimum avec lettre et chiffre.
- Session par cookie signé (HMAC-SHA256), `HttpOnly`, `Secure`, `SameSite=Lax`, durée 8 h.
- Limitation des tentatives de connexion (par identifiant et par adresse IP) et des créations de compte.
- Contrôle d'accès côté serveur : un pharmacien ne peut lire que sa fiche ; les routes `admin/` vérifient le rôle.
- Contrôle et normalisation de chaque fiche côté serveur ; en-têtes de sécurité (CSP stricte, HSTS, anti-iframe).
- Aucune donnée patient collectée.

## Développement local

```
npm install
npx vercel dev
```
Sans variables Redis, l'application utilise un stockage en mémoire (local uniquement, effacé à l'arrêt).
En production, l'absence de base de données ou de `SESSION_SECRET` bloque volontairement l'application.

## Points à valider avant un déploiement national

- **Hébergement des données** : Vercel et Upstash hébergent hors d'Algérie (choisissez la région la plus
  proche, ex. Francfort, lors de la création de la base). Les données sont des stocks et les coordonnées
  professionnelles des pharmaciens (pas de données de santé), mais la loi 18-07 et l'ANPDP doivent être
  consultées ; pour la plateforme définitive, un hébergement national est recommandé.
- **Nom de domaine** : ajoutez un domaine institutionnel dans *Settings → Domains*.
- **Liste des antidotes** : identique au référentiel de la plateforme (à valider par le comité scientifique) ;
  elle se modifie dans `public/app.js` (tableau `AB`) et `api/_schema.js` (`AB_IDS`).

## Format d'intégration (CSV des lots)

Séparateur `;`, UTF-8 avec BOM (ouverture directe dans Excel). Une ligne par lot, ou par antidote en rupture / non détenu :
`etablissement_cle, wilaya_code, etablissement_type, etablissement_nom, antidote_code, dci, statut, presentation,
quantite, unite, numero_lot, date_peremption, transmis_le, certifie_par, version, compte`.
Les codes antidotes (`atro`, `prali`, `nac`…) sont ceux du référentiel de la plateforme ANTI-DOTES DZ.
