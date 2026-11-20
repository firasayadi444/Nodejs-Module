# Queen Bee — TP Backend Node.js

## Membres du groupe

- Firas AYADI
- BENBRAHIM Mohammed

## TP 1 — Lecture des mesures sans bloquer

Mesures relevées sur ce poste avec la sonde `/ping` pendant l’import. Les durées varient selon la machine.

| Fichier | Mode | Durée de l’import (ms) | Pire temps de `/ping` (ms) |
| --- | --- | ---: | ---: |
| 1 jour | Bloquant | 15,31 | 9 |
| 1 jour | En flux | 24,51 | 5 |
| 30 jours | Bloquant | 350,83 | 345 |
| 30 jours | En flux | 388,24 | 5 |

Les deux modes renvoient les mêmes résultats : 4 800 mesures avec un poids moyen de 37,87 kg pour un jour, et 144 000 mesures avec un poids moyen de 38,74 kg pour 30 jours.

### Questions

**Pourquoi `/ping` attend-il pendant l’import bloquant ?**

`readFileSync` et le traitement de toutes les lignes s’exécutent sur le même fil que la boucle d’événements Node.js. Tant que ce travail synchrone n’est pas terminé, Node.js ne peut pas traiter les autres requêtes, dont `/ping`.

**La lecture en flux est-elle plus rapide ? Sinon, qu’apporte-t-elle ?**

Dans cette mesure, elle prend un peu plus de temps au total, mais elle laisse la boucle d’événements répondre aux autres requêtes pendant le traitement. Le pire `/ping` mesuré sur le fichier de 30 jours passe de 345 ms à 5 ms.

**Pourquoi l’effet est-il presque invisible avec le fichier d’une journée ?**

Le fichier d’une journée est assez petit pour que la lecture et le calcul bloquants se terminent rapidement. Le blocage est donc proche du temps de latence habituel et moins visible qu’avec le fichier de 30 jours.

## TP 5 — PostgreSQL et import en masse

L’API utilise PostgreSQL sur le port local `5433`. Les résultats d’import ci-dessous varient selon le poste.

| Mode d’import | Mesures | Durée |
| --- | ---: | ---: |
| Une requête par mesure | 4 800 | 14 068 ms |
| Lots de 1 000 mesures dans une transaction | 4 800 | 299 ms |

**Quel temps obtenez-vous dans chaque mode ? D’où vient l’écart ?**

L’insertion ligne à ligne a pris 14 068 ms, contre 299 ms par lots. Le premier mode produit 4 800 requêtes et validations séparées ; le second réduit fortement les allers-retours et valide toutes les écritures dans une même transaction.

**Si la 2 001e mesure provoquait une erreur, que resterait-il en base dans chaque mode ?**

En ligne à ligne, les 2 000 premières mesures resteraient enregistrées, car chaque requête est validée séparément. Par lots dans une transaction, aucune mesure du fichier ne resterait : le `ROLLBACK` annule toutes les écritures du lot d’import.

**Pourquoi la transaction emprunte-t-elle une connexion avec `pool.connect()` au lieu d’appeler `pool.query()` ?**

Une transaction doit exécuter `BEGIN`, les insertions et `COMMIT` sur une seule connexion. `pool.query()` peut emprunter une connexion différente à chaque appel, ce qui empêcherait PostgreSQL de conserver le contexte de la transaction.

**Que se passerait-il si `client.release()` n’était pas dans le `finally`, et qu’une erreur survenait dix fois de suite ?**

Chaque erreur conserverait une connexion empruntée. Après dix erreurs, le pool de dix connexions serait épuisé et les requêtes suivantes attendraient une connexion puis échoueraient après le délai d’attente.

## TP 6 — Validation et erreurs

Les entrées des routes ruches sont validées par Joi avant l’appel aux contrôleurs. Les schémas rejettent les champs inconnus, vérifient les limites physiques des mesures, les statuts et dates d’inspection, les filtres et la pagination. Les messages Joi sont en français. Les données validées sont transmises aux contrôleurs via `req.validated`.

Les erreurs métier typées et les erreurs PostgreSQL connues sont converties en réponses `application/problem+json` (RFC 9457). Les erreurs internes renvoient un message générique et ne transmettent ni requête SQL ni pile d’exécution. La taille du corps JSON est limitée à 5 Mo pour accepter un lot maximal d’inspections.

**Vérifications :** `npm test` passe. Les tests API confirment qu’une mesure invalide renvoie `400` avec tous les problèmes détectés, qu’une pagination invalide et les champs inconnus sont refusés, que `author_id` ne peut pas être fourni par le client, et qu’un identifiant d’inspection dupliqué renvoie `409`. Un test d’erreur interne confirme que le SQL et la pile restent absents de la réponse.

