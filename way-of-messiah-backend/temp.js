const { verifyToken } = require("./admin");

router.get("/all", verifyToken, async (req, res) => {
  try {
    const testimonies = await Testimony.find().sort({ createdAt: -1 });
    res.json(testimonies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch testimonies" });
  }
});
