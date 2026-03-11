function health(req, res) {
  res.json({ ok: true, service: "serums-map-peru-backend" });
}

module.exports = { health };
