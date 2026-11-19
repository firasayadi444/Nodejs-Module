import { sendProblem } from "../utils/problem.js";
import { NotFoundError, ValidationError } from "../errors.js";

export function notFoundHandler(req, res) {
  return sendProblem(res, 404, `Aucune route ne correspond à ${req.method} ${req.originalUrl}.`);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.type === "entity.parse.failed") {
    return sendProblem(res, 400, "Le corps de la requête n’est pas un JSON valide.");
  }

  if (err instanceof ValidationError) {
    return sendProblem(res, 400, err.message);
  }
  if (err instanceof NotFoundError) {
    return sendProblem(res, 404, err.message);
  }

  console.error(err);
  return sendProblem(res, 500, "Une erreur interne est survenue.");
}
