const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const AdminUser = require("../models/AdminUser");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // store this in .env in production

// Temporary Registration Route (only for setting up first admin)
router.post("/register", async(req, res) => {
    try {
        console.log("BODY:", req.body);
        const { username, password } = req.body;
        // Validate inputs
        if (!username || !password) {
            return res
                .status(400)
                .json({ error: "Username and password are required" });
        }
        // Check if user exists
        const existingUser = await AdminUser.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Save user
        const newUser = new AdminUser({ username, passwordHash, isAdmin: true });
        await newUser.save();
        res.json({ message: "Admin created" });
    } catch (err) {
        console.error("❌ Registration error:", err);
        res.status(500).json({ error: "Registration failed" });
    }
});

// Login Route
router.post("/login", async(req, res) => {
    try {
        const { username, password } = req.body;
        const user = await AdminUser.findOne({ username });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, username: user.username },
            JWT_SECRET, { expiresIn: "1d" }
        );

        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});

module.exports = router;