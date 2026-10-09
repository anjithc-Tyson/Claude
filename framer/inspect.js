// Prints the home page layer tree and existing code files.
import { withConnection } from "framer-api"

const projectUrl = process.env.FRAMER_PROJECT_URL ?? "https://framer.com/projects/Neilsen--CXEFpdVg4pst0HfSTxww-7MXuA"

async function walk(framer, node, depth) {
    if (depth > 3) return
    const children = await framer.getChildren(node.id)
    for (const child of children) {
        console.log(`${"  ".repeat(depth)}${child.__class ?? child.constructor?.name} ${child.id} "${child.name ?? ""}" w=${JSON.stringify(child.width)} h=${JSON.stringify(child.height)} layout=${child.layout ?? ""} bg=${child.backgroundColor ?? ""}`)
        await walk(framer, child, depth + 1)
    }
}

await withConnection(
    projectUrl,
    async framer => {
        const [home] = (await framer.getNodesWithType("WebPageNode")).filter(p => p.path === "/")
        console.log("Home page", home.id)
        await walk(framer, home, 1)
        const files = await framer.getCodeFiles()
        console.log("Code files:", files.map(f => f.path))
    },
    process.env.FRAMER_API_KEY
)
