const { asyncHandler } = require("../utils/asyncHandler");
const favoritesService = require("../services/favoritesService");

const listFavorites = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : "";
  const limitRaw = req.query.limit != null ? String(req.query.limit) : "";
  const limitN = limitRaw ? Number(limitRaw) : undefined;
  const favorites = await favoritesService.listFavorites({ userId, limit: limitN });
  res.json({ favorites });
});

const addFavorite = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : "";
  const { item_type, item_id, name, lat, lon, meta } = req.body || {};
  const favorite = await favoritesService.addFavorite({ userId, item_type, item_id, name, lat, lon, meta });
  res.json({ favorite });
});

const removeFavorite = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : "";
  const item_type = req.params.item_type;
  const item_id = req.params.item_id;
  const result = await favoritesService.removeFavorite({ userId, item_type, item_id });
  res.json(result);
});

const reorderFavorites = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id ? String(req.user.id) : "";
  const { ids } = req.body || {};
  const result = await favoritesService.reorderFavorites({ userId, ids });
  res.json(result);
});

module.exports = { listFavorites, addFavorite, removeFavorite, reorderFavorites };
