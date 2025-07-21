const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const AdminUser = require("../models/AdminUser");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey"; // store this in .env in production
const { adminUsername, adminPassword, jwtSecret } = require("../config");

// Temporary Registration Route (only for setting up first admin)
router.post("/register", async(req, res) => {
    try {
        // Validate inputs
        if (!adminUsername || !adminPassword) {
            return res
                .status(400)
                .json({ error: "Username and password are required" });
        }
        // Check if user exists
        const existingUser = await AdminUser.findOne({ adminUsername });
        if (existingUser) {
            return res.status(400).json({ error: "Username already exists" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        // Save user
        const newUser = new AdminUser({ adminUsername, passwordHash, isAdmin: true });
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
         const user = await AdminUser.findOne({ adminUsername });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ userId: user._id, username: user.username },
            jwtSecret, { expiresIn: "1h" }
        );

        res.json({ token });
    } catch (err) {
        res.status(500).json({ error: "Login failed" });
    }
});
//test route
router.get("/test", (req, res) => {
  res.send("Auth router is working!");
});



module.exports = router;