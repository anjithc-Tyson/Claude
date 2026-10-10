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
// Fare stages: a stage is a fare band of several stops, not one stop. Each entry is the stop
// number (seq in the route file) where a stage begins. Sample grouping until the depot's stage list is wired in.
const STAGE_STARTS = [1, 4, 7, 10, 14, 18, 21, 24, 27, 31, 35, 39, 43]
const STAGE_OF = FULL_NAMES.map((_, i) => STAGE_STARTS.filter(seq => seq <= i + 1).length - 1)
const STAGE_COUNT = STAGE_STARTS.length
// Vajra-style sample fare by stages travelled (minimum fare inside one stage).
const FARE_BY_STAGES = [15, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70]
const stagesBetween = (from: number, to: number) => STAGE_OF[to] - STAGE_OF[from]
const fareFor = (from: number, to: number) => FARE_BY_STAGES[Math.min(Math.max(stagesBetween(from, to), 0), FARE_BY_STAGES.length - 1)]
// Popular stops keep a fixed tile position for the whole trip, so muscle memory works.
const POPULAR = ["Marathahalli", "Kundalahalli Gate", "ITPL Whitefield", "Hope Farm"].map(n => FULL_NAMES.indexOf(n))
const POPULAR_LABEL = ["Marathahalli", "Kundalahalli Gate", "ITPL", "Hope Farm"]
// Soft hyphens at syllable breaks, so long names wrap legibly in a 4-across tile instead of being cut.
const SPLITS: Record<string, string> = {
    Kempegowda: "Kempe-gowda",
    Corporation: "Corpo-ration",
    Rajarajeshwari: "Raja-rajeshwari",
    Helicopter: "Heli-copter",
    Doddanekkundi: "Dodda-nekkundi",
    Munnekolalu: "Munne-kolalu",
    Whitefield: "White-field",
    Murugeshpalya: "Murugesh-palya",
    Mahadevapura: "Mahadeva-pura",
    Accounts: "Ac-counts",
}
const hyphenate = (name: string) =>
    name
        .split(" ")
        .map(w => (SPLITS[w] ?? w.replace(/(.{3,})(halli|palya)$/i, "$1-$2")).replace(/-/g, "\u00AD"))
        .join(" ")
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
type Sheet = null | "stage" | "void" | "upi" | "more" | "trays" | "shift"
type Lang = "en" | "kn"

