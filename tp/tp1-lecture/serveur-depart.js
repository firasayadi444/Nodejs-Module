// TP 1 — Lire les mesures sans bloquer la boucle d'événements. Version de départ.
//
//   GET  /ping              déjà écrite : elle joue « l'autre utilisateur »
//   POST /import/bloquant   À ÉCRIRE : lire tout le fichier d'un coup (readFileSync)
//   POST /import/flux       À ÉCRIRE : lire le fichier ligne par ligne (createReadStream + readline)
//
// Lancement, depuis la racine du projet :
//   node tp/tp1-lecture/serveur-depart.js data/mesures-SN-CASA-2026-10-31_30j.ndjson
// Puis, dans un second terminal : node tp/tp1-lecture/sonde.js bloquant (ou flux)

import express from "express";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { performance } from "node:perf_hooks";

const FICHIER = process.argv[2] ?? "data/mesures-SN-CASA-2026-10-31.ndjson";

// Le chemin du fichier est relatif au dossier depuis lequel on lance la commande.
if (!existsSync(FICHIER)) {
  console.error(`Fichier introuvable : ${FICHIER}`);
  console.error("Lancez le serveur depuis la racine du projet. Pour générer le fichier de 30 jours :");
  console.error("  node scripts/generate-measures.js SN-CASA 2026-10-31 30");
  process.exit(1);
}

const app = express();

app.get("/ping", (req, res) => {
  res.json({ pong: true });
});

app.post("/import/bloquant", (req, res, next) => {
  const debut = performance.now();
  try {
    const lignes = readFileSync(FICHIER, "utf8").split(/\r?\n/).filter((ligne) => ligne.trim() !== "");
    let totalPoids = 0;
    for (const ligne of lignes) {
      totalPoids += JSON.parse(ligne).weight_kg;
    }

    res.json({
      mesures: lignes.length,
      poids_moyen_kg: Number((totalPoids / lignes.length).toFixed(2)),
      duree_ms: Number((performance.now() - debut).toFixed(2)),
    });
  } catch (err) {
    next(err);
  }
});

app.post("/import/flux", async (req, res, next) => {
  const debut = performance.now();
  let mesures = 0;
  let totalPoids = 0;

  try {
    const lignes = createInterface({
      input: createReadStream(FICHIER),
      crlfDelay: Infinity,
    });

    for await (const ligne of lignes) {
      if (ligne.trim() === "") continue;
      totalPoids += JSON.parse(ligne).weight_kg;
      mesures++;
    }

    res.json({
      mesures,
      poids_moyen_kg: Number((totalPoids / mesures).toFixed(2)),
      duree_ms: Number((performance.now() - debut).toFixed(2)),
    });
  } catch (err) {
    next(err);
  }
});

app.listen(4000, () => {
  console.log(`Serveur du TP 1 sur http://localhost:4000, fichier : ${FICHIER}`);
});
