import express from "express";
import { createHivesController } from "./controllers/hives.controller.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { createHivesRouter } from "./routes/hives/hives.router.js";
import { createHivesService } from "./services/hives.service.js";
import { createAuthService } from "./services/auth.service.js";
import { createAuthRouter } from "./routes/auth.router.js";
import { authenticate } from "./middlewares/authenticate.js";
import { createInspectionsService } from "./services/inspections.service.js";
import { createMeasuresService } from "./services/measures.service.js";

export function createApp({ hivesRepository, measuresRepository, inspectionsRepository, usersRepository, jwt }) {
  if (!hivesRepository || !measuresRepository || !inspectionsRepository || !usersRepository || !jwt?.accessSecret || !jwt?.refreshSecret) {
    throw new TypeError("createApp requires all repositories and both JWT secrets.");
  }

  const hivesService = createHivesService({ hivesRepository });
  const measuresService = createMeasuresService({ hivesService, measuresRepository });
  const inspectionsService = createInspectionsService({ hivesService, inspectionsRepository });
  const authService = createAuthService({ usersRepository, ...jwt });
  const controller = createHivesController({ hivesService, measuresService, inspectionsService });

  const app = express();
  app.use(requestLogger);
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
  app.use("/api/auth", createAuthRouter({
    authService,
    authenticateAccess: authenticate(jwt.accessSecret),
  }));
  app.use("/api/hives", createHivesRouter(controller, { accessSecret: jwt.accessSecret, hivesService }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
