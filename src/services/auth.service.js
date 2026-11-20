import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AuthenticationError, ConflictError, ValidationError } from "../errors.js";

const ROLES = new Set(["apiculteur", "coordinateur", "gestionnaire", "admin"]);

export function createAuthService({ usersRepository, accessSecret, refreshSecret }) {
  function tokens(user) {
    const claims = { sub: user.id, role: user.role, site_id: user.site_id ?? null };
    return {
      access_token: jwt.sign(claims, accessSecret, { expiresIn: "15m", issuer: "queenbee-api", audience: "queenbee-client" }),
      refresh_token: jwt.sign({ sub: user.id, type: "refresh" }, refreshSecret, { expiresIn: "7d", issuer: "queenbee-api", audience: "queenbee-client" }),
      token_type: "Bearer",
      expires_in: 900,
    };
  }

  return {
    async login(email, password) {
      const user = await usersRepository.findByEmail(email.toLowerCase());
      if (!user) throw new AuthenticationError("Adresse e-mail ou mot de passe incorrect.");
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new AuthenticationError("Compte temporairement bloqué. Réessayez dans 15 minutes.");
      }
      if (user.locked_until) await usersRepository.resetFailures(user.id);
      if (!(await bcrypt.compare(password, user.password_hash))) {
        const result = await usersRepository.recordFailure(user.id);
        if (result.failed_attempts >= 5) {
          throw new AuthenticationError("Compte temporairement bloqué pendant 15 minutes après cinq échecs.");
        }
        throw new AuthenticationError("Adresse e-mail ou mot de passe incorrect.");
      }
      await usersRepository.resetFailures(user.id);
      return tokens(user);
    },

    async refresh(token) {
      let claims;
      try {
        claims = jwt.verify(token, refreshSecret, { issuer: "queenbee-api", audience: "queenbee-client" });
      } catch {
        throw new AuthenticationError("Jeton de renouvellement invalide ou expiré.");
      }
      if (claims.type !== "refresh") throw new AuthenticationError("Jeton de renouvellement invalide.");
      const user = await usersRepository.findById(claims.sub);
      if (!user) throw new AuthenticationError("Jeton de renouvellement invalide.");
      return tokens(user);
    },

    async createUser(input) {
      if (!ROLES.has(input.role)) throw new ValidationError("Le rôle demandé n’est pas autorisé.");
      const hash = await bcrypt.hash(input.password, 12);
      try {
        return await usersRepository.create({
          email: input.email.toLowerCase(),
          password_hash: hash,
          role: input.role,
          site_id: input.site_id ?? null,
        });
      } catch (error) {
        if (error.code === "23505") throw new ConflictError("Un compte utilise déjà cette adresse e-mail.");
        throw error;
      }
    },
  };
}
