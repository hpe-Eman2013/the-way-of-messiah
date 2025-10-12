// routes/admin.js
const express = require("express");
const jwt = require("jsonwebtoken");
const Testimony = require("../models/Testimony");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

const ADMIN_USERNAME = String(process.env.ADMIN_USERNAME || "");
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("[admin] JWT_SECRET not set — login will throw when used.");
}

/**
 * POST /api/admin/login
 * Body: { username, password }
 * Returns: { token }
 */
router.post("/login", async (req, res) => {
  try {
    const { username = "", password = "" } = req.body || {};
    if (
      username.trim() === ADMIN_USERNAME.trim() &&
      password.trim() === ADMIN_PASSWORD.trim()
    ) {
      const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
      return res.status(200).json({ token });
    }
    return res.status(401).json({ error: "Invalid login credentials." });
  } catch (e) {
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * GET /api/admin/me
 * Verify token is valid; returns basic identity.
 */
router.get("/me", verifyToken, (req, res) => {
  res.json({ ok: true, username: req.user?.username || "admin" });
});

/**
 * GET /api/admin/testimonies
 * List all testimonies (admin view).
 */
router.get("/testimonies", verifyToken, async (req, res) => {
  try {
    const testimonies = await Testimony.find().sort({ createdAt: -1 });
    res.json(testimonies);
  } catch {
    res.status(500).json({ error: "Failed to fetch testimonies" });
  }
});

/**
 * PATCH /api/admin/testimonies/:id/approve
 * Body: { approved: boolean } (optional)
 * Approve/disapprove a single testimony.
 */
router.patch("/testimonies/:id/approve", verifyToken, async (req, res) => {
  try {
    const approved =
      typeof req.body?.approved === "boolean" ? req.body.approved : true;
    const updated = await Testimony.findByIdAndUpdate(
      req.params.id,
      { approved },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Testimony not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update approval status." });
  }
});

/**
 * PATCH /api/admin/testimonies/:id/disapprove
 * Explicit disapprove convenience route.
 */
router.patch("/testimonies/:id/disapprove", verifyToken, async (req, res) => {
  try {
    const updated = await Testimony.findByIdAndUpdate(
      req.params.id,
      { approved: false },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Testimony not found" });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to disapprove testimony" });
  }
});

/**
 * DELETE /api/admin/testimonies/:id
 * Delete a single testimony.
 */
router.delete("/testimonies/:id", verifyToken, async (req, res) => {
  try {
    const doc = await Testimony.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Testimony not found" });
    res.json({ message: "Testimony deleted successfully." });
  } catch {
    res.status(500).json({ error: "Failed to delete testimony." });
  }
});

/**
 * POST /api/admin/bulk-action
 * Body: { action: 'approve'|'disapprove'|'delete', ids: string[] }
 * Bulk approve/disapprove/delete testimonies.
 */
router.post("/bulk-action", verifyToken, async (req, res) => {
  const { action, ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: "No testimony IDs provided." });
  }
  try {
    switch (action) {
      case "approve":
        await Testimony.updateMany(
          { _id: { $in: ids } },
          { $set: { approved: true } }
        );
        break;
      case "disapprove":
        await Testimony.updateMany(
          { _id: { $in: ids } },
          { $set: { approved: false } }
        );
        break;
      case "delete":
        await Testimony.deleteMany({ _id: { $in: ids } });
        break;
      default:
        return res.status(400).json({ message: "Invalid action." });
    }
    res.json({ message: "Bulk action completed successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// tiny health check
router.get("/test", (_req, res) => res.send("Admin route is working"));

module.exports = router;
