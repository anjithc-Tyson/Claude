/**
 * Takshila Team Hub — Framer code component.
 *
 * Drop it on a page, set "API URL" to your Apps Script web app URL (see team-hub/README.md),
 * and style it from the properties panel. People sign in with their work email + a one-time code.
 * Leadership can mark attendance, edit the team and send emails; everyone else sees only their own data.
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

const { useState, useEffect, useMemo, useCallback, useRef } = React

/* ------------------------------------------------------------------ types */

type Level = "leadership" | "manager" | "employee"
type Member = { id: string; name: string; email: string; linearEmail: string; title: string; level: Level; reportsTo: string; getsEmail: boolean; inReports: boolean }
type Task = { id: string; title: string; url: string; status: "backlog" | "unstarted" | "started" | "done"; statusName: string; priority: "urgent" | "high" | "medium" | "low" | "none"; due: string; project: string; labels: string[]; assigneeId: string; createdAt: string; doneAt: string; blocked: boolean }
type AttRec = { status: "ontime" | "late" | "absent" | "excused"; minsLate: number | null; joinedAt: string; source: string }
type Settings = { meeting: string; calendarTitle: string; start: string; grace: number; days: number[]; attendees: string[]; scopeOwner: string; dashboardUrl: string }
type Hub = { me: { id: string; name: string; title: string; level: Level }; today: string; updated: string; team: Member[]; settings: Settings; tasks: Task[]; people: Record<string, { id: string; name: string }>; hidden: number; attendance: Record<string, Record<string, AttRec>>; attendees: string[] }

type Props = {
    apiUrl: string
    accent: string
    background: string
    panel: string
    sunk: string
    text: string
    muted: string
    good: string
    warn: string
    bad: string
    font: string
    radius: number
    title: string
    style?: React.CSSProperties
}

/* ------------------------------------------------------------------ helpers */

const PRI: Record<string, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low", none: "No priority" }
const PRI_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
const TYPE_RANK: Record<string, number> = { backlog: 0, unstarted: 1, started: 2, done: 3 }
const LEVELS: Record<Level, string> = { leadership: "Leadership", manager: "Manager", employee: "Employee" }
const ATT = { ontime: "On time", late: "Late", absent: "Absent", excused: "Excused" } as const
const ATT_CYCLE = ["", "ontime", "late", "absent", "excused"] as const
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const TOKEN_KEY = "takshila-hub-token"

const d8 = (s: string) => new Date(s + "T12:00:00Z")
const addDays = (s: string, n: number) => { const d = d8(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const dow = (s: string) => d8(s).getUTCDay()
const fmtDate = (s: string) => (s ? d8(s).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" }) : "")
const dayName = (s: string) => d8(s).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" })
const daysBetween = (a: string, b: string) => Math.round((d8(b).getTime() - d8(a).getTime()) / 864e5)
const initials = (n: string) => (n || "?").replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"
const sortT = (a: Task, b: Task) => PRI_ORDER[a.priority] - PRI_ORDER[b.priority] || (a.due || "9999").localeCompare(b.due || "9999") || a.id.localeCompare(b.id, undefined, { numeric: true })
const fmt12 = (t: string) => { if (!t) return ""; const [h, m] = t.split(":").map(Number); return ((h % 12) || 12) + ":" + String(m).padStart(2, "0") + (h < 12 ? " AM" : " PM") }
const store = {
    get: () => { try { return localStorage.getItem(TOKEN_KEY) || "" } catch { return "" } },
    set: (v: string) => { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY) } catch {} },
}

async function post(api: string, body: Record<string, unknown>) {
    // text/plain avoids a CORS preflight, which Apps Script can't answer.
    const r = await fetch(api, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) })
    return r.json()
}

function relDue(t: Task, today: string) {
    if (!t.due) return "No due date"
    const n = daysBetween(today, t.due)
    if (n < 0) return -n + (n === -1 ? " day" : " days") + " overdue"
    if (n === 0) return "Due today"
    if (n === 1) return "Due tomorrow"
    return "Due in " + n + " days"
}

/* ------------------------------------------------------------------ component */

