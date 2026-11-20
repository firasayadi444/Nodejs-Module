import { NotFoundError } from "../errors.js";

export function createMeasuresService({ hivesService, measuresRepository }) {
  return {
    async addMeasure(hiveId, input) {
      await hivesService.getHive(hiveId);
      const measure = { ...input, hive_id: hiveId };
      return measuresRepository.add(measure);
    },

    async listMeasures(hiveId, { limit = "50", offset = "0" } = {}) {
      await hivesService.getHive(hiveId);
      const items = await measuresRepository.findByHive(hiveId, {
        limit,
        offset,
      });
      return {
        items,
        limit,
        offset,
      };
    },
  };
}
