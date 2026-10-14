import * as React from "react"
import type { ComponentType } from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

/**
 * Halloween → Design Studio.
 * Turns the "Design a Spell" prompt bar into a real text field, lets the spell idea chips fill it,
 * and sends the spell (or the pumpkin treat) into the Design Studio as the brief,
 * using the same hand-off as the Home prompt bar: sessionStorage["tks-studio-handoff"] = { prompt, images, t }.
 */

const HANDOFF = "tks-studio-handoff"
const STUDIO = "/design-studio"

// one shared spell across every breakpoint variant of the section
let spell = ""
let example = ""
const subs = new Set<(v: string) => void>()
const setSpell = (v: string) => { spell = v; subs.forEach((f) => f(v)) }
function useSpell(): [string, (v: string) => void] {
    const [v, setV] = useState(spell)
    useEffect(() => { subs.add(setV); return () => { subs.delete(setV) } }, [])
    return [v, setSpell]
}
const visibleField = () => (typeof document === "undefined" ? null : (Array.from(document.querySelectorAll<HTMLInputElement>(".tks-spell")).find((el) => el.offsetParent !== null) || null))

function openStudio(prompt: string) {
    const p = prompt.replace(/[“”"]/g, "").replace(/\s+/g, " ").trim().slice(0, 600)
    if (typeof window === "undefined") return
    try { window.sessionStorage.setItem(HANDOFF, JSON.stringify({ prompt: p, images: [], t: Date.now() })); window.location.href = STUDIO }
    catch { window.location.href = STUDIO + (p ? "?prompt=" + encodeURIComponent(p) : "") }
}

const CSS = `.tks-spell{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:0;background:transparent;outline:none;font:inherit;color:inherit;letter-spacing:inherit}
.tks-spell::placeholder{color:currentColor;opacity:.62}
.tks-spell:focus::placeholder{opacity:.38}
.tks-spell-wrap:focus-within{box-shadow:0 1px 0 0 currentColor}`

/** On the prompt text: becomes a real input that keeps the text's font and colour */
export function withSpellInput(Component: ComponentType<any>): ComponentType {
    return (props: any) => {
        const ref = useRef<HTMLDivElement>(null)
        const [look, setLook] = useState<React.CSSProperties>({})
        const [ph, setPh] = useState("")
        const [v, set] = useSpell()
        useLayoutEffect(() => {
            const t = ref.current?.querySelector("p, span, h1, h2, h3") as HTMLElement | null
            if (!t || typeof window === "undefined") return
            const cs = window.getComputedStyle(t)
            setLook({ color: cs.color, fontFamily: cs.fontFamily, fontStyle: cs.fontStyle, fontWeight: cs.fontWeight as any, fontSize: cs.fontSize, lineHeight: cs.lineHeight })
            const text = (t.closest("[data-framer-component-type]") as HTMLElement || t).textContent || ""
            setPh(text.trim()); if (!example) example = text.trim()
        }, [])
        return (
            <div ref={ref} className="tks-spell-wrap" style={{ ...props.style, position: "relative" }}>
                <style>{CSS}</style>
                <div aria-hidden style={{ visibility: "hidden" }}><Component {...props} style={{ width: "100%" }} /></div>
                <input className="tks-spell" type="text" value={v} placeholder={ph} maxLength={600} aria-label="Describe your spell" enterKeyHint="go"
                    onChange={(e) => set(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") openStudio(v || ph) }} style={look} />
            </div>
        )
    }
}

/** On each spell idea chip: fills the prompt bar with that idea */
export function withSpellIdea(Component: ComponentType<any>): ComponentType {
    return (props: any) => {
        const fill = (el: HTMLElement) => { setSpell((el.textContent || "").trim()); const f = visibleField(); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length) } }
        return <Component {...props} role="button" tabIndex={0} style={{ ...props.style, cursor: "pointer" }}
            onClick={(e: React.MouseEvent<HTMLElement>) => fill(e.currentTarget)}
            onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fill(e.currentTarget) } }} />
    }
}

/** On "Design it": opens the studio with the spell as the brief (or the example if nothing was typed) */
export function withSpellGo(Component: ComponentType<any>): ComponentType {
    return (props: any) => (
        <div style={{ display: "contents" }} onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); openStudio(spell || example) }}>
            <Component {...props} />
        </div>
    )
}

/** On the pumpkin game's "Claim it": opens the studio with the treat carried in */
export function withClaimTreat(Component: ComponentType<any>): ComponentType {
    return (props: any) => (
        <div style={{ display: "contents" }} onClickCapture={(e) => {
            e.preventDefault(); e.stopPropagation()
            const msg = (e.target as HTMLElement).closest('[data-framer-name="Message"]')
            const treat = ((msg?.querySelector('[data-framer-name="Treat"]') as HTMLElement | null)?.innerText || "").replace(/\s+/g, " ").replace(/^Treat!\s*/i, "").trim()
            openStudio(`Something spooky for Halloween${treat ? `, with my treat: ${treat}` : ""}`)
        }}>
            <Component {...props} />
        </div>
    )
}
