// Connects to the Neilsen Framer project and prints a short summary.
// Requires FRAMER_API_KEY (Site Settings → General → API keys in Framer).
import { withConnection } from "framer-api"

const projectUrl =
    process.env.FRAMER_PROJECT_URL ?? "https://framer.com/projects/Neilsen--CXEFpdVg4pst0HfSTxww-7MXuA"
const apiKey = process.env.FRAMER_API_KEY

if (!apiKey) {
    console.error("Missing FRAMER_API_KEY. Add it to your environment (or a .env file) and retry.")
    process.exit(1)
}

await withConnection(
    projectUrl,
    async framer => {
        const info = await framer.getProjectInfo()
        const pages = await framer.getNodesWithType("WebPageNode")
        const collections = await framer.getCollections()

        console.log("Project:", info.name ?? info.id)
        console.log(`Pages (${pages.length}):`)
        for (const page of pages) console.log("  ", page.path)
        console.log(`CMS collections (${collections.length}):`)
        for (const collection of collections) console.log("  ", collection.name)
    },
    apiKey
)
