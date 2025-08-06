const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();

  // You can later replace this with dynamic logic using astronomy libraries
  const equinoxDate = new Date(`${year}-03-20T00:00:00.000Z`);
  res.json({ springEquinox: equinoxDate });
});

module.exports = router;
