"use client"

import { useEffect, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"

/**
 * Halloween easter egg: a few spiders and pumpkins around the page edges.
 * Renders into the page body so it never blocks clicks. Plain React 18/19, no dependencies.
 *
 *   <SpookyLayer active />                        // on for the whole page
 *   <SpookyLayer active={inHalloweenSection} />   // or switch it with your own state
 */

const CSS = `
.spk{position:fixed;inset:0;pointer-events:none;z-index:40;overflow:hidden;transition:opacity .8s ease}
.spk *{pointer-events:none}
@keyframes spk-drop{0%{transform:translateY(-140px)}100%{transform:translateY(0)}}
@keyframes spk-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(26px)}}
@keyframes spk-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
@keyframes spk-legs{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.86)}}
@keyframes spk-crawl{0%{transform:translateX(-60px)}100%{transform:translateX(calc(100vw + 60px))}}
@keyframes spk-crawlv{0%{transform:translateY(110vh) rotate(-90deg)}100%{transform:translateY(-80px) rotate(-90deg)}}
@keyframes spk-glow{0%,100%{opacity:.75}45%{opacity:1}55%{opacity:.6}}
@keyframes spk-peek{from{transform:translateY(70px)}to{transform:translateY(0)}}
@media (prefers-reduced-motion: reduce){.spk *{animation:none!important}}
`

const ink = "#1B0C11"

function Spider({ size = 26, walking = false }: { size?: number; walking?: boolean }) {
    const legs = [-1, 1].flatMap((s) =>
        [0, 1, 2, 3].map((i) => {
            const y = 10 + i * 3.2
            const x2 = 16 + s * (9 + (i === 1 || i === 2 ? 2 : 0))
            const x3 = 16 + s * (13 + (i === 1 || i === 2 ? 1 : 0))
            const y3 = y + (i < 2 ? -5 + i * 2 : 3 + (i - 2) * 2)
            return <polyline key={`${s}${i}`} points={`16,${y + 3} ${x2},${y - 2} ${x3},${y3}`} fill="none" stroke={ink} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        })
    )
    return (
        <svg viewBox="0 0 32 32" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
            <g style={{ transformOrigin: "16px 16px", animation: `spk-legs ${walking ? ".35s" : "1.6s"} ease-in-out infinite` }}>{legs}</g>
            <ellipse cx="16" cy="19" rx="5.2" ry="6" fill={ink} />
            <circle cx="16" cy="11.5" r="3.4" fill={ink} />
            <circle cx="14.8" cy="11" r=".7" fill="#C09435" />
            <circle cx="17.2" cy="11" r=".7" fill="#C09435" />
        </svg>
    )
}

function Hanging({ left, delay, len, size, dur }: { left: string; delay: number; len: number; size: number; dur: number }) {
    return (
        <div style={{ position: "absolute", top: 0, left, animation: `spk-drop 2.4s cubic-bezier(.22,1,.36,1) ${delay}s both` }}>
            <div style={{ transformOrigin: "top center", animation: `spk-sway ${dur * 1.3}s ease-in-out ${delay}s infinite` }}>
                <div style={{ animation: `spk-bob ${dur}s ease-in-out ${delay}s infinite` }}>
                    <div style={{ width: 1, height: len, background: "linear-gradient(rgba(43,16,22,.05), rgba(43,16,22,.35))", margin: "0 auto" }} />
                    <div style={{ marginTop: -4, marginLeft: -size / 2 + 0.5 }}><Spider size={size} /></div>
                </div>
            </div>
        </div>
    )
}

export function Pumpkin({ size = 64, face = true }: { size?: number; face?: boolean }) {
    return (
        <svg viewBox="0 0 64 56" width={size} height={size * 0.875} style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 6px 10px rgba(43,16,22,.18))" }}>
            <path d="M31 9c0-4 2-7 6-8" stroke="#4A5A2A" strokeWidth="3" strokeLinecap="round" fill="none" />
            <ellipse cx="18" cy="32" rx="15" ry="20" fill="#C9661F" />
            <ellipse cx="46" cy="32" rx="15" ry="20" fill="#C9661F" />
            <ellipse cx="32" cy="32" rx="16" ry="22" fill="#E07B27" />
            <path d="M32 11v42M22 13c-4 10-4 28 0 38M42 13c4 10 4 28 0 38" stroke="#B85A18" strokeWidth="1.2" fill="none" opacity=".55" />
            {face && (
                <g fill="#FFD27A" style={{ animation: "spk-glow 3.2s ease-in-out infinite" }}>
                    <path d="M20 27l5-5 5 5z" />
                    <path d="M34 27l5-5 5 5z" />
                    <path d="M19 37q13 9 26 0l-3 6-4-3-3 4-3-4-4 3-3-4-3 2z" />
                </g>
            )}
        </svg>
    )
}

