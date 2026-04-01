import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OVERPASS_TIMEOUT_MS = 18_000;
const NEARBY_CACHE_TTL_MS = 15 * 60_000;
const NEARBY_CACHE_MAX = 800;

const OVERPASS_ENDPOINTS = (process.env.OVERPASS_ENDPOINTS ||
  "https://overpass-api.de/api/interpreter,https://overpass.kumi.systems/api/interpreter")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nearbyCache = new Map<string, { value: unknown; expiresAt: number }>();

function dbPath() {
  return path.join(process.cwd(), "backend", "src", "data", "serums.db");
}

function openDb() {
  const p = dbPath();
  if (!fs.existsSync(p)) return null;
  return new DatabaseSync(p);
}

function readCache(key: string) {
  const hit = nearbyCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    nearbyCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key: string, value: unknown) {
  nearbyCache.set(key, { value, expiresAt: Date.now() + NEARBY_CACHE_TTL_MS });
  while (nearbyCache.size > NEARBY_CACHE_MAX) {
    const firstKey = nearbyCache.keys().next().value;
    if (firstKey == null) break;
    nearbyCache.delete(firstKey);
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

function groupKeyForElement(el: Record<string, unknown>) {
  const tags = el.tags && typeof el.tags === "object" ? (el.tags as Record<string, unknown>) : {};

  if (tags.tourism === "hotel") return "hospedajes";
  if (tags.amenity === "restaurant") return "restaurantes";
  if (tags.amenity === "pharmacy") return "farmacias";
  if (tags.amenity === "police") return "comisarias";
  if (tags.amenity === "bank" || tags.amenity === "atm") return "bancos";
  if (tags.amenity === "place_of_worship" || tags.building === "church") return "iglesias";
  if (tags.leisure === "fitness_centre" || tags.amenity === "fitness_centre" || tags.leisure === "sports_centre") return "gimnasios";
  if (tags.shop === "supermarket") return "supermercados";
  if (tags.shop === "mall" || tags.amenity === "marketplace") return "centros_comerciales";
  if (tags.shop === "convenience" || tags.shop === "general" || tags.shop === "kiosk") return "tiendas";

  return null;
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

  const url = new URL(request.url);
  const radiusMetersRaw = url.searchParams.get("radius_meters");
  const radiusMeters = parseNumber(radiusMetersRaw);
  const radius =
    radiusMeters != null && Number.isFinite(radiusMeters) && radiusMeters > 0
      ? Math.max(200, Math.min(20_000, Math.round(radiusMeters)))
      : 2000;

  const typesRaw = url.searchParams.get("types");
  const types = typesRaw
    ? typesRaw
        .split(",")
        .map((t) => String(t || "").trim().toLowerCase())
        .filter(Boolean)
    : null;

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

    const typesKey = Array.isArray(types) && types.length ? types.slice().sort().join(",") : "all";
    const cacheKey = `${Math.round(lat * 10_000) / 10_000},${Math.round(lon * 10_000) / 10_000},${radius},${typesKey}`;
    const cached = readCache(cacheKey);
    if (cached) return NextResponse.json({ id: String(row.id || ""), ...(cached as object) }, { status: 200 });

    const wanted = new Set(
      Array.isArray(types) && types.length
        ? types.map((t) => String(t || "").trim().toLowerCase()).filter(Boolean)
        : [
            "hospedajes",
            "restaurantes",
            "centros_comerciales",
            "supermercados",
            "tiendas",
            "farmacias",
            "bancos",
            "comisarias",
            "gimnasios",
            "iglesias",
          ],
    );

    const lines: string[] = [];
    if (wanted.has("hospedajes")) {
      lines.push(`  nwr(around:${radius},${lat},${lon})["tourism"="hotel"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["tourism"="guest_house"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["tourism"="hostel"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["tourism"="motel"];`);
    }
    if (wanted.has("restaurantes")) {
      lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="restaurant"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="fast_food"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="cafe"];`);
    }
    if (wanted.has("farmacias")) lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="pharmacy"];`);
    if (wanted.has("comisarias")) lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="police"];`);
    if (wanted.has("bancos")) {
      lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="bank"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="atm"];`);
    }
    if (wanted.has("gimnasios")) {
      lines.push(`  nwr(around:${radius},${lat},${lon})["leisure"="fitness_centre"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="fitness_centre"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["leisure"="sports_centre"];`);
    }
    if (wanted.has("iglesias")) {
      lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="place_of_worship"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["building"="church"];`);
    }
    if (wanted.has("centros_comerciales")) {
      lines.push(`  nwr(around:${radius},${lat},${lon})["shop"="mall"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["amenity"="marketplace"];`);
    }
    if (wanted.has("supermercados")) lines.push(`  nwr(around:${radius},${lat},${lon})["shop"="supermarket"];`);
    if (wanted.has("tiendas")) {
      lines.push(`  nwr(around:${radius},${lat},${lon})["shop"="convenience"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["shop"="general"];`);
      lines.push(`  nwr(around:${radius},${lat},${lon})["shop"="kiosk"];`);
    }

    if (!lines.length) {
      lines.push(`  node(around:${radius},${lat},${lon})["amenity"="restaurant"];`);
    }

    const query = `[out:json];
(
${lines.join("\n")}
);
out center;`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
    let res: Response | null = null;
    try {
      const endpoints = OVERPASS_ENDPOINTS.length ? OVERPASS_ENDPOINTS : ["https://overpass-api.de/api/interpreter"];
      for (const ep of endpoints) {
        res = await fetch(ep, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
            accept: "application/json",
            "user-agent": "SERUMS-Map-Peru/1.0",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });
        if (res.ok) break;
      }
    } catch (e) {
      if (e && typeof e === "object" && "name" in e && e.name === "AbortError") {
        return NextResponse.json(
          { error: { message: "Servicio de lugares cercanos (Overpass) lento o no disponible. Reintenta.", status: 504 } },
          { status: 504 },
        );
      }
      return NextResponse.json(
        { error: { message: "No se pudo conectar al servicio de lugares cercanos (Overpass). Reintenta.", status: 502 } },
        { status: 502 },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res) {
      return NextResponse.json(
        { error: { message: "Error consultando lugares cercanos (Overpass). Reintenta.", status: 502 } },
        { status: 502 },
      );
    }

    const body = (await res.json().catch(() => null)) as { elements?: unknown[] } | null;
    if (!res.ok) {
      const message =
        res.status === 429
          ? "Servicio de lugares cercanos (Overpass) está limitando solicitudes. Reintenta en unos segundos."
          : "Error consultando lugares cercanos (Overpass). Reintenta.";
      return NextResponse.json({ error: { message, status: 502 } }, { status: 502 });
    }

    const grouped = {
      hospedajes: [] as unknown[],
      restaurantes: [] as unknown[],
      farmacias: [] as unknown[],
      tiendas: [] as unknown[],
      comisarias: [] as unknown[],
      gimnasios: [] as unknown[],
      bancos: [] as unknown[],
      iglesias: [] as unknown[],
      supermercados: [] as unknown[],
      centros_comerciales: [] as unknown[],
    };

    const elements = body && Array.isArray(body.elements) ? body.elements : [];
    for (const el of elements) {
      if (!el || typeof el !== "object") continue;
      const obj = el as Record<string, unknown>;
      const key = groupKeyForElement(obj);
      if (!key) continue;
      const mapped = mapElementWithCenter(obj);
      if (!mapped) continue;
      grouped[key].push(mapped);
    }

    writeCache(cacheKey, grouped);
    return NextResponse.json({ id: String(row.id || ""), ...grouped }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: { message: "Error al obtener lugares cercanos.", status: 500 } },
      { status: 500 },
    );
  } finally {
    try {
      db.close();
    } catch {
    }
  }
}
