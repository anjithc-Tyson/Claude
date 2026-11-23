import * as React from "react"
import { createRoot } from "react-dom/client"
import TeamHub from "../../framer/TeamHub"

// WordPress entry: the plugin prints <div class="takshila-team-hub" data-api="…" data-title="…"> and loads this file.
function mount() {
    document.querySelectorAll<HTMLElement>(".takshila-team-hub:not([data-mounted])").forEach((el) => {
        el.setAttribute("data-mounted", "1")
        const props = { ...(TeamHub as any).defaultProps, apiUrl: el.dataset.api || "", title: el.dataset.title || (TeamHub as any).defaultProps.title }
        createRoot(el).render(<TeamHub {...props} />)
    })
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount)
else mount()
