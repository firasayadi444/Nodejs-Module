export function requestLogger(req, res, next) {
  const startedAt = performance.now();

  res.on("finish", () => {
    const durationMs = (performance.now() - startedAt).toFixed(1);
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs} ms`);
  });

  next();
}
