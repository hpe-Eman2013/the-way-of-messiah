require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Testimony = require("./models/Testimony");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
    .connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("MongoDB error:", err));

// Auth middleware
function authenticate(req, res, next) {
    const token = req.headers.authorization;
    if (token !== `Bearer ${process.env.ADMIN_TOKEN}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}
// temp to check
console.log('🧪 MONGODB_URI from env:', process.env.MONGODB_URI); // <-- Check this in Render logs

// Get all testimonies (for admin)
app.post("/testimonies", authenticate, async(req, res) => {
    const testimonies = await Testimony.find().sort({ createdAt: -1 });
    res.json(testimonies);
});

// Approve testimony
app.post("/testimonies/:id/approve", authenticate, async(req, res) => {
    const { id } = req.params;
    await Testimony.findByIdAndUpdate(id, { approved: true });
    res.json({ success: true });
});

// Delete testimony
app.delete("/testimonies/:id", authenticate, async(req, res) => {
    const { id } = req.params;
    await Testimony.findByIdAndDelete(id);
    res.json({ success: true });
});

// Add new testimony (public)
app.post("/submit-testimony", async(req, res) => {
    const { name, email, message, imageUrl } = req.body;
    const newTestimony = new Testimony({ name, email, message, imageUrl });
    await newTestimony.save();
    res.status(201).json({ message: "Submitted for review" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));