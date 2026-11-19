import express from "express";
import { createHivesController } from "./controllers/hives.controller.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { requestLogger } from "./middlewares/requestLogger.js";
import { createHivesRouter } from "./routes/hives/hives.router.js";
import { createHivesService } from "./services/hives.service.js";
import { createInspectionsService } from "./services/inspections.service.js";
import { createMeasuresService } from "./services/measures.service.js";

export function createApp({ hivesRepository, measuresRepository, inspectionsRepository }) {
  if (!hivesRepository || !measuresRepository || !inspectionsRepository) {
    throw new TypeError("createApp requires all three repositories.");
  }

  const hivesService = createHivesService({ hivesRepository });
  const measuresService = createMeasuresService({ hivesService, measuresRepository });
  const inspectionsService = createInspectionsService({ hivesService, inspectionsRepository });
  const controller = createHivesController({ hivesService, measuresService, inspectionsService });

  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));
  app.use("/api/hives", createHivesRouter(controller));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
