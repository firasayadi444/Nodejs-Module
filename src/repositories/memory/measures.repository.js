export function createMeasuresRepository(initialMeasures = []) {
  const measures = initialMeasures.map((measure) => ({ ...measure }));

  return {
    async add(measure) {
      const saved = { ...measure };
      measures.push(saved);
      return { ...saved };
    },

    async findByHive(hiveId, { limit = 50, offset = 0 } = {}) {
      const items = measures
        .filter((measure) => measure.hive_id === hiveId)
        .map((measure) => ({ ...measure }));
      items.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      return items.slice(offset, offset + limit);
    },
  };
}
