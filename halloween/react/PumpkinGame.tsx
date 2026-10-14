"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { Pumpkin } from "./SpookyLayer"
import { openStudio } from "./studioHandoff"

/**
 * Trick or Treat: three pumpkins, one hides a treat. Plain React 18/19, no dependencies.
 * Replaces the Framer "Pumpkin Game" component and its RandomTreat override:
 * the treat moves to a random pumpkin on every page load (and on Play again).
 *
 *   <PumpkinGame />
 *   <PumpkinGame theme="dark" treatCode="SPELL13" treatText="13% off any custom design" />
 */

type Theme = "light" | "dark"
const THEMES: Record<Theme, { text: string; muted: string; accent: string; chip: string; chipText: string }> = {
    light: { text: "#2B1016", muted: "#7A5D63", accent: "#8C6322", chip: "#2B1016", chipText: "#F5EFE7" },
    dark: { text: "#F3E6D6", muted: "rgba(243, 230, 214, 0.65)", accent: "#FF9A3C", chip: "rgba(255, 154, 60, 0.16)", chipText: "#FFB870" },
}
const MISSES = [
    { title: "Trick!", line: "You let the bats out. Pick another one." },
    { title: "Boo!", line: "Only a ghost in this one. Pick another one." },
]

const CSS = `
.tpg-pumpkin{appearance:none;border:0;background:none;padding:6px;cursor:pointer;border-radius:12px;transition:transform .35s cubic-bezier(.22,1,.36,1),opacity .35s ease}
.tpg-pumpkin:hover:not(:disabled){transform:translateY(-4px)}
.tpg-pumpkin:focus-visible{outline:2px solid #C09435;outline-offset:2px}
.tpg-pumpkin:disabled{cursor:default}
.tpg-pumpkin[data-state="miss"]{opacity:.38}
.tpg-pumpkin[data-state="treat"]{animation:tpg-pop .6s cubic-bezier(.22,1,.36,1)}
.tpg-shake{animation:tpg-shake .45s ease-in-out}
.tpg-msg{animation:tpg-in .45s cubic-bezier(.22,1,.36,1)}
.tpg-link{appearance:none;border:0;background:none;padding:0;cursor:pointer;font:inherit}
.tpg-link:focus-visible{outline:2px solid #C09435;outline-offset:3px;border-radius:2px}
@keyframes tpg-shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-7deg)}75%{transform:rotate(7deg)}}
@keyframes tpg-pop{0%{transform:scale(1)}40%{transform:translateY(-10px)}100%{transform:translateY(0)}}
@keyframes tpg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.tpg-pumpkin,.tpg-shake,.tpg-msg,.tpg-pumpkin[data-state="treat"]{animation:none!important;transition:none!important}}
`

export default function PumpkinGame({
    theme = "light",
    treatCode = "SPELL13",
    treatText = "13% off any custom design",
    studioPath = "/design-studio",
    intro = "Three pumpkins. One hides a treat. Tap one, if you dare.",
    style,
}: {
    theme?: Theme
    treatCode?: string
    treatText?: string
    studioPath?: string
    intro?: string
    style?: CSSProperties
}) {
    const c = THEMES[theme]
    // picked after mount, so the server and the browser render the same first frame
    const [treatAt, setTreatAt] = useState<number | null>(null)
    const [opened, setOpened] = useState<number[]>([])
    const [shaking, setShaking] = useState<number | null>(null)
    useEffect(() => { setTreatAt(Math.floor(Math.random() * 3)) }, [])

    const won = treatAt !== null && opened.includes(treatAt)
    const last = opened[opened.length - 1]
    const missIdx = opened.filter((i) => i !== treatAt).length - 1

    const open = (i: number) => {
        if (won || opened.includes(i) || treatAt === null) return
        setShaking(i)
        window.setTimeout(() => { setShaking(null); setOpened((o) => [...o, i]) }, 450)
    }
    const again = () => { setOpened([]); setTreatAt(Math.floor(Math.random() * 3)) }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, color: c.text, fontFamily: '"Afacad Flux", "Afacad", system-ui, sans-serif', ...style }}>
            <style>{CSS}</style>
            <div role="group" aria-label="Three pumpkins" style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                {[0, 1, 2].map((i) => {
                    const state = opened.includes(i) ? (i === treatAt ? "treat" : "miss") : "closed"
                    return (
                        <button key={i} type="button" className={"tpg-pumpkin" + (shaking === i ? " tpg-shake" : "")} data-state={state}
                            disabled={won || state !== "closed"} onClick={() => open(i)}
                            aria-label={state === "closed" ? `Pumpkin ${i + 1}` : `Pumpkin ${i + 1}: ${state === "treat" ? "the treat" : "empty"}`}>
                            <Pumpkin size={i === 1 ? 72 : 60} face={state !== "miss"} />
                        </button>
                    )
                })}
            </div>

            <div aria-live="polite" style={{ minHeight: 56 }}>
                {opened.length === 0 && <p style={{ margin: 0, fontSize: 15, color: c.muted }}>{intro}</p>}
                {opened.length > 0 && !won && (
                    <p key={last} className="tpg-msg" style={{ margin: 0, fontSize: 15, color: c.muted }}>
                        <b style={{ color: c.text, fontWeight: 600 }}>{MISSES[Math.max(0, missIdx) % 2].title}</b> {MISSES[Math.max(0, missIdx) % 2].line}
                    </p>
                )}
                {won && (
                    <div className="tpg-msg" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px" }}>
                            <span style={{ fontSize: 24, fontWeight: 500, color: c.accent }}>Treat!</span>
                            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1.6, padding: "4px 10px", borderRadius: 5, background: c.chip, color: c.chipText }}>{treatCode}</span>
                            <span style={{ fontSize: 15, color: c.muted }}>{treatText}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                            <button type="button" className="tpg-link" onClick={() => openStudio(`Something spooky for Halloween, with my treat: ${treatCode} ${treatText}`, studioPath)}
                                style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: c.accent }}>Claim it →</button>
                            <button type="button" className="tpg-link" onClick={again} style={{ fontSize: 13, color: c.muted, textDecoration: "underline" }}>Play again</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
