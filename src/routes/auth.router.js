import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { requireRole } from "../middlewares/authenticate.js";
import { createUserSchema, loginSchema, refreshSchema } from "../validators/schemas.js";

export function createAuthRouter({ authService, authenticateAccess }) {
  const router = Router();
  router.post("/login", validate(loginSchema), async (req, res) => {
    res.status(200).json(await authService.login(req.validated.email, req.validated.password));
  });
  router.post("/refresh", validate(refreshSchema), async (req, res) => {
    res.status(200).json(await authService.refresh(req.validated.refresh_token));
  });
  router.post("/users", authenticateAccess, requireRole("admin"), validate(createUserSchema), async (req, res) => {
    const user = await authService.createUser(req.validated);
    res.status(201).json(user);
  });
  return router;
}
