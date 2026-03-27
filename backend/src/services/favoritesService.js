const { HttpError } = require("../utils/httpError");
const favoritesRepository = require("../db/favoritesRepository");
const { getHospitalById } = require("./hospitalService");

function normalizeItemType(value) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "hospital" || v === "place") return v;
  return null;
}

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function listFavorites({ userId, limit }) {
  return favoritesRepository.listFavorites({ userId, limit });
}

async function addFavorite({ userId, item_type, item_id, name = null, lat = null, lon = null, meta = null }) {
  const t = normalizeItemType(item_type);
  if (!t) throw new HttpError(400, "Tipo de favorito inválido");
  const id = String(item_id || "").trim();
  if (!id) throw new HttpError(400, "ID de favorito requerido");

  if (t === "hospital") {
    const incomingMeta = meta && typeof meta === "object" ? meta : null;
    const existing = incomingMeta == null ? await favoritesRepository.getFavorite({ userId, item_type: t, item_id: id }) : null;
    const metaToStore = incomingMeta != null ? incomingMeta : existing && existing.meta && typeof existing.meta === "object" ? existing.meta : null;
    const hospital = await getHospitalById(id);
    const n = hospital && hospital.nombre_establecimiento ? String(hospital.nombre_establecimiento) : null;
    const hLat = hospital && Number.isFinite(hospital.lat) ? Number(hospital.lat) : null;
    const hLng = hospital && Number.isFinite(hospital.lng) ? Number(hospital.lng) : null;
    return favoritesRepository.upsertFavorite({
      userId,
      item_type: t,
      item_id: id,
      name: n,
      lat: hLat,
      lon: hLng,
      meta: metaToStore,
    });
  }

  const latN = parseNumber(lat);
  const lonN = parseNumber(lon);
  if (latN == null || lonN == null) throw new HttpError(400, "Coordenadas inválidas");
  const nameS = name != null && String(name).trim() ? String(name).trim() : null;

  return favoritesRepository.upsertFavorite({
    userId,
    item_type: t,
    item_id: id,
    name: nameS,
    lat: latN,
    lon: lonN,
    meta: meta && typeof meta === "object" ? meta : null,
  });
}

async function removeFavorite({ userId, item_type, item_id }) {
  const t = normalizeItemType(item_type);
  if (!t) throw new HttpError(400, "Tipo de favorito inválido");
  const id = String(item_id || "").trim();
  if (!id) throw new HttpError(400, "ID de favorito requerido");
  const ok = await favoritesRepository.deleteFavorite({ userId, item_type: t, item_id: id });
  if (!ok) throw new HttpError(404, "Favorito no encontrado");
  return { ok: true };
}

module.exports = { listFavorites, addFavorite, removeFavorite };
