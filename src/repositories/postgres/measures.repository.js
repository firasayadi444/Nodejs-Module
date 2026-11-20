export function createMeasuresRepository(pool) {
  return {
    async add(measure) {
      const { rows } = await pool.query(
        `INSERT INTO measures (
           hive_id, measured_at, weight_kg, temp_internal_c, temp_external_c,
           humidity_pct, acoustic_activity_score, battery_pct, lat, lon
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (hive_id, measured_at) DO NOTHING
         RETURNING hive_id, measured_at AS timestamp, weight_kg, temp_internal_c,
                   temp_external_c, humidity_pct, acoustic_activity_score,
                   battery_pct, lat AS position_lat, lon AS position_lon`,
        [
          measure.hive_id,
          measure.timestamp,
          measure.weight_kg,
          measure.temp_internal_c ?? null,
          measure.temp_external_c ?? null,
          measure.humidity_pct ?? null,
          measure.acoustic_activity_score ?? null,
          measure.battery_pct ?? null,
          measure.position_lat ?? null,
          measure.position_lon ?? null,
        ],
      );

      const saved = rows[0] ?? (await pool.query(
        `SELECT m.hive_id, m.measured_at AS timestamp, h.site_id, m.weight_kg,
                m.temp_internal_c, m.temp_external_c, m.humidity_pct,
                m.acoustic_activity_score, m.battery_pct,
                m.lat AS position_lat, m.lon AS position_lon
         FROM measures AS m JOIN hives AS h ON h.id = m.hive_id
         WHERE m.hive_id = $1 AND m.measured_at = $2`,
        [measure.hive_id, measure.timestamp],
      )).rows[0];
      return { ...saved, ...(measure.site_id === undefined ? {} : { site_id: measure.site_id }) };
    },

    async findByHive(hiveId, { limit, offset }) {
      const { rows } = await pool.query(
        `SELECT m.hive_id, h.site_id, m.measured_at AS timestamp, m.weight_kg,
                m.temp_internal_c, m.temp_external_c, m.humidity_pct,
                m.acoustic_activity_score, m.battery_pct,
                m.lat AS position_lat, m.lon AS position_lon
         FROM measures AS m
         JOIN hives AS h ON h.id = m.hive_id
         WHERE m.hive_id = $1
         ORDER BY m.measured_at DESC
         LIMIT $2 OFFSET $3`,
        [hiveId, limit, offset],
      );
      return rows;
    },
  };
}
