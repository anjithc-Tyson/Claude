import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// The hub's source of truth is ../framer/TeamHub.tsx (the same file the Framer site used).
// "framer" is swapped for a tiny stand-in, so the component runs as a normal web page.
export default defineConfig({
    base: "./",                       // works from any folder or subdomain
    plugins: [react()],
    resolve: {
        alias: {
            framer: here("./src/framer-shim.ts"),
            react: here("./node_modules/react"),
            "react-dom": here("./node_modules/react-dom"),
        },
    },
    build: { outDir: "dist", assetsDir: "assets", sourcemap: false, target: "es2019" },
})