export default function TeamHub(props: Props) {
    const { apiUrl, accent, background, panel, sunk, text, muted, good, warn, bad, font, radius } = props
    const [token, setToken] = useState<string>(() => store.get())
    const [hub, setHub] = useState<Hub | null>(null)
    const [state, setState] = useState<"idle" | "loading" | "error">("idle")
    const [err, setErr] = useState("")
    const [tab, setTab] = useState<"dashboard" | "tasks" | "attendance" | "team">("dashboard")
    const [toast, setToast] = useState("")
    const toastTimer = useRef<number>()

    const say = useCallback((m: string) => { setToast(m); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(""), 2600) }, [])

    const load = useCallback(async (refresh = false) => {
        if (!apiUrl || !token) return
        setState("loading")
        try {
            const r = await fetch(apiUrl + (apiUrl.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token) + (refresh ? "&refresh=1" : ""))
            const j = await r.json()
            if (!j.ok) {
                if (j.error === "signed_out") { store.set(""); setToken(""); setHub(null); setState("idle"); return }
                throw new Error(j.error || "Something went wrong")
            }
            setHub(j); setState("idle"); setErr("")
        } catch (e: any) { setErr(e.message || "Couldn't reach the dashboard service."); setState("error") }
    }, [apiUrl, token])

    useEffect(() => { load() }, [load])

    const act = useCallback(async (action: string, body: Record<string, unknown>, ok?: string) => {
        try {
            const j = await post(apiUrl, { action, token, ...body })
            if (!j.ok) { say(j.error === "not_allowed" ? "Only leadership can change this." : j.error === "signed_out" ? "Your session ended. Sign in again." : "Couldn't save: " + j.error); return null }
            if (ok) say(ok)
            await load()
            return j
        } catch { say("Couldn't reach the dashboard service. Try again."); return null }
    }, [apiUrl, token, load, say])

    const C = { accent, background, panel, sunk, text, muted, good, warn, bad, radius }
    const css = useMemo(() => buildCss(C, font), [accent, background, panel, sunk, text, muted, good, warn, bad, radius, font])

    const shell = (children: React.ReactNode) => (
        <div className="th" style={{ ...props.style, width: "100%", height: "100%", overflow: "auto" }}>
            <style>{css}</style>
            {children}
            {toast ? <div className="th-toast" role="status">{toast}</div> : null}
        </div>
    )

    if (!apiUrl) return shell(<div className="th-empty"><b>Add your API URL</b><span>Select this component and paste the Apps Script web app URL into "API URL" in the properties panel.</span></div>)
    if (!token) return shell(<Login api={apiUrl} title={props.title} onToken={(t) => { store.set(t); setToken(t) }} />)
    if (!hub) return shell(<div className="th-empty">{state === "error" ? <><b>Couldn't load the dashboard</b><span>{err}</span><button className="th-cta" onClick={() => load()}>Try again</button></> : <span>Loading…</span>}</div>)

    const isLead = hub.me.level === "leadership"
    const mem = (id: string) => hub.team.find((m) => m.id === id) || hub.people[id]
    const hour = new Date().getHours()
    const greet = (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening") + ", " + hub.me.name.split(" ")[0]
    const tabs: [typeof tab, string][] = [["dashboard", "Dashboard"], ["tasks", "Tasks"], ["attendance", "Attendance"], ...(isLead ? ([["team", "Team & emails"]] as [typeof tab, string][]) : [])]

    return shell(
        <div className="th-app">
            <header className="th-head">
                <div>
                    <h1>{tab === "dashboard" ? greet : tabs.find((t) => t[0] === tab)![1]}</h1>
                    <p className="th-sub">Live from Linear · updated {new Date(hub.updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{hub.hidden ? " · " + hub.hidden + " hidden" : ""}</p>
                </div>
                <nav className="th-nav" aria-label="Views">
                    {tabs.map(([k, l]) => <button key={k} aria-current={tab === k ? "page" : undefined} onClick={() => setTab(k)}>{l}</button>)}
                </nav>
                <div className="th-me">
                    <button className="th-round" title="Refresh" aria-label="Refresh from Linear" onClick={() => load(true)} disabled={state === "loading"}>↻</button>
                    <span className="th-av" title={hub.me.name}>{initials(hub.me.name)}</span>
                    <button className="th-ghost" onClick={async () => { try { await post(apiUrl, { action: "signOut", token }) } catch {} store.set(""); setToken(""); setHub(null) }}>Sign out</button>
                </div>
            </header>
            {tab === "dashboard" && <Dashboard hub={hub} mem={mem} go={(t) => setTab(t)} />}
            {tab === "tasks" && <Tasks hub={hub} mem={mem} />}
            {tab === "attendance" && <Attendance hub={hub} canEdit={isLead} act={act} />}
            {tab === "team" && isLead && <Team hub={hub} act={act} />}
        </div>
    )
}

/* ------------------------------------------------------------------ login */

function Login({ api, title, onToken }: { api: string; title: string; onToken: (t: string) => void }) {
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [step, setStep] = useState<"email" | "code">("email")
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState("")
    const send = async (e: React.FormEvent) => {
        e.preventDefault(); if (!/^\S+@\S+\.\S+$/.test(email)) { setMsg("Enter your work email address."); return }
        setBusy(true); setMsg("")
        try { await post(api, { action: "requestCode", email }); setStep("code"); setMsg("If " + email + " is on the team, a 6-digit code is on its way. It expires in 10 minutes.") }
        catch { setMsg("Couldn't reach the dashboard service. Try again.") }
        setBusy(false)
    }
    const verify = async (e: React.FormEvent) => {
        e.preventDefault(); setBusy(true); setMsg("")
        try {
            const j = await post(api, { action: "verifyCode", email, code })
            if (j.ok && j.token) onToken(j.token)
            else setMsg(j.error === "code_expired" ? "That code has expired. Request a new one." : "That code doesn't match. Check the email and try again.")
        } catch { setMsg("Couldn't reach the dashboard service. Try again.") }
        setBusy(false)
    }
    return (
        <div className="th-login">
            <form className="th-card" onSubmit={step === "email" ? send : verify}>
                <div className="th-logo">T</div>
                <h1>{title}</h1>
                <p className="th-sub">{step === "email" ? "Sign in with your work email. We'll send you a one-time code." : "Enter the 6-digit code from your email."}</p>
                {step === "email" ? (
                    <label className="th-fld"><span>Work email</span><input id="th-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@takshila.co" autoFocus /></label>
                ) : (
                    <label className="th-fld"><span>Code</span><input id="th-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" autoFocus /></label>
                )}
                <button className="th-cta th-big" disabled={busy || (step === "code" && code.length !== 6)}>{busy ? "Please wait…" : step === "email" ? "Send code" : "Sign in"}</button>
                {step === "code" ? <button type="button" className="th-ghost" onClick={() => { setStep("email"); setCode(""); setMsg("") }}>Use a different email</button> : null}
                <p className="th-msg" role="status">{msg}</p>
            </form>
        </div>
    )
}

/* ------------------------------------------------------------------ dashboard */

function derive(hub: Hub) {
    const td = hub.today, wk = addDays(td, 6), ago7 = addDays(td, -7), all = hub.tasks, open = all.filter((t) => t.status !== "done")
    return {
        open, overdue: open.filter((t) => t.due && t.due < td), week: open.filter((t) => t.due && t.due >= td && t.due <= wk),
        started: open.filter((t) => t.status === "started"), hot: open.filter((t) => t.priority === "urgent" || t.priority === "high"),
        unassigned: open.filter((t) => !t.assigneeId), blocked: open.filter((t) => t.blocked),
        done7: all.filter((t) => t.status === "done" && t.doneAt.slice(0, 10) >= ago7),
    }
}

function stages(list: Task[], today: string, win: number) {
    const map = new Map<string, { name: string; type: string; items: Task[] }>()
    for (const t of list) { if (t.status === "done") continue; const k = t.statusName || t.status; if (!map.has(k)) map.set(k, { name: k, type: t.status, items: [] }); map.get(k)!.items.push(t) }
    const arr = [...map.values()].sort((a, b) => (TYPE_RANK[a.type] ?? 1) - (TYPE_RANK[b.type] ?? 1) || a.name.localeCompare(b.name))
    const since = addDays(today, -win)
    arr.push({ name: "Done", type: "done", items: list.filter((t) => t.status === "done" && t.doneAt.slice(0, 10) >= since) })
    return arr
}

function Dashboard({ hub, mem, go }: { hub: Hub; mem: (id: string) => any; go: (t: "tasks") => void }) {
    const [win, setWin] = useState(7)
    const d = derive(hub), td = hub.today
    const stg = stages(hub.tasks, td, win), openStg = stg.filter((s) => s.type !== "done"), done = stg[stg.length - 1]
    const peak = openStg.reduce<any>((m, x) => (!m || x.items.length > m.items.length ? x : m), null)
    const fill = (t: string) => (t === "done" ? "var(--good)" : t === "started" ? "var(--accent)" : t === "unstarted" ? "var(--muted)" : "repeating-linear-gradient(135deg,var(--hatch) 0 2px,transparent 2px 6px)")
    const soon = addDays(td, 3)
    const att = d.open.map((t) => {
        const r: string[] = []; const hot = t.priority === "urgent" || t.priority === "high"
        if (t.due && t.due < td) r.push("Overdue"); if (t.blocked) r.push("Blocked"); if (hot && !t.assigneeId) r.push("No owner"); if (hot && t.due && t.due >= td && t.due <= soon) r.push("Due soon")
        return { t, r }
    }).filter((x) => x.r.length).sort((a, b) => sortT(a.t, b.t))
    const load: Record<string, number> = {}; d.open.forEach((t) => { if (t.assigneeId) load[t.assigneeId] = (load[t.assigneeId] || 0) + 1 })
    const ppl = Object.entries(load).map(([k, n]) => ({ m: mem(k), n })).filter((x) => x.m).sort((a, b) => b.n - a.n)
    const mx = Math.max(1, ...ppl.map((x) => x.n))
    const projects = [...new Set(d.open.map((t) => t.project).filter(Boolean))].map((p) => ({ p, o: d.open.filter((t) => t.project === p).length, l: d.overdue.filter((t) => t.project === p).length })).sort((a, b) => b.o - a.o)
    const kpis: [string, number, string, string?][] = [
        ["Open issues", d.open.length, projects.length + (projects.length === 1 ? " project" : " projects")], ["In progress", d.started.length, Math.round((d.started.length / (d.open.length || 1)) * 100) + "% of open"],
        ["Due this week", d.week.length, "next 7 days"], ["Overdue", d.overdue.length, d.overdue.length ? "needs a date" : "on track", d.overdue.length ? "bad" : ""],
        ["Urgent & high", d.hot.length, d.hot.filter((t) => !t.assigneeId).length + " no owner"], ["Unassigned", d.unassigned.length, "open"], ["Done · 7 days", d.done7.length, "closed", "hi"],
    ]
    return (
        <div className="th-col">
            <div className="th-kpis">{kpis.map(([k, v, s, c]) => <div key={k} className={"th-kpi " + (c || "")}><div className="k">{k}</div><div className="row"><span className="v">{v}</span><span className="s">{s}</span></div></div>)}</div>

            <section className="th-panel">
                <div className="th-ph"><div><h2>Workflow</h2><p>Where open work sits in Linear, from brief to done</p></div>
                    <div className="th-seg">{[7, 30].map((n) => <button key={n} aria-pressed={win === n} onClick={() => setWin(n)}>{n} days</button>)}</div></div>
                {peak && peak.items.length ? <div className="th-callout"><i />{peak.items.length + " of " + d.open.length} open issues are in <b>{peak.name}</b>{peak.type === "backlog" ? " and haven't started yet." : "."} <b>{done.items.length} closed</b> in the last {win} days.</div> : null}
                <div className="th-flowbar">{openStg.filter((s) => s.items.length).map((s) => <i key={s.name} title={s.name + ": " + s.items.length} style={{ flex: s.items.length + " 1 0", background: fill(s.type) }} />)}</div>
                <div className="th-flow">{stg.map((s, i) => (
                    <React.Fragment key={s.name}>
                        {i ? <span className="th-arrow">›</span> : null}
                        <div className={"th-stage" + (s === peak ? " peak" : "")}>
                            <div className="fh"><span className="sw" style={{ background: fill(s.type) }} />{s.type === "done" ? "Done" : s.name}{s === peak ? <span className="tag">Most work</span> : null}</div>
                            <div className="big">{s.items.length}</div>
                            <div className="fm"><span>{s.type === "done" ? "closed · last " + win + " days" : Math.round((s.items.length / (d.open.length || 1)) * 100) + "% of open"}</span>
                                {s.type !== "done" && s.items.filter((t) => t.priority === "urgent" || t.priority === "high").length ? <span className="badtxt">{s.items.filter((t) => t.priority === "urgent" || t.priority === "high").length} urgent/high</span> : null}</div>
                        </div>
                    </React.Fragment>))}
                </div>
            </section>

            <div className="th-lower">
                <section className="th-panel">
                    <div className="th-ph"><div><h2>Due this week</h2><p>{d.week.length} open with a due date in the next 7 days</p></div></div>
                    {d.week.length ? [...d.week].sort((a, b) => a.due.localeCompare(b.due) || sortT(a, b)).slice(0, 6).map((t) => (
                        <div key={t.id} className="th-drow"><div className="when"><b>{dayName(t.due)}</b><small>{fmtDate(t.due)}</small></div>
                            <div className="mid"><a className="ttl" href={t.url} target="_blank" rel="noopener">{t.title}</a><div className="sub">{t.id} · {t.project || "No project"} · {mem(t.assigneeId)?.name || "Unassigned"}</div></div>
                            <span className={"th-st " + t.status}><i />{t.statusName}</span></div>)) : <p className="th-note">Nothing has a due date this week.</p>}
                    <div className="th-foot"><div className="lbl">Overdue · {d.overdue.length}</div>
                        {d.overdue.length ? <div className="th-slots">{d.overdue.slice(0, 8).map((t) => <a key={t.id} className="th-slot" href={t.url} target="_blank" rel="noopener" title={t.title}>{t.id} · {fmtDate(t.due)}</a>)}</div> : <div className="th-note">Nothing overdue.</div>}</div>
                </section>

                <section className="th-panel">
                    <div className="th-ph"><div><h2>Needs attention</h2><p>Urgent work with no owner, overdue or blocked</p></div>{att.length ? <span className="th-badge">{att.length} to act on</span> : null}</div>
                    {att.length ? att.slice(0, 4).map(({ t, r }) => { const m = mem(t.assigneeId); return (
                        <div key={t.id} className="th-acard"><div className="r1"><span className="th-av">{m ? initials(m.name) : "?"}</span>
                            <div className="mid"><div className="ttl">{t.title}</div><div className="sub">{m ? m.name : "No owner"} · {t.project || "No project"} · {t.statusName}</div></div>
                            <a className="th-open" href={t.url} target="_blank" rel="noopener">Open</a></div>
                            <div className="r2"><span className="th-chip y">{r[0]}</span>{r[1] ? <span className="th-chip">{r[1]}</span> : null}<span>{PRI[t.priority]}</span><span className="t">{relDue(t, td)}</span></div></div>) }) : <p className="th-note">Nothing urgent is stuck.</p>}
                    {att.length > 4 ? <button className="th-link" onClick={() => go("tasks")}>See all tasks ›</button> : null}
                </section>

                <section className="th-panel th-stack">
                    <div className="th-mini"><div className="mh">Open work by person<span>{ppl.length}</span></div>
                        {ppl.slice(0, 6).map((x) => <div key={x.m.id} className="th-mrow"><span className="nm">{x.m.name}</span><span className="th-meter"><i style={{ width: Math.round((x.n / mx) * 100) + "%" }} /></span><span className="val">{x.n}</span></div>)}
                        {d.unassigned.length ? <div className="th-mrow"><span className="nm">Unassigned</span><span className="val">{d.unassigned.length}</span></div> : null}</div>
                    <div className="th-mini"><div className="mh">Projects<span>{projects.length}</span></div>
                        {projects.map((x) => <div key={x.p} className="th-mrow"><span className="nm">{x.p}</span><span className="val">{x.o} open</span>{x.l ? <span className="val badtxt">{x.l} late</span> : null}</div>)}</div>
                    <div className="th-mini"><div className="mh">Done this week<span>{d.done7.length}</span></div>
                        {d.done7.length ? d.done7.slice(0, 4).map((t) => <div key={t.id} className="th-mrow"><a className="nm" href={t.url} target="_blank" rel="noopener">{t.title}</a><span className="val">{mem(t.assigneeId)?.name.split(" ")[0] || "–"}</span></div>) : <div className="th-note">Nothing closed in the last 7 days.</div>}</div>
                </section>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ tasks */

function Tasks({ hub, mem }: { hub: Hub; mem: (id: string) => any }) {
    const [view, setView] = useState<"board" | "list">("board")
    const [q, setQ] = useState("")
    const [who, setWho] = useState("")
    const [proj, setProj] = useState("")
    const [pri, setPri] = useState("")
    const since = addDays(hub.today, -7)
    const base = hub.tasks.filter((t) => t.status !== "done" || t.doneAt.slice(0, 10) >= since)
    const list = base.filter((t) => (!q || (t.title + " " + t.id).toLowerCase().includes(q.toLowerCase())) && (!proj || t.project === proj) && (!who || (who === "none" ? !t.assigneeId : t.assigneeId === who)) && (!pri || t.priority === pri)).sort(sortT)
    const whoIds = [...new Set(hub.tasks.map((t) => t.assigneeId).filter(Boolean))].map(mem).filter(Boolean).sort((a: any, b: any) => a.name.localeCompare(b.name))
    const projects = [...new Set(hub.tasks.map((t) => t.project).filter(Boolean))].sort()
    const due = (t: Task) => { if (!t.due || t.status === "done") return ""; const n = daysBetween(hub.today, t.due); return n < 0 ? "late" : n <= 2 ? "soon" : "" }
    return (
        <section className="th-panel">
            <div className="th-ph"><div><h2>All tasks <span className="th-note">· {list.length}</span></h2><p>Open work plus anything finished in the last 7 days</p></div>
                <div className="th-tools">
                    <input className="th-in" type="search" placeholder="Search tasks" aria-label="Search tasks" value={q} onChange={(e) => setQ(e.target.value)} />
                    <select className="th-sel" aria-label="Project" value={proj} onChange={(e) => setProj(e.target.value)}><option value="">All projects</option>{projects.map((p) => <option key={p} value={p}>{p}</option>)}</select>
                    <select className="th-sel" aria-label="Person" value={who} onChange={(e) => setWho(e.target.value)}><option value="">Anyone</option><option value="none">Unassigned</option>{whoIds.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
                    <select className="th-sel" aria-label="Priority" value={pri} onChange={(e) => setPri(e.target.value)}><option value="">Any priority</option>{Object.entries(PRI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <div className="th-seg">{(["board", "list"] as const).map((v) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === "board" ? "Board" : "List"}</button>)}</div>
                </div></div>
            {!list.length ? <p className="th-note">No tasks match these filters.</p> : view === "board" ? (
                <div className="th-board">{stages(list, hub.today, 7).filter((c) => c.items.length || c.type !== "done").map((c) => (
                    <div key={c.name} className="th-colm"><h3>{c.type === "done" ? "Done · last 7 days" : c.name}<span>{c.items.length}</span></h3>
                        {c.items.slice(0, 60).map((t) => { const m = mem(t.assigneeId), dc = due(t); return (
                            <div key={t.id} className={"th-card2" + (t.status === "done" ? " done" : "")}>
                                <a className="ttl" href={t.url} target="_blank" rel="noopener">{t.title}</a>
                                <div className="meta"><span className="id">{t.id}</span>{t.priority === "urgent" ? <span className="tag u">Urgent</span> : t.priority === "high" ? <span className="tag h">High</span> : null}{t.blocked ? <span className="tag u">Blocked</span> : null}{t.project ? <span className="tag">{t.project}</span> : null}{t.due ? <span className={"due " + dc}>{dc === "late" ? "Overdue · " : "Due "}{fmtDate(t.due)}</span> : null}</div>
                                {m ? <span className="who"><span className="th-av sm">{initials(m.name)}</span>{m.name}</span> : <span className="th-note">Unassigned</span>}
                            </div>) })}
                    </div>))}</div>
            ) : (
                <div className="th-tablewrap"><table className="th-table"><thead><tr>{["Task", "Status", "Priority", "Owner", "Project", "Due"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{list.map((t) => <tr key={t.id}><td><span className="id">{t.id} </span><a className="ttl" href={t.url} target="_blank" rel="noopener">{t.title}</a></td><td><span className={"th-st " + t.status}><i />{t.statusName}</span></td><td>{PRI[t.priority]}</td><td>{mem(t.assigneeId)?.name || <span className="th-note">Unassigned</span>}</td><td>{t.project || "–"}</td><td>{t.due ? <span className={"due " + due(t)}>{fmtDate(t.due)}</span> : "–"}</td></tr>)}</tbody></table></div>
            )}
        </section>
    )
}

/* ------------------------------------------------------------------ attendance */

function Attendance({ hub, canEdit, act }: { hub: Hub; canEdit: boolean; act: (a: string, b: Record<string, unknown>, ok?: string) => Promise<any> }) {
    const [week, setWeek] = useState(0)
    const set = hub.settings, td = hub.today
    const ppl = hub.team.filter((m) => hub.attendees.includes(m.id))
    const others = hub.team.filter((m) => !hub.attendees.includes(m.id))
    const mon = addDays(td, -((dow(td) + 6) % 7) + 7 * week)
    const range = (a: string, b: string) => { const o: string[] = []; for (let x = a; x <= b; x = addDays(x, 1)) if (set.days.includes(dow(x))) o.push(x); return o }
    const dates = range(mon, addDays(mon, 6)), past30 = range(addDays(td, -29), td)
    const rec = (d: string, id: string) => hub.attendance[d]?.[id]
    const count = (ds: string[], id: string) => { const o = { ontime: 0, late: 0, absent: 0, excused: 0, none: 0, mins: 0 }; ds.forEach((d) => { if (d > td) return; const r = rec(d, id); if (!r) { o.none++; return } (o as any)[r.status]++; if (r.status === "late" && r.minsLate) o.mins += r.minsLate }); return o }
    let on = 0, late = 0, abs = 0; ppl.forEach((m) => { const c = count(dates, m.id); on += c.ontime; late += c.late; abs += c.absent })
    const total = on + late + abs, wl = week === 0 ? "this week" : week === -1 ? "last week" : fmtDate(mon) + " week"
    const [pending, setPending] = useState<Record<string, string>>({})
    const cycle = async (d: string, id: string) => {
        const cur = pending[d + id] ?? rec(d, id)?.status ?? ""
        const next = ATT_CYCLE[(ATT_CYCLE.indexOf(cur as any) + 1) % ATT_CYCLE.length]
        setPending((p) => ({ ...p, [d + id]: next }))
        await act("setAttendance", { date: d, personId: id, status: next })
        setPending((p) => { const n = { ...p }; delete n[d + id]; return n })
    }
    return (
        <div className="th-col">
            <section className="th-panel">
                <div className="th-ph"><div><h2>{set.meeting}</h2><p>{set.days.map((n) => WD[n]).join(", ")} at {fmt12(set.start)} · on time = joined within {set.grace ? set.grace + " minutes" : "the start time"} · {ppl.length} tracked</p></div></div>
                <div className="th-pbox"><span className="lbl">Tracking</span>
                    {ppl.map((m) => <span key={m.id} className="th-pchip"><span className="th-av sm">{initials(m.name)}</span>{m.name}{canEdit ? <button aria-label={"Remove " + m.name + " from attendance"} onClick={() => act("setAttendees", { ids: hub.attendees.filter((x) => x !== m.id) }, "Removed " + m.name)}>×</button> : null}</span>)}
                    {canEdit && others.length ? <select className="th-sel add" aria-label="Add person to attendance" value="" onChange={(e) => e.target.value && act("setAttendees", { ids: [...hub.attendees, e.target.value] }, "Added to attendance")}><option value="">+ Add person</option>{others.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select> : null}
                </div>
                <div className="th-kpis four">
                    <div className="th-kpi hi"><div className="k">On-time rate · {wl}</div><div className="row"><span className="v">{total ? Math.round((on / total) * 100) + "%" : "–"}</span><span className="s">{total ? total + " check-ins" : "nothing recorded"}</span></div></div>
                    <div className="th-kpi"><div className="k">On time</div><div className="row"><span className="v">{on}</span><span className="s">{wl}</span></div></div>
                    <div className="th-kpi"><div className="k">Late</div><div className="row"><span className="v">{late}</span><span className="s">{wl}</span></div></div>
                    <div className={"th-kpi" + (abs ? " bad" : "")}><div className="k">Absent</div><div className="row"><span className="v">{abs}</span><span className="s">{wl}</span></div></div>
                </div>
            </section>
            <section className="th-panel">
                <div className="th-ph"><div><h2>Day by day</h2><p>{canEdit ? "Click a cell to cycle: On time → Late → Absent → Excused → clear" : "Marked by leadership and filled in from Google Meet"}</p></div>
                    <div className="th-weeknav"><button className="th-round" aria-label="Previous week" onClick={() => setWeek(week - 1)}>‹</button><b>{fmtDate(mon)} – {fmtDate(addDays(mon, 6))}</b><button className="th-round" aria-label="Next week" disabled={week >= 0} onClick={() => setWeek(week + 1)}>›</button></div></div>
                <div className="th-tablewrap"><table className="th-table att"><thead><tr><th>Person</th>{dates.map((d) => <th key={d} className={d === td ? "today" : ""}>{dayName(d)} {d8(d).getUTCDate()}</th>)}</tr></thead>
                    <tbody>{ppl.map((m) => <tr key={m.id}><td><span className="who"><span className="th-av sm">{initials(m.name)}</span>{m.name}</span></td>{dates.map((d) => {
                        const st = (pending[d + m.id] ?? rec(d, m.id)?.status ?? "") as keyof typeof ATT | ""
                        const r = rec(d, m.id), fut = d > td
                        const label = st ? ATT[st] + (st === "late" && r?.minsLate && !pending[d + m.id] ? " · " + r.minsLate + "m" : "") : fut ? "·" : "Not marked"
                        return <td key={d}><button className={"th-acell " + (st || "none")} disabled={fut || !canEdit} aria-label={m.name + ", " + dayName(d) + " " + fmtDate(d) + ": " + label} onClick={() => cycle(d, m.id)}>{label}</button></td>
                    })}</tr>)}</tbody></table></div>
            </section>
            <section className="th-panel">
                <div className="th-ph"><div><h2>Who's on time</h2><p>Counts for the week above, and the last 30 days</p></div></div>
                <div className="th-tablewrap"><table className="th-table"><thead><tr>{["Person", "On time", "Late", "Absent", "Not marked", "On-time rate · 30 days"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{ppl.map((m) => { const w = count(dates, m.id), t = count(past30, m.id), tr = t.ontime + t.late + t.absent, pct = tr ? Math.round((t.ontime / tr) * 100) : null
                        return <tr key={m.id}><td><span className="who"><span className="th-av sm">{initials(m.name)}</span>{m.name}</span></td><td>{w.ontime}</td><td>{w.late}{w.mins ? " (" + w.mins + "m)" : ""}</td><td className={w.absent ? "badtxt" : ""}>{w.absent}</td><td className="th-note">{w.none}</td>
                            <td>{pct == null ? "–" : <span className="th-rate"><span className="th-meter"><i style={{ width: pct + "%" }} /></span>{pct}%</span>}</td></tr> })}</tbody></table></div>
            </section>
        </div>
    )
}

/* ------------------------------------------------------------------ team & emails (leadership) */

function Team({ hub, act }: { hub: Hub; act: (a: string, b: Record<string, unknown>, ok?: string) => Promise<any> }) {
    const [open, setOpen] = useState<string | null>(null)
    const [adding, setAdding] = useState(false)
    const R: Record<Level, number> = { leadership: 0, manager: 1, employee: 2 }
    const list = [...hub.team].sort((a, b) => R[a.level] - R[b.level] || a.name.localeCompare(b.name))
    const save = (m: Member, patch: Partial<Member>, ok = "Saved") => act("saveMember", { member: { ...m, ...patch } }, ok)
    return (
        <div className="th-tgrid">
            <section className="th-panel">
                <div className="th-ph"><div><h2>People & roles</h2><p>{list.length} people · leadership see everything, managers their team, employees only themselves</p></div>
                    <button className="th-cta" onClick={() => setAdding(!adding)}>{adding ? "Cancel" : "Add person"}</button></div>
                {adding ? <MemberForm team={hub.team} onSave={async (m) => { const r = await act("saveMember", { member: m }, "Added " + m.name); if (r) setAdding(false) }} /> : null}
                {list.map((m) => { const n = hub.team.filter((o) => o.reportsTo === m.id).length; return (
                    <div key={m.id} className={"th-person" + (open === m.id ? " editing" : "")}>
                        <div className="prow"><span className="th-av">{initials(m.name)}</span>
                            <div className="nm"><div className="pname">{m.name}</div><div className="sub">{[m.title, n ? n + " direct report" + (n > 1 ? "s" : "") : ""].filter(Boolean).join(" · ") || "No job title yet"}</div></div>
                            <span className={"th-lvl " + m.level}>{LEVELS[m.level]}</span>
                            <label className="th-sw" title="Gets the Monday and Friday emails"><input type="checkbox" role="switch" checked={m.getsEmail} onChange={(e) => save(m, { getsEmail: e.target.checked })} />Email</label>
                            <label className="th-sw" title="When off, their tasks are left out of every email and report"><input type="checkbox" role="switch" checked={m.inReports} onChange={(e) => save(m, { inReports: e.target.checked })} />In reports</label>
                            <button className="th-edit" aria-expanded={open === m.id} onClick={() => setOpen(open === m.id ? null : m.id)}>{open === m.id ? "Done" : "Edit"}</button></div>
                        {open === m.id ? <MemberForm team={hub.team} member={m} onSave={(x) => save(m, x)} onRemove={() => act("removeMember", { id: m.id }, "Removed " + m.name).then(() => setOpen(null))} /> : null}
                    </div>) })}
            </section>
            <SendPanel hub={hub} act={act} />
        </div>
    )
}

function MemberForm({ team, member, onSave, onRemove }: { team: Member[]; member?: Member; onSave: (m: Member) => void; onRemove?: () => void }) {
    const blank: Member = { id: "", name: "", email: "", linearEmail: "", title: "", level: "employee", reportsTo: "", getsEmail: true, inReports: true }
    const [m, setM] = useState<Member>(member || blank)
    const [armed, setArmed] = useState(false)
    const f = (k: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setM({ ...m, [k]: e.target.value } as Member)
    const submit = (e: React.FormEvent) => {
        e.preventDefault(); if (!m.name.trim()) return
        const id = m.id || m.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "person-" + Date.now()
        onSave({ ...m, id, name: m.name.trim(), email: m.email.trim(), linearEmail: m.linearEmail.trim() })
    }
    return (
        <form className="th-mform" onSubmit={submit}>
            <label className="th-fld"><span>Name</span><input value={m.name} onChange={f("name")} required /></label>
            <label className="th-fld"><span>Job title</span><input value={m.title} onChange={f("title")} /></label>
            <label className="th-fld"><span>Role</span><select value={m.level} onChange={f("level")}>{Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="th-fld"><span>Email for the digest and sign-in</span><input type="email" value={m.email} onChange={f("email")} /></label>
            <label className="th-fld"><span>Linear login email, if different</span><input type="email" value={m.linearEmail} onChange={f("linearEmail")} /></label>
            <label className="th-fld"><span>Reports to</span><select value={m.reportsTo} onChange={f("reportsTo")}><option value="">Nobody</option>{team.filter((o) => o.id !== m.id).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
            <div className="full row">{onRemove ? <button type="button" className="th-ghost warn" onClick={() => (armed ? onRemove() : setArmed(true))}>{armed ? "Click again to remove " + m.name : "Remove from team"}</button> : <span />}<button className="th-cta">{member ? "Save changes" : "Add person"}</button></div>
        </form>
    )
}

function SendPanel({ hub, act }: { hub: Hub; act: (a: string, b: Record<string, unknown>, ok?: string) => Promise<any> }) {
    const [kind, setKind] = useState<"ahead" | "review">("review")
    const [period, setPeriod] = useState<"std" | "today" | "range">("std")
    const [who, setWho] = useState<"all" | "me">("me")
    const [from, setFrom] = useState(hub.today)
    const [to, setTo] = useState(addDays(hub.today, 6))
    const [armed, setArmed] = useState(false)
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState("")
    const n = who === "me" ? 1 : hub.team.filter((m) => m.getsEmail && m.inReports && m.email).length
    const send = async () => {
        if (period === "range" && (!from || !to || from > to)) { setMsg("Pick a From date that's on or before the To date."); return }
        if (!armed) { setArmed(true); setMsg("Click again to send. Emails can't be recalled once sent."); return }
        setArmed(false); setBusy(true); setMsg("")
        const r = await act("sendNow", { kind, period, from, to, onlyMe: who === "me" })
        setBusy(false)
        if (r) setMsg("Sent " + r.result.sent + " of " + r.result.total + (r.result.failed.length ? ". Couldn't send: " + r.result.failed.join("; ") : "."))
    }
    return (
        <div className="th-col">
            <section className="th-panel">
                <div className="th-ph"><div><h2>Send emails now</h2><p>Same emails as the schedule: Design & SEO only, scoped to each person's role</p></div></div>
                <div className="th-send">
                    <label className="th-fld"><span>Which email</span><select value={kind} onChange={(e) => { setKind(e.target.value as any); setArmed(false) }}><option value="ahead">Week ahead (Monday email)</option><option value="review">Week in review (Friday email)</option></select></label>
                    <label className="th-fld"><span>Period</span><select value={period} onChange={(e) => { setPeriod(e.target.value as any); setArmed(false) }}><option value="std">Usual period</option><option value="today">Today's tasks only</option><option value="range">Custom date range</option></select></label>
                    {period === "range" ? <div className="two"><label className="th-fld"><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="th-fld"><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div> : null}
                    <label className="th-fld"><span>Send to</span><select value={who} onChange={(e) => { setWho(e.target.value as any); setArmed(false) }}><option value="me">Test: only me</option><option value="all">Everyone who gets email</option></select></label>
                    <button className="th-cta th-big" disabled={busy} onClick={send}>{busy ? "Sending…" : armed ? "Confirm: email " + n + (n === 1 ? " person" : " people") : "Send emails now"}</button>
                    <p className="th-msg" role="status">{msg}</p>
                </div>
            </section>
            <section className="th-panel">
                <div className="th-ph"><div><h2>Schedule</h2><p>Sent automatically by Google Apps Script</p></div></div>
                <div className="th-mini"><div className="mh">Monday plan<span>Mon ~8:45 PM</span></div><div className="th-note">Overdue work, what's due this week, blockers and focus.</div></div>
                <div className="th-mini" style={{ marginTop: 8 }}><div className="mh">Friday review<span>Sat ~12:05 AM</span></div><div className="th-note">Wins, what slipped, what's next, and stand-up attendance.</div></div>
                <p className="th-note" style={{ marginTop: 10 }}>Times are India time. {n} people get emails.</p>
            </section>
        </div>
    )
}

/* ------------------------------------------------------------------ styles */

function buildCss(c: { accent: string; background: string; panel: string; sunk: string; text: string; muted: string; good: string; warn: string; bad: string; radius: number }, font: string) {
    const r = c.radius
    return `
.th{--accent:${c.accent};--bg:${c.background};--panel:${c.panel};--sunk:${c.sunk};--fg:${c.text};--muted:${c.muted};--good:${c.good};--warn:${c.warn};--bad:${c.bad};--hatch:color-mix(in srgb,var(--muted) 55%,transparent);--line:color-mix(in srgb,var(--muted) 22%,transparent);
  background:var(--bg);color:var(--fg);font-family:${font},system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.4;box-sizing:border-box}
.th *{box-sizing:border-box}:where(.th) button,:where(.th) input,:where(.th) select{font:inherit;color:inherit}:where(.th) a{color:inherit}
.th :focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.th-app{padding:20px;display:flex;flex-direction:column;gap:14px;max-width:1480px;margin:0 auto}
.th-col{display:flex;flex-direction:column;gap:14px;min-width:0}
.th-head{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.th-head h1{font-size:28px;font-weight:400;margin:0;letter-spacing:-.01em}
.th-sub{margin:3px 0 0;color:var(--muted);font-size:12.5px}
.th-nav{display:flex;gap:4px;background:var(--panel);border-radius:999px;padding:4px;margin-left:auto;overflow-x:auto;max-width:100%}
.th-nav button{border:0;background:transparent;padding:8px 14px;border-radius:999px;cursor:pointer;white-space:nowrap}
.th-nav button[aria-current="page"]{background:var(--fg);color:var(--bg)}
.th-me{display:flex;align-items:center;gap:8px}
.th-round{width:38px;height:38px;border-radius:50%;border:0;background:var(--panel);cursor:pointer;font-size:16px}
.th-round:disabled{opacity:.4;cursor:default}
.th-av{width:32px;height:32px;border-radius:50%;background:var(--sunk);display:inline-grid;place-items:center;font-size:11px;font-weight:600;flex:none}
.th-av.sm{width:22px;height:22px;font-size:9px}
.th-ghost{border:0;background:transparent;color:var(--muted);cursor:pointer;padding:6px 10px;border-radius:999px}
.th-ghost:hover{color:var(--fg);background:var(--sunk)}.th-ghost.warn{color:var(--bad)}
.th-cta{border:0;background:var(--fg);color:var(--bg);border-radius:999px;padding:10px 18px;cursor:pointer;font-weight:500}
.th-cta:disabled{opacity:.5;cursor:default}.th-big{width:100%;height:46px}
.th-panel{background:var(--panel);border-radius:${r + 6}px;padding:18px;min-width:0}
.th-ph{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.th-ph h2{font-size:18px;font-weight:500;margin:0}.th-ph p{margin:3px 0 0;color:var(--muted);font-size:13px}
.th-note{color:var(--muted);font-size:13px}.badtxt{color:var(--bad)}
.th-kpis{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}
.th-kpis.four{grid-template-columns:repeat(4,minmax(0,1fr))}
@media (max-width:1200px){.th-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (max-width:640px){.th-kpis,.th-kpis.four{grid-template-columns:repeat(2,minmax(0,1fr))}}
.th-kpi{background:var(--panel);border-radius:${r}px;padding:14px;display:flex;flex-direction:column;gap:14px;min-width:0}
.th-kpis.four .th-kpi{background:var(--sunk)}
.th-kpi .k{font-size:12.5px;color:var(--muted)}.th-kpi .row{display:flex;justify-content:space-between;align-items:flex-end;gap:6px}
.th-kpi .v{font-size:32px;line-height:1;font-variant-numeric:tabular-nums}.th-kpi .s{font-size:12px;color:var(--muted);white-space:nowrap}
.th-kpi.hi,.th-kpis.four .th-kpi.hi{background:var(--accent);color:#151514}.th-kpi.hi .k,.th-kpi.hi .s{color:#151514;opacity:.75}
.th-kpi.bad .v{color:var(--bad)}
.th-seg{display:inline-flex;background:var(--sunk);border-radius:999px;padding:3px}
.th-seg button{border:0;background:transparent;border-radius:999px;padding:6px 12px;cursor:pointer;color:var(--muted)}
.th-seg button[aria-pressed="true"]{background:var(--fg);color:var(--bg)}
.th-callout{display:block;background:var(--sunk);border-radius:12px;padding:10px 14px;font-size:13.5px;color:var(--muted);margin-bottom:14px}
.th-callout b{color:var(--fg);font-weight:500}.th-callout i{display:inline-block;width:10px;height:10px;border-radius:50%;background:var(--accent);margin-right:8px;vertical-align:baseline}
.th-flowbar{display:flex;gap:4px;height:12px;margin-bottom:14px}.th-flowbar i{display:block;border-radius:999px;min-width:8px}
.th-flow{display:flex;gap:6px;overflow-x:auto;padding:2px}
.th-arrow{display:grid;place-items:center;color:var(--muted);width:12px;flex:none}
.th-stage{flex:1 1 0;min-width:140px;background:var(--sunk);border-radius:${r}px;padding:14px;display:flex;flex-direction:column;gap:10px}
.th-stage.peak{box-shadow:0 0 0 2px var(--accent) inset}
.th-stage .fh{display:flex;align-items:center;gap:8px;font-size:13.5px}.th-stage .sw{width:12px;height:12px;border-radius:4px}
.th-stage .tag{margin-left:auto;background:var(--accent);color:#151514;border-radius:999px;padding:2px 8px;font-size:11px}
.th-stage .big{font-size:36px;line-height:1}.th-stage .fm{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px;font-size:12px;color:var(--muted)}
.th-lower{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr) minmax(0,1fr);gap:14px}
@media (max-width:1100px){.th-lower{grid-template-columns:1fr}}
.th-drow{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.th-drow .when b{display:block;font-size:16px;font-weight:500}.th-drow .when small{color:var(--muted);font-size:12px}
.mid{min-width:0}.ttl{font-weight:500;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none}a.ttl:hover{text-decoration:underline}
.sub{color:var(--muted);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.th-st{display:inline-flex;align-items:center;gap:6px;background:var(--sunk);border-radius:999px;padding:4px 10px;font-size:12px;white-space:nowrap}
.th-st i{width:7px;height:7px;border-radius:50%;background:var(--muted)}.th-st.started i,.th-st.done i{background:var(--good)}.th-st.unstarted i{background:var(--warn)}
.th-foot{margin-top:12px;background:var(--sunk);border-radius:${r}px;padding:12px}.th-foot .lbl{font-size:12px;color:var(--muted);margin-bottom:8px}
.th-slots{display:flex;flex-wrap:wrap;gap:6px}.th-slot{border:1.5px dashed var(--hatch);border-radius:999px;padding:4px 10px;font-size:12.5px;text-decoration:none}
.th-badge{background:var(--accent);color:#151514;border-radius:999px;padding:3px 10px;font-size:12.5px}
.th-acard{background:var(--sunk);border-radius:${r}px;padding:12px;display:flex;flex-direction:column;gap:10px;margin-bottom:8px}
.th-acard .r1{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center}
.th-acard .r2{display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:12.5px}.th-acard .r2 .t{margin-left:auto;color:var(--muted)}
.th-acard .th-av{background:var(--panel);width:36px;height:36px}
.th-open{background:var(--panel);border-radius:999px;padding:7px 14px;font-size:13px;text-decoration:none}
.th-chip{display:inline-flex;align-items:center;border-radius:999px;padding:3px 10px;font-size:12px;background:var(--panel)}.th-chip.y{background:var(--accent);color:#151514}
.th-link{border:0;background:transparent;cursor:pointer;padding:4px}
.th-stack{display:flex;flex-direction:column;gap:10px}
.th-mini{background:var(--sunk);border-radius:${r}px;padding:12px}
.th-mini .mh{display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px}.th-mini .mh span{color:var(--muted);font-size:13px}
.th-mrow{display:flex;align-items:center;gap:10px;padding:5px 0;font-size:13px}.th-mrow .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none}.th-mrow .val{color:var(--muted)}
.th-meter{width:56px;height:6px;border-radius:999px;background:var(--panel);overflow:hidden;display:inline-block}.th-meter i{display:block;height:100%;background:var(--fg)}
.th-rate{display:inline-flex;align-items:center;gap:8px}
.th-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.th-in,.th-sel{border:0;background:var(--sunk);border-radius:999px;height:38px;padding:0 14px}
.th-sel option{background:var(--panel);color:var(--fg)}
.th-board{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(250px,1fr);gap:10px;overflow-x:auto}
.th-colm{background:var(--sunk);border-radius:${r}px;padding:10px;display:flex;flex-direction:column;gap:8px}
.th-colm h3{display:flex;justify-content:space-between;margin:2px 4px;font-size:13px;font-weight:500}.th-colm h3 span{color:var(--muted)}
.th-card2{background:var(--panel);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px}
.th-card2 .ttl{white-space:normal}.th-card2.done .ttl{text-decoration:line-through;color:var(--muted)}
.meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:var(--muted)}
.id{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--muted)}
.tag{background:var(--sunk);border-radius:999px;padding:2px 8px;font-size:11.5px;color:var(--fg)}
.tag.u{color:var(--bad);background:color-mix(in srgb,var(--bad) 14%,transparent)}.tag.h{color:var(--warn);background:color-mix(in srgb,var(--warn) 14%,transparent)}
.due.late{color:var(--bad)}.due.soon{color:var(--warn)}
.who{display:inline-flex;align-items:center;gap:6px}
.th-tablewrap{overflow-x:auto}.th-table{border-collapse:collapse;width:100%;min-width:640px}
.th-table th,.th-table td{text-align:left;padding:10px;border-bottom:1px solid var(--line)}.th-table th{font-size:12px;color:var(--muted);font-weight:500}
.th-table th.today{color:var(--fg)}
.th-acell{border:0;border-radius:999px;padding:6px 10px;font-size:12px;min-width:84px;cursor:pointer;background:var(--sunk);color:var(--muted);white-space:nowrap}
.th-acell:disabled{cursor:default}
.th-acell.ontime{color:var(--good);background:color-mix(in srgb,var(--good) 16%,transparent)}
.th-acell.late{color:var(--warn);background:color-mix(in srgb,var(--warn) 16%,transparent)}
.th-acell.absent{color:var(--bad);background:color-mix(in srgb,var(--bad) 16%,transparent)}
.th-weeknav{display:flex;align-items:center;gap:10px;font-size:13.5px}.th-weeknav .th-round{width:34px;height:34px;background:var(--sunk)}
.th-pbox{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:14px}.th-pbox .lbl{font-size:12.5px;color:var(--muted)}
.th-pchip{display:inline-flex;align-items:center;gap:7px;background:var(--sunk);border-radius:999px;padding:4px 6px 4px 4px;font-size:13px}
.th-pchip button{border:0;background:transparent;color:var(--muted);width:22px;height:22px;border-radius:50%;cursor:pointer}.th-pchip button:hover{color:var(--bad)}
.th-sel.add{background:transparent;border:1.5px dashed var(--hatch);height:32px}
.th-tgrid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:14px;align-items:start}
@media (max-width:1000px){.th-tgrid{grid-template-columns:1fr}}
.th-person{background:var(--sunk);border-radius:${r}px;padding:12px 14px;margin-bottom:8px}
.th-person .prow{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.th-person .nm{flex:1 1 150px;min-width:0}.pname{font-weight:500;font-size:15px}
.th-lvl{border-radius:999px;padding:2px 10px;font-size:12px;background:var(--panel)}.th-lvl.leadership{background:var(--fg);color:var(--bg)}.th-lvl.manager{background:var(--accent);color:#151514}
.th-sw{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted);cursor:pointer}
.th-sw input{appearance:none;-webkit-appearance:none;width:30px;height:18px;border-radius:999px;background:var(--hatch);position:relative;cursor:pointer;margin:0}
.th-sw input::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff}
.th-sw input:checked{background:var(--good)}.th-sw input:checked::after{transform:translateX(12px)}
.th-edit{border:0;background:var(--panel);border-radius:999px;padding:7px 14px;cursor:pointer;font-size:13px}.th-edit[aria-expanded="true"]{background:var(--fg);color:var(--bg)}
.th-mform{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line)}
.th-mform .full{grid-column:1/-1}.row{display:flex;justify-content:space-between;align-items:center;gap:10px}
@media (max-width:700px){.th-mform{grid-template-columns:1fr}}
.th-fld{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--muted);min-width:0}
.th-fld input,.th-fld select{border:0;background:var(--sunk);border-radius:10px;height:40px;padding:0 12px;color:var(--fg);width:100%}
.th-person .th-fld input,.th-person .th-fld select{background:var(--panel)}
.th-send{display:flex;flex-direction:column;gap:10px}.two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.th-msg{font-size:13px;color:var(--muted);min-height:1.2em;margin:4px 0 0}
.th-login{min-height:100%;display:grid;place-items:center;padding:24px}
.th-card{width:100%;max-width:380px;background:var(--panel);border-radius:${r + 8}px;padding:28px;display:flex;flex-direction:column;gap:14px}
.th-card h1{font-size:24px;font-weight:500;margin:0}
.th-logo{width:44px;height:44px;border-radius:50%;background:var(--fg);color:var(--bg);display:grid;place-items:center;font-weight:700;font-size:18px}
.th-empty{min-height:100%;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;text-align:center;padding:24px;color:var(--muted)}
.th-empty b{color:var(--fg)}
.th-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:20px;background:var(--fg);color:var(--bg);padding:9px 16px;border-radius:999px;font-size:13px;z-index:30}
@media (max-width:640px){.th-app{padding:12px}.th-head h1{font-size:22px}.th-nav{margin-left:0;order:3;width:100%}}
`
}

/* ------------------------------------------------------------------ Framer controls */

TeamHub.defaultProps = {
    apiUrl: "", title: "Takshila Team Hub",
    accent: "#EFEB57", background: "#ECEBE6", panel: "#FFFFFF", sunk: "#F3F2EE", text: "#151514", muted: "#72706A",
    good: "#3B9960", warn: "#C07A0E", bad: "#CC4536", font: '"Google Sans"', radius: 18,
}

addPropertyControls(TeamHub, {
    apiUrl: { type: ControlType.String, title: "API URL", placeholder: "https://script.google.com/macros/s/…/exec" },
    title: { type: ControlType.String, title: "Sign-in title" },
    accent: { type: ControlType.Color, title: "Accent" },
    background: { type: ControlType.Color, title: "Background" },
    panel: { type: ControlType.Color, title: "Panels" },
    sunk: { type: ControlType.Color, title: "Inset" },
    text: { type: ControlType.Color, title: "Text" },
    muted: { type: ControlType.Color, title: "Muted text" },
    good: { type: ControlType.Color, title: "Good" },
    warn: { type: ControlType.Color, title: "Warning" },
    bad: { type: ControlType.Color, title: "Bad" },
    font: { type: ControlType.String, title: "Font family" },
    radius: { type: ControlType.Number, title: "Corner radius", min: 0, max: 32, unit: "px" },
})
