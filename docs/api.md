# Contrat de l’API Queen Bee

Base URL locale : `http://localhost:3000`

Les erreurs de l’API utilisent `Content-Type: application/problem+json` et le format RFC 9457. Les exemples ci-dessous décrivent le contrat visé par le TP 3.

## GET /health

Vérifie que le serveur répond.

**Paramètres :** aucun.

**Réponse `200` :**

```json
{ "status": "ok" }
```

## GET /api/hives

Renvoie les ruches en mémoire, éventuellement filtrées par site.

**Paramètres de requête :**

- `site_id` : chaîne facultative, code du site (par exemple `SN-CASA`). Sans ce paramètre, toutes les ruches sont renvoyées.

**Réponse `200` :** tableau de ruches.

```json
[
  { "id": "SN-CASA-001", "site_id": "SN-CASA", "status": "active" }
]
```

Un site sans ruche correspondante renvoie `200` avec un tableau vide.

## GET /api/hives/:id

Renvoie une ruche par son identifiant.

**Paramètres de chemin :** `id`, chaîne, identifiant de la ruche.

**Réponses :**

- `200` : ruche trouvée.
- `404` : ruche inexistante.

Exemple `200` :

```json
{ "id": "SN-CASA-001", "site_id": "SN-CASA", "status": "active" }
```

Exemple `404` : voir le format RFC 9457 dans la section « Erreurs ».

## POST /api/hives/:id/measures

Enregistre une mesure pour la ruche indiquée. Le serveur conserve le `timestamp` de la trame, qui représente l’instant de la mesure.

**Paramètres de chemin :** `id`, chaîne, identifiant de la ruche.

**Corps `application/json` :**

- Obligatoires : `timestamp` (date ISO 8601 valide), `weight_kg` (nombre compris entre 0 et 150 kg).
- Facultatifs : `hive_id` (s’il est fourni, il doit correspondre à `:id`), `site_id`, `position_lat` (-90 à 90), `position_lon` (-180 à 180), `temp_internal_c` (-10 à 60 °C), `temp_external_c` (-20 à 60 °C), `humidity_pct` (0 à 100), `acoustic_activity_score` (0 à 1), `battery_pct` (0 à 100). Les bornes s’appliquent aussi lorsqu’un champ facultatif est fourni.

Exemple de corps :

```json
{
  "hive_id": "SN-CASA-001",
  "site_id": "SN-CASA",
  "timestamp": "2026-10-31T10:00:00Z",
  "position_lat": 12.5743,
  "position_lon": -16.2873,
  "weight_kg": 36.84,
  "temp_internal_c": 34.4,
  "temp_external_c": 27.1,
  "humidity_pct": 64,
  "acoustic_activity_score": 0.42,
  "battery_pct": 88
}
```

**Réponses :**

- `201` : mesure enregistrée ; le corps renvoyé contient la mesure et le `hive_id` du chemin.
- `400` : corps invalide, `timestamp` ou `weight_kg` absent/invalide, valeur hors plage physique, ou `hive_id` différent de celui du chemin.
- `404` : ruche inexistante.

Exemple `201` : le corps renvoyé reprend la mesure ci-dessus.

## GET /api/hives/:id/measures

Renvoie l’historique des mesures d’une ruche, de la plus récente à la plus ancienne.

**Paramètres de chemin :** `id`, chaîne, identifiant de la ruche.

**Paramètres de requête :**

- `limit` : entier de 1 à 500 ; valeur par défaut `50`.
- `offset` : entier positif ou nul ; valeur par défaut `0`.

**Réponses :**

- `200` : page de mesures.
- `400` : `limit` ou `offset` invalide.
- `404` : ruche inexistante.

Exemple `200` :

```json
{
  "items": [
    {
      "hive_id": "SN-CASA-001",
      "timestamp": "2026-10-31T10:00:00Z",
      "weight_kg": 36.84
    }
  ],
  "limit": 50,
  "offset": 0
}
```

Exemple `400` : `limit=501` renvoie une erreur RFC 9457 indiquant que la limite doit être comprise entre 1 et 500.

## GET /api/hives/:id/inspections

Renvoie les inspections associées à une ruche.

**Paramètres de chemin :** `id`, chaîne, identifiant de la ruche.

**Paramètres de requête :** aucun.

**Réponses :**

- `200` : tableau d’inspections ; un historique vide renvoie `[]`.
- `404` : ruche inexistante.

Exemple `200` :

```json
[
  {
    "id": "d9428888-122b-4c1a-8f16-8c4d8e4b6a31",
    "hive_id": "SN-CASA-001",
    "inspected_at": "2026-10-24T09:30:00Z",
    "colony_status": "normale",
    "queen_present": true,
    "observations": "Couvain régulier"
  }
]
```

## POST /api/hives/:id/inspections

Enregistre une inspection créée sur le terrain. L’application mobile génère son identifiant UUID avant la synchronisation.

**Paramètres de chemin :** `id`, chaîne, identifiant de la ruche.

**Corps `application/json` :**

- Obligatoires : `id` (UUID), `inspected_at` (date ISO 8601 valide), `colony_status` (`forte`, `normale`, `faible` ou `morte`).
- Facultatifs : `queen_present` (booléen), `observations` (texte).

Exemple de corps :

```json
{
  "id": "d9428888-122b-4c1a-8f16-8c4d8e4b6a31",
  "inspected_at": "2026-10-24T09:30:00Z",
  "colony_status": "normale",
  "queen_present": true,
  "observations": "Couvain régulier"
}
```

**Réponses :**

- `201` : inspection créée ; la réponse inclut les champs fournis et le `hive_id` du chemin.
- `400` : corps invalide, UUID/date invalide, champ obligatoire absent, état de colonie inconnu ou type invalide.
- `404` : ruche inexistante.

Exemple `201` :

```json
{
  "id": "d9428888-122b-4c1a-8f16-8c4d8e4b6a31",
  "hive_id": "SN-CASA-001",
  "inspected_at": "2026-10-24T09:30:00Z",
  "colony_status": "normale",
  "queen_present": true,
  "observations": "Couvain régulier"
}
```

## Erreurs

Toutes les erreurs renvoient `Content-Type: application/problem+json` et un objet RFC 9457. `type` vaut `about:blank`; `title` est le titre associé au statut HTTP et `detail` explique l’erreur rencontrée.

Exemple `400` — paramètre `limit` invalide :

```json
{
  "type": "about:blank",
  "title": "Requête invalide",
  "status": 400,
  "detail": "Le paramètre limit doit être un entier compris entre 1 et 500."
}
```

Exemple `404` — ruche ou route inconnue :

```json
{
  "type": "about:blank",
  "title": "Ressource introuvable",
  "status": 404,
  "detail": "Aucune ruche ne porte l’identifiant XX-NOPE-999."
}
```

Un corps JSON mal formé renvoie `400` au même format. Une erreur inattendue renvoie `500` avec le titre `Erreur interne` et un détail générique, sans pile d’exécution ni message SQL.