// UI strings. Stop names stay in English as printed in the route file.
// Kannada strings are a first pass and need review by a native speaker before field use.
const STRINGS = {
    en: {
        stageBtn: "STAGE ±",
        void: "VOID",
        pending: "PENDING",
        popular: "POPULAR",
        nearest: "NEXT STOPS",
        more: "MORE",
        allStops: "All stops",
        byStage: "by stage",
        held: "held",
        stopsLeft: (n: number) => (n === 1 ? "1 stop" : `${n} stops`),
        stages: (n: number) => (n <= 0 ? "0 stages" : n === 1 ? "1 stage" : `${n} stages`),
        passed: "passed",
        paid: "PAID",
        free: "FREE",
        note: "NOTE",
        issue: "ISSUE",
        pickStop: "PICK A STOP",
        addPassenger: "ADD A PASSENGER",
        nextSale: "NEXT SALE",
        orTapStop: "or tap a stop",
        change: "Change",
        from: "from",
        noteTooSmall: "Note too small",
        boarding: "BOARDING",
        stop: "Stop",
        stage: "Stage",
        close: "Close",
        confirm: "CONFIRM",
        gpsLost: "GPS LOST · FIX",
        manual: "MANUAL STAGE",
        offline: "OFFLINE · SAVED",
        printing: "printing",
        printed: "printed",
        farStops: "All stops ahead",
        farSub: "Grouped by fare stage. Every stop in a stage costs the same.",
        scanToPay: "SCAN TO PAY",
        park: "Park · serve next passenger",
        payCash: "Paying cash instead",
        printsAfterBank: "The ticket prints only after the bank confirms.",
        correctStage: "Correct stage",
        reason: "Reason",
        voidTitle: "Void a ticket",
        hold: "HOLD 1 s TO VOID",
        slip: "Slip dropped in satchel slot",
        pendingTitle: "Pending",
        printer: "Printer",
        ready: "Ready",
        upiWait: "UPI waiting for bank",
        changeOwed: "Change owed",
        none: "None",
        notPaid: "Not paid",
        markGiven: "Mark given",
        shift: "Shift summary",
    },
    kn: {
        stageBtn: "ಹಂತ ±",
        void: "ರದ್ದು",
        pending: "ಬಾಕಿ",
        popular: "ಜನಪ್ರಿಯ",
        nearest: "ಮುಂದಿನ ನಿಲ್ದಾಣಗಳು",
        more: "ಇನ್ನಷ್ಟು",
        allStops: "ಎಲ್ಲಾ ನಿಲ್ದಾಣ",
        byStage: "ಹಂತವಾರು",
        held: "ಹಿಡಿದಿದೆ",
        stopsLeft: (n: number) => `${n} ನಿಲ್ದಾಣ`,
        stages: (n: number) => (n <= 0 ? "ಅದೇ ಹಂತ" : `${n} ಹಂತ`),
        passed: "ದಾಟಿದೆ",
        paid: "ಪಾವತಿ",
        free: "ಉಚಿತ",
        note: "ನೋಟು",
        issue: "ಟಿಕೆಟ್ ನೀಡಿ",
        pickStop: "ನಿಲ್ದಾಣ ಆರಿಸಿ",
        addPassenger: "ಪ್ರಯಾಣಿಕರನ್ನು ಸೇರಿಸಿ",
        nextSale: "ಮುಂದಿನ ಟಿಕೆಟ್",
        orTapStop: "ಅಥವಾ ನಿಲ್ದಾಣ ಒತ್ತಿ",
        change: "ಚಿಲ್ಲರೆ",
        from: "ರಿಂದ",
        noteTooSmall: "ನೋಟು ಸಾಲದು",
        boarding: "ಹತ್ತಿದ ನಿಲ್ದಾಣ",
        stop: "ನಿಲ್ದಾಣ",
        stage: "ಹಂತ",
        close: "ಮುಚ್ಚಿ",
        confirm: "ಖಚಿತಪಡಿಸಿ",
        gpsLost: "GPS ಇಲ್ಲ · ಸರಿಪಡಿಸಿ",
        manual: "ಕೈಯಾರೆ ಹಂತ",
        offline: "ಆಫ್‌ಲೈನ್ · ಉಳಿಸಲಾಗಿದೆ",
        printing: "ಮುದ್ರಣ",
        printed: "ಮುದ್ರಿತ",
        farStops: "ಮುಂದಿನ ಎಲ್ಲಾ ನಿಲ್ದಾಣಗಳು",
        farSub: "ಹಂತವಾರು ಗುಂಪು. ಒಂದೇ ಹಂತದ ನಿಲ್ದಾಣಗಳಿಗೆ ಒಂದೇ ದರ.",
        scanToPay: "ಪಾವತಿಸಲು ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
        park: "ಬಾಕಿ ಇಡಿ · ಮುಂದಿನ ಪ್ರಯಾಣಿಕ",
        payCash: "ನಗದು ಪಾವತಿ",
        printsAfterBank: "ಬ್ಯಾಂಕ್ ಖಚಿತಪಡಿಸಿದ ನಂತರವೇ ಟಿಕೆಟ್ ಮುದ್ರಣ.",
        correctStage: "ಹಂತ ಸರಿಪಡಿಸಿ",
        reason: "ಕಾರಣ",
        voidTitle: "ಟಿಕೆಟ್ ರದ್ದು",
        hold: "ರದ್ದು ಮಾಡಲು 1 ಸೆ ಒತ್ತಿ ಹಿಡಿಯಿರಿ",
        slip: "ಚೀಟಿ ಚೀಲದಲ್ಲಿ ಹಾಕಲಾಗಿದೆ",
        pendingTitle: "ಬಾಕಿ",
        printer: "ಮುದ್ರಕ",
        ready: "ಸಿದ್ಧ",
        upiWait: "UPI ಬ್ಯಾಂಕ್ ದೃಢೀಕರಣ ಬಾಕಿ",
        changeOwed: "ಕೊಡಬೇಕಾದ ಚಿಲ್ಲರೆ",
        none: "ಇಲ್ಲ",
        notPaid: "ಪಾವತಿ ಆಗಿಲ್ಲ",
        markGiven: "ಕೊಟ್ಟಿದೆ",
        shift: "ಪಾಳಿ ಸಾರಾಂಶ",
    },
}
type Strings = typeof STRINGS.en

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
const LangCtx = React.createContext<Strings>(STRINGS.en)
const useL = () => React.useContext(LangCtx)
// "3 × ₹45 + 2 free", "2 free" or "1 × ₹15": a group can be all free riders.
const fareLine = (paid: number, fare: number, free: number, L: Strings) =>
    [paid > 0 ? `${paid} × ₹${fare}` : "", free > 0 ? `${free} ${L.free.toLowerCase()}` : ""].filter(Boolean).join(" + ")

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
    const [lang, setLang] = useState<Lang>("en")
    const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null)
    const [network, setNetwork] = useState<{ online: boolean; type: string | null }>({ online: true, type: null })
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
    const L = STRINGS[lang]

    // Device status from the browser where it is available (Battery API is Android Chrome only).
    useEffect(() => {
        const nav = navigator as any
        let bat: any = null
        const readBat = () => bat && setBattery({ level: Math.round(bat.level * 100), charging: !!bat.charging })
        if (nav.getBattery)
            nav.getBattery()
                .then((b: any) => {
                    bat = b
                    readBat()
                    b.addEventListener("levelchange", readBat)
                    b.addEventListener("chargingchange", readBat)
                })
                .catch(() => {})
        const readNet = () => setNetwork({ online: navigator.onLine, type: nav.connection?.effectiveType ?? null })
        readNet()
        window.addEventListener("online", readNet)
        window.addEventListener("offline", readNet)
        nav.connection?.addEventListener?.("change", readNet)
        return () => {
            window.removeEventListener("online", readNet)
            window.removeEventListener("offline", readNet)
            nav.connection?.removeEventListener?.("change", readNet)
            if (bat) {
                bat.removeEventListener("levelchange", readBat)
                bat.removeEventListener("chargingchange", readBat)
            }
        }
    }, [])

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
    const fare = span > 0 && dest !== null ? fareFor(origin, dest) : 0
    const total = fare * paid
    const change = note !== null && dest !== null && total > 0 ? note - total : null
    const graceLeft = sale ? GRACE_SECONDS - Math.floor((now - sale.startedAt) / 1000) : GRACE_SECONDS
    const stampHeld = sale !== null && sale.origin !== stage
    const canIssue = dest !== null && span > 0 && paid + free > 0 && !(change !== null && change < 0)
    const canUpi = canIssue && total > 0

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
        if (x.amount === 0) addLog(`#${pad(x.no)} zero-fare ticket (${x.free} free) logged for audit`)
        setReceipt({ ticket: x, seconds, change: change !== null && change > 0 ? change : null })
        resetSale()
        // An all-free group is a one-off: never carry 0 paid into the next sale.
        if (paid === 0) setPaid(1)
    }
    const openUpi = () => {
        if (!canUpi) return feedback("warn")
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
    const nearest = [1, 2, 3, 4].map(n => origin + n).filter(i => i < STOPS.length)
    // Mid-distance row: the first stop of the stage 4, 5 and 6 stages ahead.
    // Skip a popular stop (it already has a fixed tile) in favour of the next stop in that stage.
    const mid = [4, 5, 6]
        .map(k => STAGE_OF[origin] + k)
        .filter(k => k < STAGE_COUNT)
        .map(k => {
            const inStage = STOPS.map((_, i) => i).filter(i => STAGE_OF[i] === k)
            return inStage.find(i => !POPULAR.includes(i)) ?? inStage[0]
        })
    const changeTotal = changeOwed.reduce((s, c) => s + c.amount, 0)
    const pendingCount = pendingUpi.length + changeOwed.length
    const farPick = dest !== null && !POPULAR.includes(dest) && !nearest.includes(dest) && !mid.includes(dest)
    const toggleNote = (n: number) => {
        feedback()
        touchSale()
        setNote(v => (v === n ? null : n))
    }
    const pickFree = (n: number) => {
        feedback()
        touchSale()
        setFree(n)
    }
    const row = (height: number): React.CSSProperties => ({ display: "flex", flexDirection: dir, gap: 5, height, alignItems: "stretch", flexShrink: 0 })
    const tileRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "86px", gap: 5, flexShrink: 0 }

    const screen = (
        <div style={{ position: "relative", width: mobile ? "100%" : W, height: mobile ? "100%" : H, background: t.bg, color: t.text, overflow: "hidden", display: "flex", flexDirection: "column", padding: "8px 10px", gap: 5, boxSizing: "border-box", fontFamily: FONT }}>
            {/* Status strip: device health and rare settings */}
            <div style={{ ...row(30), alignItems: "center", gap: 6 }}>
                <DeviceStatus battery={battery} network={network} />
                <button
                    aria-label="Shift summary"
                    style={{ ...btn, flex: 1, minWidth: 0, background: "transparent", color: t.text, fontSize: 14, fontWeight: 900, textAlign: "center", padding: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    onClick={() => (feedback(), setSheet("shift"))}
                >
                    {ROUTE}
                </button>
                <SmallToggle label="Language" onClick={() => (feedback(), setLang(l => (l === "en" ? "kn" : "en")))}>
                    {lang === "en" ? "ಕ" : "EN"}
                </SmallToggle>
                <SmallToggle label="Hand" onClick={() => (feedback(), setLeftHanded(v => !v))}>
                    {leftHanded ? "L✋" : "✋R"}
                </SmallToggle>
                <SmallToggle label="Switch theme" onClick={() => (feedback(), setDark(d => !d))}>
                    {dark ? "☾" : "☀"}
                </SmallToggle>
            </div>

            {/* Far corner: risky actions on purpose. Pending tray on the near side. */}
            <div style={row(48)}>
                <StageButton
                    stage={origin}
                    gpsOk={gpsOk}
                    manual={gpsOk && stage !== busStage}
                    online={network.online}
                    alignRight={leftHanded}
                    onClick={() => (feedback(), setSheet("stage"))}
                />
                <button
                    aria-label="Void a ticket"
                    style={{ ...btn, width: 56, background: t.surface, color: t.dangerText, border: `2px solid ${t.dangerText}`, borderRadius: 12, fontSize: 14, fontWeight: 900, padding: 0 }}
                    onClick={() => (feedback(), setSheet("void"))}
                >
                    <div style={{ fontSize: 16, lineHeight: 1 }}>✕</div>
                    {L.void}
                </button>
                <button
                    aria-label="Pending tray"
                    style={{
                        ...btn,
                        width: 96,
                        borderRadius: 12,
                        padding: "2px 8px",
                        textAlign: "left",
                        background: pendingCount ? t.pending : t.surface,
                        color: pendingCount ? t.pendingText : t.text,
                        border: `2px solid ${pendingCount ? t.pendingBorder : t.border}`,
                    }}
                    onClick={() => (feedback(), setSheet("trays"))}
                >
                    <div style={{ fontSize: 14, lineHeight: "16px", fontWeight: 900, color: pendingCount ? t.pendingText : t.text2 }}>{L.pending}</div>
                    <div style={{ fontSize: 14, lineHeight: "19px", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {pendingCount ? [pendingUpi.length ? `UPI ${pendingUpi.length}` : "", changeOwed.length ? `₹${changeTotal}` : ""].filter(Boolean).join(" · ") : "—"}
                    </div>
                </button>
            </div>

            {/* Flexible space: on taller phones it grows here, keeping the thumb zone on the bottom edge */}
            <div style={{ flex: 1, minHeight: 0 }} />
            {notice && (
                <div style={{ position: "absolute", left: 10, right: 10, top: 43, height: 48, zIndex: 2, display: "flex", alignItems: "center", background: t.surface, border: `2px solid ${t.border}`, borderRadius: 12, padding: "0 10px", fontSize: 14, fontWeight: 900, boxSizing: "border-box", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
                    {notice}
                </div>
            )}

            {/* Thumb zone. Row 1: popular stops, fixed for the whole trip. Row 2: the next four stops. Row 3: 4 to 6 stages ahead, and MORE. */}
            <div style={tileRow}>
                {POPULAR.map((i, k) => {
                    const gone = i <= origin
                    return (
                        <Tile
                            key={i}
                            star
                            on={dest === i}
                            disabled={gone}
                            fare={gone ? null : fareFor(origin, i)}
                            name={POPULAR_LABEL[k]}
                            meta={gone ? L.passed : L.stages(stagesBetween(origin, i))}
                            onClick={() => (gone ? feedback("warn") : pickDest(i))}
                        />
                    )
                })}
            </div>
            <div style={tileRow}>
                {nearest.map(i => (
                    <Tile key={i} on={dest === i} fare={fareFor(origin, i)} name={STOPS[i]} meta={L.stages(stagesBetween(origin, i))} onClick={() => pickDest(i)} />
                ))}
            </div>
            <div style={tileRow}>
                {mid.map(i => (
                    <Tile key={i} on={dest === i} fare={fareFor(origin, i)} name={STOPS[i]} meta={L.stages(stagesBetween(origin, i))} onClick={() => pickDest(i)} />
                ))}
                {origin + 1 < STOPS.length && (
                    <Tile
                        on={farPick}
                        fare={farPick && dest !== null ? fareFor(origin, dest) : null}
                        title={L.more}
                        name={farPick && dest !== null ? STOPS[dest] : L.allStops}
                        meta={farPick && dest !== null ? L.stages(stagesBetween(origin, dest)) : L.byStage}
                        onClick={() => (feedback(), touchSale(), setSheet("more"))}
                        style={{ gridColumn: 4 }}
                    />
                )}
            </div>

            <div style={{ ...row(52), marginTop: 4 }}>
                <RowLabel>{L.paid}</RowLabel>
                <Segmented dir={dir}>
                {[0, 1, 2, 3, 4].map(n => (
                    <Chip key={n} on={paid === n} onClick={() => pickPaid(n)}>
                        {n}
                    </Chip>
                ))}
                <Chip on={paid >= 5} onClick={() => pickPaid(paid >= 5 ? Math.min(paid + 1, 20) : 5)}>
                    {paid >= 5 ? paid : "5+"}
                </Chip>
                </Segmented>
            </div>

            {/* Free riders (for example Shakti): one tap, like PAID */}
            <div style={row(52)}>
                <RowLabel>{L.free}</RowLabel>
                <Segmented dir={dir}>
                {[0, 1, 2, 3].map(n => (
                    <Chip key={n} on={free === n} onClick={() => pickFree(n)} aria={`${n} free`}>
                        {n}
                    </Chip>
                ))}
                <Chip on={free >= 4} onClick={() => pickFree(free >= 4 ? Math.min(free + 1, 20) : 4)} aria="4 or more free">
                    {free >= 4 ? free : "4+"}
                </Chip>
                </Segmented>
            </div>

            {/* Quick note chips: the note handed over, tap again to clear. Change is computed, never typed. */}
            <div style={row(52)}>
                <RowLabel>{L.note}</RowLabel>
                <Segmented dir={dir}>
                {NOTES.map(n => (
                    <Chip key={n} on={note === n} small onClick={() => toggleNote(n)} dim={dest !== null && (total === 0 || n < total)}>
                        ₹{n}
                    </Chip>
                ))}
                </Segmented>
            </div>

            {/* Commit row: ISSUE on the thumb side, UPI opposite. After issuing it shows the ticket and becomes NEXT SALE, so a double tap cannot double-issue. */}
            <div style={{ ...row(76), marginTop: 4 }}>
                <button
                    aria-label="UPI QR"
                    style={{ ...btn, width: 72, borderRadius: 16, background: t.surface, color: canUpi ? t.text : t.text2, border: `2px ${canUpi ? "solid" : "dashed"} ${t.border}`, opacity: canUpi ? 1 : 0.6 }}
                    onClick={openUpi}
                >
                    <QrGlyph color={canUpi ? t.text : t.text2} />
                    <div style={{ fontSize: 14, fontWeight: 900, marginTop: 2 }}>UPI</div>
                </button>
                {receipt && dest === null ? (
                    <button
                        style={{ ...btn, flex: 1, minWidth: 0, borderRadius: 16, background: t.go, color: t.goText, border: t.goBorder, padding: "4px 10px", textAlign: "left" }}
                        onClick={() => (feedback(), setReceipt(null))}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, fontSize: 14, fontWeight: 900, lineHeight: "17px" }}>
                            <span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                ✓ #{pad(receipt.ticket.no)} → {STOPS[receipt.ticket.to]}
                            </span>
                            <span style={{ flexShrink: 0 }}>{printQueue.includes(receipt.ticket.no) ? "🖨" : "✓"}</span>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 800, lineHeight: "17px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {fareLine(receipt.ticket.paid, receipt.ticket.fare, receipt.ticket.free, L)} = ₹{receipt.ticket.amount}
                            {receipt.change ? ` · ${L.change} ₹${receipt.change}` : ""}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: "26px" }}>{L.nextSale} ›</div>
                    </button>
                ) : (
                    <button
                        style={{
                            ...btn,
                            flex: 1,
                            minWidth: 0,
                            borderRadius: 16,
                            padding: "2px 6px",
                            background: canIssue ? t.go : t.surface,
                            color: canIssue ? t.goText : t.text2,
                            border: canIssue ? t.goBorder : `2px dashed ${t.border}`,
                        }}
                        onClick={issueCash}
                    >
                        <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {dest === null ? L.pickStop : paid + free === 0 ? L.addPassenger : `${L.issue} · ${fareLine(paid, fare, free, L)}`}
                            {stampHeld ? ` · ${L.held} ${Math.max(0, graceLeft)}s` : ""}
                        </div>
                        <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.05 }}>₹{total}</div>
                        {change !== null && (
                            <div style={{ fontSize: 14, fontWeight: 900, whiteSpace: "nowrap" }}>{change < 0 ? L.noteTooSmall : `${L.change} ₹${change} · ${L.note} ₹${note}`}</div>
                        )}
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
                            {sheet === "trays" && <TraySheet printQueue={printQueue} pending={pendingUpi} change={changeOwed} onFail={failUpi} onGive={giveChange} />}
                            {sheet === "shift" && <ShiftSheet counters={counters} />}
                        </div>
                        <div style={{ padding: 12 }}>
                            <button style={{ ...btn, width: "100%", height: 52, borderRadius: 14, background: t.surface, color: t.text, border: `2px solid ${t.border}`, fontSize: 16, fontWeight: 800 }} onClick={() => setSheet(null)}>
                                {L.close}
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
        // Published pages and previews report "preview"; canvas, export and thumbnails keep the fixed frame.
        const live = RenderTarget.current() === RenderTarget.preview
        return (
            <ThemeCtx.Provider value={t}>
                <LangCtx.Provider value={L}>
                <div style={live ? { position: "fixed", inset: 0, height: "100dvh", zIndex: 10, background: t.bg } : { width: "100%", height: "100%" }}>{screen}</div>
                </LangCtx.Provider>
            </ThemeCtx.Provider>
        )
    }

    return (
        <ThemeCtx.Provider value={t}>
            <LangCtx.Provider value={L}>
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
            </LangCtx.Provider>
        </ThemeCtx.Provider>
    )
}

// Far-corner stage control. It names the boarding stop, shows the stage track and turns yellow
// when GPS is lost, the stage was set by hand, or the device is offline.
function StageButton({ stage, gpsOk, manual, online, alignRight, onClick }: { stage: number; gpsOk: boolean; manual: boolean; online: boolean; alignRight: boolean; onClick: () => void }) {
    const t = useT()
    const L = useL()
    const warn = !gpsOk || manual || !online
    const top = !gpsOk ? L.gpsLost : manual ? L.manual : !online ? L.offline : `${L.stageBtn} · ${STAGE_OF[stage] + 1}/${STAGE_COUNT}`
    return (
        <button
            aria-label="Correct stage"
            style={{
                ...btn,
                flex: 1,
                minWidth: 0,
                background: warn ? t.pending : t.surface,
                color: warn ? t.pendingText : t.text,
                border: `2px solid ${warn ? t.pendingBorder : t.border}`,
                borderRadius: 12,
                padding: "0 10px",
                textAlign: alignRight ? "right" : "left",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
            }}
            onClick={onClick}
        >
            <div style={{ fontSize: 14, lineHeight: "16px", fontWeight: 900, color: warn ? t.pendingText : t.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{top}</div>
            <div style={{ fontSize: 15, lineHeight: "19px", fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{STOPS[stage]}</div>
        </button>
    )
}

// GPS state lives in the route card, which turns yellow when it drops.
function DeviceStatus({ battery, network }: { battery: { level: number; charging: boolean } | null; network: { online: boolean; type: string | null } }) {
    const t = useT()
    const low = battery !== null && battery.level <= 20 && !battery.charging
    const bars = !network.online ? 0 : network.type === "slow-2g" ? 1 : network.type === "2g" ? 2 : network.type === "3g" ? 3 : 4
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 900, color: t.text, flexShrink: 0 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: low ? t.dangerText : t.text }} aria-label="Battery">
                <svg width="20" height="11" viewBox="0 0 20 11" aria-hidden="true">
                    <rect x="0.75" y="0.75" width="16.5" height="9.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="18" y="3.5" width="2" height="4" rx="0.5" fill="currentColor" />
                    <rect x="2.5" y="2.5" width={battery ? Math.max(1, (13 * battery.level) / 100) : 0} height="6" rx="1" fill="currentColor" />
                </svg>
                {battery ? `${battery.level}%${battery.charging ? "⚡" : ""}` : "—"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 1.5 }} aria-label="Network">
                {[1, 2, 3, 4].map(k => (
                    <span key={k} style={{ width: 3, height: 3 + k * 2, borderRadius: 1, background: k <= bars ? t.text : t.tile, border: k <= bars ? "none" : `1px solid ${t.border}`, boxSizing: "border-box" }} />
                ))}
                <span style={{ marginLeft: 3, color: network.online ? t.text : t.dangerText }}>{network.online ? (network.type ?? "").toUpperCase() || "NET" : "OFF"}</span>
            </span>
        </div>
    )
}

function SmallToggle({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
    const t = useT()
    return (
        <button aria-label={label} style={{ ...btn, minWidth: 38, height: 30, padding: "0 6px", borderRadius: 9, background: t.surface, color: t.text, border: "none", fontSize: 14, fontWeight: 900 }} onClick={onClick}>
            {children}
        </button>
    )
}

function Tile({ on, fare, name, meta, title, disabled, star, style, onClick }: { on: boolean; fare: number | null; name: string; meta: string; title?: string; disabled?: boolean; star?: boolean; style?: React.CSSProperties; onClick: () => void }) {
    const t = useT()
    const longest = Math.max(...name.split(/\s+/).map(w => w.length))
    // Four tiles across 360 px leave about 66 px for the name, so long single words step down rather than split.
    const nameSize = 13
    return (
        <button
            aria-disabled={disabled}
            style={{
                ...btn,
                background: on ? t.activeBg : disabled ? t.surface : t.tile,
                color: on ? t.activeText : disabled ? t.text2 : t.text,
                border: `${star ? 3 : 2}px ${disabled ? "dashed" : "solid"} ${on ? t.activeBg : t.tileBorder}`,
                borderRadius: 12,
                padding: "5px 6px",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
                minWidth: 0,
                ...style,
            }}
            onClick={onClick}
            data-tile
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: fare === null ? 16 : 22, fontWeight: 900, lineHeight: 1, letterSpacing: -0.3 }}>{fare === null ? title ?? "—" : `₹${fare}`}</span>
            </div>
            <div
                style={{
                    fontSize: nameSize,
                    fontWeight: 800,
                    lineHeight: 1.05,
                    letterSpacing: longest > 9 ? -0.3 : -0.2,
                    hyphens: "manual",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                }}
            >
                {hyphenate(name)}
            </div>
            <div style={{ fontSize: 14, lineHeight: "16px", fontWeight: 600, letterSpacing: -0.3, color: on ? t.activeText : t.text2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</div>
        </button>
    )
}

// One outlined bar per row instead of a box per value: far fewer outlines on screen.
// Each value still fills the full bar height, so the touch target stays 48 dp.
function Segmented({ dir, children }: { dir: "row" | "row-reverse"; children: React.ReactNode }) {
    const t = useT()
    return (
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: dir, background: t.tile, border: `2px solid ${t.tileBorder}`, borderRadius: 14, overflow: "hidden" }}>
            {children}
        </div>
    )
}

