import { ConflictError } from "../../errors.js";

export function createInspectionsRepository(initialInspections = []) {
  const inspections = initialInspections.map((inspection) => ({ ...inspection }));

  return {
    async add(inspection) {
      if (inspections.some((existing) => existing.id === inspection.id)) {
        throw new ConflictError("Une inspection avec cet identifiant existe déjà.");
      }
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
