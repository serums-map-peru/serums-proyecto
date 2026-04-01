import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function dbPath() {
  return path.join(process.cwd(), "backend", "src", "data", "serums.db");
}

function openDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return null;
  return new DatabaseSync(p);
}

function cleanString(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw.length ? raw : "";
}

function parseNumberParam(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeIpressCode(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return digits.padStart(8, "0");
}

function parseNumber(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isValidLatLng(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 || lng === 0) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
}

const CSV_FILES = [
  "6675608-oferta-de-plazas-serums-2025-i-remunerado(2).csv",
  "6675608-oferta-de-plazas-serums-2025-i-equivalente.csv",
];

type AddressCache = {
  key: string;
  byCode: Map<string, string>;
};

let addressCache: AddressCache | null = null;

function buildCacheKey() {
  const parts: string[] = [];
  for (const rel of CSV_FILES) {
    const p = path.join(process.cwd(), rel);
    if (!fs.existsSync(p)) continue;
    const st = fs.statSync(p);
    parts.push(`${rel}:${st.size}:${st.mtimeMs}`);
  }
  return parts.join("|");
}

function parseCsvSemicolon(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const QUOTE = '"';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === QUOTE) {
        if (input[i + 1] === QUOTE) {
          field += QUOTE;
          i += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }
    if (ch === QUOTE) {
      inQuotes = true;
      continue;
    }
    if (ch === ";") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\r") continue;
    if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  rows.push(row);
  while (rows.length && rows[rows.length - 1].every((c) => String(c || "").trim() === "")) rows.pop();
  return rows;
}

function getAddressMap() {
  const cacheKey = buildCacheKey();
  if (addressCache && addressCache.key === cacheKey) return addressCache.byCode;

  const byCode = new Map<string, string>();
  for (const rel of CSV_FILES) {
    const p = path.join(process.cwd(), rel);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    const rows = parseCsvSemicolon(raw);
    if (!rows.length) continue;
    const header = (rows[0] || []).map((h) => String(h || "").toLowerCase().trim());
    const idxCodigo = header.findIndex((h) => h === "codigo" || h.includes("codigo"));
    const idxDireccion = header.findIndex((h) => h === "direccion" || h.includes("direccion"));
    if (idxCodigo < 0 || idxDireccion < 0) continue;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const code = normalizeIpressCode(row[idxCodigo]);
      if (!code) continue;
      const direccion = String(row[idxDireccion] ?? "").trim();
      if (!direccion) continue;
      const prev = byCode.get(code);
      if (!prev || direccion.length > prev.length) byCode.set(code, direccion);
    }
  }

  addressCache = { key: cacheKey, byCode };
  return byCode;
}

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  importance?: number;
  address?: { country_code?: string };
};

