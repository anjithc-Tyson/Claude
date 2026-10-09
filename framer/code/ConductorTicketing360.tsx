import * as React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { RenderTarget } from "framer"

// Conductor ticketing v2: 360 × 640 screen with sun (light) and shade (dark) themes.
// Route V-335E stops from the supplied route file; fares are samples until real tariff tables are wired in.

// @framerSupportedLayoutWidth any-prefer-fixed
// @framerSupportedLayoutHeight any-prefer-fixed
// @framerIntrinsicWidth 960
// @framerIntrinsicHeight 760

const ROUTE = "V-335E"
// Stops from v335e_clean_route.csv: full name, segment, scenario tags.
const ROUTE_STOPS: [string, string, string[]][] = [
    ["Kempegowda Bus Station (Majestic)", "City core", ["boarding_rush"]],
    ["Maharani College", "City core", ["dense_stops"]],
    ["K.R. Circle", "City core", ["dense_stops"]],
    ["Corporation (St Martha's Hospital)", "City core", ["dense_stops"]],
    ["St Joseph Boys High School / Mallya Hospital", "City core", ["dense_stops"]],
    ["Richmond Circle", "City core", ["dense_stops"]],
    ["St Joseph College", "City core", ["dense_stops"]],
    ["Brigade Road", "City core", ["dense_stops"]],
    ["Mayo Hall", "City core", ["dense_stops"]],
    ["Hosmat Hospital", "Old Airport Road", ["stop_start_jolts"]],
    ["Military Accounts Office", "Old Airport Road", ["stop_start_jolts"]],
    ["Commando Hospital", "Old Airport Road", ["stop_start_jolts"]],
    ["Domlur", "Old Airport Road", ["stop_start_jolts"]],
    ["Domlur Flyover", "Old Airport Road", ["gps_dip_candidate"]],
    ["Kodihalli", "Old Airport Road", ["stop_start_jolts"]],
    ["Manipal Hospital", "Old Airport Road", ["stop_start_jolts"]],
    ["Murugeshpalya", "Old Airport Road", ["stop_start_jolts"]],
    ["Rajarajeshwari Talkies", "Old Airport Road", ["stop_start_jolts"]],
    ["HAL Main Gate", "HAL to Marathahalli", ["signals"]],
    ["Helicopter Division", "HAL to Marathahalli", ["signals"]],
    ["HAL Kalyana Mantapa", "HAL to Marathahalli", ["signals"]],
    ["Yamalur Cross", "HAL to Marathahalli", ["signals"]],
    ["Doddanekkundi CRS", "HAL to Marathahalli", ["signals"]],
    ["Marathahalli", "Marathahalli junction", ["gps_dip_candidate"]],
    ["Marathahalli Bridge", "Marathahalli junction", ["gps_dip_candidate", "long_wait"]],
    ["Munnekolalu Cross (Spice Garden)", "Kundalahalli to ITPL", ["peak_crush"]],
    ["Kundalahalli Gate", "Kundalahalli to ITPL", ["peak_crush"]],
    ["Kundalahalli", "Kundalahalli to ITPL", ["peak_crush"]],
    ["BEML Layout", "Kundalahalli to ITPL", ["peak_crush"]],
    ["AECS Layout", "Kundalahalli to ITPL", ["peak_crush"]],
    ["CMRIT College", "Kundalahalli to ITPL", ["peak_crush"]],
    ["Kundalahalli Colony", "Kundalahalli to ITPL", ["peak_crush"]],
    ["Graphite India", "Kundalahalli to ITPL", ["peak_crush"]],
    ["SAP Labs", "Kundalahalli to ITPL", ["peak_crush"]],
    ["I Gate", "Kundalahalli to ITPL", ["peak_crush"]],
    ["KTPO", "Kundalahalli to ITPL", ["peak_crush"]],
    ["Whitefield Bus Station (Vydehi Hospital)", "Whitefield", ["peak_crush"]],
    ["Sathya Sai Hospital", "Whitefield", ["peak_crush"]],
    ["ITPL Back Gate", "Whitefield", ["peak_crush"]],
    ["Pattandur Agrahara Gate", "Whitefield", ["peak_crush"]],
    ["ITPL Whitefield", "Whitefield", ["peak_crush"]],
    ["GR Tech Park ITPL", "Whitefield", ["peak_crush"]],
    ["BPL", "End of line", ["potholes"]],
    ["Hope Farm", "End of line", ["potholes", "peak_crush"]],
    ["Kadugodi Bridge", "End of line", ["gps_dip_candidate", "potholes"]],
    ["Kadugodi Bus Station", "End of line", ["terminal_end"]],
]
const FULL_NAMES = ROUTE_STOPS.map(s => s[0])
const SEGMENTS = ROUTE_STOPS.map(s => s[1])
const GPS_DIP = ROUTE_STOPS.map(s => s[2].includes("gps_dip_candidate"))
// Short names for tiles and receipts: drop the bracketed alias and anything after " / ".
const STOPS = FULL_NAMES.map(n => n.replace(/\s*\(.*\)\s*$/, "").split(" / ")[0])
// Sample fares only (₹10, then +₹5 every two stops); real tariff tables should replace this.
const FARES = FULL_NAMES.map((_, n) => (n === 0 ? 0 : 10 + 5 * Math.floor((n - 1) / 2)))
const VOID_REASONS = ["Wrong stop", "Wrong count", "Passenger left", "Printer jam"]
const STAGE_REASONS = ["GPS wrong", "GPS lost", "Route diversion"]
const NOTES = [50, 100, 200, 500]
const GRACE_SECONDS = 60
const FIRST_TICKET = 421
const W = 360
const H = 640

type Theme = {
    name: string
    bg: string
    surface: string
    tile: string
    tileBorder: string
    border: string
    text: string
    text2: string
    activeBg: string
    activeText: string
    go: string
    goBorder: string
    goText: string
    danger: string
    dangerOnFill: string
    dangerText: string
    pending: string
    pendingText: string
    pendingBorder: string
    scrim: string
}

