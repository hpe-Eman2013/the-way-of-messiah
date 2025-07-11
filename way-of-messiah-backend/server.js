// server.js
const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const testimoniesRoute = require("./routes/testimonies");
const adminRouter = require("./routes/admin");
const Testimony = require("./models/Testimony");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;
const adminAuthRoutes = require("./routes/adminAuth");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/api/testimonies", testimoniesRoute);
app.use("/admin", adminRouter);
app.use("/auth", adminAuthRoutes);

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
        cb(null, uniqueName);
    },
});
const upload = multer({ storage });

// Routes
app.get("/", (req, res) => {
    res.send("The Way of Messiah API is running");
});

// GET approved testimonies
app.get("/testimonies", async(req, res) => {
    try {
        const testimonies = await Testimony.find({ approved: true }).sort({ createdAt: -1 });
        res.json(testimonies);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch testimonies" });
    }
});

// PATCH to approve/unapprove a testimony
app.patch("/testimonies/:id/approve", async(req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;
        const updated = await Testimony.findByIdAndUpdate(id, { approved }, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update approval status" });
    }
});

// POST testimony (with optional image upload)
app.post("/submit-testimony", upload.single("image"), async(req, res) => {
    const { name, message } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    try {
        const testimony = new Testimony({
            name,
            message,
            imageUrl,
            approved: false,
            createdAt: new Date(),
        });

        await testimony.save();
        res.status(200).json({ message: "Testimony submitted successfully!" });
    } catch (err) {
        console.error("MongoDB Save Error:", err);
        res.status(500).json({ error: "Failed to save testimony." });
    }
});

// MongoDB connection
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB error:", err));

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});