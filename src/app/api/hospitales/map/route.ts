import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type HospitalRow = Record<string, unknown>;

type NearestAirportResult = {
  aeropuerto: { id: string; lat: number; lon: number; name: string; tags: Record<string, unknown> } | null;
  distancia_meters: number | null;
  radius_meters: number;
};

const airportCache = new Map<string, { value: NearestAirportResult; expiresAt: number }>();

function dbPath() {
  return path.join(process.cwd(), "backend", "src", "data", "serums.db");
}

function openDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return null;
  return new DatabaseSync(p);
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

function cleanString(value: string | null) {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length ? s : null;
}

function cleanArray(values: string[]) {
  return values.map((v) => String(v || "").trim()).filter(Boolean);
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

function parseNumberParam(value: string | null) {
  if (!value) return null;
  const n = Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

function readAirportCache(key: string) {
  const hit = airportCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    airportCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeAirportCache(key: string, value: NearestAirportResult) {
  airportCache.set(key, { value, expiresAt: Date.now() + 15 * 60_000 });
  while (airportCache.size > 800) {
    const firstKey = airportCache.keys().next().value;
    if (firstKey == null) break;
    airportCache.delete(firstKey);
  }
}

function mapElementWithCenter(el: unknown) {
  if (!el || typeof el !== "object") return null;
  const o = el as Record<string, unknown>;
  const tagsRaw = o.tags && typeof o.tags === "object" ? (o.tags as Record<string, unknown>) : {};

  const lat =
    typeof o.lat === "number"
      ? o.lat
      : o.center && typeof o.center === "object" && typeof (o.center as { lat?: unknown }).lat === "number"
        ? ((o.center as { lat?: number }).lat as number)
        : null;
  const lon =
    typeof o.lon === "number"
      ? o.lon
      : o.center && typeof o.center === "object" && typeof (o.center as { lon?: unknown }).lon === "number"
        ? ((o.center as { lon?: number }).lon as number)
        : null;

  if (lat == null || lon == null) return null;
  return {
    id: String(o.id),
    lat,
    lon,
    name: typeof tagsRaw.name === "string" ? tagsRaw.name : "",
    tags: tagsRaw,
  };
}

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function getNearestAirport({ lat, lon, maxRadius = 250000 }: { lat: number; lon: number; maxRadius?: number }) {
  const cacheKey = `airport:${Math.round(lat * 10_000) / 10_000},${Math.round(lon * 10_000) / 10_000},${maxRadius}`;
  const cached = readAirportCache(cacheKey);
  if (cached) return cached;

  const radii = [10_000, 30_000, 80_000, 160_000, 250_000, 350_000].filter((r) => r <= maxRadius);
  const origin = { lat, lon };

  for (const radius of radii.length ? radii : [maxRadius]) {
    const query = `[out:json];
(
  nwr(around:${radius},${lat},${lon})["aeroway"="aerodrome"];
);
out center;`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18_000);
    let res: Response;
    try {
      res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          accept: "application/json",
          "user-agent": "SERUMS-Map-Peru/1.0",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      continue;
    }

    const body = (await res.json().catch(() => null)) as { elements?: unknown[] } | null;
    const elements = body && Array.isArray(body.elements) ? body.elements : [];
    let best: { aeropuerto: ReturnType<typeof mapElementWithCenter>; distancia_meters: number; radius_meters: number } | null = null;
    for (const el of elements) {
      const mapped = mapElementWithCenter(el);
      if (!mapped) continue;
      const d = haversineMeters(origin, mapped);
      if (!best || d < best.distancia_meters) {
        best = { aeropuerto: mapped, distancia_meters: d, radius_meters: radius };
      }
    }

    if (best) {
      const result = {
        aeropuerto: best.aeropuerto,
        distancia_meters: best.distancia_meters,
        radius_meters: best.radius_meters,
      } as NearestAirportResult;
      writeAirportCache(cacheKey, result);
      return result;
    }
  }

  const result = { aeropuerto: null, distancia_meters: null, radius_meters: maxRadius } as NearestAirportResult;
  writeAirportCache(cacheKey, result);
  return result;
}

async function filterByAirportHoursMax(rows: HospitalRow[], airportHoursMax: number) {
  const MAX_CONCURRENCY = 5;
  const queue = rows.slice();
  const accepted: HospitalRow[] = [];

  const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const row = queue.pop();
      if (!row) break;
      const lat = Number(row.lat);
      const lng = Number(row.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      try {
        const nearest = await getNearestAirport({ lat, lon: lng });
        const dMeters = nearest && Number.isFinite(nearest.distancia_meters) ? nearest.distancia_meters : null;
        if (dMeters == null) continue;
        const km = dMeters / 1000;
        const hours = km / 60;
        if (hours <= airportHoursMax) accepted.push(row);
      } catch {
      }
    }
  });

  await Promise.all(workers);
  return accepted;
}

