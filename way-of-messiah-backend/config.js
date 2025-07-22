require("dotenv").config(); // ✅ Ensure env vars are loaded before accessing them

module.exports = {
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
  jwtSecret: process.env.JWT_SECRET
};
