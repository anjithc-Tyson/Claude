import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"

// Tappable prototype of the conductor ticketing flow.
// Sample route, stops and fares only; real tariff tables should drive the tiles.

// @framerSupportedLayoutWidth any-prefer-fixed
// @framerSupportedLayoutHeight any-prefer-fixed
// @framerIntrinsicWidth 1120
// @framerIntrinsicHeight 920

const ROUTE = "500D"
const STOPS = [
    "Hebbal",
    "Veerannapalya",
    "Nagavara",
    "HBR Layout",
    "Kalyan Nagar",
    "Ramamurthy Ngr",
    "KR Puram",
    "Mahadevapura",
    "Marathahalli",
    "Kadubeesanahalli",
    "Bellandur",
    "Agara",
    "Silk Board",
]
const FARES = [0, 6, 12, 18, 23, 25, 28, 30, 32, 34, 35, 36, 38]
const VOID_REASONS = ["Wrong stop", "Wrong count", "Passenger left", "Printer jam"]
const STAGE_REASONS = ["GPS wrong", "GPS lost", "Route diversion"]
const NOTES = [50, 100, 200, 500]
const GRACE_SECONDS = 60
const FIRST_TICKET = 421

const C = {
    bg: "#000000",
    panel: "#121212",
    line: "#2A2A2A",
    text: "#FFFFFF",
    dim: "#9A9A9A",
    fare: "#FFD60A",
    go: "#00E676",
    upi: "#40C4FF",
    risk: "#FF453A",
    warn: "#FF9F0A",
    free: "#BF5AF2",
}
const FONT = "Inter, 'Noto Sans', system-ui, -apple-system, sans-serif"

type Ticket = {
    no: number
    from: number
    to: number
    paid: number
    free: number
    amount: number
    method: "Cash" | "UPI"
    voided?: boolean
}
type Sale = { origin: number; startedAt: number }
type Sheet = null | "stage" | "void" | "upi" | "more" | "note"

const pad = (n: number) => String(n).padStart(4, "0")
const clock = () => new Date().toLocaleTimeString("en-GB")

let audio: AudioContext | null = null
function feedback(kind: "tap" | "issue" | "warn" = "tap") {
    try {
        if (navigator.vibrate) navigator.vibrate(kind === "issue" ? [20, 40, 20] : kind === "warn" ? 60 : 12)
    } catch (e) {}
    try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
        if (!Ctx) return
        const ctx: AudioContext = audio || (audio = new Ctx())
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = kind === "issue" ? 1320 : kind === "warn" ? 330 : 880
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08)
        osc.connect(gain).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.09)
    } catch (e) {}
}

