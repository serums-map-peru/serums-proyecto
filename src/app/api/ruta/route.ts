import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OSRM_TIMEOUT_MS = 12_000;
const ROUTE_CACHE_TTL_MS = 10 * 60_000;
const ROUTE_CACHE_MAX_STALE_MS = 7 * 24 * 60 * 60_000;
const ROUTE_CACHE_MAX = 800;

const routeCache = new Map<string, { value: unknown; freshUntil: number; staleUntil: number }>();

function readCache(key: string) {
  const hit = routeCache.get(key);
  if (!hit) return null;
  if (hit.staleUntil <= Date.now()) {
    routeCache.delete(key);
    return null;
  }
  return { value: hit.value, stale: hit.freshUntil <= Date.now() };
}

function writeCache(key: string, value: unknown) {
  const now = Date.now();
  routeCache.set(key, { value, freshUntil: now + ROUTE_CACHE_TTL_MS, staleUntil: now + ROUTE_CACHE_MAX_STALE_MS });
  while (routeCache.size > ROUTE_CACHE_MAX) {
    const firstKey = routeCache.keys().next().value;
    if (firstKey == null) break;
    routeCache.delete(firstKey);
  }
}

function parseNumber(value: string | null) {
  if (typeof value !== "string") return null;
  const s = value.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function roundCoord(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function parseProfile(value: string | null) {
  if (typeof value !== "string") return "driving";
  const v = value.trim().toLowerCase();
  if (!v) return "driving";
  if (v === "driving" || v === "car" || v === "carro") return "driving";
  if (v === "walking" || v === "foot" || v === "pie") return "walking";
  return null;
}

function buildRouteCacheKey(profile: string, latU: number, lonU: number, latH: number, lonH: number) {
  return `${profile}:${roundCoord(latU)},${roundCoord(lonU)}->${roundCoord(latH)},${roundCoord(lonH)}`;
}

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371e3;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

function buildFallbackRoute(profile: string, latU: number, lonU: number, latH: number, lonH: number, warning: string) {
  const dist = haversineMeters({ lat: latU, lon: lonU }, { lat: latH, lon: lonH });
  const speedMps = profile === "walking" ? 1.25 : 13.9;
  const dur = dist / speedMps;
  return {
    distancia: dist,
    duracion: dur,
    geometria: { type: "LineString" as const, coordinates: [[lonU, latU], [lonH, latH]] as Array<[number, number]> },
    aproximada: true,
    warning,
  };
}

async function fetchOsrmRoute(
  baseUrl: string,
  profile: string,
  latU: number,
  lonU: number,
  latH: number,
  lonH: number,
  timeoutMs: number,
) {
  const root = String(baseUrl || "").trim().replace(/\/$/, "");
  if (!root) return null;

  const radius = profile === "walking" ? 5_000 : 20_000;
  const radiuses = `${radius};${radius}`;
  const upstream = `${root}/route/v1/${profile}/${lonU},${latU};${lonH},${latH}?overview=full&geometries=geojson&steps=false&radiuses=${encodeURIComponent(
    radiuses,
  )}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(500, Math.round(timeoutMs)));
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(upstream, { headers: { accept: "application/json" }, signal: controller.signal }).catch(() => null);
      if (!res) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        return null;
      }
      if (!res.ok) {
        if (res.status === 429 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        return null;
      }

      const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const routes = body && Array.isArray(body.routes) ? (body.routes as Array<Record<string, unknown>>) : null;
      const first = routes && routes[0] ? routes[0] : null;
      if (!body || body.code !== "Ok" || !first) return null;
      return {
        distancia: first.distance,
        duracion: first.duration,
        geometria: first.geometry,
        aproximada: false,
      };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchValhallaRoute(profile: string, latU: number, lonU: number, latH: number, lonH: number, timeoutMs: number) {
  const costing = profile === "walking" ? "pedestrian" : "auto";
  const radius = profile === "walking" ? 5_000 : 20_000;
  const payload = {
    locations: [
      { lat: latU, lon: lonU, type: "break", radius },
      { lat: latH, lon: lonH, type: "break", radius },
    ],
    costing,
    format: "osrm",
    shape_format: "geojson",
    directions_options: { units: "kilometers" },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(500, Math.round(timeoutMs)));
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch("https://valhalla1.openstreetmap.de/route", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).catch(() => null);

      if (!res) {
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 700));
          continue;
        }
        return null;
      }

      if (!res.ok) {
        if (res.status === 429 && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        return null;
      }

      const body = (await res.json().catch(() => null)) as any;
      const routes = body && Array.isArray(body.routes) ? body.routes : null;
      const first = routes && routes[0] ? routes[0] : null;
      const geom = first && first.geometry ? first.geometry : null;
      if (!first || !geom || geom.type !== "LineString" || !Array.isArray(geom.coordinates)) return null;

      return {
        distancia: first.distance,
        duracion: first.duration,
        geometria: geom,
        aproximada: false,
        warning: "Ruta generada con proveedor alternativo.",
      };
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sp = url.searchParams;
  const latU = parseNumber(sp.get("latUsuario"));
  const lonU = parseNumber(sp.get("lonUsuario"));
  const latH = parseNumber(sp.get("latHospital"));
  const lonH = parseNumber(sp.get("lonHospital"));

  const profileRaw = sp.get("profile") ?? sp.get("perfil");
  const profile = parseProfile(profileRaw);
  if (!profile) {
    return NextResponse.json(
      { error: { message: "Parámetro 'perfil' inválido", status: 400, allowed: ["driving", "walking"] } },
      { status: 400 },
    );
  }

  if (latU == null || lonU == null || latH == null || lonH == null) {
    return NextResponse.json(
      {
        error: {
          message: "Parámetros de ruta inválidos",
          status: 400,
          required: ["latUsuario", "lonUsuario", "latHospital", "lonHospital"],
        },
      },
      { status: 400 },
    );
  }

  const cacheKey = buildRouteCacheKey(profile, latU, lonU, latH, lonH);
  const cached = readCache(cacheKey);
  const cachedValue = cached ? (cached.value as any) : null;
  const cachedIsApprox = !!(cachedValue && typeof cachedValue === "object" && cachedValue.aproximada === true);
  const usableCached = cached && !cachedIsApprox ? cached : null;
  if (usableCached && !usableCached.stale) return NextResponse.json(usableCached.value, { status: 200 });

  try {
    const localBase = process.env.OSRM_BASE_URL ? String(process.env.OSRM_BASE_URL) : "http://localhost:5000";
    const candidates = [localBase, "https://router.project-osrm.org"]
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);

    for (const base of candidates) {
      const route = await fetchOsrmRoute(base, profile, latU, lonU, latH, lonH, OSRM_TIMEOUT_MS);
      if (route) {
        writeCache(cacheKey, route);
        return NextResponse.json(route, { status: 200 });
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    const valhalla = await fetchValhallaRoute(profile, latU, lonU, latH, lonH, 12_000);
    if (valhalla) {
      writeCache(cacheKey, valhalla);
      return NextResponse.json(valhalla, { status: 200 });
    }

    if (usableCached) {
      const v = usableCached.value as any;
      const result =
        v && typeof v === "object"
          ? { ...v, warning: "Usando ruta en caché (puede estar desactualizada)." }
          : usableCached.value;
      return NextResponse.json(result, { status: 200 });
    }

    const result = buildFallbackRoute(profile, latU, lonU, latH, lonH, "Ruta por carretera no disponible. Mostrando línea directa (aprox.).");
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const isAbort = e && typeof e === "object" && "name" in e && e.name === "AbortError";
    if (usableCached) {
      const v = usableCached.value as any;
      const result =
        v && typeof v === "object"
          ? { ...v, warning: "Usando ruta en caché (el servicio de rutas no respondió)." }
          : usableCached.value;
      return NextResponse.json(result, { status: 200 });
    }
    const result = buildFallbackRoute(
      profile,
      latU,
      lonU,
      latH,
      lonH,
      isAbort ? "Ruta por carretera lenta/no disponible. Mostrando línea directa (aprox.)." : "Ruta por carretera no disponible. Mostrando línea directa (aprox.).",
    );
    return NextResponse.json(result, { status: 200 });
  }
}
