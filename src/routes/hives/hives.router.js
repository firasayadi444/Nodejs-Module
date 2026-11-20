import { Router } from "express";
import { authenticate, authorizeHive } from "../../middlewares/authenticate.js";
import { validate } from "../../middlewares/validate.js";
import {
  hivesQuerySchema,
  inspectionSchema,
  measureSchema,
  paginationSchema,
} from "../../validators/schemas.js";

export function createHivesRouter(controller, { accessSecret, hivesService }) {
  const router = Router();
  router.use(authenticate(accessSecret));

  router.get("/", validate(hivesQuerySchema, "query"), controller.listHives);
  const authorize = authorizeHive(hivesService);
  router.get("/:id", authorize, controller.getHive);
  router.post("/:id/measures", authorize, validate(measureSchema), controller.addMeasure);
  router.get("/:id/measures", authorize, validate(paginationSchema, "query"), controller.listMeasures);
  router.get("/:id/inspections", authorize, validate(paginationSchema, "query"), controller.listInspections);
  router.post("/:id/inspections", authorize, validate(inspectionSchema), controller.addInspection);

  return router;
}
