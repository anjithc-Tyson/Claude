import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// Builds the hub as one script for the WordPress plugin: ../wordpress/takshila-team-hub/assets/team-hub.js
export default defineConfig({
    plugins: [react()],
    publicDir: false,
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    resolve: { alias: { framer: here("./src/framer-shim.ts"), react: here("./node_modules/react"), "react-dom": here("./node_modules/react-dom") } },
    build: {
        outDir: here("../wordpress/takshila-team-hub/assets"), emptyOutDir: false, sourcemap: false, target: "es2019",
        lib: { entry: here("./src/wp.tsx"), name: "TakshilaTeamHub", formats: ["iife"], fileName: () => "team-hub.js" },
    },
})
