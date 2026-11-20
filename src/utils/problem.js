const TITLES = new Map([
  [400, "Requête invalide"],
  [404, "Ressource introuvable"],
  [409, "Conflit"],
  [413, "Contenu trop volumineux"],
  [500, "Erreur interne"],
]);

export function sendProblem(res, status, detail) {
  const title = TITLES.get(status) ?? "Erreur interne";
  const problem = {
    type: "about:blank",
    title,
    status,
    detail,
  };

  return res
    .status(status)
    .set("Content-Type", "application/problem+json")
    .json(problem);
}