function Web({ flip = false }: { flip?: boolean }) {
    return (
        <svg viewBox="0 0 120 120" width={120} height={120} style={{ display: "block", transform: flip ? "scaleX(-1)" : undefined, opacity: 0.28 }}>
            <g stroke="#2B1016" strokeWidth=".8" fill="none">
                {[0, 22, 45, 67, 90].map((a) => {
                    const r = (a * Math.PI) / 180
                    return <line key={a} x1="0" y1="0" x2={120 * Math.cos(r)} y2={120 * Math.sin(r)} />
                })}
                {[28, 52, 78, 104].map((d) => (
                    <path key={d} d={`M${d},0 Q${d * 0.78},${d * 0.32} ${d * 0.92},${d * 0.38} Q${d * 0.6},${d * 0.6} ${d * 0.71},${d * 0.71} Q${d * 0.38},${d * 0.82} ${d * 0.38},${d * 0.92} Q${d * 0.25},${d * 0.85} 0,${d}`} />
                ))}
            </g>
        </svg>
    )
}

export default function SpookyLayer({ active = true, style }: { active?: boolean; style?: CSSProperties }) {
    const [mounted, setMounted] = useState(false)
    const [show, setShow] = useState(false)
    const [narrow, setNarrow] = useState(false)
    useEffect(() => {
        setMounted(true)
        const mq = () => setNarrow(window.innerWidth < 760)
        mq()
        window.addEventListener("resize", mq)
        return () => window.removeEventListener("resize", mq)
    }, [])
    useEffect(() => {
        if (active) { setShow(true); return }
        const t = setTimeout(() => setShow(false), 800)
        return () => clearTimeout(t)
    }, [active])

    const layer =
        show && mounted && typeof document !== "undefined"
            ? createPortal(
                  <div className="spk" aria-hidden style={{ opacity: active ? 1 : 0 }}>
                      <style>{CSS}</style>
                      <div style={{ position: "absolute", top: 0, left: 0 }}><Web /></div>
                      <div style={{ position: "absolute", top: 0, right: 0 }}><Web flip /></div>
                      <Hanging left={narrow ? "6%" : "4%"} delay={0.2} len={narrow ? 120 : 190} size={narrow ? 20 : 24} dur={5.5} />
                      <Hanging left={narrow ? "92%" : "95%"} delay={0.9} len={narrow ? 210 : 300} size={narrow ? 18 : 22} dur={6.8} />
                      {!narrow && <Hanging left="72%" delay={1.6} len={110} size={16} dur={4.6} />}
                      <div style={{ position: "absolute", bottom: 6, left: 0, animation: "spk-crawl 26s linear 3s infinite" }}>
                          <div style={{ transform: "rotate(90deg)" }}><Spider size={narrow ? 16 : 20} walking /></div>
                      </div>
                      {!narrow && (
                          <div style={{ position: "absolute", top: 0, right: 10, animation: "spk-crawlv 34s linear 12s infinite" }}>
                              <Spider size={18} walking />
                          </div>
                      )}
                      <div style={{ position: "absolute", left: narrow ? -14 : -8, bottom: -26, animation: "spk-peek 1.2s cubic-bezier(.22,1,.36,1) .4s both" }}>
                          <Pumpkin size={narrow ? 50 : 60} />
                      </div>
                      <div style={{ position: "absolute", left: narrow ? 26 : 44, bottom: -20, animation: "spk-peek 1.2s cubic-bezier(.22,1,.36,1) .7s both" }}>
                          <Pumpkin size={narrow ? 30 : 36} face={false} />
                      </div>
                      <div style={{ position: "absolute", right: narrow ? -10 : -6, bottom: -24, animation: "spk-peek 1.2s cubic-bezier(.22,1,.36,1) 1s both" }}>
                          <Pumpkin size={narrow ? 44 : 54} />
                      </div>
                  </div>,
                  document.body
              )
            : null

    return <div style={{ ...style, width: 1, height: 1, pointerEvents: "none" }}>{layer}</div>
}
