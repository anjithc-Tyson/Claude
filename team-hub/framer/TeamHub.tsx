/**
 * Takshila Team Hub — Framer code component.
 *
 * Drop it on a page, set "API URL" to your Apps Script web app URL (see team-hub/README.md),
 * and style it from the properties panel. People sign in with their work email + a one-time code.
 * Sections (left menu): Dashboard, Tasks, Check-ins (check-in / check-out times), Stand-up attendance,
 * Onboarding (videos and documents people must go through), Documents (folders of links) and, for leadership,
 * Team & emails. Leadership can add documents and onboarding steps, fix check-ins, mark attendance and send emails;
 * everyone else sees only their own data.
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
    const [tab, setTab] = useState<TabKey>("dashboard")
    const [toast, setToast] = useState("")
    const [leaving, setLeaving] = useState(false)
    const [, tick] = useState(0)
    const toastTimer = useRef<number>()
    const routed = useRef(false)

    const say = useCallback((m: string) => { setToast(m); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(""), 2600) }, [])
    useEffect(() => { const t = window.setInterval(() => tick((n) => n + 1), 30000); return () => window.clearInterval(t) }, [])

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

    // new people land on Onboarding until the required steps are done
    useEffect(() => {
        if (!hub || routed.current) return
        routed.current = true
        if (onboardingLeft(hub, hub.me.id) > 0) setTab("onboarding")
    }, [hub])

    const act = useCallback(async (action: string, body: Record<string, unknown>, ok?: string) => {
        try {
            const j = await post(apiUrl, { action, token, ...body })
            if (!j.ok) { say(ERRORS[j.error] || "Couldn't save: " + j.error); return null }
            if (ok) say(ok)
            await load()
            return j
        } catch { say("Couldn't reach the dashboard service. Try again."); return null }
    }, [apiUrl, token, load, say])

    const C = { accent, background, panel, sunk, text, muted, good, warn, bad, radius }
    const css = useMemo(() => buildCss(C, font) + hubCss(radius), [accent, background, panel, sunk, text, muted, good, warn, bad, radius, font])

    const shell = (children: React.ReactNode) => (
        <div className="th" style={{ ...props.style, width: "100%", height: "100%", overflow: "auto" }}>
            <style>{css}</style>
            {children}
            {toast ? <div className="th-toast" role="status">{toast}</div> : null}
        </div>
    )

    if (!apiUrl) return shell(<div className="th-empty"><b>Add your API URL</b><span>Select this component and paste the Apps Script web app URL into "API URL" in the properties panel.</span></div>)
    if (!token) return shell(<Login api={apiUrl} title={props.title} onToken={(t) => { routed.current = false; store.set(t); setToken(t) }} />)
    if (!hub) return shell(<div className="th-empty">{state === "error" ? <><b>Couldn't load the dashboard</b><span>{err}</span><button className="th-cta" onClick={() => load()}>Try again</button></> : <span>Loading…</span>}</div>)

    const isLead = hub.me.level === "leadership"
    const mem = (id: string) => hub.team.find((m) => m.id === id) || hub.people[id]
    const hour = new Date().getHours()
    const greet = (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening") + ", " + hub.me.name.split(" ")[0]
    const left = onboardingLeft(hub, hub.me.id)
    const tabs: { k: TabKey; l: string; i: string; badge?: number }[] = [
        { k: "dashboard", l: "Dashboard", i: "grid" }, { k: "tasks", l: "Tasks", i: "check" },
        { k: "time", l: "Check-ins", i: "clock" }, { k: "leave", l: "Leave", i: "sun", badge: (isLead ? leaveOf(hub).filter((l) => l.status === "pending" && l.personId !== hub.me.id).length : 0) || undefined }, { k: "attendance", l: "Stand-up", i: "users" },
        { k: "onboarding", l: "Onboarding", i: "play", badge: left || undefined }, { k: "docs", l: "Documents", i: "folder" },
        ...(isLead ? [{ k: "team" as TabKey, l: "Team & emails", i: "mail" }] : []),
    ]
    const open = openSessionOf(hub, hub.me.id)
    const signOut = async () => { try { await post(apiUrl, { action: "signOut", token }) } catch {} store.set(""); setToken(""); setHub(null); setLeaving(false) }
    const titleOf = tab === "dashboard" ? greet : tabs.find((t) => t.k === tab)!.l

    return shell(
        <div className="th-shell">
            <aside className="th-side" aria-label="Sections">
                <div className="th-brand"><span className="th-logo sm">T</span><b>{props.title.replace(/^Takshila\s*/i, "") || "Team Hub"}</b></div>
                <nav className="th-snav">
                    {tabs.map((t) => (
                        <button key={t.k} aria-current={tab === t.k ? "page" : undefined} onClick={() => setTab(t.k)}>
                            <Ico n={t.i} /><span>{t.l}</span>{t.badge ? <em aria-label={t.badge + (t.k === "leave" ? " leave requests to review" : " onboarding steps left")}>{t.badge}</em> : null}
                        </button>
                    ))}
                </nav>
                <div className="th-sfoot">
                    <span className="th-av">{initials(hub.me.name)}</span>
                    <div className="who2"><b>{hub.me.name}</b><small>{hub.me.title || LEVELS[hub.me.level]}</small></div>
                    <button className="th-ghost" onClick={() => (open ? setLeaving(true) : signOut())}>Sign out</button>
                </div>
            </aside>

            <main className="th-main">
                <header className="th-head">
                    <div>
                        <h1>{titleOf}</h1>
                        <p className="th-sub">{tab === "docs" || tab === "onboarding" || tab === "time" || tab === "leave" ? "Takshila team" : <>Live from Linear · updated {new Date(hub.updated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{hub.hidden ? " · " + hub.hidden + " hidden" : ""}</>}</p>
                    </div>
                    <div className="th-me">
                        <ClockCard hub={hub} act={act} />
                        <button className="th-round" title="Refresh" aria-label="Refresh" onClick={() => load(true)} disabled={state === "loading"}>↻</button>
                    </div>
                </header>
                {left > 0 && tab !== "onboarding" ? <button className="th-obanner" onClick={() => setTab("onboarding")}><Ico n="play" /><span><b>Finish your onboarding.</b> {left} required {left === 1 ? "step" : "steps"} left.</span><span className="go">Continue ›</span></button> : null}
                {tab === "dashboard" && <Dashboard hub={hub} mem={mem} go={(t) => setTab(t)} />}
                {tab === "tasks" && <Tasks hub={hub} mem={mem} />}
                {tab === "time" && <TimeLog hub={hub} mem={mem} canEdit={isLead} act={act} />}
                {tab === "leave" && <LeavePage hub={hub} canEdit={isLead} act={act} mem={mem} />}
                {tab === "attendance" && <Attendance hub={hub} canEdit={isLead} act={act} />}
                {tab === "onboarding" && <Onboarding hub={hub} canEdit={isLead} act={act} mem={mem} />}
                {tab === "docs" && <Library hub={hub} canEdit={isLead} act={act} />}
                {tab === "team" && isLead && <Team hub={hub} act={act} />}
            </main>

            {leaving ? (
                <div className="th-modal" role="dialog" aria-modal="true" aria-labelledby="th-leave-h" onMouseDown={(e) => e.target === e.currentTarget && setLeaving(false)}>
                    <div className="th-dlg">
                        <h2 id="th-leave-h">You're still checked in</h2>
                        <p className="th-note">Checked in at {fmtTime(open!.checkIn)}. Check out now so today's time is saved?</p>
                        <div className="th-dacts">
                            <button className="th-ghost" onClick={() => setLeaving(false)}>Cancel</button>
                            <button className="th-ghost" onClick={signOut}>Sign out only</button>
                            <button className="th-cta" onClick={async () => { const r = await act("checkOut", {}, "Checked out"); if (r) signOut() }}>Check out & sign out</button>
                        </div>
                    </div>
                </div>
            ) : null}
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


/* ------------------------------------------------------------------ check-ins, onboarding, documents */

type TabKey = "dashboard" | "tasks" | "time" | "leave" | "attendance" | "onboarding" | "docs" | "team"
type Work = { id: string; date: string; personId: string; checkIn: string; checkOut: string; minutes: number | null; source: string; note: string; brk?: number }
type Brk = { id: string; workId: string; personId: string; start: string; end: string }
type Leave = { id: string; personId: string; from: string; to: string; type: "casual" | "sick" | "paid" | "unpaid"; half: boolean; reason: string; status: "pending" | "approved" | "declined" | "cancelled"; decidedBy: string; decidedAt: string; requested: string }
type Folder = { id: string; name: string; description: string; order: number }
type Doc = { id: string; folderId: string; title: string; url: string; description: string; addedBy: string; added: string; order: number }
type Step = { id: string; order: number; title: string; kind: "video" | "doc" | "link" | "task"; url: string; minutes: number; required: boolean; description: string }
type Prog = { personId: string; stepId: string; doneAt: string }
type Act = (a: string, b: Record<string, unknown>, ok?: string) => Promise<any>

const ERRORS: Record<string, string> = {
    not_allowed: "Only leadership can change this.", signed_out: "Your session ended. Sign in again.",
    already_checked_in: "You're already checked in.", not_checked_in: "You're not checked in.",
    folder_not_empty: "Move or remove the documents in this folder first.", bad_url: "Links must start with https://",
    bad_input: "Some details are missing.", not_yours: "You can only edit your own work notes.",
    note_locked: "Work notes lock 12 hours after check-out.",
    already_on_break: "You're already on a break.", not_on_break: "You're not on a break.",
    leave_overlap: "You already have leave on those dates.", own_leave: "Another leader has to approve your own leave.", leave_started: "This leave has started, so it can't be cancelled. Ask leadership.", unknown_action: "Update the Apps Script engine to use this.",
}
const breaksOf = (hub: Hub): Brk[] => (hub as any).breaks || []
const leaveOf = (hub: Hub): Leave[] => (hub as any).leave || []
const brkMins = (b: Brk) => Math.max(0, Math.round(((b.end ? +new Date(b.end) : Date.now()) - +new Date(b.start)) / 60000))
// each session carries its break minutes, so live totals can leave breaks out (closed sessions are already net)
const workOf = (hub: Hub): Work[] => { const bs = breaksOf(hub); return ((hub as any).work || []).map((w: Work) => ({ ...w, brk: bs.filter((b) => b.workId === w.id).reduce((n, b) => n + brkMins(b), 0) })) }
const openBreakOf = (hub: Hub, id: string) => breaksOf(hub).find((b) => b.personId === id && !b.end) || null
const LEAVE_T: Record<string, string> = { casual: "Casual", sick: "Sick", paid: "Paid", unpaid: "Unpaid" }
const leaveOn = (hub: Hub, id: string, day: string) => leaveOf(hub).find((l) => l.personId === id && l.status === "approved" && l.from <= day && l.to >= day) || null
const workDays = (l: Leave) => { if (l.half) return 0.5; let n = 0; for (let d = d8(l.from); d <= d8(l.to); d.setUTCDate(d.getUTCDate() + 1)) if (d.getUTCDay() % 6) n++; return n }
const leaveDates = (l: Leave) => (l.from === l.to ? dayName(l.from) + " " + fmtDate(l.from) + (l.half ? " · half day" : "") : fmtDate(l.from) + " – " + fmtDate(l.to))
const libOf = (hub: Hub): { folders: Folder[]; docs: Doc[] } => (hub as any).library || { folders: [], docs: [] }
const onbOf = (hub: Hub): { steps: Step[]; progress: Prog[] } => (hub as any).onboarding || { steps: [], progress: [] }
const engineOld = (hub: Hub) => !(hub as any).library
function onboardingLeft(hub: Hub, id: string) { const o = onbOf(hub); return o.steps.filter((s) => s.required && !o.progress.some((p) => p.personId === id && p.stepId === s.id)).length }
function openSessionOf(hub: Hub, id: string) { return workOf(hub).filter((w) => w.personId === id && w.checkIn && !w.checkOut).sort((a, b) => b.checkIn.localeCompare(a.checkIn))[0] || null }
const fmtTime = (iso: string) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "")
const fmtDur = (mins: number) => { const h = Math.floor(mins / 60), m = Math.round(mins % 60); return h ? h + "h " + String(m).padStart(2, "0") + "m" : m + "m" }
const minsOf = (w: Work) => (w.checkOut ? (w.minutes ?? Math.round((+new Date(w.checkOut) - +new Date(w.checkIn)) / 60000)) : Math.max(0, Math.round((Date.now() - +new Date(w.checkIn)) / 60000) - (w.brk || 0)))
const localDay = (iso: string) => { const d = new Date(iso); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }
// times come from the server clock and are never editable; the work note stays editable for 12 hours after check-out
const NOTE_EDIT_MS = 12 * 3600000
const noteLeft = (w: Work) => (w.checkOut ? +new Date(w.checkOut) + NOTE_EDIT_MS - Date.now() : Infinity)

const ICONS: Record<string, string> = {
    grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", check: "M4 12.5 9 17.5 20 6.5", clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2",
    users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9c.6-3.2 3.2-5 6-5s5.4 1.8 6 5m1-9a3 3 0 1 0-1.2-5.8M17.5 15c2 .5 3.2 2.2 3.5 5",
    play: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM10 8.5v7l6-3.5-6-3.5Z", folder: "M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.2l2 2.2H19a1.5 1.5 0 0 1 1.5 1.5v9.3a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5V6.5Z",
    mail: "M3.5 6h17v12h-17zM3.5 6.5 12 13l8.5-6.5", doc: "M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5Zm7 0V8h4M9 13h6m-6 3.5h4",
    link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1", task: "M5 5h14v14H5zM8.5 12l2.5 2.5L16 9.5",
    sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17m10-10 1.4-1.4",
    lock: "M6.5 10.5h11a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1Zm2 0V7.5a3.5 3.5 0 0 1 7 0v3", back: "M19 12H5m0 0 6-6m-6 6 6 6",
}
const Ico = ({ n, s = 18 }: { n: string; s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}><path d={ICONS[n]} /></svg>

/* ---- check in / out (header) ---- */
function ClockCard({ hub, act }: { hub: Hub; act: Act }) {
    const [busy, setBusy] = useState(false)
    const [note, setNote] = useState(false)
    const [txt, setTxt] = useState("")
    if (engineOld(hub)) return null
    const open = openSessionOf(hub, hub.me.id)
    const today = workOf(hub).filter((w) => w.personId === hub.me.id && localDay(w.checkIn) === localDay(new Date().toISOString()))
    const total = today.reduce((n, w) => n + minsOf(w), 0)
    const brk = openBreakOf(hub, hub.me.id)
    const off = leaveOn(hub, hub.me.id, localDay(new Date().toISOString()))
    const msg: Record<string, string> = { checkIn: "Checked in", checkOut: "Checked out", breakStart: "Enjoy your break", breakEnd: "Welcome back" }
    const go = async (a: "checkIn" | "checkOut" | "breakStart" | "breakEnd") => { setBusy(true); await act(a, a === "checkOut" ? { note: txt } : {}, msg[a]); setBusy(false); setNote(false); setTxt("") }
    return (
        <div className={"th-clock" + (brk ? " brk" : open ? " on" : "")}>
            <span className="dot" aria-hidden="true" />
            <div className="ct">{brk ? <><b>On a break · since {fmtTime(brk.start)}</b><small>{fmtDur(brkMins(brk))} so far · {fmtDur(total)} worked today</small></>
                : open ? <><b>Checked in · {fmtTime(open.checkIn)}</b><small>{fmtDur(total)} worked today</small></>
                : <><b>{today.length ? "Checked out" : off && !off.half ? "On leave today" : "Not checked in"}</b><small>{today.length ? fmtDur(total) + " today" : off ? LEAVE_T[off.type] + " leave" + (off.half ? " · half day" : "") : "Start your day"}</small></>}</div>
            {brk ? <button className="th-cta" disabled={busy} onClick={() => go("breakEnd")}>End break</button>
                : open ? <>{(hub as any).breaks ? <button className="th-ghost" disabled={busy} onClick={() => go("breakStart")}>Break</button> : null}<button className="th-cta" disabled={busy} onClick={() => setNote(true)}>Check out</button></>
                : <button className="th-cta" disabled={busy} onClick={() => go("checkIn")}>Check in</button>}
            {note ? (
                <div className="th-pop" role="dialog" aria-label="Check out">
                    <label className="th-fld"><span>What did you work on? (optional)</span><input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="e.g. Homepage hero, research notes" autoFocus /></label>
                    <div className="th-dacts"><button className="th-ghost" onClick={() => setNote(false)}>Cancel</button><button className="th-cta" disabled={busy} onClick={() => go("checkOut")}>Check out now</button></div>
                </div>
            ) : null}
        </div>
    )
}

/* ---- check-in log ---- */
function TimeLog({ hub, mem, canEdit, act }: { hub: Hub; mem: (id: string) => any; canEdit: boolean; act: Act }) {
    const [week, setWeek] = useState(0)
    const [edit, setEdit] = useState("")
    const [txt, setTxt] = useState("")
    const [busy, setBusy] = useState(false)
    if (engineOld(hub)) return <EngineNote />
    const now = new Date(), dIdx = (now.getDay() + 6) % 7
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dIdx + week * 7)
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return localDay(d.toISOString()) })
    const todayK = localDay(now.toISOString())
    const work = workOf(hub)
    const people = (canEdit ? hub.team : hub.team.filter((m) => work.some((w) => w.personId === m.id) || m.id === hub.me.id)).filter((m) => m.inReports || m.id === hub.me.id)
    const cell = (id: string, d: string) => work.filter((w) => w.personId === id && localDay(w.checkIn) === d)
    const weekMins = (id: string) => days.reduce((n, d) => n + cell(id, d).reduce((a, w) => a + minsOf(w), 0), 0)
    const recent = work.filter((w) => days.includes(localDay(w.checkIn))).sort((a, b) => b.checkIn.localeCompare(a.checkIn))
    return (
        <div className="th-col">
            <section className="th-panel">
                <div className="th-ph"><div><h2>Check-ins</h2><p>{canEdit ? "Everyone's check-in and check-out times" : "Your check-in and check-out times"} · shown in your time zone</p></div>
                    <div className="th-weeknav"><button className="th-round" aria-label="Previous week" onClick={() => setWeek(week - 1)}>‹</button><b>{fmtDate(days[0])} – {fmtDate(days[6])}</b><button className="th-round" aria-label="Next week" disabled={week >= 0} onClick={() => setWeek(week + 1)}>›</button></div></div>
                <div className="th-tablewrap"><table className="th-table"><thead><tr><th>Person</th>{days.map((d) => <th key={d} className={d === todayK ? "today" : ""}>{dayName(d)} {d8(d).getUTCDate()}</th>)}<th>Week</th></tr></thead>
                    <tbody>{people.map((m) => <tr key={m.id}><td><span className="who"><span className="th-av sm">{initials(m.name)}</span>{m.name}</span></td>
                        {days.map((d) => { const c = cell(m.id, d), live = c.some((w) => !w.checkOut), mins = c.reduce((a, w) => a + minsOf(w), 0)
                            const lv = c.length ? null : leaveOn(hub, m.id, d)
                            if (lv) return <td key={d}><span className="th-tcell leave"><b>On leave</b><small>{LEAVE_T[lv.type]}{lv.half ? " · half" : ""}</small></span></td>
                            return <td key={d}>{c.length ? <span className={"th-tcell" + (live ? " live" : "")} title={c.map((w) => fmtTime(w.checkIn) + " – " + (w.checkOut ? fmtTime(w.checkOut) : "now")).join("\n")}><b>{fmtDur(mins)}</b><small>{fmtTime(c[c.length - 1].checkIn)}{live ? " · in" : " – " + fmtTime(c[0].checkOut)}</small></span> : <span className="th-note">–</span>}</td> })}
                        <td><b>{fmtDur(weekMins(m.id))}</b></td></tr>)}</tbody></table></div>
            </section>
            <section className="th-panel">
                <div className="th-ph"><div><h2>Sessions</h2><p>Times are recorded automatically when you check in and out. You can edit what you worked on for 12 hours after checking out.</p></div></div>
                {recent.length ? recent.map((w) => {
                    const mine = w.personId === hub.me.id, left = noteLeft(w), canNote = mine && left > 0
                    const saveNote = async () => { setBusy(true); const r = await act("saveNote", { id: w.id, note: txt }, "Saved"); setBusy(false); if (r) setEdit("") }
                    return (
                    <div key={w.id} className="th-srow">
                        <span className="th-av sm">{initials(mem(w.personId)?.name || "?")}</span>
                        <div className="mid"><b>{mem(w.personId)?.name || w.personId}</b>
                            <div className="sub">{dayName(localDay(w.checkIn))} {fmtDate(localDay(w.checkIn))} · {fmtTime(w.checkIn)} – {w.checkOut ? fmtTime(w.checkOut) : openBreakOf(hub, w.personId) ? <span className="livetxt">on a break</span> : <span className="livetxt">still checked in</span>}{w.brk ? " · " + fmtDur(w.brk) + " break" : ""}</div>
                            {edit === w.id ? (
                                <form className="th-noteform" onSubmit={(e) => { e.preventDefault(); saveNote() }}>
                                    <input value={txt} onChange={(e) => setTxt(e.target.value)} maxLength={300} placeholder="What did you work on?" aria-label="What did you work on?" autoFocus />
                                    <button type="button" className="th-ghost" onClick={() => setEdit("")}>Cancel</button><button className="th-cta" disabled={busy}>Save</button>
                                </form>
                            ) : <div className="worked">{w.note ? w.note : <span className="th-note">{mine ? "No work note yet" : "No work note"}</span>}
                                {mine && w.checkOut ? <small className="th-note">{canNote ? " · editable for " + fmtDur(Math.ceil(left / 60000)) : " · locked"}</small> : null}</div>}
                        </div>
                        <b className="dur">{fmtDur(minsOf(w))}</b>
                        {canNote && edit !== w.id ? <button className="th-edit" onClick={() => { setEdit(w.id); setTxt(w.note) }}>{w.note ? "Edit work" : "Add work"}</button> : null}
                    </div>
                ) }) : <p className="th-note">No check-ins this week.</p>}
            </section>
        </div>
    )
}
/* ---- leave ---- */
function LeavePage({ hub, canEdit, act, mem }: { hub: Hub; canEdit: boolean; act: Act; mem: (id: string) => any }) {
    const today = localDay(new Date().toISOString())
    const blank = { type: "casual", from: today, to: today, half: false, reason: "" }
    const [form, setForm] = useState<typeof blank | null>(null)
    const [busy, setBusy] = useState("")
    const all = leaveOf(hub)
    const mine = all.filter((l) => l.personId === hub.me.id).sort((a, b) => b.from.localeCompare(a.from))
    const otherLead = hub.team.some((m) => m.level === "leadership" && m.id !== hub.me.id)
    const toReview = canEdit ? all.filter((l) => l.status === "pending" && (l.personId !== hub.me.id || !otherLead)).sort((a, b) => a.from.localeCompare(b.from)) : []
    const horizon = (() => { const d = d8(today); d.setUTCDate(d.getUTCDate() + 14); return d.toISOString().slice(0, 10) })()
    const out = all.filter((l) => l.status === "approved" && l.to >= today && l.from <= horizon).sort((a, b) => a.from.localeCompare(b.from))
    const run = async (key: string, a: string, body: Record<string, unknown>, ok: string) => { setBusy(key); const r = await act(a, body, ok); setBusy(""); return r }
    const submit = async (e: React.FormEvent) => {
        e.preventDefault(); if (!form) return
        const to = form.to < form.from ? form.from : form.to
        const r = await run("new", "requestLeave", { leave: { ...form, to, half: form.half && form.from === to } }, "Leave requested")
        if (r) setForm(null)
    }
    const chip = (l: Leave) => <span className={"th-lst " + l.status}>{l.status === "pending" ? "Waiting for approval" : l.status[0].toUpperCase() + l.status.slice(1)}</span>
    const days = (l: Leave) => { const n = workDays(l); return n === 0.5 ? "½ day" : n + (n === 1 ? " working day" : " working days") }
    if (engineOld(hub) || !(hub as any).leave) return <EngineNote />
    return (
        <div className="th-col">
            {toReview.length ? (
                <section className="th-panel">
                    <div className="th-ph"><div><h2>Requests to review <span className="th-note">· {toReview.length}</span></h2><p>Approving posts to the team's Chat space. Reasons stay here.</p></div></div>
                    {toReview.map((l) => (
                        <div key={l.id} className="th-lrow">
                            <span className="th-av sm">{initials(mem(l.personId)?.name || "?")}</span>
                            <div className="mid"><b>{mem(l.personId)?.name || l.personId}</b><div className="sub">{LEAVE_T[l.type]} leave · {leaveDates(l)} · {days(l)}</div>{l.reason ? <div className="why">“{l.reason}”</div> : null}</div>
                            <div className="acts"><button className="th-ghost" disabled={!!busy} onClick={() => run(l.id, "decideLeave", { id: l.id, status: "declined" }, "Declined")}>Decline</button><button className="th-cta" disabled={!!busy} onClick={() => run(l.id, "decideLeave", { id: l.id, status: "approved" }, "Approved")}>Approve</button></div>
                        </div>
                    ))}
                </section>
            ) : null}
            <section className="th-panel">
                <div className="th-ph"><div><h2>Your leave</h2><p>Request time off. Leadership approve it, and the team sees the dates in Chat.</p></div>{form ? null : <button className="th-cta" onClick={() => setForm(blank)}>Request leave</button>}</div>
                {form ? (
                    <form className="th-mform" onSubmit={submit} style={{ marginTop: 0, marginBottom: 14, borderTop: 0, paddingTop: 0 }}>
                        <label className="th-fld"><span>Type</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{Object.keys(LEAVE_T).map((k) => <option key={k} value={k}>{LEAVE_T[k]} leave</option>)}</select></label>
                        <label className="th-fld"><span>From</span><input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value, to: form.to < e.target.value ? e.target.value : form.to })} required /></label>
                        <label className="th-fld"><span>To</span><input type="date" value={form.to} min={form.from} onChange={(e) => setForm({ ...form, to: e.target.value })} required /></label>
                        {form.from === form.to ? <label className="th-chk full"><input type="checkbox" checked={form.half} onChange={(e) => setForm({ ...form, half: e.target.checked })} /> Half day</label> : null}
                        <label className="th-fld full"><span>Reason (optional, only leadership see it)</span><input value={form.reason} maxLength={300} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Family function" /></label>
                        <div className="full row"><span className="th-note">{days({ ...(form as any), to: form.to < form.from ? form.from : form.to, half: form.half && form.from === form.to })}</span><span style={{ display: "flex", gap: 8 }}><button type="button" className="th-ghost" onClick={() => setForm(null)}>Cancel</button><button className="th-cta" disabled={busy === "new"}>Send request</button></span></div>
                    </form>
                ) : null}
                {mine.length ? mine.map((l) => {
                    const canCancel = l.status === "pending" || (l.status === "approved" && l.from > today)
                    return (
                        <div key={l.id} className="th-lrow">
                            <span className="th-lic"><Ico n="sun" s={16} /></span>
                            <div className="mid"><b>{LEAVE_T[l.type]} leave</b><div className="sub">{leaveDates(l)} · {days(l)}{l.decidedBy && l.status !== "cancelled" ? " · " + l.status + " by " + (mem(l.decidedBy)?.name.split(" ")[0] || "leadership") : ""}</div>{l.reason ? <div className="why">“{l.reason}”</div> : null}</div>
                            <div className="acts">{chip(l)}{canCancel ? <button className="th-edit" disabled={!!busy} onClick={() => run(l.id, "cancelLeave", { id: l.id }, "Leave cancelled")}>Cancel</button> : null}</div>
                        </div>
                    )
                }) : form ? null : <p className="th-note">No leave yet.</p>}
            </section>
            <section className="th-panel">
                <div className="th-ph"><div><h2>Who's out</h2><p>Approved leave for the next two weeks</p></div></div>
                {out.length ? out.map((l) => (
                    <div key={l.id} className="th-lrow">
                        <span className="th-av sm">{initials(mem(l.personId)?.name || "?")}</span>
                        <div className="mid"><b>{mem(l.personId)?.name || l.personId}</b><div className="sub">{LEAVE_T[l.type]} leave · {leaveDates(l)}</div></div>
                        <div className="acts">{l.from <= today ? <span className="th-lst approved">Out today</span> : null}</div>
                    </div>
                )) : <p className="th-note">Nobody is on leave in the next two weeks.</p>}
            </section>
        </div>
    )
}

