export function createInspectionsRepository(initialInspections = []) {
  const inspections = initialInspections.map((inspection) => ({ ...inspection }));

  return {
    async add(inspection) {
      const saved = { ...inspection };
      inspections.push(saved);
      return { ...saved };
    },

    async findByHive(hiveId) {
      return inspections
        .filter((inspection) => inspection.hive_id === hiveId)
        .map((inspection) => ({ ...inspection }));
    },
  };
}