export default function ConductorPrototype() {
    const [leftHanded, setLeftHanded] = useState(false)
    const [busStage, setBusStage] = useState(0)
    const [stage, setStage] = useState(0)
    const [gpsOk, setGpsOk] = useState(true)
    const [sale, setSale] = useState<Sale | null>(null)
    const [dest, setDest] = useState<number | null>(null)
    const [paid, setPaid] = useState(1)
    const [free, setFree] = useState(0)
    const [note, setNote] = useState<number | null>(null)
    const [sheet, setSheet] = useState<Sheet>(null)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [printQueue, setPrintQueue] = useState<number[]>([])
    const [pendingUpi, setPendingUpi] = useState<Ticket[]>([])
    const [changeOwed, setChangeOwed] = useState<{ no: number; amount: number }[]>([])
    const [log, setLog] = useState<string[]>([])
    const [lastSaleSeconds, setLastSaleSeconds] = useState<number | null>(null)
    const [toast, setToast] = useState<string | null>(null)
    const [now, setNow] = useState(Date.now())
    const nextNo = useRef(FIRST_TICKET)

    const addLog = (line: string) => setLog(l => [`${clock()}  ${line}`, ...l].slice(0, 60))
    const flash = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(t => (t === msg ? null : t)), 2600)
    }

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 250)
        return () => clearInterval(id)
    }, [])

    // Printer: one ticket at a time; selling never waits for it.
    useEffect(() => {
        if (printQueue.length === 0) return
        const id = setTimeout(() => setPrintQueue(q => q.slice(1)), 1600)
        return () => clearTimeout(id)
    }, [printQueue])

    // GPS suggests the stage; when GPS is lost the conductor's stage holds.
    useEffect(() => {
        if (gpsOk) setStage(busStage)
    }, [busStage, gpsOk])

    const origin = sale ? sale.origin : stage
    const span = dest === null ? 0 : dest - origin
    const fare = span > 0 ? FARES[Math.min(span, FARES.length - 1)] : 0
    const total = fare * paid
    const change = note !== null && dest !== null ? note - total : null
    const graceLeft = sale ? GRACE_SECONDS - Math.floor((now - sale.startedAt) / 1000) : GRACE_SECONDS
    const stampHeld = sale !== null && sale.origin !== stage

    const live = tickets.filter(t => !t.voided)
    const counters = {
        tickets: live.length,
        pax: live.reduce((s, t) => s + t.paid + t.free, 0),
        free: live.reduce((s, t) => s + t.free, 0),
        cash: live.filter(t => t.method === "Cash").reduce((s, t) => s + t.amount, 0),
        upi: live.filter(t => t.method === "UPI").reduce((s, t) => s + t.amount, 0),
        voids: tickets.filter(t => t.voided).length,
    }

    const touchSale = () => {
        if (!sale) setSale({ origin: stage, startedAt: Date.now() })
    }
    const pickDest = (to: number) => {
        feedback()
        touchSale()
        setDest(to)
        setSheet(null)
    }
    const pickPaid = (n: number) => {
        feedback()
        touchSale()
        setPaid(n)
    }
    const changeFree = (d: number) => {
        feedback()
        touchSale()
        setFree(f => Math.max(0, Math.min(9, f + d)))
    }
    const resetSale = () => {
        setSale(null)
        setDest(null)
        setFree(0)
        setNote(null)
    }
    const makeTicket = (method: "Cash" | "UPI"): Ticket => {
        const no = nextNo.current++
        return { no, from: origin, to: dest as number, paid, free, amount: total, method }
    }
    const describe = (t: Ticket) =>
        `#${pad(t.no)} ${STOPS[t.from]} → ${STOPS[t.to]} · ${t.paid} paid${t.free ? ` + ${t.free} free` : ""} · ₹${t.amount}`

    const issueCash = () => {
        if (dest === null || span <= 0) return feedback("warn")
        if (change !== null && change < 0) return feedback("warn")
        feedback("issue")
        const t = makeTicket("Cash")
        setTickets(list => [t, ...list])
        setPrintQueue(q => [...q, t.no])
        if (change !== null && change > 0) {
            setChangeOwed(list => [...list, { no: t.no, amount: change }])
            addLog(`Change owed ₹${change} recorded on #${pad(t.no)}`)
        }
        if (sale && sale.origin !== stage) addLog(`#${pad(t.no)} fare held at stamped stage ${STOPS[sale.origin]}`)
        if (sale) setLastSaleSeconds((Date.now() - sale.startedAt) / 1000)
        addLog(`Issued ${describe(t)} · Cash`)
        flash(`Ticket #${pad(t.no)} printing`)
        resetSale()
    }
    const openUpi = () => {
        if (dest === null || span <= 0 || total === 0) return feedback("warn")
        feedback()
        setSheet("upi")
    }
    const parkUpi = () => {
        feedback("issue")
        const t = makeTicket("UPI")
        setPendingUpi(list => [...list, t])
        if (sale) setLastSaleSeconds((Date.now() - sale.startedAt) / 1000)
        addLog(`UPI pending ${describe(t)}`)
        flash(`#${pad(t.no)} parked · waiting for bank`)
        setSheet(null)
        resetSale()
    }
    const confirmUpi = (no?: number) => {
        const t = no === undefined ? pendingUpi[0] : pendingUpi.find(p => p.no === no)
        if (!t) return
        feedback("issue")
        setPendingUpi(list => list.filter(p => p.no !== t.no))
        setTickets(list => [t, ...list])
        setPrintQueue(q => [...q, t.no])
        addLog(`UPI confirmed by bank · printing #${pad(t.no)}`)
        flash(`UPI received · #${pad(t.no)} printing`)
    }
    const failUpi = (no: number) => {
        feedback("warn")
        setPendingUpi(list => list.filter(p => p.no !== no))
        addLog(`UPI #${pad(no)} not received · no ticket printed`)
        flash(`#${pad(no)} cancelled · take cash`)
    }
    const setManualStage = (s: number, reason: string) => {
        feedback()
        addLog(`Stage set to ${STOPS[s]} by conductor (GPS said ${STOPS[busStage]}) · ${reason}`)
        setStage(s)
        setSheet(null)
    }
    const doVoid = (no: number, reason: string) => {
        feedback("warn")
        setTickets(list => list.map(t => (t.no === no ? { ...t, voided: true } : t)))
        setChangeOwed(list => list.filter(c => c.no !== no))
        addLog(`VOID #${pad(no)} · ${reason} · slip in satchel`)
        flash(`#${pad(no)} voided and logged`)
        setSheet(null)
    }

    const advanceBus = () => {
        const next = Math.min(busStage + 1, STOPS.length - 2)
        setBusStage(next)
        addLog(`Bus crossed into stage ${STOPS[next]}${gpsOk ? "" : " (GPS lost, not detected)"}`)
    }
    const toggleGps = () => {
        setGpsOk(ok => {
            addLog(ok ? "GPS lost · stage held, correct manually" : "GPS back")
            return !ok
        })
    }
    const resetAll = () => {
        nextNo.current = FIRST_TICKET
        setBusStage(0)
        setStage(0)
        setGpsOk(true)
        resetSale()
        setPaid(1)
        setSheet(null)
        setTickets([])
        setPrintQueue([])
        setPendingUpi([])
        setChangeOwed([])
        setLastSaleSeconds(null)
        setLog([])
    }

    const dir = leftHanded ? "row-reverse" : "row"
    const tilesAhead = [1, 2, 3, 4, 5].map(n => origin + n).filter(i => i < STOPS.length)

    // ---------- UI ----------
    const phone = (
        <div style={S.phone}>
            {/* Hard zone: risky actions sit in the far corner on purpose */}
            <div style={{ ...S.header, flexDirection: dir }}>
                <div style={{ display: "flex", gap: 8, flexDirection: dir }}>
                    <button style={S.riskBtn(C.warn)} onClick={() => (feedback(), setSheet("stage"))}>
                        <div style={{ fontSize: 10, color: C.dim }}>STAGE ±</div>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{STOPS[stage]}</div>
                    </button>
                    <button style={S.riskBtn(C.risk)} onClick={() => (feedback(), setSheet("void"))}>
                        <div style={{ fontSize: 10, color: C.dim }}>VOID</div>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>✕</div>
                    </button>
                </div>
                <div style={{ textAlign: leftHanded ? "left" : "right", fontSize: 11, color: C.dim, lineHeight: 1.45 }}>
                    <div style={{ color: C.text, fontWeight: 800, fontSize: 13 }}>
                        Route {ROUTE} · <span style={{ color: gpsOk ? C.go : C.warn }}>{gpsOk ? "GPS ●" : "GPS ✕"}</span>
                    </div>
                    <div>
                        {counters.tickets} tkts · {counters.pax} pax · {counters.free} free
                    </div>
                    <div>
                        Cash ₹{counters.cash} · UPI ₹{counters.upi} · Void {counters.voids}
                    </div>
                </div>
            </div>

            {!gpsOk && (
                <button style={S.banner(C.warn)} onClick={() => setSheet("stage")}>
                    GPS lost · stage held at <b>{STOPS[stage]}</b>. Tap to correct.
                </button>
            )}
            {gpsOk && stage !== busStage && (
                <div style={S.banner(C.warn)}>
                    Manual stage {STOPS[stage]} · GPS says {STOPS[busStage]}
                </div>
            )}

            {/* Status trays: print queue, UPI pending, change owed */}
            <div style={S.trays}>
                <div style={S.tray(printQueue.length ? C.go : C.line)}>
                    <div style={S.trayLabel}>PRINTER</div>
                    <div style={S.trayValue}>{printQueue.length ? `#${pad(printQueue[0])} ▮▮▯` : "Ready"}</div>
                    {printQueue.length > 1 && <div style={S.trayLabel}>+{printQueue.length - 1} queued</div>}
                </div>
                <div style={S.tray(pendingUpi.length ? C.upi : C.line)}>
                    <div style={S.trayLabel}>UPI PENDING</div>
                    <div style={S.trayValue}>{pendingUpi.length || "—"}</div>
                    {pendingUpi.slice(0, 2).map(p => (
                        <div key={p.no} style={{ display: "flex", gap: 4, marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: C.dim, flex: 1 }}>
                                #{pad(p.no)} ₹{p.amount}
                            </span>
                            <button style={S.mini(C.risk)} onClick={() => failUpi(p.no)}>
                                ✕
                            </button>
                        </div>
                    ))}
                </div>
                <div style={S.tray(changeOwed.length ? C.fare : C.line)}>
                    <div style={S.trayLabel}>CHANGE OWED</div>
                    <div style={S.trayValue}>{changeOwed.length ? `₹${changeOwed[0].amount}` : "—"}</div>
                    {changeOwed.slice(0, 2).map(c => (
                        <button
                            key={c.no}
                            style={{ ...S.mini(C.fare), marginTop: 3, width: "100%" }}
                            onClick={() => {
                                feedback()
                                setChangeOwed(list => list.filter(x => x.no !== c.no))
                                addLog(`Change ₹${c.amount} handed over for #${pad(c.no)}`)
                            }}
                        >
                            #{pad(c.no)} ₹{c.amount} · Given
                        </button>
                    ))}
                </div>
            </div>

            {/* Sale summary */}
            <div style={S.summary}>
                <div style={{ fontSize: 12, color: C.dim }}>
                    FROM <b style={{ color: C.text }}>{STOPS[origin]}</b>
                    {sale && (
                        <span style={{ color: stampHeld ? C.warn : C.dim }}>
                            {" "}
                            · stamped{stampHeld ? `, bus moved on · grace ${Math.max(0, graceLeft)}s` : ""}
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 12, color: C.dim }}>
                    {lastSaleSeconds !== null ? (
                        <span>
                            Last sale{" "}
                            <b style={{ color: lastSaleSeconds <= 4 ? C.go : C.warn }}>{lastSaleSeconds.toFixed(1)} s</b>
                        </span>
                    ) : (
                        "Target < 4 s"
                    )}
                </div>
            </div>

            {/* Easy zone: destination tiles */}
            <div style={S.tiles}>
                {tilesAhead.map(i => {
                    const n = i - origin
                    const on = dest === i
                    return (
                        <button key={i} style={S.tile(on)} onClick={() => pickDest(i)}>
                            <div style={{ fontSize: 30, fontWeight: 900, color: on ? C.bg : C.fare, lineHeight: 1 }}>
                                ₹{FARES[n]}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{STOPS[i]}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>+{n} stage</div>
                        </button>
                    )
                })}
                {origin + 6 < STOPS.length && (
                    <button
                        style={S.tile(dest !== null && dest - origin > 5)}
                        onClick={() => (feedback(), touchSale(), setSheet("more"))}
                    >
                        <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1 }}>MORE</div>
                        <div style={{ fontSize: 12, fontWeight: 800, marginTop: 6 }}>
                            {dest !== null && dest - origin > 5 ? STOPS[dest] : "Far stops"}
                        </div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>+6 and beyond</div>
                    </button>
                )}
            </div>

            {/* Passenger counters */}
            <div style={{ ...S.row, flexDirection: dir }}>
                <div style={S.rowLabel}>PAID</div>
                {[1, 2, 3, 4].map(n => (
                    <button key={n} style={S.chip(paid === n, C.text)} onClick={() => pickPaid(n)}>
                        {n}
                    </button>
                ))}
                <button style={S.chip(paid >= 5, C.text)} onClick={() => pickPaid(paid >= 5 ? Math.min(paid + 1, 20) : 5)}>
                    {paid >= 5 ? paid : "5+"}
                </button>
            </div>
            <div style={{ ...S.row, flexDirection: dir }}>
                <div style={{ ...S.rowLabel, color: C.free }}>FREE</div>
                <button style={S.chip(false, C.free)} onClick={() => changeFree(-1)}>
                    −
                </button>
                <div style={{ ...S.chip(free > 0, C.free), display: "grid", placeItems: "center" }}>{free}</div>
                <button style={S.chip(false, C.free)} onClick={() => changeFree(1)}>
                    +
                </button>
                <button style={{ ...S.chip(note !== null, C.fare), flex: 1.6, fontSize: 14 }} onClick={() => (feedback(), setSheet("note"))}>
                    {note === null ? "Note ₹" : `Got ₹${note}`}
                </button>
            </div>

            {/* Commit: ISSUE anchored to the bottom edge, UPI on the opposite side */}
            <div style={{ ...S.bottom, flexDirection: dir }}>
                <button style={S.upiBtn(dest !== null && total > 0)} onClick={openUpi}>
                    <div style={{ fontSize: 22 }}>▦</div>
                    <div style={{ fontSize: 13, fontWeight: 900 }}>UPI QR</div>
                </button>
                <button style={S.issueBtn(dest !== null && span > 0 && !(change !== null && change < 0))} onClick={issueCash}>
                    <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>
                        {dest === null
                            ? "PICK A STOP"
                            : `ISSUE · ${paid} × ₹${fare}${free ? ` + ${free} free` : ""}`}
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1 }}>₹{total}</div>
                    {change !== null && (
                        <div style={{ fontSize: 12, fontWeight: 900 }}>
                            {change < 0 ? `Note too small` : `Change ₹${change}`}
                        </div>
                    )}
                </button>
            </div>

            {toast && <div style={S.toast}>{toast}</div>}

            {sheet && (
                <div style={S.scrim} onClick={() => setSheet(null)}>
                    <div style={S.sheet} onClick={e => e.stopPropagation()}>
                        {sheet === "more" && (
                            <MoreSheet origin={origin} onPick={pickDest} />
                        )}
                        {sheet === "note" && (
                            <NoteSheet
                                total={total}
                                onPick={n => {
                                    feedback()
                                    touchSale()
                                    setNote(n)
                                    setSheet(null)
                                }}
                            />
                        )}
                        {sheet === "upi" && (
                            <UpiSheet
                                amount={total}
                                seed={nextNo.current}
                                onPark={parkUpi}
                                onCash={() => {
                                    setSheet(null)
                                    issueCash()
                                }}
                            />
                        )}
                        {sheet === "stage" && <StageSheet stage={stage} gpsStage={busStage} gpsOk={gpsOk} onSet={setManualStage} />}
                        {sheet === "void" && <VoidSheet tickets={tickets.filter(t => !t.voided).slice(0, 4)} onVoid={doVoid} describe={describe} />}
                        <button style={S.close} onClick={() => setSheet(null)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )

    const panel = (
        <div style={S.side}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>Conductor ticketing · prototype</div>
            <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>
                Sample route, stops and fares. Not tested with conductors yet.
            </div>

            <div style={S.sideTitle}>Simulate the bus</div>
            <div style={S.sideGrid}>
                <button style={S.sideBtn} onClick={advanceBus}>
                    Bus crosses next stage
                </button>
                <button style={S.sideBtn} onClick={toggleGps}>
                    {gpsOk ? "Lose GPS (flyover)" : "Restore GPS"}
                </button>
                <button style={S.sideBtn} onClick={() => confirmUpi()} disabled={!pendingUpi.length}>
                    Bank confirms oldest UPI
                </button>
                <button style={S.sideBtn} onClick={() => setLeftHanded(v => !v)}>
                    {leftHanded ? "Right-handed mode" : "Left-handed mode"}
                </button>
                <button style={S.sideBtn} onClick={resetAll}>
                    Reset shift
                </button>
            </div>

            <div style={S.sideTitle}>Try these</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: "#D0D0D0" }}>
                <li>Sell: tap a fare tile, then 3, then ISSUE. Watch the time.</li>
                <li>Next sale starts while the last ticket prints.</li>
                <li>Mixed group: 2 paid, FREE + once.</li>
                <li>Change: Note ₹ → 500 before ISSUE, then mark Given.</li>
                <li>UPI: UPI QR → Park, then bank confirms (prints only then).</li>
                <li>Stage boundary: tap a tile, then Bus crosses stage. Fare stays stamped.</li>
                <li>GPS lost: then correct the stage from the top corner.</li>
                <li>Void: top corner → ticket, reason, slip, hold 1 s.</li>
                <li>Far stop: MORE.</li>
                <li>Left-handed mode mirrors the layout.</li>
            </ol>

            <div style={S.sideTitle}>Audit log</div>
            <div style={S.log}>
                {log.length === 0 ? (
                    <div style={{ color: C.dim }}>Every sale, void and stage change is logged here.</div>
                ) : (
                    log.map((l, i) => (
                        <div key={i} style={{ color: l.includes("VOID") ? C.risk : l.includes("Stage set") ? C.warn : "#D0D0D0" }}>
                            {l}
                        </div>
                    ))
                )}
            </div>
        </div>
    )

    return (
        <div style={S.root}>
            {phone}
            {panel}
        </div>
    )
}

