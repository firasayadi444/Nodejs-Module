import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/authenticate.js";
import { validate } from "../middlewares/validate.js";
import { inspectionSyncSchema } from "../validators/schemas.js";

export function createInspectionsRouter({ controller, accessSecret }) {
  const router = Router();
  router.post(
    "/sync",
    authenticate(accessSecret),
    requireRole("apiculteur"),
    validate(inspectionSyncSchema),
    controller.syncInspections,
  );
  return router;
}
