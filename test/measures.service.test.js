import assert from "node:assert/strict";
import { test } from "node:test";
import { ValidationError } from "../src/errors.js";
import { createMeasuresService } from "../src/services/measures.service.js";

test("rejects a weight outside its physical range without saving it", async () => {
  const savedMeasures = [];
  const hivesService = {
    async getHive(hiveId) {
      return { id: hiveId, site_id: "SN-CASA", status: "active" };
    },
  };
  const measuresRepository = {
    async add(measure) {
      savedMeasures.push(measure);
      return measure;
    },
  };
  const service = createMeasuresService({ hivesService, measuresRepository });

  await assert.rejects(
    service.addMeasure("SN-CASA-001", {
      timestamp: "2026-10-31T10:00:00Z",
      weight_kg: 500,
    }),
    ValidationError,
  );
  assert.equal(savedMeasures.length, 0);
});
