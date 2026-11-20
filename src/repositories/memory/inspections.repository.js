import { ConflictError } from "../../errors.js";

export function createInspectionsRepository(initialInspections = []) {
  const inspections = initialInspections.map((inspection) => ({ ...inspection }));
  const copy = (inspection) => ({ ...inspection });

  return {
    async add(inspection) {
      const result = await this.createIfAbsent(inspection);
      if (!result.created) throw new ConflictError("Une inspection avec cet identifiant existe déjà.");
      return result.inspection;
    },

    async findById(id) {
      const inspection = inspections.find((item) => item.id === id);
      return inspection ? copy(inspection) : null;
    },

    async createIfAbsent(inspection) {
      const existing = inspections.find((item) => item.id === inspection.id);
      if (existing) return { inspection: copy(existing), created: false };
      const saved = { version: 1, ...inspection };
      inspections.push(saved);
      return { inspection: copy(saved), created: true };
    },

    async updateIfVersion(inspection, expectedVersion) {
      const index = inspections.findIndex((item) => item.id === inspection.id);
      if (index < 0 || inspections[index].version !== expectedVersion) return null;
      const updated = {
        ...inspections[index],
        hive_id: inspection.hive_id,
        inspected_at: inspection.inspected_at,
        queen_present: inspection.queen_present ?? null,
        colony_status: inspection.colony_status,
        observations: inspection.observations ?? null,
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      };
      inspections[index] = updated;
      return copy(updated);
    },

    async findByHive(hiveId) {
      return inspections
        .filter((inspection) => inspection.hive_id === hiveId)
        .map((inspection) => ({ ...inspection }));
    },
  };
}
