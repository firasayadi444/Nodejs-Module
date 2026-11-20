import { randomUUID } from "node:crypto";
import { ConflictError } from "../../errors.js";

export function createUsersRepository(initialUsers = []) {
  const users = initialUsers.map((user) => ({ failed_attempts: 0, locked_until: null, ...user }));
  return {
    async findByEmail(email) {
      return users.find((user) => user.email === email.toLowerCase()) ?? null;
    },
    async findById(id) {
      return users.find((user) => user.id === id) ?? null;
    },
    async recordFailure(id) {
      const user = users.find((item) => item.id === id);
      user.failed_attempts += 1;
      user.locked_until = user.failed_attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null;
      return { failed_attempts: user.failed_attempts, locked_until: user.locked_until };
    },
    async resetFailures(id) {
      const user = users.find((item) => item.id === id);
      user.failed_attempts = 0;
      user.locked_until = null;
    },
    async create(input) {
      if (users.some((user) => user.email === input.email.toLowerCase())) {
        throw new ConflictError("Un compte utilise déjà cette adresse e-mail.");
      }
      const user = { id: randomUUID(), failed_attempts: 0, locked_until: null, ...input };
      users.push(user);
      return { id: user.id, email: user.email, role: user.role, site_id: user.site_id };
    },
  };
}
