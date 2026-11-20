export function createUsersRepository(pool) {
  return {
    async findByEmail(email) {
      const { rows } = await pool.query(
        "SELECT id, email, password_hash, role, site_id, failed_attempts, locked_until FROM users WHERE email = $1",
        [email.toLowerCase()],
      );
      return rows[0] ?? null;
    },
    async findById(id) {
      const { rows } = await pool.query(
        "SELECT id, email, role, site_id FROM users WHERE id = $1",
        [id],
      );
      return rows[0] ?? null;
    },
    async recordFailure(id) {
      const { rows } = await pool.query(
        `UPDATE users SET failed_attempts = failed_attempts + 1,
           locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE NULL END
         WHERE id = $1 RETURNING failed_attempts, locked_until`,
        [id],
      );
      return rows[0];
    },
    async resetFailures(id) {
      await pool.query("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1", [id]);
    },
    async create({ email, password_hash: passwordHash, role, site_id: siteId }) {
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, role, site_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, site_id`,
        [email.toLowerCase(), passwordHash, role, siteId ?? null],
      );
      return rows[0];
    },
  };
}