async function nominatimSearchPe(query: string) {
  const viewbox = "-82.5,1.2,-67.0,-20.7";
  const upstream = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query,
  )}&format=json&addressdetails=1&limit=8&countrycodes=pe&viewbox=${encodeURIComponent(viewbox)}&bounded=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 18_000);
  try {
    const res = await fetch(upstream, {
      headers: {
        accept: "application/json",
        "user-agent": "SERUMS-Map-Peru/1.0",
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const body = (await res.json().catch(() => null)) as unknown;
    return Array.isArray(body) ? (body as NominatimResult[]) : [];
  } finally {
    clearTimeout(timeoutId);
  }
}

function pickBestNominatim(results: NominatimResult[]) {
  const filtered = results.filter((r) => (r.address?.country_code || "").toLowerCase() === "pe");
  if (!filtered.length) return null;
  const sorted = filtered
    .slice()
    .sort((a, b) => (Number(b.importance) || 0) - (Number(a.importance) || 0));
  const first = sorted[0];
  const lat = first && typeof first.lat === "string" ? Number(first.lat) : NaN;
  const lng = first && typeof first.lon === "string" ? Number(first.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!isValidLatLng(lat, lng)) return null;
  return { lat, lng, display_name: first.display_name || "" };
}

function tableExists(db: DatabaseSync, name: string) {
  try {
    const row = db
      .prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1")
      .get(String(name));
    return !!(row && (row as { ok?: number }).ok);
  } catch {
    return false;
  }
}

function safeJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
  }
  return [];
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  const resolvedParams = await Promise.resolve(params);
  const id = String(resolvedParams?.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: { message: "ID inválido.", status: 400 } }, { status: 400 });
  }

  const db = openDb();
  if (!db) {
    return NextResponse.json(
      { error: { message: "Base de datos no encontrada.", status: 500 } },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const force = parseNumberParam(url.searchParams.get("force")) === 1;
  const now = new Date().toISOString();

  try {
    const row = db
      .prepare(
        `
        SELECT
          h.id,
          h.profesion,
          h.profesiones_json,
          h.institucion,
          h.departamento,
          h.provincia,
          h.distrito,
          h.grado_dificultad,
          h.codigo_renipress_modular,
          h.nombre_establecimiento,
          h.presupuesto,
          h.categoria,
          h.zaf,
          h.ze,
          h.imagenes_json,
          h.lat,
          h.lng,
          h.coordenadas_fuente
        FROM hospitals h
        WHERE h.id = ? OR h.codigo_renipress_modular = ?
        ORDER BY CASE WHEN h.id = ? THEN 0 ELSE 1 END
        LIMIT 1
      `,
      )
      .get(id, id, id) as Record<string, unknown> | undefined;

    if (!row) {
      return NextResponse.json({ error: { message: "Hospital no encontrado", status: 404 } }, { status: 404 });
    }

    const hospitalId = normalizeIpressCode(row.id);
    const latPrev = parseNumber(row.lat);
    const lngPrev = parseNumber(row.lng);
    const sourcePrev = cleanString(row.coordenadas_fuente).toUpperCase();
    if (!force && sourcePrev === "CSV" && isValidLatLng(latPrev, lngPrev)) {
      const profesiones = safeJsonArray(row.profesiones_json);
      const imagenes = safeJsonArray(row.imagenes_json);
      return NextResponse.json(
        {
          id: String(row.id || ""),
          profesion: String(row.profesion || ""),
          profesiones: profesiones.length ? profesiones : undefined,
          institucion: String(row.institucion || ""),
          departamento: String(row.departamento || ""),
          provincia: String(row.provincia || ""),
          distrito: String(row.distrito || ""),
          grado_dificultad: String(row.grado_dificultad || ""),
          codigo_renipress_modular: String(row.codigo_renipress_modular || ""),
          nombre_establecimiento: String(row.nombre_establecimiento || ""),
          presupuesto: String(row.presupuesto || ""),
          categoria: String(row.categoria || ""),
          zaf: String(row.zaf || ""),
          ze: String(row.ze || ""),
          lat: Number(row.lat),
          lng: Number(row.lng),
          imagenes: imagenes.length ? imagenes : undefined,
          coordenadas_fuente: row.coordenadas_fuente != null ? String(row.coordenadas_fuente) : undefined,
        },
        { status: 200 },
      );
    }

    const nombre = cleanString(row.nombre_establecimiento);
    const distrito = cleanString(row.distrito);
    const provincia = cleanString(row.provincia);
    const departamento = cleanString(row.departamento);
    if (!nombre || !distrito || !provincia || !departamento) {
      return NextResponse.json({ error: { message: "Hospital sin datos suficientes para geocodificar.", status: 400 } }, { status: 400 });
    }

    const addressByCode = getAddressMap();
    const direccion = addressByCode.get(hospitalId) || addressByCode.get(normalizeIpressCode(row.codigo_renipress_modular)) || "";

    const queries = [
      direccion ? `${nombre}, ${direccion}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
      direccion ? `${direccion}, ${distrito}, ${provincia}, ${departamento}, Peru` : null,
      `${nombre}, ${distrito}, ${provincia}, ${departamento}, Peru`,
      `${distrito}, ${provincia}, ${departamento}, Peru`,
    ].filter((q): q is string => !!q && q.trim().length > 0);

    let match: { lat: number; lng: number; display_name: string } | null = null;
    for (const q of queries) {
      const results = await nominatimSearchPe(q);
      const best = pickBestNominatim(results);
      if (best) {
        match = best;
        break;
      }
    }

    if (!match || !isValidLatLng(match.lat, match.lng)) {
      return NextResponse.json({ error: { message: "No se encontró una ubicación mejor.", status: 404 } }, { status: 404 });
    }

    if (!tableExists(db, "hospital_coord_overrides")) {
      return NextResponse.json({ error: { message: "Tabla de overrides no encontrada.", status: 500 } }, { status: 500 });
    }

    const upsertOverride = db.prepare(
      `
      INSERT INTO hospital_coord_overrides (hospital_id, lat, lng, source, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(hospital_id) DO UPDATE SET
        lat = excluded.lat,
        lng = excluded.lng,
        source = excluded.source,
        updated_at = excluded.updated_at
    `,
    );
    const updateHospital = db.prepare(
      `
      UPDATE hospitals
      SET lat = ?, lng = ?, coordenadas_fuente = ?, updated_at = ?
      WHERE id = ?
    `,
    );

    db.exec("BEGIN");
    upsertOverride.run(hospitalId, match.lat, match.lng, "NOMINATIM", now);
    updateHospital.run(match.lat, match.lng, "NOMINATIM", now, hospitalId);
    db.exec("COMMIT");

    const profesiones = safeJsonArray(row.profesiones_json);
    const imagenes = safeJsonArray(row.imagenes_json);

    const base = {
      id: hospitalId,
      profesion: String(row.profesion || ""),
      profesiones: profesiones.length ? profesiones : undefined,
      institucion: String(row.institucion || ""),
      departamento: String(row.departamento || ""),
      provincia: String(row.provincia || ""),
      distrito: String(row.distrito || ""),
      grado_dificultad: String(row.grado_dificultad || ""),
      codigo_renipress_modular: String(row.codigo_renipress_modular || ""),
      nombre_establecimiento: String(row.nombre_establecimiento || ""),
      presupuesto: String(row.presupuesto || ""),
      categoria: String(row.categoria || ""),
      zaf: String(row.zaf || ""),
      ze: String(row.ze || ""),
      lat: match.lat,
      lng: match.lng,
      imagenes: imagenes.length ? imagenes : undefined,
      coordenadas_fuente: "NOMINATIM",
    } as Record<string, unknown>;

    return NextResponse.json(base, { status: 200 });
  } catch {
    try {
      db.exec("ROLLBACK");
    } catch {
    }
    return NextResponse.json(
      { error: { message: "Error al geocodificar el establecimiento.", status: 500 } },
      { status: 500 },
    );
  } finally {
    try {
      db.close();
    } catch {
    }
  }
}

