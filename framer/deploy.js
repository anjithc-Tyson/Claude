// Uploads code/ConductorPrototype.tsx to Framer and places it on the home page.
// Safe to re-run: updates the code file and replaces the previous instance.
import { readFile, writeFile } from "node:fs/promises"
import { withConnection } from "framer-api"

const projectUrl = process.env.FRAMER_PROJECT_URL ?? "https://framer.com/projects/Neilsen--CXEFpdVg4pst0HfSTxww-7MXuA"
const FILE = "ConductorPrototype.tsx"
const INSTANCE_NAME = "Conductor prototype"

if (!process.env.FRAMER_API_KEY) {
    console.error("Missing FRAMER_API_KEY.")
    process.exit(1)
}

const code = await readFile(new URL(`./code/${FILE}`, import.meta.url), "utf8")

await withConnection(
    projectUrl,
    async framer => {
        const problems = (await framer.typecheckCode(FILE, code)).filter(d => d.category === 1) // ts.DiagnosticCategory.Error
        if (problems.length) {
            console.error("Typecheck errors:", JSON.stringify(problems, null, 2))
            process.exit(1)
        }

        const existing = (await framer.getCodeFiles()).find(f => f.name === FILE || f.path.endsWith(FILE))
        const file = existing ? await existing.setFileContent(code) : await framer.createCodeFile(FILE, code)
        const component = file.exports.find(e => e.type === "component")
        if (!component) throw new Error(`No component export in ${FILE}: ${JSON.stringify(file.exports)}`)
        console.log(existing ? "Updated" : "Created", file.path, "(typecheck clean)")

        const [home] = (await framer.getNodesWithType("WebPageNode")).filter(p => p.path === "/")
        const [desktop] = await framer.getChildren(home.id)
        await framer.setAttributes(desktop.id, { backgroundColor: "#0B0B0B", height: "1000px" })

        const old = (await framer.getChildren(desktop.id)).filter(n => n.name === INSTANCE_NAME)
        if (old.length) await framer.removeNodes(old.map(n => n.id))

        const instance = await framer.addComponentInstance({ url: component.insertURL, parentId: desktop.id })
        await framer.setAttributes(instance.id, {
            name: INSTANCE_NAME,
            position: "absolute",
            top: "40px",
            left: "40px",
            width: "1120px",
            height: "920px",
        })
        console.log("Placed instance", instance.id, "on", desktop.name)

        if (process.argv.includes("--screenshot")) {
            const shot = await framer.screenshot(desktop.id, { format: "png" })
            await writeFile(process.argv[process.argv.indexOf("--screenshot") + 1], shot.data)
            console.log("Screenshot saved")
        }
    },
    process.env.FRAMER_API_KEY
)
