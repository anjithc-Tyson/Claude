import * as React from "react"
import { createRoot } from "react-dom/client"
import TeamHub from "../../framer/TeamHub"
import { API_URL } from "./config"

const props = { ...(TeamHub as any).defaultProps, apiUrl: API_URL }
createRoot(document.getElementById("root")!).render(<React.StrictMode><TeamHub {...props} /></React.StrictMode>)
