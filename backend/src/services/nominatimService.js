const { HttpError } = require("../utils/httpError");

function cleanQuery(value) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

async function searchPlaces(q) {
  const query = cleanQuery(q);
  if (!query) throw new HttpError(400, "Parámetro 'q' requerido");

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query,
  )}&format=json&addressdetails=1&limit=8`;

  const res = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "SERUMS-Map-Peru/1.0",
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new HttpError(502, "Error consultando Nominatim", {
      status: res.status,
      body,
    });
  }

  const items = Array.isArray(body) ? body : [];
  return items.map((it) => ({
    place_id: it.place_id,
    display_name: it.display_name,
    lat: it.lat,
    lon: it.lon,
    type: it.type,
    class: it.class,
    importance: it.importance,
    boundingbox: it.boundingbox,
  }));
}

module.exports = { searchPlaces };