function Chip({ on, onClick, children, small, aria, dim }: { on: boolean; onClick: () => void; children: React.ReactNode; small?: boolean; aria?: string; dim?: boolean }) {
    const t = useT()
    return (
        <button
            aria-label={aria}
            style={{
                ...btn,
                flex: 1,
                height: "100%",
                minWidth: 0,
                borderRadius: 11,
                fontSize: small ? 17 : 24,
                fontWeight: 900,
                background: on ? t.activeBg : "transparent",
                boxShadow: on ? `inset 0 0 0 3px ${t.tile}` : "none",
                color: on ? t.activeText : t.text,
                opacity: dim && !on ? 0.4 : 1,
            }}
            onClick={onClick}
        >
            {children}
        </button>
    )
}

function RowLabel({ children }: { children: React.ReactNode }) {
    const t = useT()
    return <div style={{ width: 44, flexShrink: 0, alignSelf: "center", fontSize: 14, fontWeight: 800, color: t.text2, textAlign: "center", overflow: "hidden" }}>{children}</div>
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
            {sub && <div style={{ fontSize: 14, fontWeight: 600, color: t.text2, marginTop: 2 }}>{sub}</div>}
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
    const L = useL()
    const ahead = STOPS.map((_, i) => i).filter(i => i > origin)
    // One header per fare stage: every stop under it costs the same.
    const stages = Array.from(new Set(ahead.map(i => STAGE_OF[i])))
    return (
        <div>
            <SheetTitle sub={L.farSub}>{L.farStops}</SheetTitle>
            {stages.map(k => {
                const stops = ahead.filter(i => STAGE_OF[i] === k)
                const first = stops[0]
                return (
                    <div key={k} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "6px 2px", borderBottom: `2px solid ${t.border}`, marginBottom: 6 }}>
                            <span style={{ fontSize: 15, fontWeight: 900 }}>
                                {L.stage} {k + 1} · {L.stages(stagesBetween(origin, first))}
                                <span style={{ fontSize: 14, fontWeight: 700, color: t.text2 }}> · {SEGMENTS[first]}</span>
                            </span>
                            <span style={{ fontSize: 22, fontWeight: 900, flexShrink: 0 }}>₹{fareFor(origin, first)}</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            {stops.map(i => (
                                <ListButton key={i} onClick={() => onPick(i)} style={{ padding: "8px 10px", fontSize: 14, fontWeight: 800, minHeight: 52 }}>
                                    <span style={{ minWidth: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.15 }}>{STOPS[i]}</span>
                                </ListButton>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

function UpiSheet({ amount, seed, onPark, onCash }: { amount: number; seed: number; onPark: () => void; onCash: () => void }) {
    const t = useT()
    const L = useL()
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
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text2 }}>{L.scanToPay}</div>
            <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1 }}>₹{amount}</div>
            <div style={{ display: "inline-grid", gridTemplateColumns: "repeat(25, 7px)", background: "#FFFFFF", padding: 10, borderRadius: 10, border: "2px solid #000", marginTop: 6 }}>
                {cells.map((on, i) => (
                    <div key={i} style={{ width: 7, height: 7, background: on ? "#000" : "#fff" }} />
                ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text2, marginTop: 6 }}>Sample QR · new code per ticket</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginTop: 6 }}>{L.printsAfterBank}</div>
            <BigButton kind="pending" onClick={onPark}>
                {L.park}
            </BigButton>
            <ListButton onClick={onCash} style={{ justifyContent: "center", marginTop: 8 }}>
                {L.payCash}
            </ListButton>
        </div>
    )
}

function StageSheet({ stage, gpsStage, gpsOk, onSet }: { stage: number; gpsStage: number; gpsOk: boolean; onSet: (s: number, reason: string) => void }) {
    const t = useT()
    const L = useL()
    const [pick, setPick] = useState(stage)
    const [reason, setReason] = useState(gpsOk ? STAGE_REASONS[0] : STAGE_REASONS[1])
    const current = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        if (current.current) current.current.scrollIntoView({ block: "center" })
    }, [])
    return (
        <div>
            <SheetTitle sub={`GPS ${gpsOk ? `suggests ${STOPS[gpsStage]}` : "is lost"}. Every change is logged with a reason.`}>{L.correctStage}</SheetTitle>
            <div style={{ maxHeight: 230, overflow: "auto", border: `2px solid ${t.border}`, borderRadius: 12, padding: "0 6px 6px" }}>
                {STOPS.slice(0, -1).map((s, i) => (
                    <div key={i} ref={i === stage ? current : undefined}>
                        {(i === 0 || STAGE_OF[i] !== STAGE_OF[i - 1]) && (
                            <Label>
                                {L.stage.toUpperCase()} {STAGE_OF[i] + 1} · {SEGMENTS[i].toUpperCase()}
                            </Label>
                        )}
                        <ListButton on={pick === i} onClick={() => (feedback(), setPick(i))} style={{ fontSize: 14, padding: "8px 10px", marginTop: 4 }}>
                            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {i + 1}. {FULL_NAMES[i]}
                            </span>
                            {gpsOk && i === gpsStage && <span style={{ fontSize: 14, fontWeight: 900, flexShrink: 0 }}>GPS</span>}
                        </ListButton>
                    </div>
                ))}
            </div>
            <Label>{L.reason}</Label>
            <ReasonChips reasons={STAGE_REASONS} value={reason} onChange={setReason} />
            <BigButton kind="go" onClick={() => onSet(pick, reason)}>
                {L.confirm} · {STOPS[pick]}
            </BigButton>
        </div>
    )
}

