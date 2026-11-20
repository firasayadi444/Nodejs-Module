import { createApp } from "./app.js";
import { config } from "./config.js";
import { createPool } from "./db.js";
import { createMemoryRepositories } from "./repositories/memory/index.js";
import { createPostgresRepositories } from "./repositories/postgres/index.js";

let repositories;
if (config.storage === "postgres") {
  const pool = createPool();
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    console.error(
      `Impossible de joindre PostgreSQL sur ${config.db.host}:${config.db.port} : ${error.message || error.code}`,
    );
    await pool.end();
    process.exit(1);
  }
  repositories = createPostgresRepositories(pool);
} else {
  repositories = createMemoryRepositories();
}

const app = createApp(repositories);
app.listen(config.port, () => {
  console.log(`API Queen Bee sur http://localhost:${config.port} (stockage : ${config.storage})`);
});
