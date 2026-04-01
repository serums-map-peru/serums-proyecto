const express = require("express");

const { requireAuth } = require("../middlewares/requireAuth");
const { validateIdParam } = require("../middlewares/validateIdParam");
const { getMyHospitalComment, setMyHospitalComment } = require("../controllers/commentsController");

const router = express.Router();

router.get("/comentarios/hospitales/:id", requireAuth, validateIdParam("id"), getMyHospitalComment);
router.put("/comentarios/hospitales/:id", requireAuth, validateIdParam("id"), setMyHospitalComment);

module.exports = { commentsRouter: router };
