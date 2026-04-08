const { DB_ENABLED, queryAll } = require("../db");
const hospitalService = require("../services/hospitalService");

function getEnvNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function getEnvBool(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const v = String(raw).trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "y") return true;
  if (v === "0" || v === "false" || v === "no" || v === "n") return false;
  return fallback;
}

function splitTargets(value) {
  const raw = typeof value === "string" ? value : "";
  return raw
    .split(/[,;\n]+/g)
    .map((s) => String(s || "").trim())
    .filter(Boolean);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!DB_ENABLED) {
    process.stdout.write("DB deshabilitada (DB_ENABLED=0). Abortando.\n");
    process.exit(1);
  }

  const targets = splitTargets(process.env.GEOCODE_TARGETS || "");
  if (targets.length === 0) {
    process.stdout.write("Falta GEOCODE_TARGETS (ej: YAURICOCHA,OYON).\n");
    process.exit(1);
  }

  const force = getEnvBool("GEOCODE_FORCE", false);
  const delayMs = getEnvNumber("GEOCODE_DELAY_MS", 900);
  const max = getEnvNumber("GEOCODE_MAX", 0);

  const lowered = targets.map((t) => t.toLowerCase());
  const ph = lowered.map(() => "?").join(",");
  const sql = `
    SELECT h.id
    FROM hospitals h
    WHERE LOWER(COALESCE(h.distrito, '')) IN (${ph})
       OR LOWER(COALESCE(h.provincia, '')) IN (${ph})
    ORDER BY h.id ASC
  `;

  const rows = await queryAll(sql, [...lowered, ...lowered]);
  const ids = rows.map((r) => String(r.id)).filter(Boolean);
  const total = ids.length;

  process.stdout.write(`Targets: ${targets.join(", ")}\n`);
  process.stdout.write(`Encontrados: ${total}\n`);
  if (total === 0) return;

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  const limit = max > 0 ? Math.min(max, total) : total;

  for (let i = 0; i < limit; i++) {
    const id = ids[i];
    try {
      const before = await hospitalService.getHospitalById(id);
      const src = String(before && before.coordenadas_fuente ? before.coordenadas_fuente : "").toUpperCase();
      const isProtected = src === "CSV" || src === "RENIPRESS";

      if (!force && isProtected) {
        skipped += 1;
      } else {
        const after = await hospitalService.geocodeHospitalById(id, { force });
        const changed =
          !!after &&
          !!before &&
          Number.isFinite(after.lat) &&
          Number.isFinite(after.lng) &&
          (after.lat !== before.lat || after.lng !== before.lng);
        if (changed) updated += 1;
        else unchanged += 1;
      }
    } catch {
      failed += 1;
    }

    if ((i + 1) % 10 === 0 || i + 1 === limit) {
      process.stdout.write(
        `Progreso: ${i + 1}/${limit} | actualizados=${updated} | sin_cambio=${unchanged} | omitidos=${skipped} | errores=${failed}\n`,
      );
    }

    if (delayMs > 0) await sleep(delayMs);
  }
}

main().catch(() => process.exit(1));