/* ---- onboarding ---- */
function ytId(u: string) { const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/); return m ? m[1] : "" }
function embedOf(u: string) {
    const d = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/); if (d) return "https://drive.google.com/file/d/" + d[1] + "/preview"
    const l = u.match(/loom\.com\/share\/([\w-]+)/); if (l) return "https://www.loom.com/embed/" + l[1]
    const v = u.match(/vimeo\.com\/(\d+)/); if (v) return "https://player.vimeo.com/video/" + v[1]
    return ""
}
const isFile = (u: string) => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u)

/** Plays an onboarding video and reports when it has really been watched (90% played, no skipping ahead). */
function VideoGate({ url, minutes, onWatched }: { url: string; minutes: number; onWatched: () => void }) {
    const [pct, setPct] = useState(0)
    const [left, setLeft] = useState(Math.max(1, minutes || 1) * 60)
    const done = useRef(false)
    const finish = () => { if (!done.current) { done.current = true; setPct(100); onWatched() } }
    const yt = ytId(url), emb = embedOf(url), file = isFile(url)
    const host = useRef<HTMLDivElement>(null)
    // YouTube: count real playback time through the IFrame API
    useEffect(() => {
        if (!yt) return
        let player: any, timer = 0, watched = 0, last = -1, dead = false
        const start = () => {
            if (dead || !host.current) return
            const el = document.createElement("div"); host.current.innerHTML = ""; host.current.appendChild(el)
            player = new (window as any).YT.Player(el, { videoId: yt, width: "100%", height: "100%", playerVars: { rel: 0, modestbranding: 1 } })
            timer = window.setInterval(() => {
                try {
                    const dur = player.getDuration(), t = player.getCurrentTime(), st = player.getPlayerState()
                    if (st === 1 && last >= 0 && t - last > 0 && t - last < 2.5) watched += t - last
                    last = t
                    if (dur > 0) { const p = Math.min(100, Math.round((watched / dur) * 100)); setPct(p); if (watched >= dur * 0.9) finish() }
                } catch {}
            }, 1000)
        }
        const w = window as any
        if (w.YT && w.YT.Player) start()
        else {
            const prev = w.onYouTubeIframeAPIReady; w.onYouTubeIframeAPIReady = () => { prev && prev(); start() }
            if (!document.getElementById("yt-iframe-api")) { const s = document.createElement("script"); s.id = "yt-iframe-api"; s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s) }
        }
        return () => { dead = true; window.clearInterval(timer); try { player && player.destroy() } catch {} }
    }, [yt])
    // Drive, Loom, Vimeo and other players can't report progress: the step unlocks after its length has passed with the page open
    useEffect(() => {
        if (yt || file) return
        const t = window.setInterval(() => { if (document.visibilityState === "visible") setLeft((n) => { const x = n - 1; if (x <= 0) finish(); return Math.max(0, x) }) }, 1000)
        return () => window.clearInterval(t)
    }, [url])
    const max = useRef(0)
    return (
        <div className="th-video">
            <div className="frame">
                {yt ? <div ref={host} className="fill" /> : file ? (
                    <video src={url} controls playsInline className="fill"
                        onTimeUpdate={(e) => { const v = e.currentTarget; if (v.currentTime > max.current && v.currentTime - max.current < 2) max.current = v.currentTime; if (v.duration) { const p = Math.round((max.current / v.duration) * 100); setPct(p); if (max.current >= v.duration * 0.9) finish() } }}
                        onSeeking={(e) => { const v = e.currentTarget; if (v.currentTime > max.current + 1) v.currentTime = max.current }}
                        onEnded={() => { if (max.current > 0) finish() }} />
                ) : emb ? <iframe className="fill" src={emb} allow="autoplay; fullscreen" allowFullScreen title="Onboarding video" /> : <div className="fill th-empty"><span>This link can't be played here.</span><a className="th-cta" href={url} target="_blank" rel="noopener">Open the video</a></div>}
            </div>
            <div className="th-vbar"><span className="th-meter wide"><i style={{ width: (yt || file ? pct : Math.round(100 - (left / (Math.max(1, minutes || 1) * 60)) * 100)) + "%" }} /></span>
                <small>{done.current || pct >= 100 ? "Watched" : yt || file ? pct + "% watched · watch to the end to continue" : "Keep watching · unlocks in " + Math.ceil(left / 60) + " min"}</small></div>
        </div>
    )
}

