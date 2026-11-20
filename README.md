# Queen Bee — TP Backend Node.js

## Membres du groupe

- Firas AYADI
- BENBRAHIM Mohamed

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

Les erreurs métier typées et les erreurs PostgreSQL connues sont converties en réponses `application/problem+json` (RFC 9457). Les erreurs internes renvoient un message générique et ne transmettent ni requête SQL ni pile d’exécution. La taille du corps JSON est limitée à 1 Mo.

**Vérifications :** `npm test` passe. Les tests API confirment qu’une mesure invalide renvoie `400` avec tous les problèmes détectés, qu’une pagination invalide et les champs inconnus sont refusés, que `author_id` ne peut pas être fourni par le client, et qu’un identifiant d’inspection dupliqué renvoie `409`. Un test d’erreur interne confirme que le SQL et la pile restent absents de la réponse.
