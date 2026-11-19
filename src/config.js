const NODE_ENVS = new Set(["development", "test", "production"]);

export function readConfig(env = process.env) {
  const portValue = env.PORT ?? "3000";
  if (!/^\d+$/.test(portValue)) {
    throw new Error("PORT doit être un entier compris entre 1 et 65535.");
  }

  const port = Number(portValue);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT doit être un entier compris entre 1 et 65535.");
  }

  const nodeEnv = env.NODE_ENV ?? "development";
  if (!NODE_ENVS.has(nodeEnv)) {
    throw new Error("NODE_ENV doit valoir development, test ou production.");
  }

  return Object.freeze({ port, nodeEnv });
}
