const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const testimoniesRoute = require("./routes/testimonies");
const Testimony = require("./models/Testimony");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use("/testimonies", testimoniesRoute);
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Routes
app.get("/", (req, res) => {
  res.send("The Way of Messiah API is running");
});

app.post("/submit-testimony", upload.single("image"), async (req, res) => {
  try {
    const { name, message } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    const testimony = new Testimony({
      name,
      message,
      imageUrl,
      approved: false,
      createdAt: new Date(),
    });

    await testimony.save();
    res.status(200).json({ message: "Testimony submitted successfully!" });
  } catch (error) {
    console.error("MongoDB Save Error:", error);
    res.status(500).json({ error: "Failed to save testimony." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});