function VoidSheet({ tickets, onVoid }: { tickets: Ticket[]; onVoid: (no: number, reason: string) => void }) {
    const t = useT()
    const L = useL()
    const [no, setNo] = useState<number | null>(tickets[0]?.no ?? null)
    const [reason, setReason] = useState<string | null>(null)
    const [slip, setSlip] = useState(false)
    const ready = no !== null && reason !== null && slip
    if (tickets.length === 0)
        return (
            <div>
                <SheetTitle sub="Nothing issued yet this shift.">{L.voidTitle}</SheetTitle>
            </div>
        )
    return (
        <div>
            <SheetTitle sub="Logged with a reason. The depot counts slips against voids.">{L.voidTitle}</SheetTitle>
            <div style={{ display: "grid", gap: 6 }}>
                {tickets.map(x => (
                    <ListButton key={x.no} on={no === x.no} danger onClick={() => (feedback(), setNo(x.no))} style={{ fontSize: 14, minHeight: 44, padding: "8px 10px" }}>
                        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            #{pad(x.no)} → {STOPS[x.to]}
                        </span>
                        <span style={{ flexShrink: 0, fontWeight: 900 }}>
                            {x.paid + x.free} pax · ₹{x.amount}
                        </span>
                    </ListButton>
                ))}
            </div>
            <Label>1 · {L.reason}</Label>
            <ReasonChips reasons={VOID_REASONS} value={reason} onChange={setReason} danger />
            <Label>2 · Paper slip</Label>
            <ListButton on={slip} danger onClick={() => (feedback(), setSlip(s => !s))}>
                <span>
                    {slip ? "☑" : "☐"} {L.slip}
                </span>
            </ListButton>
            <Label>3 · Hold to confirm</Label>
            <HoldButton enabled={ready} onDone={() => no !== null && reason && onVoid(no, reason)} />
            {!ready && <div style={{ fontSize: 14, color: t.text2, marginTop: 6 }}>Pick a ticket, a reason and the slip first.</div>}
        </div>
    )
}