## TP 7 — Authentification et autorisation

L’API fournit `POST /api/auth/login`, `POST /api/auth/refresh` et `POST /api/auth/users` (administrateur seulement). Les mots de passe sont hachés avec bcrypt. Les jetons d’accès (15 minutes) et de renouvellement (7 jours) sont signés avec deux secrets distincts, configurés par `JWT_ACCESS_SECRET` et `JWT_REFRESH_SECRET`. Après cinq mots de passe erronés, le compte est bloqué 15 minutes ; une connexion réussie remet le compteur à zéro.

Toutes les routes `/api/hives` demandent `Authorization: Bearer <access_token>`. L’administrateur et le gestionnaire voient toutes les ruches, le coordinateur celles de son site et l’apiculteur celles dont il est propriétaire. Une ruche existante hors périmètre renvoie `403`; une ruche absente renvoie `404`. L’auteur d’une inspection est pris depuis le jeton et ne peut pas être choisi par le client.

**Vérification d’accès :** le test API se connecte comme coordinateur `SITE-A` puis demande `GET /api/hives/HIVE-B1`; la réponse est `403 application/problem+json` avec le détail « Vous n’avez pas accès à cette ruche. ». Il confirme aussi `404` pour `NO-SUCH-HIVE`, les listes filtrées par rôle, le renouvellement, la création de compte et le blocage après cinq échecs. `npm test` passe (10 tests au total).

Pour utiliser les comptes de démonstration, démarrez PostgreSQL avec les données du dépôt. Le mot de passe fourni par le seed pour ces comptes est `QueenBee2026!`. Copiez les noms de variables JWT de `.env-example` dans `.env`; `npm run dev` utilise les secrets locaux générés pour ce dépôt, et `.env` reste ignoré par Git.

## TP 8 — Synchronisation idempotente

`POST /api/inspections/sync` accepte un lot JSON `{"inspections":[...]}` de 1 à 500 inspections et exige un jeton d’accès d’apiculteur. Chaque élément reçoit son propre résultat : `created`, `unchanged`, `updated`, `conflict` ou `rejected`. Une entrée invalide, une ruche inexistante ou inaccessible ne bloque pas le traitement des autres entrées. Le champ `version` est requis pour modifier une inspection existante; les nouvelles inspections commencent à la version 1.

Les mesures sont identifiées par la clé PostgreSQL (`hive_id`, `measured_at`) : rejouer la même mesure retourne l’enregistrement déjà présent. Une inspection rejouée avec les mêmes données renvoie `unchanged`; les mêmes identifiants avec des données différentes ne créent pas de doublon.

**Règle de conflit — le serveur l’emporte :** une mise à jour n’est appliquée que si la version envoyée correspond à la version courante. Une version périmée reçoit `conflict` et `current_version`, sans modifier les données du serveur. Le client peut alors recharger la version actuelle et décider de renvoyer ses changements.

**Vérifications :** `npm test` couvre le rejeu des mesures et inspections, la création et mise à jour versionnée, le conflit périmé, le rejet isolé d’une inspection, le lot vide ou supérieur à 500 éléments, et le refus d’un rôle non autorisé.

**Postman :** importer [`requests/tp8-sync.postman_collection.json`](requests/tp8-sync.postman_collection.json), démarrer l’API et la base seedée, puis exécuter les requêtes dans l’ordre avec le Collection Runner. La collection se connecte avec `api1.sn-casa@queenbee.test` / `QueenBee2026!`, mémorise le jeton et génère un nouvel UUID d’inspection pour chaque exécution. La section 3D/3E teste l’accès admin refusé, puis 3F rétablit la session apiculteur.

## Livraison Jour 2 — État des vérifications

- Les requêtes PostgreSQL du dépôt utilisent des paramètres SQL; les insertions rejouables et les mises à jour optimistes sont implémentées dans les repositories PostgreSQL.
- Les durées d’import TP 5, les réponses demandées, les erreurs RFC 9457, l’authentification et la règle de conflit sont consignées dans ce README.
- `npm test` passe : 10 tests.
- `.env` est ignoré et absent de l’index Git; `.env-example` contient des valeurs factices.
- **Vérification restante :** le moteur Docker/PostgreSQL n’était pas accessible pendant cette livraison. Les tests utilisent les repositories mémoire; le démarrage contre la base seedée et l’exécution de la collection Postman contre PostgreSQL restent à faire.