// Tokens from the design spec. Light is for direct sun, dark for shade, dusk and night.
const LIGHT: Theme = {
    name: "Sun",
    bg: "#FFFFFF",
    surface: "#F2F2F2",
    tile: "#EDEDED",
    tileBorder: "#000000",
    border: "#000000",
    text: "#000000",
    text2: "#333333",
    activeBg: "#000000",
    activeText: "#FFD600",
    go: "#00C853",
    goBorder: "3px solid #000000",
    goText: "#000000",
    danger: "#B00020",
    dangerOnFill: "#FFFFFF",
    dangerText: "#B00020",
    pending: "#FFD600",
    pendingText: "#000000",
    pendingBorder: "#000000",
    scrim: "rgba(0,0,0,0.45)",
}
const DARK: Theme = {
    name: "Shade",
    bg: "#000000",
    surface: "#121212",
    tile: "#1E1E1E",
    tileBorder: "#5A5A5A",
    border: "#5A5A5A",
    text: "#FFFFFF",
    text2: "#BDBDBD",
    activeBg: "#FFD600",
    activeText: "#000000",
    go: "#00E676",
    goBorder: "none",
    goText: "#000000",
    danger: "#D50000",
    dangerOnFill: "#FFFFFF",
    dangerText: "#FF5252",
    pending: "#FFD600",
    pendingText: "#000000",
    pendingBorder: "#FFD600",
    scrim: "rgba(0,0,0,0.7)",
}

const FONT = "Inter, 'Noto Sans', system-ui, -apple-system, sans-serif"

type Ticket = {
    no: number
    from: number
    to: number
    paid: number
    free: number
    fare: number
    amount: number
    method: "Cash" | "UPI"
    voided?: boolean
}
type Sale = { origin: number; startedAt: number }
type Sheet = null | "stage" | "void" | "upi" | "more" | "note" | "trays" | "shift"

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

const ThemeCtx = React.createContext<Theme>(LIGHT)
const useT = () => React.useContext(ThemeCtx)

const btn: React.CSSProperties = {
    fontFamily: "inherit",
    border: "none",
    margin: 0,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    boxSizing: "border-box",
}

export default function ConductorTicketing360() {
    return <Ticketing mobile={false} />
}

/**
 * Phone-only build: the 360 × 640 screen on its own, with no frame, notes or simulation panel.
 * With no panel to press, the bank confirms a parked UPI payment after a few seconds.
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 360
 * @framerIntrinsicHeight 640
 */
export function ConductorTicketingMobile() {
    return <Ticketing mobile />
}

const MOBILE_BANK_DELAY_MS = 4000