function MoreSheet({ origin, onPick }: { origin: number; onPick: (i: number) => void }) {
    const far = STOPS.map((s, i) => i).filter(i => i - origin > 5)
    return (
        <div>
            <div style={S.sheetTitle}>Far stops</div>
            <div style={{ display: "grid", gap: 8 }}>
                {far.map(i => (
                    <button key={i} style={S.listBtn} onClick={() => onPick(i)}>
                        <span style={{ fontWeight: 800 }}>{STOPS[i]}</span>
                        <span style={{ color: C.dim, fontSize: 12 }}>+{i - origin} stage</span>
                        <span style={{ color: C.fare, fontWeight: 900, fontSize: 22 }}>₹{FARES[Math.min(i - origin, FARES.length - 1)]}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}

function NoteSheet({ total, onPick }: { total: number; onPick: (n: number | null) => void }) {
    return (
        <div>
            <div style={S.sheetTitle}>Note received</div>
            <div style={{ color: C.dim, fontSize: 13, marginBottom: 12 }}>
                Change owed is recorded against the ticket number.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {NOTES.map(n => (
                    <button key={n} style={{ ...S.listBtn, justifyContent: "center", fontSize: 26, fontWeight: 900, color: n >= total ? C.fare : C.dim }} onClick={() => onPick(n)}>
                        ₹{n}
                    </button>
                ))}
            </div>
            <button style={{ ...S.listBtn, marginTop: 10, justifyContent: "center" }} onClick={() => onPick(null)}>
                Exact cash
            </button>
        </div>
    )
}

function UpiSheet({ amount, seed, onPark, onCash }: { amount: number; seed: number; onPark: () => void; onCash: () => void }) {
    const cells = useMemo(() => {
        const n = 25
        let x = seed * 9301 + amount * 49297
        const out: boolean[] = []
        for (let i = 0; i < n * n; i++) {
            x = (x * 1103515245 + 12345) % 2147483648
            const r = Math.floor(i / n)
            const c = i % n
            const finder = (a: number, b: number) => r >= a && r < a + 7 && c >= b && c < b + 7
            if (finder(0, 0) || finder(0, n - 7) || finder(n - 7, 0)) {
                const rr = r < 7 ? r : r - (n - 7)
                const cc = c < 7 ? c : c - (n - 7)
                out.push(rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4))
            } else out.push(x % 3 === 0)
        }
        return out
    }, [seed, amount])
    return (
        <div style={{ textAlign: "center" }}>
            <div style={S.sheetTitle}>Scan to pay ₹{amount}</div>
            <div style={{ display: "inline-grid", gridTemplateColumns: "repeat(25, 7px)", background: "#fff", padding: 10, borderRadius: 8 }}>
                {cells.map((on, i) => (
                    <div key={i} style={{ width: 7, height: 7, background: on ? "#000" : "#fff" }} />
                ))}
            </div>
            <div style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>Sample QR · dynamic per ticket</div>
            <div style={{ color: C.upi, fontSize: 14, fontWeight: 800, marginTop: 8 }}>Ticket prints only after the bank confirms.</div>
            <button style={{ ...S.bigBtn(C.upi), marginTop: 14 }} onClick={onPark}>
                Park in pending · next passenger
            </button>
            <button style={{ ...S.listBtn, marginTop: 10, justifyContent: "center" }} onClick={onCash}>
                Paying cash instead
            </button>
        </div>
    )
}

function StageSheet({ stage, gpsStage, gpsOk, onSet }: { stage: number; gpsStage: number; gpsOk: boolean; onSet: (s: number, reason: string) => void }) {
    const [pick, setPick] = useState(stage)
    const [reason, setReason] = useState(gpsOk ? STAGE_REASONS[0] : STAGE_REASONS[1])
    return (
        <div>
            <div style={S.sheetTitle}>Correct stage</div>
            <div style={{ color: C.dim, fontSize: 13, marginBottom: 10 }}>
                GPS {gpsOk ? `suggests ${STOPS[gpsStage]}` : "is lost"}. Every change is logged with a reason.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 250, overflow: "auto" }}>
                {STOPS.slice(0, -1).map((s, i) => (
                    <button key={s} style={{ ...S.listBtn, padding: "10px 12px", borderColor: pick === i ? C.warn : C.line, color: pick === i ? C.warn : C.text }} onClick={() => (feedback(), setPick(i))}>
                        {s}
                        {gpsOk && i === gpsStage ? " · GPS" : ""}
                    </button>
                ))}
            </div>
            <ReasonChips reasons={STAGE_REASONS} value={reason} onChange={setReason} color={C.warn} />
            <button style={{ ...S.bigBtn(C.warn), marginTop: 12 }} onClick={() => onSet(pick, reason)}>
                Set stage to {STOPS[pick]}
            </button>
        </div>
    )
}

function VoidSheet({ tickets, onVoid, describe }: { tickets: Ticket[]; onVoid: (no: number, reason: string) => void; describe: (t: Ticket) => string }) {
    const [no, setNo] = useState<number | null>(tickets[0]?.no ?? null)
    const [reason, setReason] = useState<string | null>(null)
    const [slip, setSlip] = useState(false)
    const ready = no !== null && reason !== null && slip
    if (tickets.length === 0)
        return (
            <div>
                <div style={S.sheetTitle}>Void a ticket</div>
                <div style={{ color: C.dim }}>No tickets to void yet.</div>
            </div>
        )
    return (
        <div>
            <div style={S.sheetTitle}>Void a ticket</div>
            <div style={{ display: "grid", gap: 6 }}>
                {tickets.map(t => (
                    <button key={t.no} style={{ ...S.listBtn, fontSize: 12, padding: "10px 12px", borderColor: no === t.no ? C.risk : C.line }} onClick={() => (feedback(), setNo(t.no))}>
                        {describe(t)}
                    </button>
                ))}
            </div>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 12 }}>1 · Reason</div>
            <ReasonChips reasons={VOID_REASONS} value={reason} onChange={setReason} color={C.risk} />
            <div style={{ fontSize: 12, color: C.dim, marginTop: 12 }}>2 · Paper slip</div>
            <button style={{ ...S.listBtn, marginTop: 6, borderColor: slip ? C.risk : C.line }} onClick={() => (feedback(), setSlip(s => !s))}>
                {slip ? "☑" : "☐"} Slip dropped in satchel slot
            </button>
            <div style={{ fontSize: 12, color: C.dim, marginTop: 12 }}>3 · Hold to confirm</div>
            <HoldButton enabled={ready} onDone={() => no !== null && reason && onVoid(no, reason)} />
        </div>
    )
}

