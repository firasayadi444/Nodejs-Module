export function createMeasuresRepository(initialMeasures = []) {
  const measures = initialMeasures.map((measure) => ({ ...measure }));

  return {
    async create(measure) {
      const saved = { ...measure };
      measures.push(saved);
      return { ...saved };
    },

    async findByHiveId(hiveId) {
      return measures
        .filter((measure) => measure.hive_id === hiveId)
        .map((measure) => ({ ...measure }));
    },
  };
}
