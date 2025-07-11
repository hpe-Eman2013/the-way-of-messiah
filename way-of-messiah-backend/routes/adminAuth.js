const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // store this in .env in production

// Temporary Registration Route (only for setting up first admin)
router.post("/register", async(req, res) => {
    try {
        const { username, password } = req.body;
        const existing = await AdminUser.findOne({ username });
        if (existing)
            return res.status(400).json({ error: "Username already exists" });

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new AdminUser({ username, passwordHash });
        await newUser.save();

        res.status(201).json({ message: "Admin created" });
    } catch (err) {
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