import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OVERPASS_TIMEOUT_MS = 18_000;
const AIRPORT_CACHE_TTL_MS = 15 * 60_000;
const AIRPORT_CACHE_MAX = 800;

const airportCache = new Map<string, { value: unknown; expiresAt: number }>();

function dbPath() {
  return path.join(process.cwd(), "backend", "src", "data", "serums.db");
}

function openDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return null;
  return new DatabaseSync(p);
}

function readCache(key: string) {
  const hit = airportCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    airportCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key: string, value: unknown) {
  airportCache.set(key, { value, expiresAt: Date.now() + AIRPORT_CACHE_TTL_MS });
  while (airportCache.size > AIRPORT_CACHE_MAX) {
    const firstKey = airportCache.keys().next().value;
    if (firstKey == null) break;
    airportCache.delete(firstKey);
  }
}

function parseNumber(value: string | number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function mapElementWithCenter(el: Record<string, unknown>) {
  const tags = el.tags && typeof el.tags === "object" ? (el.tags as Record<string, unknown>) : {};
  const lat =
    typeof el.lat === "number"
      ? el.lat
      : el.center && typeof el.center === "object" && typeof (el.center as { lat?: unknown }).lat === "number"
        ? ((el.center as { lat?: number }).lat as number)
        : null;
  const lon =
    typeof el.lon === "number"
      ? el.lon
      : el.center && typeof el.center === "object" && typeof (el.center as { lon?: unknown }).lon === "number"
        ? ((el.center as { lon?: number }).lon as number)
        : null;

  if (lat == null || lon == null) return null;
  return {
    id: String(el.id),
    lat,
    lon,
    name: typeof tags.name === "string" ? tags.name : "",
    tags,
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

export async function GET(
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

  try {
    const row = db
      .prepare(
        `
        SELECT h.id, h.lat, h.lng
        FROM hospitals h
        WHERE h.id = ? OR h.codigo_renipress_modular = ?
        ORDER BY CASE WHEN h.id = ? THEN 0 ELSE 1 END
        LIMIT 1
      `,
      )
      .get(id, id, id) as { id?: unknown; lat?: unknown; lng?: unknown } | undefined;

    if (!row) {
      return NextResponse.json({ error: { message: "Hospital no encontrado", status: 404 } }, { status: 404 });
    }

    const lat = parseNumber(typeof row.lat === "number" ? row.lat : String(row.lat ?? ""));
    const lon = parseNumber(typeof row.lng === "number" ? row.lng : String(row.lng ?? ""));
    if (lat == null || lon == null) {
      return NextResponse.json(
        { error: { message: "Hospital sin coordenadas válidas", status: 500 } },
        { status: 500 },
      );
    }

    const maxRadius = 250000;
    const cacheKey = `airport:${Math.round(lat * 10_000) / 10_000},${Math.round(lon * 10_000) / 10_000},${maxRadius}`;
    const cached = readCache(cacheKey);
    if (cached) return NextResponse.json({ id: String(row.id || ""), ...(cached as object) }, { status: 200 });

    const radii = [10_000, 30_000, 80_000, 160_000, 250_000, 350_000].filter((r) => r <= maxRadius);
    const origin = { lat, lon };

    for (const radius of radii.length ? radii : [maxRadius]) {
      const query = `[out:json];
(
  nwr(around:${radius},${lat},${lon})["aeroway"="aerodrome"];
);
out center;`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
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
      } catch (e) {
        if (e && typeof e === "object" && "name" in e && e.name === "AbortError") {
          return NextResponse.json(
            { error: { message: "Servicio de aeropuertos (Overpass) lento o no disponible. Reintenta.", status: 504 } },
            { status: 504 },
          );
        }
        return NextResponse.json(
          { error: { message: "No se pudo conectar al servicio de aeropuertos (Overpass). Reintenta.", status: 502 } },
          { status: 502 },
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const body = (await res.json().catch(() => null)) as { elements?: unknown[] } | null;
      if (!res.ok) {
        const message =
          res.status === 429
            ? "Servicio de aeropuertos (Overpass) está limitando solicitudes. Reintenta en unos segundos."
            : "Error consultando aeropuertos (Overpass). Reintenta.";
        return NextResponse.json({ error: { message, status: 502 } }, { status: 502 });
      }

      const elements = body && Array.isArray(body.elements) ? body.elements : [];
      let best: { aeropuerto: ReturnType<typeof mapElementWithCenter>; distancia_meters: number; radius_meters: number } | null = null;
      for (const el of elements) {
        if (!el || typeof el !== "object") continue;
        const mapped = mapElementWithCenter(el as Record<string, unknown>);
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
        };
        writeCache(cacheKey, result);
        return NextResponse.json({ id: String(row.id || ""), ...result }, { status: 200 });
      }
    }

    const result = { aeropuerto: null, distancia_meters: null, radius_meters: maxRadius };
    writeCache(cacheKey, result);
    return NextResponse.json({ id: String(row.id || ""), ...result }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: "Error al obtener aeropuerto cercano.", status: 500 } },
      { status: 500 },
    );
  } finally {
    try {
      db.close();
    } catch {
    }
  }
}
