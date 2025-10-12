const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
const upload = multer({ storage });

// POST /api/uploads (form-data key: file)
router.post("/", upload.single("file"), (req, res) => {
  const filename = req.file.filename;
  // public URL for the uploaded file:
  const url = `/uploads/${filename}`;
  res.status(201).json({ filename, url });
});

router.get("/health", (_req, res) => res.json({ ok: true }));

module.exports = router;
