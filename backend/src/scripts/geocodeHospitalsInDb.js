const { DB_ENABLED, queryAll } = require("../db");
const hospitalService = require("../services/hospitalService");

function getEnvNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!DB_ENABLED) {
    process.stdout.write("DB deshabilitada (DB_ENABLED=0). Abortando.\n");
    process.exit(1);
  }

  const delayMs = getEnvNumber("GEOCODE_DELAY_MS", 1200);
  const max = getEnvNumber("GEOCODE_MAX", 0);
  const verifyAll = getEnvNumber("GEOCODE_VERIFY_ALL", 0) !== 0;

  const sql = verifyAll
    ? `
      SELECT h.id
      FROM hospitals h
      WHERE COALESCE(h.nombre_establecimiento, '') <> ''
        AND COALESCE(h.departamento, '') <> ''
        AND COALESCE(h.provincia, '') <> ''
        AND COALESCE(h.distrito, '') <> ''
        AND COALESCE(h.coordenadas_fuente, '') <> 'CSV'
      ORDER BY h.id ASC
    `
    : `
      SELECT h.id
      FROM hospitals h
      LEFT JOIN hospital_coord_overrides o
        ON o.hospital_id = h.id
      WHERE o.hospital_id IS NULL
        AND COALESCE(h.coordenadas_fuente, '') <> 'RENIPRESS'
        AND COALESCE(h.coordenadas_fuente, '') <> 'CSV'
        AND COALESCE(h.nombre_establecimiento, '') <> ''
        AND COALESCE(h.departamento, '') <> ''
        AND COALESCE(h.provincia, '') <> ''
        AND COALESCE(h.distrito, '') <> ''
      ORDER BY h.id ASC
    `;
  const rows = await queryAll(sql);

  const ids = rows.map((r) => String(r.id)).filter(Boolean);
  const total = ids.length;
  process.stdout.write(`Pendientes de geocodificar (sin override): ${total}\n`);
  if (total === 0) return;

  let ok = 0;
  let fail = 0;
  const limit = max > 0 ? Math.min(max, total) : total;

  for (let i = 0; i < limit; i++) {
    const id = ids[i];
    try {
      const before = await hospitalService.getHospitalById(id);
      const updated = await hospitalService.geocodeHospitalById(id);
      const changed =
        updated &&
        before &&
        Number.isFinite(updated.lat) &&
        Number.isFinite(updated.lng) &&
        (updated.lat !== before.lat || updated.lng !== before.lng);
      if (verifyAll) {
        ok += updated ? 1 : 0;
        fail += updated ? 0 : 1;
      } else {
        ok += changed ? 1 : 0;
        fail += changed ? 0 : 1;
      }
    } catch {
      fail += 1;
    }

    if ((i + 1) % 10 === 0 || i + 1 === limit) {
      process.stdout.write(`Progreso: ${i + 1}/${limit} | actualizados=${ok} | sin_cambio_o_error=${fail}\n`);
    }

    if (delayMs > 0) await sleep(delayMs);
  }
}