function Ticketing({ mobile }: { mobile: boolean }) {
    const [dark, setDark] = useState(false)
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
    const [receipt, setReceipt] = useState<{ ticket: Ticket; seconds: number | null; change: number | null } | null>(null)
    const [log, setLog] = useState<string[]>([])
    const [notice, setNotice] = useState<string | null>(null)
    const [now, setNow] = useState(Date.now())
    const nextNo = useRef(FIRST_TICKET)
    const t = dark ? DARK : LIGHT

    const addLog = (line: string) => setLog(l => [`${clock()}  ${line}`, ...l].slice(0, 80))
    const flash = (msg: string) => {
        setNotice(msg)
        setTimeout(() => setNotice(n => (n === msg ? null : n)), 2600)
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
    const canIssue = dest !== null && span > 0 && !(change !== null && change < 0)

    const live = tickets.filter(x => !x.voided)
    const counters = {
        tickets: live.length,
        pax: live.reduce((s, x) => s + x.paid + x.free, 0),
        free: live.reduce((s, x) => s + x.free, 0),
        cash: live.filter(x => x.method === "Cash").reduce((s, x) => s + x.amount, 0),
        upi: live.filter(x => x.method === "UPI").reduce((s, x) => s + x.amount, 0),
        voids: tickets.filter(x => x.voided).length,
    }

    // Any tap that starts a sale clears the last receipt, so NEXT SALE is never a required step.
    const touchSale = () => {
        setReceipt(null)
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
    const makeTicket = (method: "Cash" | "UPI"): Ticket => ({
        no: nextNo.current++,
        from: origin,
        to: dest as number,
        paid,
        free,
        fare,
        amount: total,
        method,
    })
    const describe = (x: Ticket) =>
        `#${pad(x.no)} ${STOPS[x.from]} → ${STOPS[x.to]} · ${x.paid} paid${x.free ? ` + ${x.free} free` : ""} · ₹${x.amount}`

    const issueCash = () => {
        if (!canIssue) return feedback("warn")
        feedback("issue")
        const x = makeTicket("Cash")
        const seconds = sale ? (Date.now() - sale.startedAt) / 1000 : null
        setTickets(list => [x, ...list])
        setPrintQueue(q => [...q, x.no])
        if (change !== null && change > 0) {
            setChangeOwed(list => [...list, { no: x.no, amount: change }])
            addLog(`Change owed ₹${change} recorded on #${pad(x.no)}`)
        }
        if (stampHeld && sale) addLog(`#${pad(x.no)} fare held at stamped stage ${STOPS[sale.origin]}`)
        addLog(`Issued ${describe(x)} · Cash`)
        setReceipt({ ticket: x, seconds, change: change !== null && change > 0 ? change : null })
        resetSale()
    }
    const openUpi = () => {
        if (!canIssue || total === 0) return feedback("warn")
        feedback()
        setSheet("upi")
    }
    const parkUpi = () => {
        feedback("issue")
        const x = makeTicket("UPI")
        setPendingUpi(list => [...list, x])
        addLog(`UPI pending ${describe(x)}`)
        flash(`#${pad(x.no)} parked · waiting for bank`)
        setSheet(null)
        resetSale()
    }
    useEffect(() => {
        if (!mobile || pendingUpi.length === 0) return
        const id = setTimeout(confirmUpi, MOBILE_BANK_DELAY_MS)
        return () => clearTimeout(id)
    }, [mobile, pendingUpi])

    const confirmUpi = () => {
        const x = pendingUpi[0]
        if (!x) return
        feedback("issue")
        setPendingUpi(list => list.slice(1))
        setTickets(list => [x, ...list])
        setPrintQueue(q => [...q, x.no])
        addLog(`UPI confirmed by bank · printing #${pad(x.no)}`)
        flash(`UPI received · #${pad(x.no)} printing`)
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
        setTickets(list => list.map(x => (x.no === no ? { ...x, voided: true } : x)))
        setChangeOwed(list => list.filter(c => c.no !== no))
        setReceipt(r => (r && r.ticket.no === no ? null : r))
        addLog(`VOID #${pad(no)} · ${reason} · slip in satchel`)
        flash(`#${pad(no)} voided and logged`)
        setSheet(null)
    }
    const giveChange = (no: number, amount: number) => {
        feedback()
        setChangeOwed(list => list.filter(c => c.no !== no))
        addLog(`Change ₹${amount} handed over for #${pad(no)}`)
    }

    // Stops tagged gps_dip_candidate in the route file (flyovers, underpasses, bridges) drop GPS on arrival.
    const autoGpsLoss = useRef(false)
    const advanceBus = () => {
        const next = Math.min(busStage + 1, STOPS.length - 2)
        setBusStage(next)
        let ok = gpsOk
        if (GPS_DIP[next] && gpsOk) {
            ok = false
            autoGpsLoss.current = true
        } else if (!GPS_DIP[next] && autoGpsLoss.current) {
            ok = true
            autoGpsLoss.current = false
        }
        addLog(`Bus crossed into stage ${STOPS[next]}${ok ? "" : " (GPS lost, not detected)"}`)
        if (ok !== gpsOk) addLog(ok ? "GPS back after the dip" : `GPS dip near ${FULL_NAMES[next]} · stage held, correct manually`)
        setGpsOk(ok)
    }
    const toggleGps = () => {
        addLog(gpsOk ? "GPS lost · stage held, correct manually" : "GPS back")
        autoGpsLoss.current = false
        setGpsOk(!gpsOk)
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
        setReceipt(null)
        setLog([])
    }

    const dir = leftHanded ? "row-reverse" : "row"
    const tilesAhead = [1, 2, 3, 4, 5].map(n => origin + n).filter(i => i < STOPS.length)
    const changeTotal = changeOwed.reduce((s, c) => s + c.amount, 0)

    const screen = (
        <div style={{ position: "relative", width: mobile ? "100%" : W, height: mobile ? "100%" : H, background: t.bg, color: t.text, overflow: "hidden", display: "flex", flexDirection: "column", padding: 12, gap: 8, boxSizing: "border-box", fontFamily: FONT }}>
            {/* Hard-to-reach corner: risky actions on purpose */}
            <div style={{ display: "flex", flexDirection: dir, alignItems: "stretch", gap: 6, height: 52 }}>
                <button
                    aria-label="Correct stage"
                    style={{ ...btn, flex: 1, minWidth: 0, background: t.surface, color: t.text, border: `2px solid ${t.border}`, borderRadius: 12, padding: "3px 8px", textAlign: "left" }}
                    onClick={() => (feedback(), setSheet("stage"))}
                >
                    <div style={{ fontSize: 10, fontWeight: 800, color: t.text2, letterSpacing: 0.4 }}>STAGE ±</div>
                    <div style={{ fontSize: 13, fontWeight: 900, lineHeight: 1.1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{STOPS[stage]}</div>
                </button>
                <button
                    aria-label="Void a ticket"
                    style={{ ...btn, width: 52, background: t.surface, color: t.dangerText, border: `2px solid ${t.dangerText}`, borderRadius: 12, fontSize: 11, fontWeight: 900 }}
                    onClick={() => (feedback(), setSheet("void"))}
                >
                    <div style={{ fontSize: 18, lineHeight: 1 }}>✕</div>
                    VOID
                </button>
                <button
                    aria-label="Shift summary"
                    style={{ ...btn, background: "transparent", color: t.text, textAlign: leftHanded ? "left" : "right", padding: 0 }}
                    onClick={() => (feedback(), setSheet("shift"))}
                >
                    <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: "nowrap" }}>{ROUTE}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: t.text2, whiteSpace: "nowrap", marginTop: 2 }}>
                        {gpsOk ? (
                            <span>
                                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: t.go, border: dark ? "none" : "1px solid #000", marginRight: 3 }} />
                                GPS · ₹{counters.cash + counters.upi}
                            </span>
                        ) : (
                            <span style={{ fontSize: 10, fontWeight: 900, background: t.pending, color: t.pendingText, borderRadius: 4, padding: "1px 4px" }}>NO GPS</span>
                        )}
                    </div>
                </button>
                <button
                    aria-label="Switch theme"
                    style={{ ...btn, width: 44, background: t.surface, color: t.text, border: `2px solid ${t.border}`, borderRadius: 12, fontSize: 20 }}
                    onClick={() => (feedback(), setDark(d => !d))}
                >
                    {dark ? "☾" : "☀"}
                </button>
            </div>

            {/* Status chips: printer, UPI pending, change owed */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, height: 40 }}>
                <StatusChip label="PRINTER" value={printQueue.length ? `#${pad(printQueue[0])}${printQueue.length > 1 ? ` +${printQueue.length - 1}` : ""}` : "Ready"} />
                <StatusChip label="UPI WAIT" value={pendingUpi.length ? String(pendingUpi.length) : "—"} hot={pendingUpi.length > 0} onClick={() => (feedback(), setSheet("trays"))} />
                <StatusChip label="CHANGE" value={changeOwed.length ? `₹${changeTotal}` : "—"} hot={changeOwed.length > 0} onClick={() => (feedback(), setSheet("trays"))} />
            </div>

            {/* Proof area: last ticket stays visible until the next sale starts */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 6, minHeight: 0, overflow: "hidden" }}>
                {notice && (
                    <div style={{ background: t.surface, border: `2px solid ${t.border}`, borderRadius: 10, padding: "6px 10px", fontSize: 13, fontWeight: 800 }}>{notice}</div>
                )}
                {receipt && !notice && (
                    <div style={{ flexShrink: 0, background: t.surface, border: `2px solid ${t.border}`, borderRadius: 12, padding: "6px 10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, fontWeight: 900 }}>
                            <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                ✓ #{pad(receipt.ticket.no)} → {STOPS[receipt.ticket.to]}
                            </span>
                            {receipt.seconds !== null && <span style={{ flexShrink: 0, fontSize: 12 }}>{receipt.seconds.toFixed(1)} s</span>}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: t.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {receipt.ticket.paid} × ₹{receipt.ticket.fare}
                            {receipt.ticket.free ? ` + ${receipt.ticket.free} free` : ""} = ₹{receipt.ticket.amount}
                            {receipt.change ? ` · change ₹${receipt.change}` : ""}
                        </div>
                    </div>
                )}
                <RouteCard
                    origin={origin}
                    gpsOk={gpsOk}
                    manual={gpsOk && stage !== busStage ? STOPS[busStage] : null}
                    status={sale ? (stampHeld ? `held ${Math.max(0, graceLeft)}s` : "stamped") : null}
                    onClick={() => (feedback(), setSheet("stage"))}
                />
            </div>

            {/* Thumb zone: destination tiles, fixed positions within a stage */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "88px 88px", gap: 8 }}>
                {tilesAhead.map(i => (
                    <Tile key={i} on={dest === i} fare={FARES[i - origin]} name={STOPS[i]} hint={`+${i - origin}`} onClick={() => pickDest(i)} />
                ))}
                {origin + 6 < STOPS.length && (
                    <Tile
                        on={dest !== null && dest - origin > 5}
                        fare={dest !== null && dest - origin > 5 ? FARES[Math.min(dest - origin, FARES.length - 1)] : null}
                        name={dest !== null && dest - origin > 5 ? STOPS[dest] : "Far stops list"}
                        hint={dest !== null && dest - origin > 5 ? `+${dest - origin}` : "6+"}
                        title="MORE"
                        onClick={() => (feedback(), touchSale(), setSheet("more"))}
                    />
                )}
            </div>

            <div style={{ display: "flex", flexDirection: dir, gap: 6, height: 52, alignItems: "center" }}>
                <RowLabel>PAID</RowLabel>
                {[1, 2, 3, 4].map(n => (
                    <Chip key={n} on={paid === n} onClick={() => pickPaid(n)}>
                        {n}
                    </Chip>
                ))}
                <Chip on={paid >= 5} onClick={() => pickPaid(paid >= 5 ? Math.min(paid + 1, 20) : 5)}>
                    {paid >= 5 ? paid : "5+"}
                </Chip>
            </div>

            <div style={{ display: "flex", flexDirection: dir, gap: 6, height: 48, alignItems: "center" }}>
                <RowLabel>FREE</RowLabel>
                <Chip on={false} onClick={() => changeFree(-1)} aria="Fewer free riders">
                    −
                </Chip>
                <Chip on={free > 0} onClick={() => {}} static>
                    {free}
                </Chip>
                <Chip on={false} onClick={() => changeFree(1)} aria="More free riders">
                    +
                </Chip>
                <Chip on={note !== null} grow={1.7} onClick={() => (feedback(), setSheet("note"))} small>
                    {note === null ? "Note ₹" : `Got ₹${note}`}
                </Chip>
            </div>

            {/* Commit row: ISSUE on the thumb side, UPI opposite. After issuing it becomes NEXT SALE, so a double tap cannot double-issue. */}
            <div style={{ display: "flex", flexDirection: dir, gap: 8, height: 84 }}>
                <button
                    aria-label="UPI QR"
                    style={{ ...btn, width: 76, borderRadius: 16, background: t.surface, color: canIssue ? t.text : t.text2, border: `2px ${canIssue ? "solid" : "dashed"} ${t.border}`, opacity: canIssue ? 1 : 0.6 }}
                    onClick={openUpi}
                >
                    <QrGlyph color={canIssue ? t.text : t.text2} />
                    <div style={{ fontSize: 13, fontWeight: 900, marginTop: 4 }}>UPI</div>
                </button>
                {receipt && dest === null ? (
                    <button
                        style={{ ...btn, flex: 1, borderRadius: 16, background: t.go, color: t.goText, border: t.goBorder, fontSize: 24, fontWeight: 900 }}
                        onClick={() => (feedback(), setReceipt(null))}
                    >
                        NEXT SALE
                        <div style={{ fontSize: 12, fontWeight: 800 }}>or tap a stop</div>
                    </button>
                ) : (
                    <button
                        style={{
                            ...btn,
                            flex: 1,
                            borderRadius: 16,
                            background: canIssue ? t.go : t.surface,
                            color: canIssue ? t.goText : t.text2,
                            border: canIssue ? t.goBorder : `2px dashed ${t.border}`,
                        }}
                        onClick={issueCash}
                    >
                        <div style={{ fontSize: 12, fontWeight: 900 }}>
                            {dest === null ? "PICK A STOP" : `ISSUE · ${paid} × ₹${fare}${free ? ` + ${free} free` : ""}`}
                        </div>
                        <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.05 }}>₹{total}</div>
                        {change !== null && <div style={{ fontSize: 12, fontWeight: 900 }}>{change < 0 ? "Note too small" : `Change ₹${change}`}</div>}
                    </button>
                )}
            </div>

            {sheet && (
                <div style={{ position: "absolute", inset: 0, background: t.scrim, display: "flex", alignItems: "flex-end" }} onClick={() => setSheet(null)}>
                    <div
                        style={{ width: "100%", maxHeight: "94%", display: "flex", flexDirection: "column", background: t.bg, borderTop: `2px solid ${t.border}`, borderRadius: "20px 20px 0 0", boxSizing: "border-box" }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ overflow: "auto", overscrollBehavior: "contain", padding: "14px 12px 0" }}>
                            {sheet === "more" && <MoreSheet origin={origin} onPick={pickDest} />}
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
                            {sheet === "void" && <VoidSheet tickets={tickets.filter(x => !x.voided).slice(0, 3)} onVoid={doVoid} />}
                            {sheet === "trays" && <TraySheet pending={pendingUpi} change={changeOwed} onFail={failUpi} onGive={giveChange} />}
                            {sheet === "shift" && <ShiftSheet counters={counters} />}
                        </div>
                        <div style={{ padding: 12 }}>
                            <button style={{ ...btn, width: "100%", height: 52, borderRadius: 14, background: t.surface, color: t.text, border: `2px solid ${t.border}`, fontSize: 16, fontWeight: 800 }} onClick={() => setSheet(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    // On the canvas the screen is the 360 × 640 frame. On a real phone it takes the whole viewport:
    // extra height opens up above the tiles, so the thumb zone and sheets stay on the bottom edge.
    if (mobile) {
        const live = RenderTarget.current() !== RenderTarget.canvas
        return (
            <ThemeCtx.Provider value={t}>
                <div style={live ? { position: "fixed", inset: 0, height: "100dvh", zIndex: 10, background: t.bg } : { width: "100%", height: "100%" }}>{screen}</div>
            </ThemeCtx.Provider>
        )
    }

    return (
        <ThemeCtx.Provider value={t}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 36, justifyContent: "center", alignItems: "flex-start", width: "100%", height: "100%", padding: 28, boxSizing: "border-box", background: "#E9E9E9", fontFamily: FONT, color: "#000" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div style={{ padding: 10, background: "#1A1A1A", borderRadius: 30, boxShadow: "0 18px 40px rgba(0,0,0,0.25)" }}>
                        <div style={{ borderRadius: 20, overflow: "hidden" }}>{screen}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>
                        360 × 640 · {t.name} theme {dark ? "(shade, dusk, night)" : "(direct sun)"}
                    </div>
                </div>
                <DemoPanel
                    dark={dark}
                    leftHanded={leftHanded}
                    gpsOk={gpsOk}
                    pending={pendingUpi.length}
                    log={log}
                    onTheme={() => setDark(d => !d)}
                    onHand={() => setLeftHanded(v => !v)}
                    onAdvance={advanceBus}
                    onGps={toggleGps}
                    onConfirmUpi={confirmUpi}
                    onReset={resetAll}
                />
            </div>
        </ThemeCtx.Provider>
    )
}

// Where the fare starts: boarding stop, position on the route and GPS state.
function RouteCard({ origin, gpsOk, manual, status, onClick }: { origin: number; gpsOk: boolean; manual: string | null; status: string | null; onClick: () => void }) {
    const t = useT()
    const warn = !gpsOk || manual !== null
    const ink = warn ? t.pendingText : t.text
    const sub = warn ? t.pendingText : t.text2
    const top = !gpsOk ? "GPS LOST · STAGE HELD · TAP TO CORRECT" : manual ? `MANUAL STAGE · GPS SAYS ${manual.toUpperCase()}` : `FROM · ${SEGMENTS[origin].toUpperCase()}`
    return (
        <button
            style={{
                ...btn,
                flexShrink: 0,
                width: "100%",
                textAlign: "left",
                background: warn ? t.pending : t.surface,
                color: ink,
                border: `2px solid ${warn ? t.pendingBorder : t.border}`,
                borderRadius: 12,
                padding: "5px 10px 7px",
            }}
            onClick={onClick}
        >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 10, fontWeight: 900, letterSpacing: 0.3, color: sub }}>
                <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{top}</span>
                <span style={{ flexShrink: 0 }}>
                    {origin + 1}/{STOPS.length}
                </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <span style={{ minWidth: 0, fontSize: 15, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{STOPS[origin]}</span>
                {status && <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: sub }}>{status}</span>}
            </div>
            <div style={{ height: 4, borderRadius: 2, background: warn ? "rgba(0,0,0,0.2)" : t.tile, marginTop: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${((origin + 1) / STOPS.length) * 100}%`, background: warn ? t.pendingText : t.text }} />
            </div>
        </button>
    )
}

function StatusChip({ label, value, hot, onClick }: { label: string; value: string; hot?: boolean; onClick?: () => void }) {
    const t = useT()
    return (
        <button
            style={{
                ...btn,
                background: hot ? t.pending : t.surface,
                color: hot ? t.pendingText : t.text,
                border: `2px solid ${hot ? t.pendingBorder : t.border}`,
                borderRadius: 10,
                padding: "2px 8px",
                textAlign: "left",
                cursor: onClick ? "pointer" : "default",
            }}
            onClick={onClick}
        >
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: 0.4, color: hot ? t.pendingText : t.text2 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: "nowrap" }}>{value}</div>
        </button>
    )
}

function Tile({ on, fare, name, hint, title, onClick }: { on: boolean; fare: number | null; name: string; hint: string; title?: string; onClick: () => void }) {
    const t = useT()
    return (
        <button
            style={{
                ...btn,
                background: on ? t.activeBg : t.tile,
                color: on ? t.activeText : t.text,
                border: `2px solid ${on ? t.activeBg : t.tileBorder}`,
                borderRadius: 14,
                padding: "6px 8px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
                minWidth: 0,
            }}
            onClick={onClick}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: fare === null ? 22 : 28, fontWeight: 900, lineHeight: 1 }}>{fare === null ? title : `₹${fare}`}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: on ? t.activeText : t.text2, whiteSpace: "nowrap" }}>{hint}</span>
            </div>
            <div
                style={{
                    fontSize: name.length > 11 ? 11 : 12,
                    fontWeight: 800,
                    letterSpacing: name.length > 11 ? -0.4 : -0.2,
                    lineHeight: 1.2,
                    marginTop: 5,
                    minHeight: 30,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflowWrap: "break-word",
                }}
            >
                {name}
            </div>
        </button>
    )
}

function Chip({ on, onClick, children, grow, small, aria, static: isStatic }: { on: boolean; onClick: () => void; children: React.ReactNode; grow?: number; small?: boolean; aria?: string; static?: boolean }) {
    const t = useT()
    return (
        <button
            aria-label={aria}
            style={{
                ...btn,
                flex: grow ?? 1,
                height: "100%",
                minWidth: 0,
                borderRadius: 12,
                fontSize: small ? 15 : 22,
                fontWeight: 900,
                background: on ? t.activeBg : t.tile,
                color: on ? t.activeText : t.text,
                border: `2px solid ${on ? t.activeBg : t.tileBorder}`,
                cursor: isStatic ? "default" : "pointer",
            }}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

function RowLabel({ children }: { children: React.ReactNode }) {
    const t = useT()
    return <div style={{ width: 38, flexShrink: 0, fontSize: 11, fontWeight: 900, color: t.text2, textAlign: "center" }}>{children}</div>
}

function QrGlyph({ color }: { color: string }) {
    return (
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
            {[
                [0, 0],
                [16, 0],
                [0, 16],
            ].map(([x, y]) => (
                <g key={`${x}${y}`}>
                    <rect x={x + 1} y={y + 1} width="10" height="10" fill="none" stroke={color} strokeWidth="2.5" />
                    <rect x={x + 4.5} y={y + 4.5} width="3" height="3" fill={color} />
                </g>
            ))}
            <rect x="17" y="17" width="4" height="4" fill={color} />
            <rect x="23" y="23" width="4" height="4" fill={color} />
            <rect x="23" y="17" width="4" height="2" fill={color} />
        </svg>
    )
}

function SheetTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
    const t = useT()
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>{children}</div>
            {sub && <div style={{ fontSize: 13, fontWeight: 600, color: t.text2, marginTop: 2 }}>{sub}</div>}
        </div>
    )
}

function ListButton({ on, onClick, children, danger, style }: { on?: boolean; onClick: () => void; children: React.ReactNode; danger?: boolean; style?: React.CSSProperties }) {
    const t = useT()
    const accent = danger ? t.dangerText : t.activeBg
    return (
        <button
            style={{
                ...btn,
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                background: on && !danger ? t.activeBg : t.tile,
                color: on ? (danger ? t.dangerText : t.activeText) : t.text,
                border: `2px solid ${on ? accent : t.tileBorder}`,
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 15,
                fontWeight: 700,
                textAlign: "left",
                minHeight: 48,
                ...style,
            }}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

function BigButton({ kind, onClick, children, disabled }: { kind: "go" | "pending" | "danger"; onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
    const t = useT()
    const fill = kind === "go" ? t.go : kind === "pending" ? t.pending : t.danger
    const ink = kind === "danger" ? t.dangerOnFill : kind === "go" ? t.goText : t.pendingText
    const border = kind === "go" ? t.goBorder : kind === "pending" ? `2px solid ${t.pendingBorder}` : "none"
    return (
        <button
            style={{
                ...btn,
                width: "100%",
                height: 60,
                borderRadius: 14,
                background: disabled ? t.surface : fill,
                color: disabled ? t.text2 : ink,
                border: disabled ? `2px dashed ${t.border}` : border,
                fontSize: 17,
                fontWeight: 900,
                marginTop: 12,
            }}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

function MoreSheet({ origin, onPick }: { origin: number; onPick: (i: number) => void }) {
    const t = useT()
    const far = STOPS.map((_, i) => i).filter(i => i - origin > 5)
    return (
        <div>
            <SheetTitle sub="Grouped by road segment, nearest first.">Far stops</SheetTitle>
            <div style={{ display: "grid", gap: 6 }}>
                {far.map(i => (
                    <React.Fragment key={i}>
                        {(i === far[0] || SEGMENTS[i] !== SEGMENTS[i - 1]) && <Label>{SEGMENTS[i].toUpperCase()}</Label>}
                        <ListButton onClick={() => onPick(i)}>
                            <span style={{ minWidth: 0 }}>
                                <b>{FULL_NAMES[i]}</b>
                                <span style={{ color: t.text2, fontSize: 12 }}> · +{i - origin}</span>
                            </span>
                            <span style={{ fontWeight: 900, fontSize: 22, flexShrink: 0 }}>₹{FARES[i - origin]}</span>
                        </ListButton>
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}

function NoteSheet({ total, onPick }: { total: number; onPick: (n: number | null) => void }) {
    const t = useT()
    return (
        <div>
            <SheetTitle sub="Change owed is recorded against the ticket number.">Note received</SheetTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {NOTES.map(n => (
                    <ListButton key={n} onClick={() => onPick(n)} style={{ justifyContent: "center", fontSize: 26, fontWeight: 900, height: 72, color: n >= total ? t.text : t.text2 }}>
                        ₹{n}
                    </ListButton>
                ))}
            </div>
            <ListButton onClick={() => onPick(null)} style={{ justifyContent: "center", marginTop: 8 }}>
                Exact cash
            </ListButton>
        </div>
    )
}

function UpiSheet({ amount, seed, onPark, onCash }: { amount: number; seed: number; onPark: () => void; onCash: () => void }) {
    const t = useT()
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
            <div style={{ fontSize: 13, fontWeight: 800, color: t.text2 }}>SCAN TO PAY</div>
            <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1 }}>₹{amount}</div>
            <div style={{ display: "inline-grid", gridTemplateColumns: "repeat(25, 7px)", background: "#FFFFFF", padding: 10, borderRadius: 10, border: "2px solid #000", marginTop: 6 }}>
                {cells.map((on, i) => (
                    <div key={i} style={{ width: 7, height: 7, background: on ? "#000" : "#fff" }} />
                ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.text2, marginTop: 6 }}>Sample QR · new code per ticket</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 6 }}>The ticket prints only after the bank confirms.</div>
            <BigButton kind="pending" onClick={onPark}>
                Park · serve next passenger
            </BigButton>
            <ListButton onClick={onCash} style={{ justifyContent: "center", marginTop: 8 }}>
                Paying cash instead
            </ListButton>
        </div>
    )
}

function StageSheet({ stage, gpsStage, gpsOk, onSet }: { stage: number; gpsStage: number; gpsOk: boolean; onSet: (s: number, reason: string) => void }) {
    const t = useT()
    const [pick, setPick] = useState(stage)
    const [reason, setReason] = useState(gpsOk ? STAGE_REASONS[0] : STAGE_REASONS[1])
    const current = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        if (current.current) current.current.scrollIntoView({ block: "center" })
    }, [])
    return (
        <div>
            <SheetTitle sub={`GPS ${gpsOk ? `suggests ${STOPS[gpsStage]}` : "is lost"}. Every change is logged with a reason.`}>Correct stage</SheetTitle>
            <div style={{ maxHeight: 230, overflow: "auto", border: `2px solid ${t.border}`, borderRadius: 12, padding: "0 6px 6px" }}>
                {STOPS.slice(0, -1).map((s, i) => (
                    <div key={i} ref={i === stage ? current : undefined}>
                        {(i === 0 || SEGMENTS[i] !== SEGMENTS[i - 1]) && <Label>{SEGMENTS[i].toUpperCase()}</Label>}
                        <ListButton on={pick === i} onClick={() => (feedback(), setPick(i))} style={{ fontSize: 13, padding: "8px 10px", marginTop: 4 }}>
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {i + 1}. {FULL_NAMES[i]}
                            </span>
                            {gpsOk && i === gpsStage && <span style={{ fontSize: 10, fontWeight: 900, flexShrink: 0 }}>GPS</span>}
                        </ListButton>
                    </div>
                ))}
            </div>
            <Label>Reason</Label>
            <ReasonChips reasons={STAGE_REASONS} value={reason} onChange={setReason} />
            <BigButton kind="go" onClick={() => onSet(pick, reason)}>
                CONFIRM · {STOPS[pick]}
            </BigButton>
        </div>
    )
}

function VoidSheet({ tickets, onVoid }: { tickets: Ticket[]; onVoid: (no: number, reason: string) => void }) {
    const t = useT()
    const [no, setNo] = useState<number | null>(tickets[0]?.no ?? null)
    const [reason, setReason] = useState<string | null>(null)
    const [slip, setSlip] = useState(false)
    const ready = no !== null && reason !== null && slip
    if (tickets.length === 0)
        return (
            <div>
                <SheetTitle sub="Nothing issued yet this shift.">Void a ticket</SheetTitle>
            </div>
        )
    return (
        <div>
            <SheetTitle sub="Logged with a reason. The depot counts slips against voids.">Void a ticket</SheetTitle>
            <div style={{ display: "grid", gap: 6 }}>
                {tickets.map(x => (
                    <ListButton key={x.no} on={no === x.no} danger onClick={() => (feedback(), setNo(x.no))} style={{ fontSize: 13, minHeight: 44, padding: "8px 10px" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            #{pad(x.no)} → {STOPS[x.to]}
                        </span>
                        <span style={{ flexShrink: 0, fontWeight: 900 }}>
                            {x.paid + x.free} pax · ₹{x.amount}
                        </span>
                    </ListButton>
                ))}
            </div>
            <Label>1 · Reason</Label>
            <ReasonChips reasons={VOID_REASONS} value={reason} onChange={setReason} danger />
            <Label>2 · Paper slip</Label>
            <ListButton on={slip} danger onClick={() => (feedback(), setSlip(s => !s))}>
                <span>{slip ? "☑" : "☐"} Slip dropped in satchel slot</span>
            </ListButton>
            <Label>3 · Hold to confirm</Label>
            <HoldButton enabled={ready} onDone={() => no !== null && reason && onVoid(no, reason)} />
            {!ready && <div style={{ fontSize: 12, color: t.text2, marginTop: 6 }}>Pick a ticket, a reason and the slip first.</div>}
        </div>
    )
}

function TraySheet({ pending, change, onFail, onGive }: { pending: Ticket[]; change: { no: number; amount: number }[]; onFail: (no: number) => void; onGive: (no: number, amount: number) => void }) {
    const t = useT()
    return (
        <div>
            <SheetTitle sub="Pending UPI prints only after the bank confirms.">Waiting</SheetTitle>
            <Label>UPI pending</Label>
            {pending.length === 0 && <div style={{ fontSize: 14, color: t.text2 }}>None</div>}
            <div style={{ display: "grid", gap: 6 }}>
                {pending.map(p => (
                    <div key={p.no} style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                        <div style={{ flex: 1, background: t.pending, color: t.pendingText, border: `2px solid ${t.pendingBorder}`, borderRadius: 12, padding: "8px 10px", fontSize: 13, fontWeight: 800 }}>
                            #{pad(p.no)} · ₹{p.amount}
                            <div style={{ fontSize: 11, fontWeight: 700 }}>Waiting for bank…</div>
                        </div>
                        <ListButton danger onClick={() => onFail(p.no)} style={{ width: 110, justifyContent: "center", color: t.dangerText, fontSize: 13 }}>
                            Not paid
                        </ListButton>
                    </div>
                ))}
            </div>
            <Label>Change owed</Label>
            {change.length === 0 && <div style={{ fontSize: 14, color: t.text2 }}>None</div>}
            <div style={{ display: "grid", gap: 6 }}>
                {change.map(c => (
                    <ListButton key={c.no} onClick={() => onGive(c.no, c.amount)}>
                        <span>
                            #{pad(c.no)} · <b>₹{c.amount}</b>
                        </span>
                        <span style={{ fontWeight: 900 }}>Mark given</span>
                    </ListButton>
                ))}
            </div>
        </div>
    )
}

function ShiftSheet({ counters }: { counters: { tickets: number; pax: number; free: number; cash: number; upi: number; voids: number } }) {
    const t = useT()
    const rows: [string, string][] = [
        ["Tickets", String(counters.tickets)],
        ["Passengers", String(counters.pax)],
        ["Free riders", String(counters.free)],
        ["Cash", `₹${counters.cash}`],
        ["UPI", `₹${counters.upi}`],
        ["Voids", String(counters.voids)],
    ]
    return (
        <div>
            <SheetTitle sub={`Route ${ROUTE} · this shift`}>Shift summary</SheetTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {rows.map(([k, v]) => (
                    <div key={k} style={{ background: t.surface, border: `2px solid ${t.border}`, borderRadius: 12, padding: "8px 10px" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: t.text2 }}>{k.toUpperCase()}</div>
                        <div style={{ fontSize: 22, fontWeight: 900 }}>{v}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function Label({ children }: { children: React.ReactNode }) {
    const t = useT()
    return <div style={{ fontSize: 12, fontWeight: 800, color: t.text2, margin: "12px 0 6px" }}>{children}</div>
}

function ReasonChips({ reasons, value, onChange, danger }: { reasons: string[]; value: string | null; onChange: (r: string) => void; danger?: boolean }) {
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {reasons.map(r => (
                <ListButton key={r} on={value === r} danger={danger} onClick={() => (feedback(), onChange(r))} style={{ width: "auto", fontSize: 13, padding: "8px 12px", minHeight: 44 }}>
                    {r}
                </ListButton>
            ))}
        </div>
    )
}

function HoldButton({ enabled, onDone }: { enabled: boolean; onDone: () => void }) {
    const t = useT()
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
            style={{
                ...btn,
                width: "100%",
                height: 60,
                borderRadius: 14,
                position: "relative",
                overflow: "hidden",
                touchAction: "none",
                background: enabled ? t.danger : t.surface,
                color: enabled ? t.dangerOnFill : t.text2,
                border: enabled ? "none" : `2px dashed ${t.border}`,
                fontSize: 17,
                fontWeight: 900,
            }}
            onPointerDown={begin}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
        >
            <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${progress * 100}%`, background: "rgba(255,255,255,0.35)" }} />
            <span style={{ position: "relative" }}>HOLD 1 s TO VOID</span>
        </button>
    )
}

