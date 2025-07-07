// server.js
// for the multer app
const multer = require("multer");
const path = require("path");

const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const testimoniesRoute = require("./routes/testimonies");
const Testimony = require("./models/Testimony");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Debug: log if env is not working
console.log("🧪 MONGODB_URI from env:", process.env.MONGODB_URI);

app.use(cors());
app.use(express.json());
app.use("/testimonies", testimoniesRoute);
// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads/");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/\s+/g, "_");
        cb(null, `${name}-${Date.now()}${ext}`);
    },
});

const upload = multer({ storage });

// MongoDB Connection
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB error:", err));

// Example route
app.get("/", (req, res) => {
    res.send("The Way of Messiah API is running");
});
// post code
app.post("/submit-testimony", upload.single("image"), async(req, res) => {
    const { name, email, message } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : "";

    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    try {
        const testimony = new Testimony({
            name,
            email,
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

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});