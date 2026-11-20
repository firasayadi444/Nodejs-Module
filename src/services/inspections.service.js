export function createInspectionsService({ hivesService, inspectionsRepository }) {
  return {
    async listInspections(hiveId, { limit, offset } = {}) {
      await hivesService.getHive(hiveId);
      const inspections = await inspectionsRepository.findByHive(hiveId);
      return limit === undefined ? inspections : inspections.slice(offset, offset + limit);
    },

    async addInspection(hiveId, input) {
      await hivesService.getHive(hiveId);
      const inspection = {
        id: input.id,
        hive_id: hiveId,
        author_id: input.author_id,
        inspected_at: input.inspected_at,
        colony_status: input.colony_status,
        ...(input.queen_present === undefined ? {} : { queen_present: input.queen_present }),
        ...(input.observations === undefined ? {} : { observations: input.observations }),
      };
      return inspectionsRepository.add(inspection);
    },
  };
}
