// Uploads a prototype code component to Framer and places it on a page.
// Safe to re-run: updates the code file and replaces the previous instance.
//   node deploy.js          → v1 on the home page
//   node deploy.js v2       → v2 (360 × 640, themed) on /v2
//   node deploy.js mobile   → v2 screen only, filling the phone, on /mobile
import { readFile, writeFile } from "node:fs/promises"
import { withConnection } from "framer-api"

const projectUrl = process.env.FRAMER_PROJECT_URL ?? "https://framer.com/projects/Neilsen--CXEFpdVg4pst0HfSTxww-7MXuA"
const TARGETS = {
    v1: { file: "ConductorPrototype.tsx", page: "/", name: "Conductor prototype", width: 1120, height: 920, background: "#0B0B0B" },
    v2: { file: "ConductorTicketing360.tsx", page: "/v2", name: "Conductor ticketing v2", width: 960, height: 760, background: "#E9E9E9" },
    mobile: { file: "ConductorTicketing360.tsx", exportName: "ConductorTicketingMobile", page: "/mobile", name: "Conductor ticketing mobile", fill: true, background: "#FFFFFF" },
}
const target = TARGETS[process.argv[2]] ?? TARGETS.v1

if (!process.env.FRAMER_API_KEY) {
    console.error("Missing FRAMER_API_KEY.")
    process.exit(1)
}

const code = await readFile(new URL(`./code/${target.file}`, import.meta.url), "utf8")

await withConnection(
    projectUrl,
    async framer => {
        const problems = (await framer.typecheckCode(target.file, code)).filter(d => d.category === 1) // ts.DiagnosticCategory.Error
        if (problems.length) {
            console.error("Typecheck errors:", JSON.stringify(problems, null, 2))
            process.exit(1)
        }

        const existing = (await framer.getCodeFiles()).find(f => f.name === target.file || f.path.endsWith(target.file))
        const file = existing ? await existing.setFileContent(code) : await framer.createCodeFile(target.file, code)
        const component = file.exports.find(e => e.type === "component" && (target.exportName ? e.name === target.exportName : e.isDefaultExport))
        if (!component) throw new Error(`No component export in ${target.file}: ${JSON.stringify(file.exports)}`)
        console.log(existing ? "Updated" : "Created", file.path, "(typecheck clean)")

        let [page] = (await framer.getNodesWithType("WebPageNode")).filter(p => p.path === target.page)
        if (!page) {
            page = await framer.createWebPage(target.page)
            console.log("Created page", target.page)
        }
        const [frame] = await framer.getChildren(page.id)
        await framer.setAttributes(frame.id, { backgroundColor: target.background, height: target.fill ? "100vh" : `${target.height + 80}px` })

        const old = (await framer.getChildren(frame.id)).filter(n => n.name === target.name)
        if (old.length) await framer.removeNodes(old.map(n => n.id))

        const width = parseInt(String(frame.width)) || 1200
        const instance = await framer.addComponentInstance({ url: component.insertURL, parentId: frame.id })
        await framer.setAttributes(
            instance.id,
            target.fill
                ? { name: target.name, position: "absolute", top: "0px", left: "0px", width: "100%", height: "100vh" }
                : {
                      name: target.name,
                      position: "absolute",
                      top: "40px",
                      left: `${Math.max(0, Math.round((width - target.width) / 2))}px`,
                      width: `${target.width}px`,
                      height: `${target.height}px`,
                  }
        )
        console.log("Placed instance", instance.id, "on", target.page, frame.name)

        if (process.argv.includes("--screenshot")) {
            const shot = await framer.screenshot(frame.id, { format: "png" })
            await writeFile(process.argv[process.argv.indexOf("--screenshot") + 1], shot.data)
            console.log("Screenshot saved")
        }
    },
    process.env.FRAMER_API_KEY
)
