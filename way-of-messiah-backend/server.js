// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const testimoniesRoute = require("./routes/testimonies");
const adminRouter = require("./routes/admin");
const Testimony = require("./models/Testimony");

const app = express();
const PORT = process.env.PORT || 10000;
const adminAuthRoutes = require("./routes/adminAuth");
const adminRoutes = require("./routes/adminRoutes");
const testimonyRoutes = require("./routes/testimonyRoutes");
const calendarRoutes = require('./routes/calendarRoutes');
const explanationsRoute = require('./routes/explanations');
const equinoxRoute = require('./routes/equinox');
const calendarDownload = require('./routes/calendarDownload');
const donationsRoute = require('./routes/donations');


// Middleware
app.use(cors());
app.use('/api/donations', donationsRoute);
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/api/testimonies", testimoniesRoute);
app.use("/", testimonyRoutes); // allows /testimonies
app.use("/api/admin", adminRouter);
app.use("/api/auth", adminAuthRoutes);
app.use("/admin", adminRoutes);
app.use("/api", require("./routes/testimonies"));
app.use("/api", require("./routes/events"));
app.use('/calendar', calendarRoutes);
app.use('/api/explanations', explanationsRoute);
app.use('/api/equinox', equinoxRoute);
app.use('/calendar', calendarDownload);

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // ensure this folder exists
    },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + file.originalname;
    cb(null, uniqueSuffix);
  }
});

const upload = multer({ storage });

// Routes
app.get("/", (req, res) => {
    res.send("The Way of Messiah API is running");
});

// GET approved testimonies
app.get("/api/testimonies", async(req, res) => {
    try {
        const testimonies = await Testimony.find({ approved: true }).sort({ createdAt: -1 });
        res.json(testimonies);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch testimonies" });
    }
});

// PATCH to approve/unapprove a testimony
app.patch("/api/testimonies/:id/approve", async(req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;
        const updated = await Testimony.findByIdAndUpdate(id, { approved }, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Failed to update approval status" });
    }
});

// POST testimony (with optional image upload or URL)
app.post("/api/submit-testimony", upload.single("image"), async(req, res) => {
    console.log("📥 BODY:", req.body);
    console.log("🖼️ FILE:", req.file);
    const { name, message, imageUrl: submittedUrl } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    let finalImageUrl = "";

    if (req.file) {
        finalImageUrl = `/uploads/${req.file.filename}`;
    } else if (submittedUrl) {
        finalImageUrl = submittedUrl;
    }

    try {
        const testimony = new Testimony({
            name,
            message,
            imageUrl: finalImageUrl,
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