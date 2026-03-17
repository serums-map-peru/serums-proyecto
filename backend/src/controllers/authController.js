const { asyncHandler } = require("../utils/asyncHandler");
const authService = require("../services/authService");

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body || {};
  const result = await authService.register({ email, password, name });
  res.json(result);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const result = await authService.login({ email, password });
  res.json(result);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body || {};
  const result = await authService.verifyEmail({ email, code });
  res.json(result);
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  const result = await authService.resendVerification({ email });
  res.json(result);
});

const me = asyncHandler(async (req, res) => {
  const id = req.user && req.user.id ? String(req.user.id) : "";
  const user = await authService.me(id);
  res.json({ user });
});

module.exports = { register, login, verifyEmail, resendVerification, me };

