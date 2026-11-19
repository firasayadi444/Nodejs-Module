# Guide de démarrage — TP Backend Node.js Queen Bee

Le document « Jour 1 — Énoncés des TP.docx » décrit une journée de travail pour passer d’un serveur Express qui bloque pendant un import à une API v0 organisée en couches. Le travail comporte quatre TP, à réaliser dans l’ordre. À la fin, vous devez avoir une API v0 et créer le tag Git `jour1-fin`.

## Avant de commencer

Le projet contient déjà la base de données, les données simulées et le générateur de mesures. Vérifiez que Node.js, Git et Docker sont installés, puis :

1. Créez `.env` à partir de `.env-example` et choisissez un mot de passe.
2. Démarrez PostgreSQL avec `docker compose up -d`.
3. Attendez que la base soit prête, puis vérifiez qu’elle contient **400 ruches** et **1 146 240 mesures**.
4. Initialisez le projet Node avec Express et créez un premier commit Git. Ne versionnez pas `.env` ni `node_modules`.

## TP 1 — Importer les mesures sans bloquer le serveur

Comparez deux façons de lire le fichier de mesures :

- **Lecture bloquante** : lire tout le fichier en mémoire, puis analyser chaque ligne.
- **Lecture en flux** : lire et traiter le fichier ligne par ligne avec `createReadStream` et `readline`.

Ajoutez deux routes POST au serveur fourni, lancez une sonde qui appelle `/ping` pendant chaque import, puis comparez les temps de réponse pour un fichier d’un jour et un fichier de 30 jours.

**À noter dans le README :** les durées et temps de réponse observés, puis vos réponses à ces trois questions : pourquoi le serveur attend pendant la lecture bloquante, ce qu’apporte le flux, et pourquoi la différence se voit peu sur un petit fichier.

## TP 2 — Créer les premières routes de l’API

Construisez une API avec quelques ruches conservées dans un tableau JavaScript, sans utiliser la base de données pour ces routes. À réaliser :

- `GET /health`
- `GET /api/hives`, avec filtre facultatif par site
- `GET /api/hives/:id`
- `POST /api/hives/:id/measures`, avec validation des champs obligatoires et codes d’erreur adaptés

Ajoutez aussi un journal des requêtes et une collection de requêtes exportée dans le dépôt. Chaque route doit avoir le bon code HTTP : par exemple `201` pour une mesure créée et `404` pour une ruche inconnue.

## TP 3 — Décrire le contrat, puis ajouter les routes

Avant de coder, rédigez `docs/api.md` pour décrire les routes : paramètres, valeurs attendues, codes de statut et exemples de succès et d’erreur. Faites relire ce contrat par un autre groupe.

Ajoutez ensuite :

- `GET /api/hives/:id/measures`, avec pagination
- `GET /api/hives/:id/inspections`
- `POST /api/hives/:id/inspections`

Toutes les erreurs doivent suivre le format **RFC 9457**, avec le type de contenu `application/problem+json`. Traitez aussi les routes inconnues et les corps JSON mal formés.

## TP 4 — Organiser le code en couches

Réorganisez l’API sans changer le comportement de ses routes. L’arborescence cible sépare les responsabilités :

- **Routes** : associer URL, méthode HTTP et intergiciels.
- **Contrôleurs** : lire la requête et préparer la réponse.
- **Services** : appliquer les règles métier.
- **Repositories** : gérer les données en mémoire.

Ajoutez la configuration lue depuis l’environnement et un test qui vérifie qu’une mesure de **500 kg** est refusée sans être enregistrée. Lancez le test avec `npm test`.

## Ce qui est déjà fourni dans ce dossier

- `db/` : schéma SQL et données de démonstration.
- `data/` : mesures simulées au format NDJSON.
- `scripts/generate-measures.js` : générateur de fichiers de mesures.
- `tp/tp1-lecture/` : fichiers de départ pour le TP 1.
- `Jour 1 — Énoncés des TP.docx` : consignes détaillées.

## Premier travail concret

Commencez par le **TP 1**, après avoir vérifié l’installation et démarré la base. À la fin de la journée, le livrable regroupe l’API, `docs/api.md`, la collection de requêtes, les résultats du TP 1 dans le README et au moins un test vert. Le document précise que le tag `jour1-fin` doit être posé à 17 h, même si certains éléments restent incomplets.
