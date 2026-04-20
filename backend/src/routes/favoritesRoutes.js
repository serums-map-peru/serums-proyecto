const express = require("express");

const { requireAuth } = require("../middlewares/requireAuth");
const { listFavorites, addFavorite, removeFavorite, reorderFavorites } = require("../controllers/favoritesController");

const router = express.Router();

router.get("/favoritos", requireAuth, listFavorites);
router.post("/favoritos", requireAuth, addFavorite);
router.put("/favoritos/orden", requireAuth, reorderFavorites);
router.delete("/favoritos/:item_type/:item_id", requireAuth, removeFavorite);

module.exports = { favoritesRouter: router };
