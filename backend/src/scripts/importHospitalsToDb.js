const fs = require("fs");
const path = require("path");

const { DB_ENABLED } = require("../db");
const { getEnvString } = require("../utils/env");
const { HttpError } = require("../utils/httpError");
const hospitalService = require("../services/hospitalService");

function getOverridesJsonPath() {
  const configured = getEnvString(
    "COORD_OVERRIDES_PATH",
    path.resolve(__dirname, "../../../../hospital_coords_overrides.json"),
  );
  return path.resolve(configured);
}

function importOverridesJsonIntoDb() {
  if (!DB_ENABLED) return { imported: 0, skipped: 0, path: null };
  const overridesPath = getOverridesJsonPath();
  let raw;
  try {
    raw = fs.readFileSync(overridesPath, "utf8");
  } catch {
    return { imported: 0, skipped: 0, path: overridesPath };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(500, "No se pudo parsear hospital_coords_overrides.json", { path: overridesPath });
  }

  const entries = parsed && typeof parsed === "object" ? Object.entries(parsed) : [];
  let imported = 0;
  let skipped = 0;
  for (const [id, v] of entries) {
    const lat = v && typeof v === "object" ? Number(v.lat) : NaN;
    const lng = v && typeof v === "object" ? Number(v.lng) : NaN;
    const source = v && typeof v === "object" && typeof v.source === "string" ? v.source : "OVERRIDE";
    if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      skipped += 1;
      continue;
    }
    hospitalService.__persistCoordOverrideForImport(String(id), { lat, lng, source });
    imported += 1;
  }
  return { imported, skipped, path: overridesPath };
}

async function main() {
  if (!DB_ENABLED) {
    process.stdout.write("DB_ENABLED=0: importación omitida.\n");
    process.exit(0);
  }

  const overridesResult = importOverridesJsonIntoDb();
  if (overridesResult.path) {
    process.stdout.write(
      `Overrides: importados=${overridesResult.imported}, omitidos=${overridesResult.skipped}, path=${overridesResult.path}\n`,
    );
  }

  const result = await hospitalService.importHospitalsToDb({ force: true });
  process.stdout.write(
    `Hospitales: upsert=${result.upserted}, csv=${result.csvPath}, renipress=${result.renipressPath}\n`,
  );
}

main().catch((e) => {
  const message = e instanceof Error ? e.message : "Error inesperado";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});

