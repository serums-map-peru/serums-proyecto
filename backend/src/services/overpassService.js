const { HttpError } = require("../utils/httpError");

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function groupKeyForElement(el) {
  const tags = el && el.tags ? el.tags : {};

  if (tags.tourism === "hotel") return "hospedajes";
  if (tags.amenity === "restaurant") return "restaurantes";
  if (tags.amenity === "pharmacy") return "farmacias";
  if (tags.amenity === "police") return "comisarias";
  if (tags.shop) return "tiendas";

  return null;
}

function mapElement(el) {
  const tags = el && el.tags ? el.tags : {};
  return {
    id: String(el.id),
    lat: el.lat,
    lon: el.lon,
    name: typeof tags.name === "string" ? tags.name : "",
    tags,
  };
}

async function getNearbyPlaces({ lat, lon, radius = 2000 }) {
  const latN = parseNumber(lat);
  const lonN = parseNumber(lon);
  if (latN == null || lonN == null) {
    throw new HttpError(500, "Hospital sin coordenadas válidas");
  }

  const query = `[out:json];
(
  node(around:${radius},${latN},${lonN})["tourism"="hotel"];
  node(around:${radius},${latN},${lonN})["amenity"="restaurant"];
  node(around:${radius},${latN},${lonN})["amenity"="pharmacy"];
  node(around:${radius},${latN},${lonN})["shop"];
  node(around:${radius},${latN},${lonN})["amenity"="police"];
);
out center;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
      accept: "application/json",
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new HttpError(502, "Error consultando Overpass", {
      status: res.status,
      body,
    });
  }

  const grouped = {
    hospedajes: [],
    restaurantes: [],
    farmacias: [],
    tiendas: [],
    comisarias: [],
  };

  const elements = body && Array.isArray(body.elements) ? body.elements : [];
  for (const el of elements) {
    const key = groupKeyForElement(el);
    if (!key) continue;
    grouped[key].push(mapElement(el));
  }

  return grouped;
}

module.exports = { getNearbyPlaces };
