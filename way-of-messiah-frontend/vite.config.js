import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "dist",
    },
    server: {
        fs: {
            allow: ['.'],
        },
    },
    // 👇 required for React Router on static hosts like Render
    resolve: {
        alias: {
            "@": "/src",
        },
    },
});