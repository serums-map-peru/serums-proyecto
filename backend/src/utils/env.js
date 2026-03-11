function getEnvString(key, fallback) {
  const v = process.env[key];
  if (typeof v === "string" && v.trim() !== "") return v;
  return fallback;
}

function getEnvNumber(key, fallback) {
  const v = process.env[key];
  if (typeof v !== "string" || v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = { getEnvString, getEnvNumber };