export async function GET(request: Request) {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL ? String(process.env.NEXT_PUBLIC_API_BASE_URL).trim().replace(/\/$/, "") : "";
  const selfBase = `${new URL(request.url).origin}/api`;
  if (configured && configured !== selfBase) {
    const url = new URL(request.url);
    const upstream = `${configured}/hospitales/map?${url.searchParams.toString()}`;
    const res = await fetch(upstream, { headers: { accept: "application/json" } }).catch(() => null);
    if (!res) {
      return NextResponse.json({ error: { message: "No se pudo conectar al backend.", status: 502 } }, { status: 502 });
    }
    const body = await res.json().catch(() => null);
    return NextResponse.json(body, { status: res.status });
  }

  const db = openDb();
  if (!db) {
    return NextResponse.json(
      { error: { message: "Base de datos no encontrada.", status: 500 } },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const sp = url.searchParams;

  const profesion = cleanString(sp.get("profesion"));
  const instituciones = cleanArray(sp.getAll("institucion"));
  const departamentos = cleanArray(sp.getAll("departamento"));
  const provincias = cleanArray(sp.getAll("provincia"));
  const distrito = cleanString(sp.get("distrito"));
  const grados = cleanArray(sp.getAll("grado_dificultad"));
  const categorias = cleanArray(sp.getAll("categoria"));
  const zaf = cleanString(sp.get("zaf"));
  const ze = cleanString(sp.get("ze"));
  const serums_periodo = cleanString(sp.get("serums_periodo"));
  const serums_modalidad = cleanString(sp.get("serums_modalidad"));
  const airportHoursMax = parseNumberParam(sp.get("airport_hours_max"));

  try {
    const hasOverrides = tableExists(db, "hospital_coord_overrides");
    const latSql = hasOverrides ? "COALESCE(o.lat, h.lat)" : "h.lat";
    const lngSql = hasOverrides ? "COALESCE(o.lng, h.lng)" : "h.lng";
    const joinSql = hasOverrides ? "LEFT JOIN hospital_coord_overrides o ON o.hospital_id = h.id" : "";

    const where: string[] = [];
    const params: SQLInputValue[] = [];

    where.push(`CAST(${latSql} AS REAL) BETWEEN -90 AND 90`);
    where.push(`CAST(${lngSql} AS REAL) BETWEEN -180 AND 180`);
    where.push(`CAST(${latSql} AS REAL) != 0`);
    where.push(`CAST(${lngSql} AS REAL) != 0`);

    const addLowerEq = (column: string, value: string | null) => {
      if (!value) return;
      where.push(`LOWER(${column}) = ?`);
      params.push(value.toLowerCase());
    };

    const addLowerIn = (column: string, values: string[]) => {
      if (!values.length) return;
      const normalized = values.map((v) => v.toLowerCase());
      where.push(`LOWER(${column}) IN (${normalized.map(() => "?").join(", ")})`);
      params.push(...normalized);
    };

    addLowerIn("h.institucion", instituciones);
    addLowerIn("h.departamento", departamentos);
    addLowerIn("h.provincia", provincias);
    addLowerEq("h.distrito", distrito);
    addLowerIn("h.grado_dificultad", grados);
    addLowerIn("h.categoria", categorias);
    addLowerEq("h.zaf", zaf);
    addLowerEq("h.ze", ze);

    const requiresOfferFilter = !!serums_periodo || !!serums_modalidad;
    const needsOfferFilter = !!profesion || requiresOfferFilter;
    if (needsOfferFilter) {
      if (!tableExists(db, "serums_offers")) return NextResponse.json([], { status: 200 });

      const offerWhere: string[] = ["o.hospital_id = h.id"];
      const offerParams: SQLInputValue[] = [];
      if (serums_periodo) {
        offerWhere.push("LOWER(o.periodo) = ?");
        offerParams.push(serums_periodo.toLowerCase());
      }
      if (serums_modalidad) {
        offerWhere.push("LOWER(o.modalidad) = ?");
        offerParams.push(serums_modalidad.toLowerCase());
      }
      if (profesion) {
        offerWhere.push("LOWER(o.profesion) = ?");
        offerParams.push(profesion.toLowerCase());
      }
      where.push(`EXISTS (SELECT 1 FROM serums_offers o WHERE ${offerWhere.join(" AND ")})`);
      params.push(...offerParams);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const rows = db
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
          h.categoria,
          h.zaf,
          h.ze,
          ${latSql} AS lat,
          ${lngSql} AS lng
        FROM hospitals h
        ${joinSql}
        ${whereSql}
      `,
      )
      .all(...params) as HospitalRow[];

    let filtered = rows;
    if (airportHoursMax != null && Number.isFinite(airportHoursMax) && airportHoursMax > 0) {
      filtered = await filterByAirportHoursMax(filtered, airportHoursMax);
    }

    const mapped = filtered.map((row) => {
      const profesiones = safeJsonArray(row.profesiones_json);
      return {
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
        categoria: String(row.categoria || ""),
        zaf: String(row.zaf || ""),
        ze: String(row.ze || ""),
        lat: Number(row.lat),
        lng: Number(row.lng),
      };
    });

    return NextResponse.json(mapped, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: "Error al cargar establecimientos.", status: 500 } },
      { status: 500 },
    );
  } finally {
    try {
      db.close();
    } catch {
    }
  }
}
