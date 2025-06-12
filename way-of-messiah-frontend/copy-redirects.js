import { copyFileSync } from "fs";

try {
    copyFileSync("public/_redirects", "dist/_redirects");
    console.log("✅ _redirects copied to dist");
} catch (err) {
    console.error("❌ Failed to copy _redirects:", err);
}