function Onboarding({ hub, canEdit, act, mem }: { hub: Hub; canEdit: boolean; act: Act; mem: (id: string) => any }) {
    const o = onbOf(hub)
    const doneIds = new Set(o.progress.filter((p) => p.personId === hub.me.id).map((p) => p.stepId))
    const firstOpen = o.steps.find((s) => !doneIds.has(s.id))
    const [sel, setSel] = useState<string>(firstOpen?.id || o.steps[0]?.id || "")
    const [ready, setReady] = useState<Record<string, boolean>>({})
    const [manage, setManage] = useState<Partial<Step> | null>(null)
    const [view, setView] = useState<"mine" | "team">("mine")
    if (engineOld(hub)) return <EngineNote />
    const step = o.steps.find((s) => s.id === sel)
    const req = o.steps.filter((s) => s.required), reqDone = req.filter((s) => doneIds.has(s.id)).length
    const idx = o.steps.findIndex((s) => s.id === sel)
    const complete = async (s: Step) => { const r = await act("completeStep", { stepId: s.id }, "Step completed"); if (r) { const nx = o.steps.find((x, i) => i > idx && !doneIds.has(x.id)); if (nx) setSel(nx.id) } }
    const canDone = (s: Step) => s.kind === "task" || ready[s.id]
    return (
        <div className="th-col">
            <section className="th-panel">
                <div className="th-ph"><div><h2>Your onboarding</h2><p>{req.length ? reqDone + " of " + req.length + " required steps done" : "No steps yet"}{o.steps.length > req.length ? " · " + (o.steps.length - req.length) + " optional" : ""}</p></div>
                    {canEdit ? <div className="th-seg">{(["mine", "team"] as const).map((v) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v === "mine" ? "Steps" : "Team progress"}</button>)}</div> : null}</div>
                <div className="th-pbar"><i style={{ width: (req.length ? Math.round((reqDone / req.length) * 100) : 0) + "%" }} /></div>
            </section>

            {view === "team" && canEdit ? (
                <section className="th-panel"><div className="th-tablewrap"><table className="th-table"><thead><tr><th>Person</th>{o.steps.map((s, i) => <th key={s.id} title={s.title}>{i + 1}. {s.title.length > 18 ? s.title.slice(0, 17) + "…" : s.title}</th>)}<th>Done</th></tr></thead>
                    <tbody>{hub.team.map((m) => { const mine = o.progress.filter((p) => p.personId === m.id); const n = o.steps.filter((s) => s.required && mine.some((p) => p.stepId === s.id)).length
                        return <tr key={m.id}><td><span className="who"><span className="th-av sm">{initials(m.name)}</span>{m.name}</span></td>
                            {o.steps.map((s) => { const p = mine.find((x) => x.stepId === s.id); return <td key={s.id}>{p ? <button className="th-acell ontime" title={"Done " + fmtDate(p.doneAt.slice(0, 10)) + ". Click to reset."} onClick={() => act("resetStep", { personId: m.id, stepId: s.id }, "Step reset for " + m.name)}>Done</button> : <span className="th-note">–</span>}</td> })}
                            <td><b>{n}/{req.length}</b></td></tr> })}</tbody></table></div></section>
            ) : (
                <div className="th-ogrid">
                    <section className="th-panel th-steps">
                        {o.steps.length ? o.steps.map((s, i) => {
                            const done = doneIds.has(s.id), locked = !done && o.steps.slice(0, i).some((x) => x.required && !doneIds.has(x.id))
                            return (
                                <div key={s.id} className={"th-step" + (s.id === sel ? " on" : "") + (done ? " done" : "")}>
                                    <button className="pick" onClick={() => !locked && setSel(s.id)} disabled={locked} aria-current={s.id === sel}>
                                        <span className="num">{done ? "✓" : locked ? <Ico n="lock" s={14} /> : i + 1}</span>
                                        <span className="tx"><b>{s.title}</b><small>{s.kind === "video" ? "Video" + (s.minutes ? " · " + s.minutes + " min" : "") : s.kind === "doc" ? "Read" : s.kind === "task" ? "Task" : "Link"}{s.required ? "" : " · optional"}</small></span>
                                    </button>
                                    {canEdit ? <span className="th-sact"><button aria-label="Move up" onClick={() => act("moveStep", { id: s.id, dir: "up" })}>↑</button><button aria-label="Move down" onClick={() => act("moveStep", { id: s.id, dir: "down" })}>↓</button><button aria-label={"Edit " + s.title} onClick={() => setManage(s)}>✎</button></span> : null}
                                </div>
                            )
                        }) : <p className="th-note">{canEdit ? "Add the first step: a welcome video, the handbook, or tools to set up." : "Nothing to do yet. Leadership will add your onboarding steps here."}</p>}
                        {canEdit ? <button className="th-ghost addstep" onClick={() => setManage({ kind: "video", required: true, title: "", url: "", minutes: 5, description: "" })}>+ Add step</button> : null}
                    </section>

                    <section className="th-panel">
                        {manage ? <StepForm step={manage} onCancel={() => setManage(null)} onRemove={manage.id ? async () => { const r = await act("removeStep", { id: manage.id }, "Step removed"); if (r) setManage(null) } : undefined}
                            onSave={async (s) => { const r = await act("saveStep", { step: s }, "Step saved"); if (r) setManage(null) }} />
                            : step ? (
                                <div className="th-stepview">
                                    <div className="th-ph" style={{ marginBottom: 10 }}><div><h2>{idx + 1}. {step.title}</h2>{step.description ? <p>{step.description}</p> : null}</div>{doneIds.has(step.id) ? <span className="th-chip done">Completed</span> : null}</div>
                                    {step.kind === "video" && step.url ? <VideoGate key={step.id} url={step.url} minutes={step.minutes} onWatched={() => setReady((r) => ({ ...r, [step.id]: true }))} /> : null}
                                    {(step.kind === "doc" || step.kind === "link") && step.url ? <a className="th-open big" href={step.url} target="_blank" rel="noopener" onClick={() => setReady((r) => ({ ...r, [step.id]: true }))}><Ico n={step.kind === "doc" ? "doc" : "link"} />Open {step.kind === "doc" ? "the document" : "the link"} ↗</a> : null}
                                    {!doneIds.has(step.id) ? (
                                        <div className="th-done">
                                            <button className="th-cta th-big" disabled={!canDone(step)} onClick={() => complete(step)}>{step.kind === "video" ? "I've watched this" : step.kind === "task" ? "Mark as done" : "I've read this"}</button>
                                            {!canDone(step) ? <small className="th-note">{step.kind === "video" ? "Unlocks once you've watched the video." : "Open it first, then mark it as read."}</small> : null}
                                        </div>
                                    ) : <p className="th-note" style={{ marginTop: 12 }}>Done. {o.steps.find((x, i) => i > idx && !doneIds.has(x.id)) ? <button className="th-link" onClick={() => setSel(o.steps.find((x, i) => i > idx && !doneIds.has(x.id))!.id)}>Next step ›</button> : "That's everything."}</p>}
                                </div>
                            ) : <p className="th-note">Pick a step on the left.</p>}
                    </section>
                </div>
            )}
        </div>
    )
}

