const fs = require("node:fs/promises");
const path = require("node:path");

async function readJsonFile(absolutePath) {
  const raw = await fs.readFile(absolutePath, "utf-8");
  return JSON.parse(raw);
}

function dataPath(...parts) {
  return path.join(__dirname, "..", "data", ...parts);
}

module.exports = { readJsonFile, dataPath };
