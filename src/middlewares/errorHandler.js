import { sendProblem } from "../utils/problem.js";
import { AppError } from "../errors.js";

export function notFoundHandler(req, res) {
  return sendProblem(res, 404, `Aucune route ne correspond à ${req.method} ${req.originalUrl}.`);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    return sendProblem(res, err.status, err.message);
  }
  if (err.type === "entity.parse.failed") {
    return sendProblem(res, 400, "Le corps de la requête n’est pas un JSON valide.");
  }
  if (err.type === "entity.too.large") {
    return sendProblem(res, 413, "Le corps de la requête dépasse la taille maximale autorisée.");
  }
  if (err.code === "23505") {
    return sendProblem(res, 409, "Cette ressource existe déjà.");
  }
  if (["23503", "23514", "22P02"].includes(err.code)) {
    return sendProblem(res, 400, "Les données fournies ne sont pas valides.");
  }

  console.error(err);
  return sendProblem(res, 500, "Une erreur interne est survenue.");
}