function StepForm({ step, onSave, onCancel, onRemove }: { step: Partial<Step>; onSave: (s: any) => void; onCancel: () => void; onRemove?: () => void }) {
    const [s, setS] = useState<Partial<Step>>(step)
    const [armed, setArmed] = useState(false)
    return (
        <form className="th-send" onSubmit={(e) => { e.preventDefault(); if (s.title?.trim()) onSave(s) }}>
            <div className="th-ph" style={{ marginBottom: 4 }}><div><h2>{step.id ? "Edit step" : "New onboarding step"}</h2><p>Videos can be YouTube, Google Drive, Loom, Vimeo or an .mp4 link.</p></div></div>
            <label className="th-fld"><span>Title</span><input value={s.title || ""} onChange={(e) => setS({ ...s, title: e.target.value })} required placeholder="Welcome to Takshila" /></label>
            <div className="two">
                <label className="th-fld"><span>Type</span><select value={s.kind} onChange={(e) => setS({ ...s, kind: e.target.value as any })}><option value="video">Video to watch</option><option value="doc">Document to read</option><option value="link">Link to open</option><option value="task">Task to do</option></select></label>
                <label className="th-fld"><span>{s.kind === "video" ? "Length (minutes)" : "Required"}</span>{s.kind === "video" ? <input type="number" min={1} value={s.minutes || ""} onChange={(e) => setS({ ...s, minutes: Number(e.target.value) })} /> : <select value={s.required ? "1" : "0"} onChange={(e) => setS({ ...s, required: e.target.value === "1" })}><option value="1">Required</option><option value="0">Optional</option></select>}</label>
            </div>
            {s.kind !== "task" ? <label className="th-fld"><span>Link</span><input type="url" value={s.url || ""} onChange={(e) => setS({ ...s, url: e.target.value })} placeholder="https://" /></label> : null}
            <label className="th-fld"><span>What should they know? (optional)</span><input value={s.description || ""} onChange={(e) => setS({ ...s, description: e.target.value })} /></label>
            {s.kind === "video" ? <label className="th-sw"><input type="checkbox" role="switch" checked={s.required !== false} onChange={(e) => setS({ ...s, required: e.target.checked })} />Required</label> : null}
            <div className="row">{onRemove ? <button type="button" className="th-ghost warn" onClick={() => (armed ? onRemove() : setArmed(true))}>{armed ? "Click again to remove" : "Remove step"}</button> : <span />}<span style={{ display: "flex", gap: 8 }}><button type="button" className="th-ghost" onClick={onCancel}>Cancel</button><button className="th-cta">Save step</button></span></div>
        </form>
    )
}

