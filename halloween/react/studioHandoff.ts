// Sends a brief into the Design Studio, the same way the Home prompt bar does:
// sessionStorage["tks-studio-handoff"] = { prompt, images, t }. Falls back to ?prompt= when storage is blocked.
export const HANDOFF_KEY = "tks-studio-handoff"

export function openStudio(prompt: string, studioPath = "/design-studio", images: string[] = []) {
    if (typeof window === "undefined") return
    const p = prompt.replace(/[“”"]/g, "").replace(/\s+/g, " ").trim().slice(0, 600)
    try {
        window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify({ prompt: p, images: images.slice(0, 3), t: Date.now() }))
        window.location.href = studioPath
    } catch {
        window.location.href = studioPath + (p ? (studioPath.includes("?") ? "&" : "?") + "prompt=" + encodeURIComponent(p) : "")
    }
}