function TraySheet({ printQueue, pending, change, onFail, onGive }: { printQueue: number[]; pending: Ticket[]; change: { no: number; amount: number }[]; onFail: (no: number) => void; onGive: (no: number, amount: number) => void }) {
    const t = useT()
    const L = useL()
    return (
        <div>
            <SheetTitle>{L.pendingTitle}</SheetTitle>
            <Label>{L.printer}</Label>
            <div style={{ fontSize: 15, fontWeight: 800 }}>
                {printQueue.length ? `#${pad(printQueue[0])} ${L.printing}${printQueue.length > 1 ? ` · +${printQueue.length - 1}` : ""}` : L.ready}
            </div>
            <Label>{L.upiWait}</Label>
            {pending.length === 0 && <div style={{ fontSize: 14, color: t.text2 }}>{L.none}</div>}
            <div style={{ display: "grid", gap: 6 }}>
                {pending.map(p => (
                    <div key={p.no} style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                        <div style={{ flex: 1, background: t.pending, color: t.pendingText, border: `2px solid ${t.pendingBorder}`, borderRadius: 12, padding: "8px 10px", fontSize: 14, fontWeight: 800 }}>
                            #{pad(p.no)} → {STOPS[p.to]} · ₹{p.amount}
                        </div>
                        <ListButton danger onClick={() => onFail(p.no)} style={{ width: 104, justifyContent: "center", color: t.dangerText, fontSize: 14 }}>
                            {L.notPaid}
                        </ListButton>
                    </div>
                ))}
            </div>
            <Label>{L.changeOwed}</Label>
            {change.length === 0 && <div style={{ fontSize: 14, color: t.text2 }}>{L.none}</div>}
            <div style={{ display: "grid", gap: 6 }}>
                {change.map(c => (
                    <ListButton key={c.no} onClick={() => onGive(c.no, c.amount)}>
                        <span>
                            #{pad(c.no)} · <b>₹{c.amount}</b>
                        </span>
                        <span style={{ fontWeight: 900 }}>{L.markGiven}</span>
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
            <SheetTitle sub={`Route ${ROUTE} · this shift`}>{useL().shift}</SheetTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {rows.map(([k, v]) => (
                    <div key={k} style={{ background: t.surface, border: `2px solid ${t.border}`, borderRadius: 12, padding: "8px 10px" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: t.text2 }}>{k.toUpperCase()}</div>
                        <div style={{ fontSize: 22, fontWeight: 900 }}>{v}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function Label({ children }: { children: React.ReactNode }) {
    const t = useT()
    return <div style={{ fontSize: 14, fontWeight: 800, color: t.text2, margin: "12px 0 6px" }}>{children}</div>
}

function ReasonChips({ reasons, value, onChange, danger }: { reasons: string[]; value: string | null; onChange: (r: string) => void; danger?: boolean }) {
    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {reasons.map(r => (
                <ListButton key={r} on={value === r} danger={danger} onClick={() => (feedback(), onChange(r))} style={{ width: "auto", fontSize: 14, padding: "8px 12px", minHeight: 44 }}>
                    {r}
                </ListButton>
            ))}
        </div>
    )
}

function HoldButton({ enabled, onDone }: { enabled: boolean; onDone: () => void }) {
    const t = useT()
    const L = useL()
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
            <span style={{ position: "relative" }}>{L.hold}</span>
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

            <div style={title}>How this screen works</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "#222" }}>
                <li>Popular stops (Marathahalli, Kundalahalli Gate, ITPL, Hope Farm) keep fixed tiles for the whole trip; the next three stops sit below.</li>
                <li>Tiles show fare stages, not stops. 46 stops are grouped into 13 sample stages with Vajra-style sample fares.</li>
                <li>Note chips record the note handed over, and change is worked out automatically.</li>
                <li>Pending UPI, change owed and the printer live in one tray. Void and Stage ± stay in the far corner.</li>
                <li>Top strip: battery and network from the device, language, hand and theme.</li>
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
