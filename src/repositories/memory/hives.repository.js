const INITIAL_HIVES = [
  { id: "SN-CASA-001", site_id: "SN-CASA", status: "active" },
  { id: "SN-CASA-002", site_id: "SN-CASA", status: "active" },
  { id: "SN-CASA-011", site_id: "SN-CASA", status: "active" },
  { id: "CI-MAN-001", site_id: "CI-MAN", status: "active" },
  { id: "CI-MAN-002", site_id: "CI-MAN", status: "active" },
];

export function createHivesRepository(initialHives = INITIAL_HIVES) {
  const hives = initialHives.map((hive) => ({ ...hive }));

  return {
    async findAll({ site_id: siteId, owner_id: ownerId } = {}) {
      const result = hives.filter((hive) => (!siteId || hive.site_id === siteId)
        && (!ownerId || hive.owner_id === ownerId));
      return result.map((hive) => ({ ...hive }));
    },

    async findById(id) {
      const hive = hives.find((item) => item.id === id);
      return hive ? { ...hive } : null;
    },
  };
}
