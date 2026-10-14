"use client"

import { useRef, useState, type CSSProperties } from "react"
import { openStudio } from "./studioHandoff"

/**
 * Design a Spell: a prompt bar whose spell opens in the Design Studio as the brief.
 * Plain React 18/19, no dependencies. Replaces the Framer "Design a Spell" bar and its SpellToStudio overrides.
 *
 *   <SpellPrompt />
 *   <SpellPrompt theme="dark" ideas={["Spider-web pendant", "Bat-wing ear cuff"]} />
 */

type Theme = "light" | "dark"
const THEMES: Record<Theme, { text: string; muted: string; border: string; field: string; chip: string; chipBorder: string; button: string; buttonText: string; buttonHover: string }> = {
    light: { text: "#2B1016", muted: "#7A5D63", border: "#2B1016", field: "#FFFFFF", chip: "#FFFFFF", chipBorder: "#EADFD3", button: "#C09435", buttonText: "#FFFFFF", buttonHover: "#A87A2C" },
    dark: { text: "#F3E6D6", muted: "rgba(243, 230, 214, 0.65)", border: "rgba(243, 230, 214, 0.35)", field: "rgba(255, 255, 255, 0.05)", chip: "rgba(255, 255, 255, 0.05)", chipBorder: "rgba(255, 154, 60, 0.28)", button: "#C09435", buttonText: "#FFFFFF", buttonHover: "#A87A2C" },
}
const DEFAULT_IDEAS = ["Spider-web pendant", "Crescent moonstone ring", "Ghost charm in white gold"]

export default function SpellPrompt({
    theme = "light",
    placeholder = "a bat-wing ear cuff in rose gold, with one tiny ruby",
    ideas = DEFAULT_IDEAS,
    studioPath = "/design-studio",
    buttonLabel = "Design it",
    style,
}: {
    theme?: Theme
    placeholder?: string
    ideas?: string[]
    studioPath?: string
    buttonLabel?: string
    style?: CSSProperties
}) {
    const c = THEMES[theme]
    const [spell, setSpell] = useState("")
    const field = useRef<HTMLInputElement>(null)
    // nothing typed → the example spell, so the button never leads nowhere
    const go = () => openStudio(spell.trim() || placeholder, studioPath)
    // styles are scoped per theme, so a light and a dark bar can share a page
    const t = `.tsp-${theme}`
    const css = `
${t} .tsp-bar:focus-within{border-color:${c.text}}
${t} .tsp-input::placeholder{color:${c.muted};opacity:1}
${t} .tsp-go{transition:background .2s ease-out}
${t} .tsp-go:hover{background:${c.buttonHover}!important}
${t} .tsp-go:focus-visible,${t} .tsp-chip:focus-visible{outline:2px solid #C09435;outline-offset:2px}
${t} .tsp-chip{transition:border-color .2s ease-out}
${t} .tsp-chip:hover{border-color:${c.text}!important}`

    return (
        <form className={`tsp-${theme}`} onSubmit={(e) => { e.preventDefault(); go() }} style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: '"Afacad Flux", "Afacad", system-ui, sans-serif', color: c.text, ...style }}>
            <style>{css}</style>
            <div className="tsp-bar" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 20px", border: `1px solid ${c.border}`, borderRadius: 999, background: c.field, transition: "border-color .2s ease-out" }}>
                <input ref={field} className="tsp-input" type="text" value={spell} onChange={(e) => setSpell(e.target.value)} maxLength={600} enterKeyHint="go"
                    placeholder={`“${placeholder}”`} aria-label="Describe your spell"
                    style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", color: c.text, fontFamily: '"Cormorant Garamond", "Cormorant", Georgia, serif', fontStyle: "italic", fontWeight: 500, fontSize: 20, lineHeight: 1.2 }} />
                <button type="submit" className="tsp-go" style={{ flex: "none", height: 44, padding: "0 20px", border: 0, borderRadius: 5, background: c.button, color: c.buttonText, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, letterSpacing: 1.8, textTransform: "uppercase", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                    {buttonLabel} <span aria-hidden>→</span>
                </button>
            </div>
            {ideas.length > 0 && (
                <div role="group" aria-label="Spell ideas" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {ideas.map((idea) => (
                        <button key={idea} type="button" className="tsp-chip" onClick={() => { setSpell(idea); field.current?.focus() }}
                            style={{ height: 34, padding: "0 14px", borderRadius: 999, border: `1px solid ${c.chipBorder}`, background: c.chip, color: c.text, fontFamily: "inherit", fontSize: 14, cursor: "pointer" }}>
                            {idea}
                        </button>
                    ))}
                </div>
            )}
        </form>
    )
}
