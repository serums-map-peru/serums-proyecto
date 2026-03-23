const express = require("express");

const { login, me, register, resendVerification, verifyEmail } = require("../controllers/authController");
const { requireAuth } = require("../middlewares/requireAuth");

const router = express.Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/verify-email", verifyEmail);
router.post("/auth/resend-verification", resendVerification);
router.get("/auth/me", requireAuth, me);

module.exports = { authRouter: router };

