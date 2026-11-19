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
