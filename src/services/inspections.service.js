import { NotFoundError, ValidationError } from "../errors.js";

const COLONY_STATUSES = new Set(["forte", "normale", "faible", "morte"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function validateInspection(hiveId, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("Le corps JSON de l’inspection est requis.");
  }
  if (typeof input.id !== "string" || !UUID_PATTERN.test(input.id)) {
    throw new ValidationError("Le champ id doit être un UUID valide.");
  }
  if (typeof input.inspected_at !== "string" || !ISO_DATE_PATTERN.test(input.inspected_at) || Number.isNaN(Date.parse(input.inspected_at))) {
    throw new ValidationError("Le champ inspected_at doit être une date ISO 8601 valide.");
  }
  if (typeof input.colony_status !== "string" || !COLONY_STATUSES.has(input.colony_status)) {
    throw new ValidationError("Le champ colony_status doit valoir forte, normale, faible ou morte.");
  }
  if (input.queen_present !== undefined && typeof input.queen_present !== "boolean") {
    throw new ValidationError("Le champ queen_present doit être un booléen.");
  }
  if (input.observations !== undefined && typeof input.observations !== "string") {
    throw new ValidationError("Le champ observations doit être un texte.");
  }

  return {
    id: input.id,
    hive_id: hiveId,
    inspected_at: input.inspected_at,
    colony_status: input.colony_status,
    ...(input.queen_present === undefined ? {} : { queen_present: input.queen_present }),
    ...(input.observations === undefined ? {} : { observations: input.observations }),
  };
}

export function createInspectionsService({ hivesService, inspectionsRepository }) {
  return {
    async listInspections(hiveId) {
      await hivesService.getHive(hiveId);
      return inspectionsRepository.findByHive(hiveId);
    },

    async addInspection(hiveId, input) {
      await hivesService.getHive(hiveId);
      const inspection = validateInspection(hiveId, input);
      return inspectionsRepository.add(inspection);
    },
  };
}
