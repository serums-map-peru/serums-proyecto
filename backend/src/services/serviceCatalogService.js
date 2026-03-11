const { dataPath, readJsonFile } = require("../utils/jsonStore");

async function listServices() {
  return readJsonFile(dataPath("servicios.json"));
}

module.exports = { listServices };
