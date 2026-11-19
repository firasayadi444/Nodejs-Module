export function createInspectionsRepository(initialInspections = []) {
  const inspections = initialInspections.map((inspection) => ({ ...inspection }));

  return {
    async create(inspection) {
      const saved = { ...inspection };
      inspections.push(saved);
      return { ...saved };
    },

    async findByHiveId(hiveId) {
      return inspections
        .filter((inspection) => inspection.hive_id === hiveId)
        .map((inspection) => ({ ...inspection }));
    },
  };
}
