const { asyncHandler } = require("../utils/asyncHandler");
const serviceCatalogService = require("../services/serviceCatalogService");

const listServices = asyncHandler(async (req, res) => {
  const services = await serviceCatalogService.listServices();
  res.json(services);
});

module.exports = { listServices };
