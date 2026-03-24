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

function safeLower(value: string) {
  return String(value || "").trim().toLowerCase();
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

export function GET(request: Request) {
  const url = new URL(request.url);
  const getAllLower = (key: string) => url.searchParams.getAll(key).map((v) => safeLower(v)).filter(Boolean);
  const filters = {
    profesion: safeLower(url.searchParams.get("profesion") || ""),
    institucion: getAllLower("institucion"),
    departamento: getAllLower("departamento"),
    grado_dificultad: getAllLower("grado_dificultad"),
    categoria: getAllLower("categoria"),
    zaf: safeLower(url.searchParams.get("zaf") || ""),
    ze: safeLower(url.searchParams.get("ze") || ""),
    serums_periodo: String(url.searchParams.get("serums_periodo") || "").trim(),
    serums_modalidad: String(url.searchParams.get("serums_modalidad") || "").trim(),
    airport_hours_max: Number(url.searchParams.get("airport_hours_max") || ""),
  };

  const db = openDb();
  if (!db) {
    return NextResponse.json(
      { error: { message: "Base de datos no encontrada.", status: 500 } },
      { status: 500 },
    );
  }

  try {
    const clauses: string[] = [];
    const params: string[] = [];

    if (filters.profesion) {
      clauses.push(
        "(LOWER(COALESCE(h.profesion,'')) = ? OR LOWER(COALESCE(h.profesiones_json,'')) LIKE '%' || ? || '%')",
      );
      params.push(filters.profesion, filters.profesion);
    }
    if (Array.isArray(filters.institucion) && filters.institucion.length) {
      clauses.push(`LOWER(COALESCE(h.institucion,'')) IN (${filters.institucion.map(() => "?").join(",")})`);
      params.push(...filters.institucion);
    }
    if (Array.isArray(filters.departamento) && filters.departamento.length) {
      clauses.push(`LOWER(COALESCE(h.departamento,'')) IN (${filters.departamento.map(() => "?").join(",")})`);
      params.push(...filters.departamento);
    }
    if (Array.isArray(filters.grado_dificultad) && filters.grado_dificultad.length) {
      clauses.push(
        `LOWER(COALESCE(h.grado_dificultad,'')) IN (${filters.grado_dificultad.map(() => "?").join(",")})`,
      );
      params.push(...filters.grado_dificultad);
    }
    if (Array.isArray(filters.categoria) && filters.categoria.length) {
      clauses.push(`LOWER(COALESCE(h.categoria,'')) IN (${filters.categoria.map(() => "?").join(",")})`);
      params.push(...filters.categoria);
    }
    if (filters.zaf) {
      clauses.push("LOWER(COALESCE(h.zaf,'')) = ?");
      params.push(filters.zaf);
    }
    if (filters.ze) {
      clauses.push("LOWER(COALESCE(h.ze,'')) = ?");
      params.push(filters.ze);
    }

    const wantsOffers = !!filters.serums_periodo || !!filters.serums_modalidad;
    if (wantsOffers && tableExists(db, "serums_offers")) {
      const offerClauses: string[] = ["o.hospital_id = h.id"];
      if (filters.serums_periodo) {
        offerClauses.push("o.periodo = ?");
        params.push(filters.serums_periodo);
      }
      if (filters.serums_modalidad) {
        offerClauses.push("o.modalidad = ?");
        params.push(filters.serums_modalidad);
      }
      clauses.push(`EXISTS (SELECT 1 FROM serums_offers o WHERE ${offerClauses.join(" AND ")})`);
    } else if (wantsOffers) {
      return NextResponse.json([], { status: 200 });
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
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
          h.lat,
          h.lng
        FROM hospitals h
        ${where}
      `,
      )
      .all(...params);

    const mapped = rows.map((r) => {
      const row = r as Record<string, unknown>;
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

    const hoursMax = Number.isFinite(filters.airport_hours_max) ? Number(filters.airport_hours_max) : null;
    if (!hoursMax || hoursMax <= 0) {
      return NextResponse.json(mapped, { status: 200 });
    }

    function toRad(d: number) {
      return (d * Math.PI) / 180;
    }
    function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
      const R = 6371000;
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lon - a.lon);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const sinDLat = Math.sin(dLat / 2);
      const sinDLon = Math.sin(dLon / 2);
      const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    }

    const airportCache = new Map<string, { lat: number; lon: number } | null>();
    function roundCoord(v: number) {
      return Math.round(v * 10000) / 10000;
    }

    async function getNearestAirport(lat: number, lon: number) {
      const key = `${roundCoord(lat)},${roundCoord(lon)}`;
      if (airportCache.has(key)) return airportCache.get(key);
      const radii = [30000, 80000, 160000, 250000, 350000];
      const origin = { lat, lon };
      for (const radius of radii) {
        const query = `[out:json];
(nwr(around:${radius},${lat},${lon})["aeroway"="aerodrome"];);
out center;`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 18000);
        try {
          const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
              accept: "application/json",
              "user-agent": "SERUMS-Map-Peru/1.0",
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          });
          const body = await res.json().catch(() => null);
          if (res.ok && body && Array.isArray(body.elements)) {
            let best: { lat: number; lon: number } | null = null;
            let bestD = Infinity;
            for (const el of body.elements) {
              const aLat =
                typeof el.lat === "number" ? el.lat : el.center && typeof el.center.lat === "number" ? el.center.lat : null;
              const aLon =
                typeof el.lon === "number" ? el.lon : el.center && typeof el.center.lon === "number" ? el.center.lon : null;
              if (aLat == null || aLon == null) continue;
              const d = haversineMeters(origin, { lat: aLat, lon: aLon });
              if (d < bestD) {
                bestD = d;
                best = { lat: aLat, lon: aLon };
              }
            }
            if (best) {
              airportCache.set(key, best);
              clearTimeout(timeout);
              return best;
            }
          }
        } catch {
        } finally {
          clearTimeout(timeout);
        }
      }
      airportCache.set(key, null);
      return null;
    }

    const routeCache = new Map<string, number>();
    function routeKey(aLon: number, aLat: number, bLon: number, bLat: number) {
      return `${roundCoord(aLon)},${roundCoord(aLat)}->${roundCoord(bLon)},${roundCoord(bLat)}`;
    }
    async function osrmDurationSeconds(aLat: number, aLon: number, bLat: number, bLon: number) {
      const key = routeKey(aLon, aLat, bLon, bLat);
      if (routeCache.has(key)) return routeCache.get(key)!;
      const url = `https://router.project-osrm.org/route/v1/driving/${aLon},${aLat};${bLon},${bLat}?overview=false`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
        const body = await res.json().catch(() => null);
        if (res.ok && body && body.code === "Ok" && Array.isArray(body.routes) && body.routes[0]) {
          const seconds = Number(body.routes[0].duration);
          if (Number.isFinite(seconds)) {
            routeCache.set(key, seconds);
            return seconds;
          }
        }
      } catch {
      } finally {
        clearTimeout(timeout);
      }
      return Infinity;
    }

    const MAX_CONCURRENCY = 5;
    const queue = mapped.slice();
    const selected: typeof mapped = [];
    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, async () => {
      while (queue.length) {
        const h = queue.pop()!;
        if (!Number.isFinite(h.lat) || !Number.isFinite(h.lng)) continue;
        try {
          const airport = await getNearestAirport(h.lat, h.lng);
          if (!airport) continue;
          const sec = await osrmDurationSeconds(h.lat, h.lng, airport.lat, airport.lon);
          const hours = sec / 3600;
          if (hours <= hoursMax) selected.push(h);
        } catch {
          // Ignorar fallas de servicios externos
        }
      }
    });
    return Promise.all(workers).then(() => NextResponse.json(selected, { status: 200 }));
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
