import jwt from "jsonwebtoken";
import { AuthenticationError, ForbiddenError, NotFoundError } from "../errors.js";

export function authenticate(accessSecret) {
  return (req, res, next) => {
    const [scheme, token] = (req.get("authorization") ?? "").split(" ");
    if (scheme !== "Bearer" || !token) return next(new AuthenticationError());
    try {
      req.user = jwt.verify(token, accessSecret, {
        issuer: "queenbee-api",
        audience: "queenbee-client",
      });
      return next();
    } catch {
      return next(new AuthenticationError("Jeton d’accès invalide ou expiré."));
    }
  };
}

export function requireRole(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : next(new ForbiddenError("Votre rôle ne permet pas cette action."));
}

export function authorizeHive(hivesService) {
  return async (req, res, next) => {
    try {
      const hive = await hivesService.getHive(req.params.id);
      const user = req.user;
      const allowed = user.role === "admin" || user.role === "gestionnaire"
        || (user.role === "coordinateur" && user.site_id === hive.site_id)
        || (user.role === "apiculteur" && user.sub === hive.owner_id);
      if (!allowed) throw new ForbiddenError("Vous n’avez pas accès à cette ruche.");
      req.hive = hive;
      return next();
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ForbiddenError) return next(error);
      return next(error);
    }
  };
}