function DemoPanel(p: {
    dark: boolean
    leftHanded: boolean
    gpsOk: boolean
    pending: number
    log: string[]
    onTheme: () => void
    onHand: () => void
    onAdvance: () => void
    onGps: () => void
    onConfirmUpi: () => void
    onReset: () => void
}) {
    const side: React.CSSProperties = { ...btn, background: "#FFFFFF", color: "#000", border: "2px solid #000", borderRadius: 12, padding: "10px 8px", fontSize: 13, fontWeight: 800 }
    const title: React.CSSProperties = { fontSize: 12, fontWeight: 900, color: "#333", letterSpacing: 0.6, textTransform: "uppercase", margin: "20px 0 8px" }
    return (
        <div style={{ width: 440, maxWidth: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Conductor ticketing · v2</div>
            <div style={{ fontSize: 13, color: "#333", marginTop: 4, lineHeight: 1.5 }}>360 × 640 screen with sun and shade themes. Route V-335E, 46 stops; fares are samples. Not tested with conductors yet.</div>

            <div style={title}>Simulate</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button style={side} onClick={p.onTheme}>
                    {p.dark ? "☀ Sun theme" : "☾ Shade theme"}
                </button>
                <button style={side} onClick={p.onHand}>
                    {p.leftHanded ? "Right-handed" : "Left-handed"}
                </button>
                <button style={side} onClick={p.onAdvance}>
                    Bus crosses next stage
                </button>
                <button style={side} onClick={p.onGps}>
                    {p.gpsOk ? "Lose GPS (flyover)" : "Restore GPS"}
                </button>
                <button style={{ ...side, opacity: p.pending ? 1 : 0.5 }} onClick={p.onConfirmUpi}>
                    Bank confirms oldest UPI
                </button>
                <button style={side} onClick={p.onReset}>
                    Reset shift
                </button>
            </div>

            <div style={title}>What changed from v1</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "#222" }}>
                <li>Sun and shade themes from the token spec, switchable in one tap.</li>
                <li>After ISSUE the bar turns into NEXT SALE, so a jolt-induced double tap cannot print twice. Tapping a stop skips it.</li>
                <li>The last ticket stays on screen as proof until the next sale starts.</li>
                <li>Pending UPI and change owed live in one tray with Not paid and Mark given actions.</li>
                <li>Real V-335E stops, grouped by road segment. Flyovers, underpasses and bridges tagged in the route file drop GPS when the bus reaches them.</li>
                <li>Shift totals move into a summary sheet, which frees space for larger targets on 360 × 640.</li>
            </ul>

            <div style={title}>Audit log</div>
            <div style={{ background: "#FFFFFF", border: "2px solid #000", borderRadius: 12, padding: 10, height: 170, overflow: "auto", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, lineHeight: 1.6 }}>
                {p.log.length === 0 ? (
                    <div style={{ color: "#333" }}>Every sale, void and stage change is logged here.</div>
                ) : (
                    p.log.map((l, i) => (
                        <div key={i} style={{ color: l.includes("VOID") ? "#B00020" : "#000", fontWeight: l.includes("Stage set") ? 800 : 400 }}>
                            {l}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
