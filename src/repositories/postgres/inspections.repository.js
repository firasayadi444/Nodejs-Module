export function createInspectionsRepository(pool) {
  const returning = `id, hive_id, author_id, inspected_at, queen_present,
    colony_status, observations, version, created_at, updated_at`;

  return {
    async add(inspection) {
      const result = await this.createIfAbsent(inspection);
      if (!result.created) {
        const error = new Error("Une inspection avec cet identifiant existe déjà.");
        error.code = "23505";
        throw error;
      }
      return result.inspection;
    },

    async findById(id) {
      const { rows } = await pool.query(`SELECT ${returning} FROM inspections WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    async createIfAbsent(inspection) {
      const { rows } = await pool.query(
        `INSERT INTO inspections (
           id, hive_id, author_id, inspected_at, queen_present, colony_status, observations
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING
         RETURNING ${returning}`,
        [
          inspection.id,
          inspection.hive_id,
          inspection.author_id,
          inspection.inspected_at,
          inspection.queen_present ?? null,
          inspection.colony_status,
          inspection.observations ?? null,
        ],
      );
      if (rows[0]) return { inspection: rows[0], created: true };
      return { inspection: await this.findById(inspection.id), created: false };
    },

    async updateIfVersion(inspection, expectedVersion) {
      const { rows } = await pool.query(
        `UPDATE inspections
         SET hive_id = $2, inspected_at = $3, queen_present = $4,
             colony_status = $5, observations = $6, version = version + 1, updated_at = now()
         WHERE id = $1 AND version = $7
         RETURNING ${returning}`,
        [
          inspection.id,
          inspection.hive_id,
          inspection.inspected_at,
          inspection.queen_present ?? null,
          inspection.colony_status,
          inspection.observations ?? null,
          expectedVersion,
        ],
      );
      return rows[0] ?? null;
    },

    async findByHive(hiveId) {
      const { rows } = await pool.query(
        `SELECT ${returning}
         FROM inspections
         WHERE hive_id = $1
         ORDER BY inspected_at DESC`,
        [hiveId],
      );
      return rows;
    },
  };
}