function ReasonChips({ reasons, value, onChange, color }: { reasons: string[]; value: string | null; onChange: (r: string) => void; color: string }) {
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {reasons.map(r => (
                <button key={r} style={{ ...S.listBtn, width: "auto", padding: "8px 12px", fontSize: 13, borderColor: value === r ? color : C.line, color: value === r ? color : C.text }} onClick={() => (feedback(), onChange(r))}>
                    {r}
                </button>
            ))}
        </div>
    )
}

function HoldButton({ enabled, onDone }: { enabled: boolean; onDone: () => void }) {
    const [progress, setProgress] = useState(0)
    const raf = useRef<number | null>(null)
    const start = useRef(0)
    const stop = () => {
        if (raf.current !== null) cancelAnimationFrame(raf.current)
        raf.current = null
        setProgress(0)
    }
    const begin = () => {
        if (!enabled) return feedback("warn")
        start.current = performance.now()
        const tick = () => {
            const p = Math.min(1, (performance.now() - start.current) / 1000)
            setProgress(p)
            if (p >= 1) {
                raf.current = null
                onDone()
            } else raf.current = requestAnimationFrame(tick)
        }
        raf.current = requestAnimationFrame(tick)
    }
    useEffect(() => stop, [])
    return (
        <button
            style={{ ...S.bigBtn(enabled ? C.risk : "#3A3A3A"), position: "relative", overflow: "hidden", marginTop: 6, touchAction: "none" }}
            onPointerDown={begin}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
        >
            <div style={{ position: "absolute", inset: 0, width: `${progress * 100}%`, background: "rgba(255,255,255,0.35)" }} />
            <span style={{ position: "relative" }}>{enabled ? "HOLD 1 s TO VOID" : "Pick ticket, reason and slip"}</span>
        </button>
    )
}

