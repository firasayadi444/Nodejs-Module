export function createHivesRepository(pool) {
  return {
    async findAll({ site_id: siteId, owner_id: ownerId } = {}) {
      if (siteId && ownerId) {
        const { rows } = await pool.query(
          "SELECT id, site_id, owner_id, ref_lat, ref_lon, status FROM hives WHERE site_id = $1 AND owner_id = $2 ORDER BY id",
          [siteId, ownerId],
        );
        return rows;
      }
      if (siteId || ownerId) {
        const { rows } = await pool.query(
          `SELECT id, site_id, owner_id, ref_lat, ref_lon, status FROM hives
           WHERE ($1::text IS NULL OR site_id = $1) AND ($2::uuid IS NULL OR owner_id = $2) ORDER BY id`,
          [siteId ?? null, ownerId ?? null],
        );
        return rows;
      }

      const { rows } = await pool.query(
        "SELECT id, site_id, owner_id, ref_lat, ref_lon, status FROM hives ORDER BY id",
      );
      return rows;
    },

    async findById(id) {
      const { rows } = await pool.query(
        "SELECT id, site_id, owner_id, ref_lat, ref_lon, status FROM hives WHERE id = $1",
        [id],
      );
      return rows[0] ?? null;
    },
  };
}
