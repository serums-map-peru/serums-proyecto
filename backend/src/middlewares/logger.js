function logger(req, res, next) {
  const startedAt = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - startedAt;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms\n`;
    process.stdout.write(line);
  });

  next();
}

module.exports = { logger };