const btnReset: React.CSSProperties = {
    font: "inherit",
    border: "none",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
}

const S: any = {
    root: {
        display: "flex",
        flexWrap: "wrap",
        gap: 32,
        justifyContent: "center",
        alignItems: "flex-start",
        width: "100%",
        height: "100%",
        padding: 24,
        boxSizing: "border-box",
        background: "#0B0B0B",
        fontFamily: FONT,
        color: C.text,
    },
    phone: {
        position: "relative",
        width: 390,
        height: 844,
        background: C.bg,
        borderRadius: 44,
        border: "10px solid #1C1C1E",
        boxSizing: "border-box",
        padding: "18px 14px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        overflow: "hidden",
        flexShrink: 0,
    },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
    riskBtn: (color: string) => ({
        ...btnReset,
        background: "transparent",
        color,
        border: `1.5px solid ${color}`,
        borderRadius: 12,
        padding: "6px 10px",
        textAlign: "left",
        minHeight: 48,
    }),
    banner: (color: string) => ({
        ...btnReset,
        background: color,
        color: "#000",
        fontSize: 13,
        fontWeight: 700,
        borderRadius: 10,
        padding: "8px 10px",
        textAlign: "left",
    }),
    trays: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 },
    tray: (color: string) => ({ border: `1.5px solid ${color}`, borderRadius: 12, padding: "6px 8px", minHeight: 54 }),
    trayLabel: { fontSize: 9, color: C.dim, fontWeight: 700, letterSpacing: 0.4 },
    trayValue: { fontSize: 15, fontWeight: 900, marginTop: 2 },
    mini: (color: string) => ({ ...btnReset, background: "transparent", color, border: `1px solid ${color}`, borderRadius: 6, fontSize: 10, fontWeight: 800, padding: "3px 5px" }),
    summary: { display: "flex", justifyContent: "space-between", gap: 8, marginTop: "auto", alignItems: "flex-end" },
    tiles: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
    tile: (on: boolean) => ({
        ...btnReset,
        background: on ? C.fare : C.panel,
        color: on ? C.bg : C.text,
        border: `2px solid ${on ? C.fare : C.line}`,
        borderRadius: 16,
        height: 104,
        padding: 8,
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflow: "hidden",
    }),
    row: { display: "flex", gap: 6, alignItems: "center" },
    rowLabel: { width: 42, fontSize: 12, fontWeight: 900, color: C.dim, textAlign: "center" },
    chip: (on: boolean, color: string) => ({
        ...btnReset,
        flex: 1,
        height: 56,
        borderRadius: 14,
        fontSize: 24,
        fontWeight: 900,
        background: on ? color : C.panel,
        color: on ? C.bg : color,
        border: `2px solid ${on ? color : C.line}`,
    }),
    bottom: { display: "flex", gap: 8, height: 112 },
    upiBtn: (on: boolean) => ({
        ...btnReset,
        width: 96,
        borderRadius: 20,
        background: C.panel,
        color: on ? C.upi : "#4A4A4A",
        border: `2px solid ${on ? C.upi : C.line}`,
    }),
    issueBtn: (on: boolean) => ({
        ...btnReset,
        flex: 1,
        borderRadius: 20,
        background: on ? C.go : "#1E1E1E",
        color: on ? "#000" : "#5A5A5A",
    }),
    toast: {
        position: "absolute",
        left: 14,
        right: 14,
        top: 262,
        background: "#FFFFFF",
        color: "#000",
        borderRadius: 12,
        padding: "10px 12px",
        fontWeight: 800,
        fontSize: 14,
        pointerEvents: "none",
    },
    scrim: { position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-end" },
    sheet: {
        width: "100%",
        maxHeight: "86%",
        overflow: "auto",
        background: "#161616",
        borderTop: `1px solid ${C.line}`,
        borderRadius: "22px 22px 0 0",
        padding: 16,
        boxSizing: "border-box",
    },
    sheetTitle: { fontSize: 20, fontWeight: 900, marginBottom: 10 },
    listBtn: {
        ...btnReset,
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        background: C.panel,
        color: C.text,
        border: `1.5px solid ${C.line}`,
        borderRadius: 12,
        padding: "12px 14px",
        fontSize: 15,
        textAlign: "left",
    },
    bigBtn: (color: string) => ({ ...btnReset, width: "100%", height: 64, borderRadius: 16, background: color, color: "#000", fontSize: 17, fontWeight: 900 }),
    close: { ...btnReset, width: "100%", marginTop: 12, height: 52, borderRadius: 14, background: "transparent", color: C.dim, border: `1.5px solid ${C.line}`, fontSize: 15, fontWeight: 700 },
    side: { width: 420, maxWidth: "100%", display: "flex", flexDirection: "column" },
    sideTitle: { fontSize: 12, fontWeight: 900, color: C.dim, letterSpacing: 0.6, textTransform: "uppercase", marginTop: 22, marginBottom: 8 },
    sideGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
    sideBtn: { ...btnReset, background: "#1C1C1E", color: C.text, borderRadius: 12, padding: "12px 10px", fontSize: 13, fontWeight: 700, border: `1px solid ${C.line}` },
    log: {
        background: "#111",
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        padding: 10,
        height: 220,
        overflow: "auto",
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 11,
        lineHeight: 1.6,
    },
}
