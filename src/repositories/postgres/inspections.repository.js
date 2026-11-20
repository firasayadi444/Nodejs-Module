export function createInspectionsRepository(pool) {
  return {
    async add(inspection) {
      const { rows } = await pool.query(
        `INSERT INTO inspections (
           id, hive_id, author_id, inspected_at, queen_present, colony_status, observations
         ) VALUES (
           $1, $2, (SELECT owner_id FROM hives WHERE id = $2), $3, $4, $5, $6
         )
         RETURNING id, hive_id, author_id, inspected_at, queen_present,
                   colony_status, observations, version, created_at, updated_at`,
        [
          inspection.id,
          inspection.hive_id,
          inspection.inspected_at,
          inspection.queen_present ?? null,
          inspection.colony_status,
          inspection.observations ?? null,
        ],
      );
      return rows[0];
    },

    async findByHive(hiveId) {
      const { rows } = await pool.query(
        `SELECT id, hive_id, author_id, inspected_at, queen_present,
                colony_status, observations, version, created_at, updated_at
         FROM inspections
         WHERE hive_id = $1
         ORDER BY inspected_at DESC`,
        [hiveId],
      );
      return rows;
    },
  };
}
