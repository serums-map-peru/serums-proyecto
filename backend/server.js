const { createApp } = require("./app");
const { getEnvNumber, getEnvString } = require("./src/utils/env");

const PORT = getEnvNumber("PORT", 4000);
const HOST = getEnvString("HOST", "0.0.0.0");

const app = createApp();

app.listen(PORT, HOST, () => {
  process.stdout.write(`SERUMS Map Perú API listening on http://${HOST}:${PORT}\n`);
});
