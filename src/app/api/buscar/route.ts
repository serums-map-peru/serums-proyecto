import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SEARCH_CACHE_TTL_MS = 10 * 60_000;
const SEARCH_CACHE_MAX = 800;
const NOMINATIM_TIMEOUT_MS = 10_000;

const searchCache = new Map<string, { value: unknown; expiresAt: number }>();

function cleanQuery(value: string | null) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function normalizeQuery(value: string) {
  return cleanQuery(value).toLowerCase();
}

function readCache(key: string) {
  const hit = searchCache.get(key);
  if (!hit) return null;
  return { value: hit.value, stale: hit.expiresAt <= Date.now() };
}

function writeCache(key: string, value: unknown) {
  searchCache.set(key, { value, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  while (searchCache.size > SEARCH_CACHE_MAX) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey == null) break;
    searchCache.delete(firstKey);
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = cleanQuery(url.searchParams.get("q"));
  if (!q) {
    return NextResponse.json({ error: { message: "Parámetro 'q' requerido", status: 400 } }, { status: 400 });
  }

  const cacheKey = `pe:${normalizeQuery(q)}`;
  const cached = readCache(cacheKey);
  if (cached && !cached.stale) return NextResponse.json({ results: cached.value, cached: true }, { status: 200 });

  const viewbox = "-82.5,1.2,-67.0,-20.7";
  const upstream = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    q,
  )}&format=json&addressdetails=1&limit=8&countrycodes=pe&viewbox=${encodeURIComponent(viewbox)}&bounded=1`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: Response;
      try {
        res = await fetch(upstream, {
          headers: {
            accept: "application/json",
            "user-agent": "SERUMS-Map-Peru/1.0",
          },
          signal: controller.signal,
        });
      } catch (e) {
        const isAbort = e && typeof e === "object" && "name" in e && e.name === "AbortError";
        if (isAbort) break;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 700));
          continue;
        }
        const fallback = cached ? cached.value : [];
        return NextResponse.json(
          { results: fallback, cached: !!cached, warning: "Servicio de búsqueda no disponible. Mostrando resultados en caché si existen." },
          { status: 200 },
        );
      }

      if (res.status === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1400));
        continue;
      }

      const body = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        const fallback = cached ? cached.value : [];
        const warning =
          res.status === 429
            ? "Servicio de búsqueda está limitando solicitudes. Mostrando resultados en caché si existen."
            : "Error consultando servicio de búsqueda. Mostrando resultados en caché si existen.";
        return NextResponse.json({ results: fallback, cached: !!cached, warning }, { status: 200 });
      }

      const items = Array.isArray(body) ? body : [];
      const result = items.map((it) => {
        const o = it as Record<string, unknown>;
        return {
          place_id: o.place_id,
          display_name: o.display_name,
          lat: o.lat,
          lon: o.lon,
          type: o.type,
          class: o.class,
          importance: o.importance,
          boundingbox: o.boundingbox,
        };
      });

      writeCache(cacheKey, result);
      return NextResponse.json({ results: result, cached: false }, { status: 200 });
    }
  } catch (e) {
    const fallback = cached ? cached.value : [];
    return NextResponse.json(
      { results: fallback, cached: !!cached, warning: "Servicio de búsqueda lento. Mostrando resultados en caché si existen." },
      { status: 200 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
  const fallback = cached ? cached.value : [];
  return NextResponse.json(
    { results: fallback, cached: !!cached, warning: "Servicio de búsqueda no disponible. Mostrando resultados en caché si existen." },
    { status: 200 },
  );
}
