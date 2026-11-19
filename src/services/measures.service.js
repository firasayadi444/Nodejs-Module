import { NotFoundError, ValidationError } from "../errors.js";

const MEASURE_RANGES = {
  position_lat: [-90, 90],
  position_lon: [-180, 180],
  weight_kg: [0, 150],
  temp_internal_c: [-10, 60],
  temp_external_c: [-20, 60],
  humidity_pct: [0, 100],
  acoustic_activity_score: [0, 1],
  battery_pct: [0, 100],
};

function parseInteger(value, name, min, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
    throw new ValidationError(`Le paramètre ${name} doit être un entier.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    const bounds = max === Number.MAX_SAFE_INTEGER ? `au moins ${min}` : `compris entre ${min} et ${max}`;
    throw new ValidationError(`Le paramètre ${name} doit être un entier ${bounds}.`);
  }
  return parsed;
}

function validateMeasure(hiveId, input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("Le corps JSON de la mesure est requis.");
  }
  if (typeof input.timestamp !== "string" || Number.isNaN(Date.parse(input.timestamp))) {
    throw new ValidationError("Le champ timestamp doit contenir une date valide.");
  }
  if (input.hive_id !== undefined && input.hive_id !== hiveId) {
    throw new ValidationError("Le champ hive_id doit correspondre à l’identifiant de la route.");
  }

  for (const [field, [min, max]] of Object.entries(MEASURE_RANGES)) {
    if (input[field] === undefined) continue;
    if (typeof input[field] !== "number" || !Number.isFinite(input[field]) || input[field] < min || input[field] > max) {
      throw new ValidationError(`Le champ ${field} doit être un nombre compris entre ${min} et ${max}.`);
    }
  }

  if (input.weight_kg === undefined) {
    throw new ValidationError("Le champ weight_kg est obligatoire.");
  }

  return { ...input, hive_id: hiveId };
}

export function createMeasuresService({ hivesService, measuresRepository }) {
  return {
    async addMeasure(hiveId, input) {
      await hivesService.getHive(hiveId);
      const measure = validateMeasure(hiveId, input);
      return measuresRepository.create(measure);
    },

    async listMeasures(hiveId, { limit = "50", offset = "0" } = {}) {
      await hivesService.getHive(hiveId);
      const parsedLimit = parseInteger(limit, "limit", 1, 500);
      const parsedOffset = parseInteger(offset, "offset", 0);
      const items = await measuresRepository.findByHiveId(hiveId);
      items.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      return {
        items: items.slice(parsedOffset, parsedOffset + parsedLimit),
        limit: parsedLimit,
        offset: parsedOffset,
      };
    },
  };
}