/* ---- documents ---- */
function kindOf(u: string): [string, string] {
    if (/docs\.google\.com\/document/.test(u)) return ["Google Doc", "doc"]
    if (/docs\.google\.com\/spreadsheets/.test(u)) return ["Google Sheet", "grid"]
    if (/docs\.google\.com\/presentation/.test(u)) return ["Google Slides", "play"]
    if (/drive\.google\.com/.test(u)) return ["Google Drive", "folder"]
    if (/figma\.com/.test(u)) return ["Figma", "grid"]
    if (/notion\.(so|site)/.test(u)) return ["Notion", "doc"]
    if (/youtu\.?be|loom\.com|vimeo\.com/.test(u)) return ["Video", "play"]
    if (/\.pdf(\?|$)/i.test(u)) return ["PDF", "doc"]
    return ["Link", "link"]
}
function Library({ hub, canEdit, act }: { hub: Hub; canEdit: boolean; act: Act }) {
    const { folders, docs } = libOf(hub)
    const [fid, setFid] = useState<string>("")
    const [q, setQ] = useState("")
    const [fEdit, setFEdit] = useState<Partial<Folder> | null>(null)
    const [dEdit, setDEdit] = useState<Partial<Doc> | null>(null)
    if (engineOld(hub)) return <EngineNote />
    const folder = folders.find((f) => f.id === fid)
    const ql = q.trim().toLowerCase()
    const list = docs.filter((d) => (ql ? (d.title + " " + d.description + " " + (folders.find((f) => f.id === d.folderId)?.name || "")).toLowerCase().includes(ql) : d.folderId === fid)).sort((a, b) => a.order - b.order || b.added.localeCompare(a.added))
    const showList = !!folder || !!ql
    return (
        <div className="th-col">
            <section className="th-panel">
                <div className="th-ph">
                    <div>{folder && !ql ? <button className="th-link back" onClick={() => setFid("")}><Ico n="back" s={14} /> All folders</button> : null}<h2>{ql ? "Search results" : folder ? folder.name : "Documents"}</h2><p>{ql ? list.length + " found" : folder ? folder.description || docs.filter((d) => d.folderId === folder.id).length + " items" : folders.length + " folders · " + docs.length + " documents and links"}</p></div>
                    <div className="th-tools">
                        <input className="th-in" type="search" placeholder="Search documents" aria-label="Search documents" value={q} onChange={(e) => setQ(e.target.value)} />
                        {canEdit ? <>{folder && !ql ? <button className="th-edit" onClick={() => setFEdit(folder)}>Edit folder</button> : <button className="th-edit" onClick={() => setFEdit({ name: "", description: "" })}>New folder</button>}
                            <button className="th-cta" onClick={() => setDEdit({ folderId: folder?.id || folders[0]?.id || "", title: "", url: "", description: "" })} disabled={!folders.length}>Add document</button></> : null}
                    </div>
                </div>
                {fEdit ? <FolderForm f={fEdit} onCancel={() => setFEdit(null)} onRemove={fEdit.id ? async () => { const r = await act("removeFolder", { id: fEdit.id }, "Folder removed"); if (r) { setFEdit(null); setFid("") } } : undefined} onSave={async (f) => { const r = await act("saveFolder", { folder: f }, "Folder saved"); if (r) setFEdit(null) }} /> : null}
                {dEdit ? <DocForm d={dEdit} folders={folders} onCancel={() => setDEdit(null)} onRemove={dEdit.id ? async () => { const r = await act("removeDoc", { id: dEdit.id }, "Removed"); if (r) setDEdit(null) } : undefined} onSave={async (d) => { const r = await act("saveDoc", { doc: d }, "Document saved"); if (r) setDEdit(null) }} /> : null}

                {!showList ? (
                    <div className="th-folders">{folders.map((f) => { const n = docs.filter((d) => d.folderId === f.id).length
                        return <button key={f.id} className="th-folder" onClick={() => setFid(f.id)}><span className="fi"><Ico n="folder" s={22} /></span><b>{f.name}</b><small>{f.description || " "}</small><span className="cnt">{n} {n === 1 ? "item" : "items"}</span></button> })}
                        {!folders.length ? <p className="th-note">No folders yet.</p> : null}</div>
                ) : list.length ? (
                    <div className="th-docs">{list.map((d) => { const [kl, ki] = kindOf(d.url)
                        return <div key={d.id} className="th-docrow"><span className="fi"><Ico n={ki} /></span>
                            <div className="mid"><a className="ttl" href={d.url} target="_blank" rel="noopener">{d.title}</a><div className="sub">{kl}{ql ? " · " + (folders.find((f) => f.id === d.folderId)?.name || "") : ""}{d.description ? " · " + d.description : ""}</div></div>
                            <span className="th-note when">{d.added ? fmtDate(d.added) : ""}</span>
                            <a className="th-open" href={d.url} target="_blank" rel="noopener">Open ↗</a>
                            {canEdit ? <button className="th-edit" onClick={() => setDEdit(d)}>Edit</button> : null}</div> })}</div>
                ) : <p className="th-note">{ql ? "Nothing matches." : canEdit ? "This folder is empty. Add the first document." : "Nothing here yet."}</p>}
            </section>
        </div>
    )
}
function FolderForm({ f, onSave, onCancel, onRemove }: { f: Partial<Folder>; onSave: (f: any) => void; onCancel: () => void; onRemove?: () => void }) {
    const [x, setX] = useState(f), [armed, setArmed] = useState(false)
    return (
        <form className="th-mform" onSubmit={(e) => { e.preventDefault(); if (x.name?.trim()) onSave(x) }} style={{ marginTop: 0, marginBottom: 14, borderTop: 0, paddingTop: 0 }}>
            <label className="th-fld"><span>Folder name</span><input value={x.name || ""} onChange={(e) => setX({ ...x, name: e.target.value })} required placeholder="Design" autoFocus /></label>
            <label className="th-fld" style={{ gridColumn: "span 2" }}><span>Description (optional)</span><input value={x.description || ""} onChange={(e) => setX({ ...x, description: e.target.value })} /></label>
            <div className="full row">{onRemove ? <button type="button" className="th-ghost warn" onClick={() => (armed ? onRemove() : setArmed(true))}>{armed ? "Click again to remove" : "Remove folder"}</button> : <span />}<span style={{ display: "flex", gap: 8 }}><button type="button" className="th-ghost" onClick={onCancel}>Cancel</button><button className="th-cta">Save folder</button></span></div>
        </form>
    )
}
function DocForm({ d, folders, onSave, onCancel, onRemove }: { d: Partial<Doc>; folders: Folder[]; onSave: (d: any) => void; onCancel: () => void; onRemove?: () => void }) {
    const [x, setX] = useState(d), [armed, setArmed] = useState(false)
    return (
        <form className="th-mform" onSubmit={(e) => { e.preventDefault(); if (x.title?.trim() && x.url) onSave(x) }} style={{ marginTop: 0, marginBottom: 14, borderTop: 0, paddingTop: 0 }}>
            <label className="th-fld"><span>Title</span><input value={x.title || ""} onChange={(e) => setX({ ...x, title: e.target.value })} required autoFocus placeholder="Brand guidelines" /></label>
            <label className="th-fld"><span>Link</span><input type="url" value={x.url || ""} onChange={(e) => setX({ ...x, url: e.target.value })} required placeholder="https://docs.google.com/…" /></label>
            <label className="th-fld"><span>Folder</span><select value={x.folderId} onChange={(e) => setX({ ...x, folderId: e.target.value })}>{folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
            <label className="th-fld full"><span>Short description (optional)</span><input value={x.description || ""} onChange={(e) => setX({ ...x, description: e.target.value })} /></label>
            <div className="full row">{onRemove ? <button type="button" className="th-ghost warn" onClick={() => (armed ? onRemove() : setArmed(true))}>{armed ? "Click again to remove" : "Remove"}</button> : <span />}<span style={{ display: "flex", gap: 8 }}><button type="button" className="th-ghost" onClick={onCancel}>Cancel</button><button className="th-cta">Save</button></span></div>
        </form>
    )
}
function EngineNote() {
    return <section className="th-panel"><div className="th-empty" style={{ minHeight: 220 }}><b>Update the Apps Script engine</b><span>This section needs the latest Code.gs. Paste it into Apps Script, run upgradeSheets once, then Deploy → Manage deployments → Edit → New version.</span></div></section>
}

function hubCss(r: number) {
    return `
.th-shell{display:grid;grid-template-columns:232px minmax(0,1fr);min-height:100%}
.th-side{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:14px;padding:18px 12px;border-right:1px solid var(--line);background:var(--bg)}
.th-brand{display:flex;align-items:center;gap:10px;padding:4px 8px 10px;font-size:15px}
.th-logo.sm{width:32px;height:32px;font-size:14px}
.th-snav{display:flex;flex-direction:column;gap:2px;flex:1;overflow:auto}
.th-snav button{display:flex;align-items:center;gap:11px;border:0;background:transparent;padding:10px 12px;border-radius:12px;cursor:pointer;color:var(--muted);text-align:left;font-size:14px}
.th-snav button:hover{background:var(--panel);color:var(--fg)}
.th-snav button[aria-current="page"]{background:var(--panel);color:var(--fg);font-weight:500;box-shadow:0 1px 0 var(--line)}
.th-snav em{margin-left:auto;font-style:normal;background:var(--accent);color:#151514;border-radius:999px;padding:1px 8px;font-size:12px}
.th-sfoot{display:flex;align-items:center;gap:10px;padding:10px 8px 2px;border-top:1px solid var(--line)}
.th-sfoot .who2{flex:1;min-width:0;display:flex;flex-direction:column}.th-sfoot .who2 b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.th-sfoot small{color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.th-sfoot .th-ghost{padding:6px 8px;font-size:12.5px}
.th-main{padding:20px;display:flex;flex-direction:column;gap:14px;min-width:0;max-width:1480px;width:100%}
.th-clock{position:relative;display:flex;align-items:center;gap:10px;background:var(--panel);border-radius:999px;padding:5px 5px 5px 14px}
.th-clock .dot{width:9px;height:9px;border-radius:50%;background:var(--muted)}.th-clock.on .dot{background:var(--good);box-shadow:0 0 0 4px color-mix(in srgb,var(--good) 20%,transparent)}
.th-clock .ct{display:flex;flex-direction:column;line-height:1.2}.th-clock .ct b{font-weight:500;font-size:13px}.th-clock .ct small{color:var(--muted);font-size:12px}
.th-clock .th-cta{padding:8px 16px}.th-clock .th-ghost{padding:8px 14px}
.th-clock.brk .dot{background:var(--warn);box-shadow:0 0 0 4px color-mix(in srgb,var(--warn) 22%,transparent)}
.th-tcell.leave{background:color-mix(in srgb,var(--accent) 22%,transparent)}
.th-lrow{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid var(--line)}.th-lrow:last-child{border-bottom:0}
.th-lrow .mid b{font-weight:500}.th-lrow .sub{color:var(--muted);font-size:13px;margin-top:2px}.th-lrow .why{font-size:13.5px;margin-top:4px;overflow-wrap:anywhere}
.th-lrow .acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.th-lic{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--sunk);color:var(--muted)}
.th-lst{display:inline-flex;align-items:center;border-radius:999px;padding:4px 10px;font-size:12px;white-space:nowrap;background:var(--sunk);color:var(--muted)}
.th-lst.pending{background:color-mix(in srgb,var(--warn) 20%,transparent);color:var(--fg)}.th-lst.approved{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}.th-lst.declined{background:color-mix(in srgb,var(--bad) 15%,transparent);color:var(--bad)}
.th-chk{display:flex;gap:8px;align-items:center;font-size:14px;cursor:pointer}.th-chk input{width:16px;height:16px;accent-color:var(--fg)}
.th-pop{position:absolute;right:0;top:calc(100% + 8px);z-index:20;width:320px;background:var(--panel);border-radius:${r}px;padding:14px;box-shadow:0 18px 40px -18px rgba(0,0,0,.35);display:flex;flex-direction:column;gap:10px}
.th-dacts{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.th-modal{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.35);display:grid;place-items:center;padding:16px}
.th-dlg{background:var(--panel);border-radius:${r + 6}px;padding:22px;max-width:440px;width:100%;display:flex;flex-direction:column;gap:10px}.th-dlg h2{margin:0;font-size:19px;font-weight:500}
.th-obanner{display:flex;align-items:center;gap:12px;border:0;cursor:pointer;text-align:left;background:var(--accent);color:#151514;border-radius:${r}px;padding:12px 16px;font-size:14px}.th-obanner b{font-weight:600}.th-obanner .go{margin-left:auto;font-weight:500}
.th-tcell{display:inline-flex;flex-direction:column;line-height:1.25;background:var(--sunk);border-radius:10px;padding:6px 10px;min-width:92px}.th-tcell b{font-weight:500}.th-tcell small{color:var(--muted);font-size:11.5px}.th-tcell.live{box-shadow:inset 0 0 0 1.5px var(--good)}
.th-srow{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}.th-srow .mid b{font-weight:500}.th-srow .worked{margin-top:4px;font-size:14px;overflow-wrap:anywhere}.th-noteform{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}.th-noteform input{flex:1 1 220px;min-width:0;font:inherit;font-size:14px;height:40px;padding:0 12px;border:0;border-radius:10px;background:var(--panel);color:var(--fg)}.th-srow .dur{font-variant-numeric:tabular-nums}
.livetxt{color:var(--good)}
.th-pbar{height:10px;background:var(--sunk);border-radius:999px;overflow:hidden}.th-pbar i{display:block;height:100%;background:var(--good);border-radius:999px;transition:width .4s ease}
.th-ogrid{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:14px;align-items:start}
.th-steps{display:flex;flex-direction:column;gap:6px}
.th-step{display:flex;align-items:center;gap:6px;border-radius:${r}px}
.th-step .pick{flex:1;min-width:0;display:flex;align-items:center;gap:12px;border:0;background:var(--sunk);border-radius:${r}px;padding:10px 12px;cursor:pointer;text-align:left}
.th-step .pick:disabled{cursor:not-allowed;opacity:.55}
.th-step.on .pick{box-shadow:inset 0 0 0 2px var(--fg)}
.th-step .num{width:28px;height:28px;border-radius:50%;background:var(--panel);display:grid;place-items:center;font-size:12.5px;font-weight:600;flex:none}
.th-step.done .num{background:var(--good);color:#fff}
.th-step .tx{display:flex;flex-direction:column;min-width:0}.th-step .tx b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.th-step .tx small{color:var(--muted);font-size:12px}
.th-sact{display:flex;gap:2px}.th-sact button{border:0;background:transparent;color:var(--muted);width:26px;height:26px;border-radius:8px;cursor:pointer}.th-sact button:hover{background:var(--sunk);color:var(--fg)}
.addstep{align-self:flex-start;margin-top:6px}
.th-video .frame{position:relative;aspect-ratio:16/9;background:#000;border-radius:${r}px;overflow:hidden}
.th-video .fill{position:absolute;inset:0;width:100%;height:100%;border:0}
.th-video .fill iframe{width:100%;height:100%}
.th-video .th-empty{color:#ddd}
.th-vbar{display:flex;align-items:center;gap:10px;margin-top:10px}.th-vbar small{color:var(--muted);font-size:12.5px}
.th-meter.wide{flex:1;width:auto;background:var(--sunk)}.th-meter.wide i{background:var(--good)}
.th-done{display:flex;flex-direction:column;gap:6px;margin-top:14px}
.th-open.big{display:inline-flex;align-items:center;gap:8px;background:var(--sunk);padding:12px 16px;font-size:14px}
.th-chip.done{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}
.th-folders{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.th-folder{display:flex;flex-direction:column;align-items:flex-start;gap:4px;border:0;background:var(--sunk);border-radius:${r}px;padding:16px;cursor:pointer;text-align:left;min-height:140px}
.th-folder:hover{box-shadow:inset 0 0 0 1.5px var(--fg)}
.th-folder .fi,.th-docrow .fi{width:40px;height:40px;border-radius:12px;background:var(--panel);display:grid;place-items:center;margin-bottom:6px;flex:none}
.th-folder b{font-weight:500;font-size:15px}.th-folder small{color:var(--muted);font-size:12.5px;line-height:1.35}.th-folder .cnt{margin-top:auto;font-size:12px;color:var(--muted)}
.th-docs{display:flex;flex-direction:column}
.th-docrow{display:grid;grid-template-columns:auto minmax(0,1fr) auto auto auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.th-docrow .fi{margin:0;background:var(--sunk)}.th-docrow .when{white-space:nowrap}
.th-link.back{display:inline-flex;align-items:center;gap:6px;color:var(--muted);padding:0;margin-bottom:6px;font-size:13px}
@media (max-width:900px){
 .th-shell{grid-template-columns:minmax(0,1fr)}
 .th-head{align-items:stretch}.th-head>div:first-child{width:100%}.th-me{width:100%}.th-ogrid>*{min-width:0}
 .th-side{position:sticky;top:0;z-index:10;height:auto;flex-direction:row;align-items:center;padding:8px 10px;border-right:0;border-bottom:1px solid var(--line)}
 .th-brand{display:none}.th-sfoot{border:0;padding:0}.th-sfoot .who2,.th-sfoot .th-av{display:none}
 .th-snav{flex-direction:row;overflow-x:auto;gap:4px}.th-snav button{white-space:nowrap;padding:8px 10px}.th-snav button span{display:inline}
 .th-main{padding:12px}
 .th-ogrid{grid-template-columns:1fr}
 .th-docrow{grid-template-columns:auto minmax(0,1fr) auto}.th-docrow .when,.th-docrow .th-edit{display:none}
 .th-srow{grid-template-columns:auto minmax(0,1fr) auto}.th-srow .th-edit{grid-column:2/-1;justify-self:start}
 .th-clock{width:100%;flex-wrap:wrap}.th-clock .ct{flex:1}.th-lrow{grid-template-columns:auto minmax(0,1fr)}.th-lrow .acts{grid-column:2/-1;justify-content:flex-start}.th-pop{width:auto;left:0}
}
`
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
