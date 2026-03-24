const express = require("express");

const { requireAuth } = require("../middlewares/requireAuth");
const { listFavorites, addFavorite, removeFavorite } = require("../controllers/favoritesController");

const router = express.Router();

router.get("/favoritos", requireAuth, listFavorites);
router.post("/favoritos", requireAuth, addFavorite);
router.delete("/favoritos/:item_type/:item_id", requireAuth, removeFavorite);

module.exports = { favoritesRouter: router };
