const nodemailer = require("nodemailer");

const { HttpError } = require("../utils/httpError");
const { getEnvNumber, getEnvString } = require("../utils/env");

function isProd() {
  return getEnvString("NODE_ENV", "development") === "production";
}

function getTransport() {
  const host = getEnvString("SMTP_HOST", "");
  if (!host) {
    if (isProd()) throw new HttpError(500, "SMTP no configurado");
    return null;
  }

  const port = getEnvNumber("SMTP_PORT", 587);
  const secure = getEnvString("SMTP_SECURE", "false").toLowerCase() === "true";
  const user = getEnvString("SMTP_USER", "");
  const pass = getEnvString("SMTP_PASS", "");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
}

async function sendVerificationCode({ to, code }) {
  const transport = getTransport();
  if (!transport) {
    process.stderr.write(`[DEV] Código de verificación para ${to}: ${code}\n`);
    return { sent: false };
  }

  const from = getEnvString("SMTP_FROM", "SERUMS <no-reply@serums.local>");
  const appName = getEnvString("APP_NAME", "SERUMS Map Perú");
  const subject = `Tu código de verificación - ${appName}`;
  const text = `Tu código de verificación es: ${code}\n\nSi no fuiste tú, ignora este mensaje.`;
  const html = `<p>Tu código de verificación es:</p><p style="font-size:24px;font-weight:800;letter-spacing:2px">${code}</p><p>Si no fuiste tú, ignora este mensaje.</p>`;

  await transport.sendMail({ from, to, subject, text, html });
  return { sent: true };
}

module.exports = { sendVerificationCode };
