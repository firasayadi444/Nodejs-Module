const NODE_ENVS = new Set(["development", "test", "production"]);
const STORAGE_TYPES = new Set(["postgres", "memory"]);

function parseInteger(value, name, min, max) {
  const text = String(value);
  if (!/^\d+$/.test(text)) {
    throw new Error(`${name} doit être un entier compris entre ${min} et ${max}.`);
  }
  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} doit être un entier compris entre ${min} et ${max}.`);
  }
  return parsed;
}

export function readConfig(env = process.env) {
  const port = parseInteger(env.PORT ?? "3000", "PORT", 1, 65535);

  const nodeEnv = env.NODE_ENV ?? "development";
  if (!NODE_ENVS.has(nodeEnv)) {
    throw new Error("NODE_ENV doit valoir development, test ou production.");
  }

  const storage = env.STORAGE ?? "postgres";
  if (!STORAGE_TYPES.has(storage)) {
    throw new Error("STORAGE doit valoir postgres ou memory.");
  }

  const password = env.DB_PASSWORD ?? "";
  if (storage === "postgres" && password.trim() === "") {
    throw new Error("DB_PASSWORD est obligatoire quand STORAGE=postgres.");
  }

  const accessSecret = env.JWT_ACCESS_SECRET ?? "";
  const refreshSecret = env.JWT_REFRESH_SECRET ?? "";
  if (accessSecret.length < 32 || refreshSecret.length < 32 || accessSecret === refreshSecret) {
    throw new Error("JWT_ACCESS_SECRET et JWT_REFRESH_SECRET doivent être distincts et contenir au moins 32 caractères.");
  }

  const db = Object.freeze({
    host: env.DB_HOST ?? "localhost",
    port: parseInteger(env.DB_PORT ?? "5432", "DB_PORT", 1, 65535),
    user: env.DB_USER ?? "queenbee",
    password,
    database: env.DB_NAME ?? "queenbee",
    poolMax: parseInteger(env.DB_POOL_MAX ?? "10", "DB_POOL_MAX", 1, 100),
  });

  return Object.freeze({ port, nodeEnv, storage, db, jwt: Object.freeze({ accessSecret, refreshSecret }) });
}

export let config;
try {
  config = readConfig();
} catch (error) {
  console.error(`Configuration invalide : ${error.message}`);
  process.exit(1);
}
