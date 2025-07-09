// routes/admin.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

// Login endpoint
router.post("/login", async(req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
        return res.status(200).json({ token });
    }

    return res.status(401).json({ error: "Invalid login credentials." });
});

// Middleware to verify token
function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(403).json({ error: "Token required" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Invalid token" });
        req.admin = decoded;
        next();
    });
}

// Example protected route
router.get("/protected", verifyToken, (req, res) => {
    res.status(200).json({ message: "Access granted to protected admin route." });
});

module.exports = { router, verifyToken };