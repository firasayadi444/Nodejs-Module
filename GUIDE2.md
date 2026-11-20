# Guide du Jour 2 — API PostgreSQL et sécurité

Ce guide résume le document **« Jour 2 — Énoncés des TP »**. La journée comprend quatre TP, numérotés de 5 à 8. Le but est de faire passer l’API v0 de données en mémoire à une API reliée à PostgreSQL, puis de valider et sécuriser ses accès.

## Objectif de la journée

À la fin du Jour 2, l’API doit lire et écrire dans PostgreSQL avec des requêtes paramétrées, rejeter les entrées invalides, authentifier les utilisateurs et appliquer leurs permissions. Les mesures et inspections doivent aussi pouvoir être renvoyées ou synchronisées plusieurs fois sans créer de doublons.

## Avant de commencer

1. Démarrez Docker Desktop et vérifiez que son moteur est actif.
2. À la racine du dépôt, lancez `docker compose up -d`, puis vérifiez avec `docker compose ps` que le service `db` est `running`.
3. Vérifiez le contenu de la base : **400 ruches, 1 146 240 mesures et 1 194 inspections**.
4. Repartez du tag Git `jour1-fin`. Le travail se fait dans le dépôt du Jour 1.
5. Copiez depuis le kit du Jour 2 les trois fichiers fournis, à leurs emplacements indiqués :
   - `scripts/import-measures.js` dans `scripts/` ;
   - `src/validators/messages.js` dans `src/validators/` ;
   - `tp/tp8-sync/lot.json` dans `tp/tp8-sync/`.
6. Vérifiez que `npm run dev` charge `.env` grâce à `--env-file=.env`. Ne commitez jamais `.env` ni de vrais secrets.

## TP 5 — Brancher PostgreSQL

**Objectif :** remplacer les tableaux en mémoire par PostgreSQL, sans modifier les services, contrôleurs ni routes. Ce TP vérifie que les couches du Jour 1 sont bien séparées.

À faire :

- Installer `pg`, ajouter la configuration `STORAGE` et `DB_POOL_MAX`, et créer un pool de connexions.
- Écrire les repositories PostgreSQL pour les ruches, les mesures et les inspections. Ils doivent avoir les mêmes méthodes que les repositories en mémoire.
- Utiliser des requêtes SQL paramétrées, sélectionner les colonnes explicitement et convertir les noms de colonnes SQL vers les noms de l’API.
- Choisir le stockage au démarrage : PostgreSQL par défaut, mémoire si `STORAGE=memory`. Vérifier la connexion à PostgreSQL au lancement.
- Importer les 4 800 mesures du 31 octobre avec le script fourni, en comparant une insertion à la fois et une insertion par lots transactionnels.

**À vérifier :** les ruches, mesures et inspections viennent de la base ; un filtre par site fonctionne ; une valeur ressemblant à une injection SQL ne retourne pas toutes les données.

**À noter dans le README :** les durées des deux modes d’import et les réponses aux quatre questions sur l’écart de temps, les transactions et la libération de connexion.

## TP 6 — Validation et erreurs

**Objectif :** centraliser la validation avec Joi et donner des erreurs sûres et cohérentes, sans exposer les piles d’exécution ou les messages SQL.

À faire :

- Installer Joi et utiliser les messages français fournis.
- Ajouter des erreurs métier typées avec leur statut HTTP, dont validation, ressource absente et conflit.
- Centraliser leur conversion en réponses RFC 9457 dans l’intergiciel d’erreur.
- Définir des schémas Joi pour les mesures, la pagination, les inspections et les autres entrées indiquées dans l’énoncé.
- Ajouter l’intergiciel `validate` aux routes et faire lire aux contrôleurs les données validées.

**À vérifier :** une mesure hors limites produit une erreur `400` avec tous les messages concernés ; une pagination invalide est refusée ; une erreur de clé dupliquée devient un `409` compréhensible ; un champ interdit comme `author_id` est rejeté ; aucune réponse ne révèle SQL ou pile d’exécution.

**Livrable :** commit `feat: validation Joi et erreurs centralisées`, et `npm test` au vert.

## TP 7 — Authentification et autorisation

**Objectif :** savoir qui fait chaque requête et limiter les données et actions selon le compte, son rôle et son site.

À faire :

- Installer `bcryptjs` et `jsonwebtoken`, puis créer deux secrets JWT distincts dans `.env` et des valeurs factices dans `.env.example`.
- Ajouter la connexion, le renouvellement du jeton, la vérification du jeton d’accès et la création de comptes par un administrateur.
- Bloquer un compte pendant 15 minutes après cinq échecs de connexion consécutifs.
- Protéger les routes et contrôler l’accès aux ruches selon le rôle et le périmètre de l’utilisateur.

**Règles d’accès à vérifier :** l’administrateur voit toutes les ruches ; le coordinateur ne voit que celles de son site ; l’apiculteur ne voit que ses propres ruches. Une ruche existante mais interdite donne `403`, tandis qu’une ruche inexistante donne `404`.

**Livrable :** commit `feat: authentification JWT et contrôle d'accès`, tests, et résultat d’une requête interdite consigné dans le README.

## TP 8 — Synchronisation idempotente

**Objectif :** permettre au mobile de renvoyer un lot après une coupure réseau sans créer de doublons ni écraser silencieusement une modification plus récente.

À faire :

- Rendre les insertions de mesures rejouables sans doublon.
- Ajouter la mise à jour optimiste des inspections à l’aide du champ `version`.
- Créer `POST /api/inspections/sync` pour traiter un lot de 1 à 500 inspections, une par une.
- Renvoyer pour chaque élément un résultat tel que créé, inchangé, mis à jour, conflit ou rejeté, sans faire échouer tout le lot pour une seule entrée refusée.
- Choisir une règle de résolution de conflit et la justifier en trois lignes dans le README. La référence applique « le serveur l’emporte ».

**À vérifier :** rejouer un lot ne crée aucun doublon ; une modification avec une version périmée renvoie un conflit ; un lot vide est refusé ; un utilisateur sans rôle autorisé reçoit `403`. Les insertions répétées d’une mesure et d’une inspection doivent être idempotentes.

**Livrable :** commit `feat: synchronisation idempotente des inspections`, tests de rejeu et de conflit, et règle de conflit expliquée dans le README.

## Livraison du Jour 2

À la fin de la journée, vérifiez que :

- l’API utilise PostgreSQL et les requêtes SQL sont paramétrées ;
- les temps d’import et réponses demandées au TP 5 sont dans le README ;
- toutes les entrées sont validées avec Joi et les erreurs suivent RFC 9457 ;
- la connexion JWT, les rôles, les permissions et le blocage après cinq échecs fonctionnent ;
- les mesures et inspections se rejouent sans doublon et la synchronisation signale les conflits ;
- `npm test` passe ;
- `.env` n’est pas suivi par Git et `.env.example` contient seulement des valeurs factices.

Posez ensuite le tag `jour2-fin` sur l’état du projet, même s’il reste des éléments à terminer. Notez dans le README tout élément manquant, puis poussez les commits et le tag sur le dépôt distant.
